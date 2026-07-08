import { unstable_cache } from 'next/cache';
import { collection, getDocs, doc, getDoc, query, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase/config';
import { Producto } from '@/types/producto';

// Revalidar cada 0 segundos para que la web siempre refleje los cambios del POS instantáneamente
const REVALIDATE_TIME = 0;

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

export interface ComunidadConfig {
  avisoGlobal?: string;
  telefonos?: { id: string; nombre: string; numero: string }[];
}

function mapFirestoreProduct(doc: any): Producto {
  const data = doc.data();
  
  let etiquetasArr: string[] = [];
  if (data.etiquetas) {
    if (Array.isArray(data.etiquetas)) {
      etiquetasArr = data.etiquetas;
    } else if (typeof data.etiquetas === 'string') {
      try {
        etiquetasArr = JSON.parse(data.etiquetas);
      } catch (e) {
        etiquetasArr = data.etiquetas.split(',').map((s: string) => s.trim());
      }
    }
  }

  return {
    id: doc.id,
    codigoBarras: data.codigoBarras || '',
    nombre: data.nombre || '',
    descripcion: data.descripcion || '',
    categoria: data.categoria || 'Otros',
    precio: Number(data.precio) || 0,
    unidadMedida: data.unidadMedida || 'unidad',
    imagenUrl: data.imagenUrl || '',
    disponible: data.disponible === true || data.disponible === 1 || data.disponible === '1',
    destacado: data.destacado === true || data.destacado === 1 || data.destacado === '1',
    etiquetas: etiquetasArr
  };
}

function mapFirestoreBanner(doc: any): Banner {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title || '',
    subtitle: data.subtitle || '',
    imageUrl: data.imageUrl || '',
    badgeText: data.badgeText || '',
    ctaText: data.ctaText || 'Ver más',
    ctaActionCategory: data.ctaActionCategory || 'Todas',
    active: data.active === true || data.active === 1 || data.active === '1',
    priority: Number(data.priority) || 0
  };
}

// Obtener todos los productos activos
export const getProductosActivos = unstable_cache(
  async () => {
    try {
      const snapshot = await getDocs(collection(db, 'productos'));
      if (snapshot.empty) return [];
      
      return snapshot.docs
        .map(mapFirestoreProduct)
        .filter(p => p.disponible);
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
          telefonos: []
        };
      }
      return docSnap.data() as ComunidadConfig;
    } catch (error) {
      console.error("Error fetching comunidad config from Firebase:", error);
      return {
        avisoGlobal: '',
        telefonos: []
      };
    }
  },
  ['web-config-comunidad'],
  { revalidate: REVALIDATE_TIME, tags: ['web_config'] }
);

// Registrar evento de Analytics (No usar cache aquí)
export async function logAnalyticsEvent(type: 'pageview' | 'whatsapp_click', details: any = {}) {
  try {
    await addDoc(collection(db, 'analytics_events'), {
      type,
      ...details,
      timestamp: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error logging analytics event:", error);
    return false;
  }
}
