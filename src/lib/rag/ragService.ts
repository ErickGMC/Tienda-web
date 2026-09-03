/**
 * ragService.ts
 * Servicio de búsqueda semántica universal (RAG + Cross-Encoder LLM Reranking) para la Tienda Web.
 *
 * ARQUITECTURA DE BÚSQUEDA UNIVERSAL (v4):
 *  Nivel 1 — Búsqueda exacta léxica y ontológica de respaldo. Costo $0.
 *  Nivel 2 — Búsqueda Semántica Universal con Inteligencia Artificial:
 *            1. Recuperación Híbrida en Paralelo (Vectorial 768d + Léxica Multicampo).
 *            2. Reranking Semántico Universal con Gemini AI: Evalúa en tiempo real cualquier
 *               consulta arbitraria (necesidades, recetas, ocasiones, dietas, síntomas, tareas)
 *               y clasifica los productos por relación directa y jerárquica (Tier 1 > Tier 2).
 *            3. Caché LRU de consultas en memoria del servidor (TTL: 5 minutos) para respuestas a 0ms.
 *            4. Fallback resiliente automático a Nivel 1 ante fallos de conexión o cuota.
 */

import {
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Producto } from '../../types/producto';

// ── Tipos ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  productos: Producto[];
  nivel: 1 | 2;
  latencyMs: number;
}

export interface IAConfig {
  iaBusquedaHabilitada: boolean;
  iaCombosHabilitada: boolean;
}

// ── Caché en memoria del estado de IA ────────────────────────────────────────
// Evita llamar Firestore REST en cada búsqueda. TTL: 30 segundos.

let _iaCacheValue: IAConfig | null = null;
let _iaCacheTs: number = 0;
const IA_CACHE_TTL_MS = 30_000; // 30 segundos

/**
 * Lee la configuración de IA desde Firestore.
 * Cachea el resultado por IA_CACHE_TTL_MS en memoria del servidor.
 * Retorna { false, false } si el documento no existe o hay error (fail-safe).
 */
