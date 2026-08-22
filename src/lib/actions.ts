import { unstable_cache } from 'next/cache';
import { collection, getDocs, doc, getDoc, addDoc, serverTimestamp, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from './firebase/config';
import { Producto } from '@/types/producto';

// Revalidar cada 30 segundos para actualización rápida de banners y catálogo
const REVALIDATE_TIME = 30;

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  badgeText?: string;
  ctaText?: string;
  ctaActionCategory?: string;
  active: boolean;
  priority: number;
}

export interface WebConfig {
  whatsapp?: string;
  ubicacion?: string;
  mostrarPrecios?: boolean;
  nombreTienda?: string;
  descripcionTienda?: string;
  mapaIframe?: string;
  horarioAtencion?: string;
  emailContacto?: string;
}

export interface EmpresaConfig {
  ruc?: string;
  razonSocial?: string;
  nombreComercial?: string;
  direccionFiscal?: string;
  telefono?: string;
  leyenda?: string;
}

export interface Anuncio {
  id: string;
  nombre: string;
  descripcion: string;
  telefono: string;
}

export interface Aviso {
  id: string;
  titulo: string;
  contenido: string;
  fecha: string;
}

export interface ComunidadConfig {
  avisoGlobal?: string;
  telefonos?: { id: string; nombre: string; numero: string }[];
  anuncios?: Anuncio[];
  avisos?: Aviso[];
}