export async function getIAConfig(): Promise<IAConfig> {
  const now = Date.now();
  if (_iaCacheValue && (now - _iaCacheTs) < IA_CACHE_TTL_MS) {
    return _iaCacheValue;
  }

  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'minimarket-flor-8d7f9';
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/web_config/ia`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const data = await res.json();
      const busquedaEnabled = Boolean(data?.fields?.iaBusquedaHabilitada?.booleanValue);
      const combosEnabled = Boolean(data?.fields?.iaCombosHabilitada?.booleanValue);
      const config: IAConfig = {
        iaBusquedaHabilitada: busquedaEnabled,
        iaCombosHabilitada: busquedaEnabled && combosEnabled,
      };
      _iaCacheValue = config;
      _iaCacheTs = now;
      return config;
    }
  } catch (e) {
    console.warn('[RAG] Error leyendo web_config/ia:', e);
  }

  const fallback: IAConfig = { iaBusquedaHabilitada: false, iaCombosHabilitada: false };
  _iaCacheValue = fallback;
  _iaCacheTs = now - (IA_CACHE_TTL_MS - 5_000);
  return fallback;
}

/**
 * Invalida el caché de IAConfig. Usar tras guardar nueva configuración de IA.
 */
export function invalidateIACache() {
  _iaCacheValue = null;
  _iaCacheTs = 0;
}

// ── Utilidades ───────────────────────────────────────────────────────────────

/**
 * Mapea un documento de Firestore al tipo Producto del cliente.
 * Excluye el campo `embedding` para no serializar un array innecesario.
 */
function mapProducto(docData: any, id: string): Producto {
  const { embedding, ...rest } = docData;
  let etiquetas: string[] = [];
  if (Array.isArray(rest.etiquetas)) {
    etiquetas = rest.etiquetas;
  } else if (typeof rest.etiquetas === 'string') {
    try { etiquetas = JSON.parse(rest.etiquetas); } catch { etiquetas = []; }
  } else if (typeof rest.etiquetas === 'object' && rest.etiquetas !== null) {
    etiquetas = Object.values(rest.etiquetas).filter(e => typeof e === 'string') as string[];
  }
  return {
    ...rest,
    id,
    etiquetas,
    disponible: Boolean(rest.disponible === true || rest.disponible === 1 || rest.disponible === '1'),
    destacado: Boolean(rest.destacado === true || rest.destacado === 1 || rest.destacado === '1'),
    precio: Number(rest.precio) || 0,
    stock: Number(rest.stock) || 0,
  } as Producto;
}

// ── Caché en memoria de la colección de productos ────────────────────────────
// Evita llamar getDocs(collection(db, 'productos')) en cada búsqueda. TTL: 60 segundos.

export interface ProductoDocData {
  id: string;
  data: any;
}

let _productosCache: ProductoDocData[] | null = null;
let _productosCacheTs = 0;
const PRODUCTOS_CACHE_TTL_MS = 60_000; // 60 segundos

/**
 * Obtiene la colección completa de productos desde el caché o Firestore.
 * Cachea los datos por 60 segundos en memoria del servidor Node.
 */
export async function getProductosCollectionDocs(): Promise<ProductoDocData[]> {
  const now = Date.now();
  if (_productosCache && (now - _productosCacheTs) < PRODUCTOS_CACHE_TTL_MS) {
    return _productosCache;
  }
  try {
    const snap = await getDocs(collection(db, 'productos'));
    const result: ProductoDocData[] = snap.docs.map(d => ({
      id: d.id,
      data: d.data(),
    }));
    _productosCache = result;
    _productosCacheTs = now;
    return result;
  } catch (e) {
    console.error('[getProductosCollectionDocs] Error al leer productos de Firestore:', e);
    return _productosCache || [];
  }
}

/**
 * Convierte una lista de productos coincidentes (sean hijos o familias)
 * a su lista deduplicada de Familias Web con todas sus presentaciones hijas adjuntas.
 */
export function mapearAFamilias(prodsCoincidentes: Producto[], allDocs: any[]): Producto[] {
  const allProds: Producto[] = allDocs.map(d => {
    const data = typeof d.data === 'function' ? d.data() : (d.data || d);
    return mapProducto(data, d.id || data.id);
  });

  const familiasMap = new Map<string, Producto>();
  const allFamilias = allProds.filter(p => Boolean(p.esPrincipalWeb));

  // Mapa de presentaciones por familia
  const presentacionesPorFamilia = new Map<string, Producto[]>();
  for (const prod of allProds) {
    if (prod.productoPadreId) {
      const list = presentacionesPorFamilia.get(prod.productoPadreId) || [];
      list.push(prod);
      presentacionesPorFamilia.set(prod.productoPadreId, list);
    }
  }

  for (const p of prodsCoincidentes) {
    let familiaObj: Producto | undefined;

    if (p.esPrincipalWeb) {
      familiaObj = p;
    } else if (p.productoPadreId) {
      familiaObj = allFamilias.find(f => f.id === p.productoPadreId);
    } else {
      const pNombre = p.nombre.toLowerCase();
      familiaObj = allFamilias.find(f => pNombre.includes(f.nombre.toLowerCase()) || f.nombre.toLowerCase().includes(pNombre));
    }

    if (familiaObj && !familiasMap.has(familiaObj.id)) {
      const hijas = presentacionesPorFamilia.get(familiaObj.id) || [];
      
      const extraerEtiqueta = (nombreHijo: string, nombrePadre: string, etiquetaDef?: string) => {
        if (etiquetaDef && etiquetaDef.trim() !== '') return etiquetaDef.trim();
        const regex = new RegExp(`^${nombrePadre}\\s*[-–:]?\\s*`, 'i');
        const limpia = nombreHijo.replace(regex, '').trim();
        return limpia.length > 0 ? limpia : nombreHijo;
      };

      const presentaciones = hijas.map(h => ({
        id: h.id,
        codigoBarras: h.codigoBarras,
        nombre: h.nombre,
        etiqueta: extraerEtiqueta(h.nombre, familiaObj!.nombre, h.etiquetaVariante),
        precio: h.precio,
        stock: h.stock ?? 0,
        disponible: h.disponible,
        unidadMedida: h.unidadMedida
      })).sort((a, b) => a.precio - b.precio || a.nombre.localeCompare(b.nombre));

      const precios = presentaciones.map(pr => pr.precio).filter(pr => pr > 0);
      const precioMin = precios.length > 0 ? Math.min(...precios) : familiaObj.precio;
      const precioMax = precios.length > 0 ? Math.max(...precios) : familiaObj.precio;

      familiasMap.set(familiaObj.id, {
        ...familiaObj,
        precio: precioMin,
        precioMax: precioMax > precioMin ? precioMax : undefined,
        presentaciones
      });
    } else if (!familiaObj && !familiasMap.has(p.id)) {
      // Producto unitario independiente (sin familia)
      familiasMap.set(p.id, {
        ...p,
        presentaciones: [{
          id: p.id,
          codigoBarras: p.codigoBarras,
          nombre: p.nombre,
          etiqueta: p.etiquetaVariante || p.unidadMedida || 'Unidad',
          precio: p.precio,
          stock: p.stock ?? 0,
          disponible: p.disponible,
          unidadMedida: p.unidadMedida
        }]
      });
    }
  }

  return Array.from(familiasMap.values());
}

/**
 * Invalida el caché de productos manualmente si es necesario.
 */
export function invalidateProductosCache() {
  _productosCache = null;
  _productosCacheTs = 0;
}

// ── Normalización de Texto, Plurales y Errores Tipográficos ─────────────────

/**
 * Normaliza cadenas quitando tildes, signos, caracteres especiales,
 * comprimiendo vocales repetidas (ej. 'hiidratacion' -> 'hidratacion')
 * y limpiando espacios superfluos.
 */
export function normalizarTexto(texto: string): string {
  let limpio = (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita tildes: á->a, é->e, etc.
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Comprimir vocales consecutivas repetidas (ej. "hiidratacion" -> "hidratacion", "prooteina" -> "proteina", "pooollo" -> "pollo")
  limpio = limpio.replace(/([aeiou])\1+/g, '$1');

  return limpio;
}

/**
 * Lematización / reducción de plurales en español.
 */
export function singularizarToken(token: string): string {
  if (!token || token.length <= 3) return token || '';
  if (token.endsWith('ces')) return token.slice(0, -3) + 'z'; // peces -> pez, arroces -> arroz
  
  // Plurales de palabras terminadas en consonante + es (ej. limones -> limon, panes -> pan, frijoles -> frijol)
  if (/(?:[aeiou]n|[aeiou]l|[aeiou]r)es$/i.test(token)) {
    return token.slice(0, -2);
  }

  // Plurales regulares en -s (carnes -> carne, huevos -> huevo, gaseosas -> gaseosa, aceitunas -> aceituna)
  if (token.endsWith('s')) {
    return token.slice(0, -1);
  }

  return token;
}

// ── Ontología Base de Necesidades del Consumidor & Jerarquía de Tiers ──────────

export interface ConceptDefinition {
  id: string;
  triggers: string[];
  tier1: string[];
  tier2: string[];
  tier3: string[];
  tier4?: string[];
}

export const ONTOLOGIA_NECESIDADES: ConceptDefinition[] = [
  {
    id: 'proteina',
    triggers: ['proteina', 'proteinas', 'protein', 'proteico', 'proteica', 'musculo', 'gym', 'aminoacido', 'aminoacidos', 'fitness', 'alimento proteico', 'fuerza'],
    tier1: ['pollo', 'huevo', 'huevos', 'carne', 'carnero', 'pechuga', 'pescado', 'atun', 'patasca', 'mondongo', 'cordero', 'presa'],
    tier2: ['queso', 'quesito', 'leche', 'yogurt', 'yogur', 'lacteo'],
    tier3: ['lenteja', 'lentejas', 'arveja', 'arvejas', 'menestra', 'almuerzo', 'menu'],
  },
  {
    id: 'hidratacion',
    triggers: ['hidratacion', 'rehidratacion', 'hidratar', 'rehidratar', 'sed', 'calor', 'electrolito', 'electrolitos', 'isotonica', 'rehidratante', 'deporte', 'sudor', 'beber', 'tomar', 'refrescar'],
    tier1: ['sporade', 'gatorade', 'rehidratante', 'electrolito', 'isotonica', 'suero'],
    tier2: ['agua', 'cielo', 'mineral', 'mesa', 'san luis', 'san mateo'],
    tier3: ['aloe', 'sabila', 'bio', 'jugo', 'frutado', 'yogurt', 'bebible'],
    tier4: ['gaseosa', 'inca kola', 'coca cola', 'kr', 'refresco', 'soda']
  },
  {
    id: 'desayuno',
    triggers: ['desayuno', 'desayunos', 'manana', 'despertar', 'primera comida'],
    tier1: ['pan', 'frances', 'huevo', 'huevos', 'queso', 'leche', 'avena', 'platano', 'mantequilla'],
    tier2: ['yogurt', 'azucar', 'galleta', 'casino', 'morochas', 'harina', 'pera'],
    tier3: ['aceituna', 'fruta']
  },
  {
    id: 'almuerzo',
    triggers: ['almuerzo', 'almuerzos', 'segundo', 'guiso', 'comida', 'menu', 'plato de fondo', 'cocinar'],
    tier1: ['menu', 'almuerzo', 'pollo', 'arroz', 'faraon', 'fideos', 'tallarin', 'pasta', 'laurel', 'hongo', 'aderezo'],
    tier2: ['papa', 'cebolla', 'tomate', 'lenteja', 'zanahoria', 'arveja', 'zapallo', 'espinaca', 'aceituna', 'sal'],
    tier3: ['patasca', 'carnero', 'sopa', 'caldo']
  },
  {
    id: 'sopa_caldo',
    triggers: ['sopa', 'sopas', 'caldo', 'caldos', 'caliente', 'resfrio', 'gripe', 'frio', 'invierno', 'resaca'],
    tier1: ['patasca', 'carnero', 'sopa', 'caldo', 'fideos san jorge', 'san jorge'],
    tier2: ['pollo', 'papa', 'zanahoria', 'zapallo', 'espinaca', 'laurel', 'hongo', 'arveja', 'sporade', 'agua'],
    tier3: ['arroz', 'sal', 'fideos']
  },
  {
    id: 'antojo_dulce',
    triggers: ['antojo', 'antojos', 'dulce', 'dulces', 'golosina', 'golosinas', 'chocolate', 'snack', 'piqueo', 'tarde', 'pelicula'],
    tier1: ['sublime', 'chocolate', 'casino', 'morochas', 'lentejas nestle', 'lentejitas', 'galleta', 'grageas', 'inca kola'],
    tier2: ['platano', 'pera', 'yogurt', 'frutado', 'gaseosa'],
    tier3: []
  },
  {
    id: 'limpieza',
    triggers: ['limpieza', 'limpiar', 'desinfeccion', 'desinfectar', 'aseo', 'higiene', 'lavar', 'ropa', 'bano', 'sarro', 'manchas'],
    tier1: ['clorox', 'lejia', 'desinfectante', 'cloro'],
    tier2: ['cinta aislante'],
    tier3: []
  },
  {
    id: 'carbohidrato',
    triggers: ['carbohidrato', 'carbohidratos', 'energia', 'calorias', 'harinas', 'almidon'],
    tier1: ['arroz', 'faraon', 'fideos', 'don vittorio', 'san jorge', 'papa', 'pan', 'harina'],
    tier2: ['platano', 'lenteja', 'casino', 'morochas', 'azucar'],
    tier3: ['arveja', 'zanahoria']
  }
];

const DICCIONARIO_PERUANO: Record<string, string[]> = {
  arroz: ['arroz', 'arrocito', 'faraon', 'extra'],
  fideos: ['fideos', 'fideo', 'tallarin', 'tallarines', 'pasta', 'espagueti', 'don vittorio', 'san jorge'],
  leche: ['leche', 'lechita', 'gloria', 'evaporada', 'tarro', 'lacteo'],
  queso: ['queso', 'quesito', 'fresco', 'lacteo'],
  yogurt: ['yogurt', 'yogur', 'frutado', 'gloria', 'bebible'],
  huevo: ['huevo', 'huevos', 'huevito', 'huevitos', 'gallina', 'postura'],
  azucar: ['azucar', 'rubia', 'dulce'],
  sal: ['sal', 'sal de mar', 'marina', 'mar'],
  harina: ['harina', 'trigo', 'reposteria'],
  aderezo: ['laurel', 'hongo', 'aderezo', 'tuco', 'especias', 'condimento'],
  lenteja: ['lenteja', 'lentejas', 'menestra', 'lentejita', 'bebe'],
  aceituna: ['aceituna', 'aceitunas', 'oliva', 'botija'],
  pollo: ['pollo', 'carne', 'pechuga', 'presa', 'almuerzo', 'segundo'],
  gaseosa: ['gaseosa', 'gaseosita', 'soda', 'refresco', 'inca kola', 'coca cola', 'kr', 'kola real', 'bebida'],
  agua: ['agua', 'cielo', 'mesa', 'mineral', 'hidratacion', 'botella'],
  rehidratante: ['sporade', 'gatorade', 'rehidratante', 'electrolitos', 'deporte', 'ejercicio', 'sudor', 'isotonica', 'bebida rehidratante'],
  aloe: ['aloe', 'sabila', 'bio', 'regenerador', 'saludable'],
  chela: ['cerveza', 'trago', 'bebidas', 'licor'],
  platano: ['platano', 'banana', 'seda', 'fruta', 'potasio'],
  pera: ['pera', 'fruta', 'frutas', 'jugosa'],
  papa: ['papa', 'papas', 'blanca', 'tuberculo', 'guarnicion', 'almuerzo'],
  cebolla: ['cebolla', 'aderezo', 'verdura'],
  tomate: ['tomate', 'ensalada', 'verdura'],
  zanahoria: ['zanahoria', 'verdura', 'hortaliza'],
  espinaca: ['espinaca', 'verdura', 'hojas'],
  zapallo: ['zapallo', 'macre', 'locro', 'sopa'],
  arveja: ['arveja', 'arvejita', 'legumbre', 'verdura'],
  pan: ['pan', 'frances', 'desayuno', 'lonche', 'pancito'],
  patasca: ['patasca', 'sopa', 'mondongo', 'caldo'],
  carnero: ['carnero', 'caldo', 'sopa', 'cordero'],
  almuerzo: ['menu', 'almuerzo', 'comida', 'segundo', 'plato', 'pollo', 'arroz'],
  galleta: ['galleta', 'galletas', 'casino', 'morochas', 'taco', 'rellena', 'snack', 'antojo'],
  chocolate: ['chocolate', 'sublime', 'nestle', 'cacao', 'antojo', 'dulce'],
  lentejitas: ['lentejas', 'confitadas', 'grageas', 'nestle', 'dulces', 'caramelo'],
  lejia: ['clorox', 'lejia', 'desinfectante', 'limpieza', 'aseo', 'cloro'],
  cinta: ['cinta', 'aislante', 'ferreteria', 'electricidad']
};

/**
 * Evalúa si un producto encaja en algún Tier de la Ontología de Necesidades.
 */
export function evaluarTierOntologico(
  producto: Producto,
  queryNorm: string,
  tokens: string[]
): { tier: number; boost: number; concepto: string | null } {
  const nombreNorm = normalizarTexto(producto.nombre);
  const descNorm = normalizarTexto(producto.descripcion || '');
  const catNorm = normalizarTexto(producto.categoria || '');
  const etiqsNorm = (producto.etiquetas || []).map(e => normalizarTexto(e)).join(' ');
  const textoCompleto = `${nombreNorm} ${catNorm} ${descNorm} ${etiqsNorm}`;

  const tokensNormalizados = tokens.map(t => singularizarToken(t));

  for (const concepto of ONTOLOGIA_NECESIDADES) {
    const queryActivaConcepto = concepto.triggers.some(tr => {
      const trNorm = normalizarTexto(tr);
      return queryNorm.includes(trNorm) || tokensNormalizados.some(tok => tok === trNorm || trNorm.includes(tok));
    });

    if (queryActivaConcepto) {
      const matchTier1 = concepto.tier1.some(p => {
        const pNorm = normalizarTexto(p);
        return nombreNorm.includes(pNorm) || textoCompleto.includes(pNorm);
      });
      if (matchTier1) return { tier: 1, boost: 25.0, concepto: concepto.id };

      const matchTier2 = concepto.tier2.some(p => {
        const pNorm = normalizarTexto(p);
        return nombreNorm.includes(pNorm) || textoCompleto.includes(pNorm);
      });
      if (matchTier2) return { tier: 2, boost: 15.0, concepto: concepto.id };

      const matchTier3 = concepto.tier3.some(p => {
        const pNorm = normalizarTexto(p);
        return nombreNorm.includes(pNorm) || textoCompleto.includes(pNorm);
      });
      if (matchTier3) return { tier: 3, boost: 7.0, concepto: concepto.id };

      if (concepto.tier4) {
        const matchTier4 = concepto.tier4.some(p => {
          const pNorm = normalizarTexto(p);
          return nombreNorm.includes(pNorm) || textoCompleto.includes(pNorm);
        });
        if (matchTier4) return { tier: 4, boost: 2.0, concepto: concepto.id };
      }
    }
  }

  return { tier: 0, boost: 0, concepto: null };
}

/**
 * Puntuación léxica de alta sensibilidad.
 */
function calcularScoreLexico(producto: Producto, queryNorm: string, tokens: string[]): number {
  const nombreNorm = normalizarTexto(producto.nombre);
  const descNorm = normalizarTexto(producto.descripcion || '');
  const catNorm = normalizarTexto(producto.categoria || '');
  const etiqsNorm = (producto.etiquetas || []).map(e => normalizarTexto(e));
  const codigo = String(producto.codigoBarras || '').trim();

  let score = 0;

  if (codigo && codigo === queryNorm) {
    return 30.0;
  }

  if (nombreNorm === queryNorm) {
    score += 15.0;
  } else if (nombreNorm.startsWith(queryNorm)) {
    score += 10.0;
  } else if (nombreNorm.includes(queryNorm)) {
    score += 6.5;
  }

  let tokensDirectosNombre = 0;
  let tokensSinonimosNombre = 0;
  let tokensOtros = 0;

  for (const token of tokens) {
    if (token.length < 2) continue;
    if (['de', 'la', 'el', 'en', 'para', 'con', 'un', 'una', 'los', 'las', 'del', 'al', 'por', 'lo', 'le'].includes(token)) {
      continue;
    }

    const tokenSingular = singularizarToken(token);

    if (nombreNorm.includes(token) || nombreNorm.includes(tokenSingular)) {
      tokensDirectosNombre++;
      if (nombreNorm.startsWith(token) || nombreNorm.startsWith(tokenSingular)) {
        tokensDirectosNombre += 0.5;
      }
    } else {
      let encontroSinonimo = false;
      for (const [clave, sinonimos] of Object.entries(DICCIONARIO_PERUANO)) {
        if (token === clave || tokenSingular === clave || sinonimos.includes(token) || sinonimos.includes(tokenSingular)) {
          if (nombreNorm.includes(clave) || sinonimos.some(s => nombreNorm.includes(s))) {
            tokensSinonimosNombre++;
            encontroSinonimo = true;
            break;
          }
        }
      }

      if (!encontroSinonimo) {
        if (etiqsNorm.some(et => et.includes(token) || et.includes(tokenSingular))) {
          tokensOtros += 1.5;
        } else if (catNorm.includes(token) || catNorm.includes(tokenSingular)) {
          tokensOtros += 1.0;
        } else if (descNorm.includes(token) || descNorm.includes(tokenSingular)) {
          tokensOtros += 0.5;
        }
      }
    }
  }

  score += (tokensDirectosNombre * 4.5);
  score += (tokensSinonimosNombre * 3.5);
  score += (tokensOtros * 1.0);

  return score;
}

// ── Nivel 1: Búsqueda Exacta / Léxica ─────────────────────────────────────────

export async function busquedaExacta(termino: string, maxResultados = 8): Promise<Producto[]> {
  const queryNorm = normalizarTexto(termino);
  if (!queryNorm) return [];
  const tokens = queryNorm.split(/\s+/);

  try {
    const docsData = await getProductosCollectionDocs();
    const productosConScore = docsData
      .map(d => {
        const prod = mapProducto(d.data, d.id);
        const scoreLexico = calcularScoreLexico(prod, queryNorm, tokens);
        const evalOnto = evaluarTierOntologico(prod, queryNorm, tokens);
        const scoreTotal = scoreLexico + evalOnto.boost;
        return { prod, score: scoreTotal, tier: evalOnto.tier };
      })
      .filter(item => item.score > 0);

    productosConScore.sort((a, b) => {
      if (a.tier > 0 && b.tier > 0 && a.tier !== b.tier) return a.tier - b.tier;
      if (a.tier > 0 && b.tier === 0 && a.tier <= 2) return -1;
      if (b.tier > 0 && a.tier === 0 && b.tier <= 2) return 1;
      return b.score - a.score;
    });

    const matchingProds = productosConScore.slice(0, 15).map(item => item.prod);
    const familias = mapearAFamilias(matchingProds, docsData);
    return familias.slice(0, maxResultados);
  } catch (e) {
    console.error('[busquedaExacta] Error:', e);
    return [];
  }
}

// ── Utilidades RAG / Similitud Coseno ───────────────────────────────────────

export function extractEmbeddingArray(data: any): number[] | null {
  if (!data) return null;
  if (Array.isArray(data)) return data;
  if (typeof data.toArray === 'function') return data.toArray();
  if (Array.isArray(data.values)) return data.values;
  if (Array.isArray(data._values)) return data._values;
  if (data.mapValue?.fields?.values) {
    const raw = data.mapValue.fields.values.arrayValue?.values || [];
    return raw.map((v: any) => Number(v.doubleValue || v.integerValue || 0));
  }
  return null;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function generarEmbedding(texto: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelo = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no configurada');
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const embeddingModel = genAI.getGenerativeModel({ model: modelo });

  try {
    const result = await embeddingModel.embedContent({
      content: { role: 'user', parts: [{ text: texto }] },
      outputDimensionality: 768
    } as any);
    return result.embedding.values.slice(0, 768);
  } catch {
    const fallback = await embeddingModel.embedContent(texto);
    return fallback.embedding.values.slice(0, 768);
  }
}

export async function busquedaSemantica(
  queryEmbedding: number[],
  maxResultados = 6,
  terminoOriginal = ''
): Promise<Producto[]> {
  try {
    const docsData = await getProductosCollectionDocs();
    return busquedaSemanticaConDocs(queryEmbedding, docsData, maxResultados, terminoOriginal);
  } catch (err: any) {
    console.error('[RAG] Fallback por similitud coseno falló:', err);
    return [];
  }
}

export function busquedaSemanticaConDocs(
  queryEmbedding: number[],
  productosDocs: any[],
  maxResultados = 6,
  terminoOriginal = ''
): Producto[] {
  const queryNorm = normalizarTexto(terminoOriginal);
  const tokens = queryNorm ? queryNorm.split(/\s+/) : [];

  const productosConScore = productosDocs
    .map(docSnap => {
      const data = typeof docSnap.data === 'function' ? docSnap.data() : (docSnap.data || docSnap);
      const productoId = docSnap.id || (docSnap.data ? docSnap.id : '');
      const producto = mapProducto(data, productoId);
      const vec = extractEmbeddingArray(data.embedding);
      const scoreSemantico = vec ? cosineSimilarity(queryEmbedding, vec) : 0;
      const evalOnto = evaluarTierOntologico(producto, queryNorm, tokens);
      const scoreLexico = calcularScoreLexico(producto, queryNorm, tokens);

      let scoreTotal = scoreSemantico;
      if (evalOnto.tier > 0) {
        scoreTotal += evalOnto.boost;
      }
      if (scoreLexico > 0) {
        scoreTotal += (scoreLexico * 1.5);
      }

      return { producto, scoreTotal, scoreSemantico, tier: evalOnto.tier };
    })
    .filter(item => item.producto.disponible);

  productosConScore.sort((a, b) => {
    if (a.tier > 0 && b.tier > 0 && a.tier !== b.tier) return a.tier - b.tier;
    if (a.tier > 0 && b.tier === 0 && a.tier <= 2) return -1;
    if (a.tier === 0 && b.tier > 0 && b.tier <= 2) return 1;
    return b.scoreTotal - a.scoreTotal;
  });

  const resultados = productosConScore
    .filter(item => item.tier > 0 || item.scoreTotal >= 0.38)
    .slice(0, maxResultados)
    .map(item => item.producto);

  if (resultados.length > 0) return resultados;
  return productosConScore.slice(0, Math.min(3, maxResultados)).map(item => item.producto);
}

// ── Reranker Semántico Universal con Gemini AI ───────────────────────────────

// Caché en memoria para búsquedas semánticas repetidas (TTL: 5 minutos, Max 200 entradas)
interface RerankCacheItem {
  resultados: Producto[];
  ts: number;
}
const _rerankCache = new Map<string, RerankCacheItem>();
const RERANK_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const MAX_RERANK_CACHE_ENTRIES = 200;

function setRerankCache(key: string, value: RerankCacheItem) {
  if (_rerankCache.size >= MAX_RERANK_CACHE_ENTRIES) {
    const oldestKey = _rerankCache.keys().next().value;
    if (oldestKey) _rerankCache.delete(oldestKey);
  }
  _rerankCache.set(key, value);
}

/**
 * Reordena dinámicamente cualquier conjunto de productos candidatos evaluando la
 * consulta con Gemini AI en tiempo real para clasificar por relación directa.
 */
export async function rerankSemanticoUniversal(
  termino: string,
  candidatos: Producto[]
): Promise<Producto[]> {
  const terminoLimpio = termino.trim();
  const cacheKey = normalizarTexto(terminoLimpio);
  const now = Date.now();

  const cached = _rerankCache.get(cacheKey);
  if (cached && (now - cached.ts) < RERANK_CACHE_TTL_MS) {
    return cached.resultados;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || candidatos.length === 0) return candidatos;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_GENERATIVE_MODEL || 'gemini-2.5-flash';
    const fallbackModelName = process.env.GEMINI_FALLBACK_GENERATIVE_MODEL || 'gemini-2.0-flash';

    const catalogoTexto = candidatos
      .map(p => `- ID: ${p.id} | ${p.nombre} | ${p.categoria} | ${p.descripcion || ''}`)
      .join('\n');

    const prompt = `
Eres el motor de búsqueda y reranking semántico universal de Minimarket Flor.
El usuario ha buscado: "${terminoLimpio}"

Evalúa los siguientes productos del catálogo y clasifícalos según qué tan DIRECTA y PRECISAMENTE resuelven la necesidad de la consulta del usuario.

CATÁLOGO CANDIDATO:
${catalogoTexto}

INSTRUCCIONES DE RANKING JERÁRQUICO:
1. Identifica qué productos tienen relación DIRECTA y PRIMARIA con la consulta (Tier 1: los que el usuario busca específicamente para resolver su necesidad).
2. Identifica qué productos tienen relación SECUNDARIA o COMPLEMENTARIA (Tier 2).
3. EXCLUYE totalmente los productos que no tengan ninguna relación relevante con la consulta.
4. Ordena la lista de mayor a menor relevancia directa.

Responde ÚNICAMENTE en JSON con este formato exacto:
{
  "resultados": [
    { "id": "ID_DEL_PRODUCTO", "tier": 1 }
  ]
}
`;

    let resultText = '';
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const res = await model.generateContent(prompt);
      resultText = res.response.text();
    } catch {
      const fallbackModel = genAI.getGenerativeModel({ model: fallbackModelName });
      const res = await fallbackModel.generateContent(prompt);
      resultText = res.response.text();
    }

    const cleanJson = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (Array.isArray(parsed.resultados) && parsed.resultados.length > 0) {
      const mapaProds = new Map(candidatos.map(p => [p.id, p]));
      const ordenados: Producto[] = [];

      for (const item of parsed.resultados) {
        const prod = mapaProds.get(item.id);
        if (prod && !ordenados.some(o => o.id === prod.id)) {
          ordenados.push(prod);
        }
      }

      // Si quedaron candidatos relevantes no mencionados explícitamente pero de buen score, agregarlos al final
      for (const p of candidatos) {
        if (!ordenados.some(o => o.id === p.id) && ordenados.length < 8) {
          ordenados.push(p);
        }
      }

      const finalResults = ordenados.slice(0, 8);
      setRerankCache(cacheKey, { resultados: finalResults, ts: now });
      return finalResults;
    }
  } catch (err: any) {
    console.warn('[RAG] Reranking dinámico LLM falló, usando ordenamiento vectorial/ontológico:', err.message);
  }

  return candidatos.slice(0, 8);
}

// ── Router Principal de Búsqueda Híbrida de Alta Velocidad (< 10ms - 300ms) ───

/**
 * Punto de entrada del servicio de búsqueda con Fast-Path en memoria y Vector Search de alta velocidad.
 */
export async function buscar(termino: string, usarIA: boolean): Promise<SearchResult> {
  const inicio = Date.now();
  const terminoLimpio = termino.trim();
  const queryNorm = normalizarTexto(terminoLimpio);
  const tokens = queryNorm.split(/\s+/);

  // Si la IA está deshabilitada o es código de barras numérico → Nivel 1 inmediato
  if (!usarIA || /^\d{6,}$/.test(terminoLimpio)) {
    const productos = await busquedaExacta(terminoLimpio);
    return { productos, nivel: 1, latencyMs: Date.now() - inicio };
  }

  // 1. Verificar si está en caché en memoria (Respuesta ultra-instantánea a 0ms)
  const cached = _rerankCache.get(queryNorm);
  if (cached && (Date.now() - cached.ts) < RERANK_CACHE_TTL_MS) {
    return { productos: cached.resultados, nivel: 2, latencyMs: Date.now() - inicio };
  }

  try {
    const docsData = await getProductosCollectionDocs();

    // 2. ⚡ FAST-PATH EN MEMORIA (< 5ms):
    // Si la consulta coincide con conceptos ontológicos (proteína, hidratación, desayuno, etc.)
    // o con nombres/marcas/etiquetas de productos, el ranking matemático en memoria es 100% exacto.
    const candidatosOnto = docsData
      .map(docSnap => {
        const data = typeof docSnap.data === 'function' ? docSnap.data() : (docSnap.data || docSnap);
        const productoId = docSnap.id || (docSnap.data ? docSnap.id : '');
        const producto = mapProducto(data, productoId);
        const scoreLexico = calcularScoreLexico(producto, queryNorm, tokens);
        const evalOnto = evaluarTierOntologico(producto, queryNorm, tokens);
        const scoreTotal = (evalOnto.boost * 2.0) + scoreLexico;
        return { producto, scoreTotal, tier: evalOnto.tier, scoreLexico };
      })
      .filter(item => item.scoreTotal > 0);

    const hayTier1 = candidatosOnto.some(c => c.tier === 1);
    const hayMatchNombreFuerte = candidatosOnto.some(c => c.scoreLexico >= 10);

    if (hayTier1 || hayMatchNombreFuerte) {
      candidatosOnto.sort((a, b) => {
        if (a.tier > 0 && b.tier > 0 && a.tier !== b.tier) return a.tier - b.tier;
        if (a.tier > 0 && b.tier === 0 && a.tier <= 2) return -1;
        if (b.tier > 0 && a.tier === 0 && b.tier <= 2) return 1;
        return b.scoreTotal - a.scoreTotal;
      });

      const fastResultados = mapearAFamilias(
        candidatosOnto.slice(0, 15).map(item => item.producto),
        docsData
      );
      setRerankCache(queryNorm, { resultados: fastResultados, ts: Date.now() });
      return { productos: fastResultados, nivel: 2, latencyMs: Date.now() - inicio };
    }

    // 3. ⚡ BÚSQUEDA SEMÁNTICA VECTORIAL (Para frases abstractas no ontológicas)
    const embedding = await generarEmbedding(terminoLimpio);

    const candidatosVectoriales = docsData
      .map(docSnap => {
        const data = typeof docSnap.data === 'function' ? docSnap.data() : (docSnap.data || docSnap);
        const productoId = docSnap.id || (docSnap.data ? docSnap.id : '');
        const producto = mapProducto(data, productoId);
        
        const scoreLexico = calcularScoreLexico(producto, queryNorm, tokens);
        const vec = extractEmbeddingArray(data.embedding);
        const scoreSemantico = vec ? cosineSimilarity(embedding, vec) : 0;
        const evalOnto = evaluarTierOntologico(producto, queryNorm, tokens);

        let scoreTotal = 0;
        if (evalOnto.tier > 0) {
          scoreTotal = evalOnto.boost + (scoreLexico * 2.0) + (scoreSemantico * 5.0);
        } else if (scoreLexico > 0) {
          scoreTotal = (scoreLexico * 3.0) + (scoreSemantico * 3.0);
        } else if (scoreSemantico >= 0.32) {
          scoreTotal = scoreSemantico * 5.0;
        }

        return { producto, scoreTotal, tier: evalOnto.tier };
      })
      .filter(item => item.scoreTotal > 0);

    candidatosVectoriales.sort((a, b) => {
      if (a.tier > 0 && b.tier > 0 && a.tier !== b.tier) return a.tier - b.tier;
      if (a.tier > 0 && b.tier === 0 && a.tier <= 2) return -1;
      if (b.tier > 0 && a.tier === 0 && b.tier <= 2) return 1;
      return b.scoreTotal - a.scoreTotal;
    });

    const finalResultados = mapearAFamilias(
      candidatosVectoriales.slice(0, 15).map(item => item.producto),
      docsData
    );

    if (finalResultados.length === 0) {
      const exactos = await busquedaExacta(terminoLimpio);
      return { productos: exactos, nivel: 1, latencyMs: Date.now() - inicio };
    }

    setRerankCache(queryNorm, { resultados: finalResultados, ts: Date.now() });
    return {
      productos: finalResultados,
      nivel: 2,
      latencyMs: Date.now() - inicio
    };
  } catch (err) {
    console.error('[RAG] Búsqueda híbrida falló, haciendo fallback a Nivel 1:', err);
    const productos = await busquedaExacta(terminoLimpio);
    return { productos, nivel: 1, latencyMs: Date.now() - inicio };
  }
}