function mapFirestoreProduct(doc: DocumentSnapshot | QueryDocumentSnapshot): Producto {
  const data = doc.data() || {};
  
  let etiquetasArr: string[] = [];
  if (data?.etiquetas) {
    if (Array.isArray(data.etiquetas)) {
      etiquetasArr = data.etiquetas;
    } else if (typeof data.etiquetas === 'string') {
      try {
        etiquetasArr = JSON.parse(data.etiquetas);
      } catch (e) {
        etiquetasArr = (data.etiquetas as string).split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
  }

  // Normalizar disponible/destacado: true para cualquier valor truthy
  // (true, 1, "1", "true") y false solo para falsy explícito (false, 0, "0", "false", null, undefined).
  const parseBool = (val: unknown, defaultVal: boolean): boolean => {
    if (val === true || val === 1 || val === '1' || val === 'true') return true;
    if (val === false || val === 0 || val === '0' || val === 'false') return false;
    return defaultVal;
  };

  return {
    id: doc.id,
    codigoBarras: data.codigoBarras || '',
    nombre: data.nombre || '',
    descripcion: data.descripcion || '',
    categoria: data.categoria || 'Otros',
    precio: Number(data.precio) || 0,
    unidadMedida: data.unidadMedida || 'unidad',
    imagenUrl: data.imagenUrl || data.imageUrl || '',
    disponible: parseBool(data.disponible, true),
    destacado: parseBool(data.destacado, false),
    stock: data.stock !== undefined && data.stock !== null ? Number(data.stock) : undefined,
    etiquetas: etiquetasArr,
    esPrincipalWeb: parseBool(data.esPrincipalWeb, false),
    productoPadreId: data.productoPadreId || undefined,
    etiquetaVariante: data.etiquetaVariante || undefined,
    mostrarPrecioWeb: parseBool(data.mostrarPrecioWeb, false)
  };
}

function mapFirestoreBanner(doc: DocumentSnapshot | QueryDocumentSnapshot): Banner {
  const data = doc.data() || {};
  return {
    id: doc.id,
    title: data.title || '',
    subtitle: data.subtitle || '',
    imageUrl: data.imageUrl || data.imagenLocal || '',
    badgeText: data.badgeText || '',
    ctaText: data.ctaText || 'Ver más',
    ctaActionCategory: data.ctaActionCategory || 'Todas',
    active: data.active === true || data.active === 1 || data.active === '1',
    priority: Number(data.priority) || 0
  };
}

// Obtener todos los productos activos agrupando familias y variantes para la web
export const getProductosActivos = unstable_cache(
  async () => {
    try {
      const snapshot = await getDocs(collection(db, 'productos'));
      if (snapshot.empty) return [];
      
      const todosLosProductos: Producto[] = [];
      for (const docSnap of snapshot.docs) {
        try {
          const producto = mapFirestoreProduct(docSnap);
          if (producto.disponible) {
            todosLosProductos.push(producto);
          }
        } catch (docErr) {
          // Un documento malformado no debe romper el catálogo completo
          console.warn(`[getProductosActivos] Error mapeando producto ${docSnap.id}:`, docErr);
        }
      }

      // Mapa de variantes agrupadas por productoPadreId
      const variantesPorPadre = new Map<string, Producto[]>();
      for (const prod of todosLosProductos) {
        if (prod.productoPadreId) {
          const lista = variantesPorPadre.get(prod.productoPadreId) || [];
          lista.push(prod);
          variantesPorPadre.set(prod.productoPadreId, lista);
        }
      }

      const catalogoFinal: Producto[] = [];

      for (const prod of todosLosProductos) {
        // Si es una variante secundaria vinculada a un padre, NO se muestra como tarjeta individual
        if (prod.productoPadreId && variantesPorPadre.has(prod.productoPadreId)) {
          continue;
        }

        const variantesHijas = variantesPorPadre.get(prod.id) || [];

        if (variantesHijas.length > 0) {
          // Es un Producto Principal / Familia Web con variantes
          const todasLasPresentaciones = [
            // Si el padre tiene su propio nombre de variante o precio base
            ...(prod.etiquetaVariante ? [{
              id: prod.id,
              codigoBarras: prod.codigoBarras,
              nombre: prod.nombre,
              etiqueta: prod.etiquetaVariante,
              precio: prod.precio,
              stock: prod.stock ?? 0,
              disponible: prod.disponible,
              unidadMedida: prod.unidadMedida
            }] : []),
            ...variantesHijas.map(v => ({
              id: v.id,
              codigoBarras: v.codigoBarras,
              nombre: v.nombre,
              etiqueta: v.etiquetaVariante || v.nombre,
              precio: v.precio,
              stock: v.stock ?? 0,
              disponible: v.disponible,
              unidadMedida: v.unidadMedida
            }))
          ];

          const precios = todasLasPresentaciones.map(p => p.precio).filter(p => p > 0);
          const precioMin = precios.length > 0 ? Math.min(...precios) : prod.precio;
          const precioMax = precios.length > 0 ? Math.max(...precios) : prod.precio;

          catalogoFinal.push({
            ...prod,
            precio: precioMin,
            precioMax: precioMax > precioMin ? precioMax : undefined,
            presentaciones: todasLasPresentaciones
          });
        } else {
          // Producto individual independiente
          catalogoFinal.push(prod);
        }
      }

      return catalogoFinal;
    } catch (error) {
      console.error("Error fetching productos from Firebase:", error);
      return [];
    }
  },
  ['productos-activos'],
  { revalidate: REVALIDATE_TIME, tags: ['productos'] }
);

// Obtener un producto por ID
export const getProductoById = unstable_cache(
  async (id: string) => {
    try {
      const docRef = doc(db, 'productos', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        return null;
      }
      return mapFirestoreProduct(docSnap);
    } catch (error) {
      console.error("Error fetching product by id:", error);
      return null;
    }
  },
  ['producto-detalle'],
  { revalidate: REVALIDATE_TIME }
);

// Obtener los banners del carrusel ordenados por prioridad
export const getBannersActivos = unstable_cache(
  async () => {
    try {
      const snapshot = await getDocs(collection(db, 'banners'));
      if (snapshot.empty) return [];

      return snapshot.docs
        .map(mapFirestoreBanner)
        .filter(b => b.active)
        .sort((a, b) => a.priority - b.priority);
    } catch (error) {
      console.error("Error fetching banners from Firebase:", error);
      return [];
    }
  },
  ['banners-activos'],
  { revalidate: REVALIDATE_TIME, tags: ['banners'] }
);

// Obtener configuración general de la tienda
export const getWebConfig = unstable_cache(
  async () => {
    try {
      const docRef = doc(db, 'web_config', 'general');
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        return { whatsapp: '51970560023', ubicacion: 'Av. Principal 123', mostrarPrecios: false };
      }
      return docSnap.data() as WebConfig;
    } catch (error) {
      console.error("Error fetching web config from Firebase:", error);
      return { whatsapp: '51970560023', ubicacion: 'Av. Principal 123', mostrarPrecios: false };
    }
  },
  ['web-config-general'],
  { revalidate: REVALIDATE_TIME, tags: ['web_config'] }
);

// Obtener datos formales de la empresa
export const getEmpresaConfig = unstable_cache(
  async () => {
    try {
      const docRef = doc(db, 'web_config', 'empresa');
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        return {
          nombreComercial: 'Minimarket Flor',
          direccionFiscal: 'Av. Principal 123',
          telefono: '51970560023'
        };
      }
      return docSnap.data() as EmpresaConfig;
    } catch (error) {
      console.error("Error fetching empresa config from Firebase:", error);
      return {
        nombreComercial: 'Minimarket Flor',
        direccionFiscal: 'Av. Principal 123',
        telefono: '51970560023'
      };
    }
  },
  ['web-config-empresa'],
  { revalidate: REVALIDATE_TIME, tags: ['web_config'] }
);

// Obtener configuración comunitaria
export const getComunidadConfig = unstable_cache(
  async () => {
    try {
      const docRef = doc(db, 'web_config', 'comunidad');
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        return {
          avisoGlobal: '',
          telefonos: [],
          anuncios: [],
          avisos: []
        };
      }
      return docSnap.data() as ComunidadConfig;
    } catch (error) {
      console.error("Error fetching comunidad config from Firebase:", error);
      return {
        avisoGlobal: '',
        telefonos: [],
        anuncios: [],
        avisos: []
      };
    }
  },
  ['web-config-comunidad'],
  { revalidate: REVALIDATE_TIME, tags: ['web_config'] }
);
