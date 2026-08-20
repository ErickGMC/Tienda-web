/**
 * ragService.ts
 * Servicio de búsqueda semántica (RAG) para la Tienda Web.
 *
 * NIVELES DE BÚSQUEDA:
 *  Nivel 1 — Búsqueda exacta (filtro en memoria sobre todos los productos disponibles). Costo $0.
 *  Nivel 2 — Búsqueda semántica (embedding Gemini + similitud coseno). Solo cuando IA está habilitada.
 *
 * OPTIMIZACIONES (v2):
 *  - IAConfig cacheada en memoria del servidor por 30 segundos → elimina llamada Firestore extra por búsqueda.
 *  - Dims completos: gemini-embedding-2 produce 3072 dims, se usan TODOS.
 *  - Ejecución paralela: embedding + getDocs se ejecutan con Promise.all.
 *  - Nivel 1 mejorado: filtra por nombre, descripción, categoría, etiquetas y código de barras.
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
        // Regla de negocio: los combos requieren que la búsqueda IA esté activa
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
  // Cachear el fallback también (TTL corto: 5s) para no martillar Firestore ante errores
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
 * Invalida el caché de productos manualmente si es necesario.
 */
export function invalidateProductosCache() {
  _productosCache = null;
  _productosCacheTs = 0;
}

// ── Normalización de Texto y Diccionario Peruano ──────────────────────────

/**
 * Normaliza cadenas quitando tildes, signos y espacios redundantes.
 */
export function normalizarTexto(texto: string): string {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita tildes: á->a, é->e, etc.
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Diccionario de modismos, jergas y sinónimos de compras habituales en Perú.
 */
const DICCIONARIO_PERUANO: Record<string, string[]> = {
  // Abarrotes y Almuerzo
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

  // Bebidas e Hidratación
  gaseosa: ['gaseosa', 'gaseosita', 'soda', 'refresco', 'inca kola', 'coca cola', 'kr', 'kola real', 'bebida'],
  agua: ['agua', 'cielo', 'mesa', 'mineral', 'hidratacion', 'botella'],
  rehidratante: ['sporade', 'gatorade', 'rehidratante', 'electrolitos', 'deporte', 'ejercicio', 'sudor', 'isotonica', 'bebida rehidratante'],
  aloe: ['aloe', 'sabila', 'bio', 'regenerador', 'saludable'],
  chela: ['cerveza', 'trago', 'bebidas', 'licor'],

  // Frutas y Verduras
  platano: ['platano', 'banana', 'seda', 'fruta', 'potasio'],
  pera: ['pera', 'fruta', 'frutas', 'jugosa'],
  papa: ['papa', 'papas', 'blanca', 'tuberculo', 'guarnicion', 'almuerzo'],
  cebolla: ['cebolla', 'aderezo', 'verdura'],
  tomate: ['tomate', 'ensalada', 'verdura'],
  zanahoria: ['zanahoria', 'verdura', 'hortaliza'],
  espinaca: ['espinaca', 'verdura', 'hojas'],
  zapallo: ['zapallo', 'macre', 'locro', 'sopa'],
  arveja: ['arveja', 'arvejita', 'legumbre', 'verdura'],

  // Desayuno / Lonche / Comidas Rápidas
  pan: ['pan', 'frances', 'desayuno', 'lonche', 'pancito'],
  patasca: ['patasca', 'sopa', 'mondongo', 'caldo'],
  carnero: ['carnero', 'caldo', 'sopa', 'cordero'],
  almuerzo: ['menu', 'almuerzo', 'comida', 'segundo', 'plato', 'pollo', 'arroz'],

  // Golosinas y Snacks
  galleta: ['galleta', 'galletas', 'casino', 'morochas', 'taco', 'rellena', 'snack', 'antojo'],
  chocolate: ['chocolate', 'sublime', 'nestle', 'cacao', 'antojo', 'dulce'],
  lentejitas: ['lentejas', 'confitadas', 'grageas', 'nestle', 'dulces', 'caramelo'],

  // Limpieza y Hogar
  lejia: ['clorox', 'lejia', 'desinfectante', 'limpieza', 'aseo', 'cloro'],
  cinta: ['cinta', 'aislante', 'ferreteria', 'electricidad']
};

/**
 * Calcula la puntuación léxica de un producto contra una consulta.
 */
function calcularScoreLexico(producto: Producto, queryNorm: string, tokens: string[]): number {
  const nombreNorm = normalizarTexto(producto.nombre);
  const descNorm = normalizarTexto(producto.descripcion || '');
  const catNorm = normalizarTexto(producto.categoria || '');
  const etiqsNorm = (producto.etiquetas || []).map(e => normalizarTexto(e));
  const codigo = String(producto.codigoBarras || '').trim();

  let score = 0;

  // 1. Coincidencia exacta de código de barras
  if (codigo && codigo === queryNorm) {
    return 15.0;
  }

  // 2. Coincidencia total o prefijo en el nombre
  if (nombreNorm === queryNorm) {
    score += 8.0;
  } else if (nombreNorm.startsWith(queryNorm)) {
    score += 5.5;
  } else if (nombreNorm.includes(queryNorm)) {
    score += 4.0;
  }

  // 3. Coincidencia por tokens individuales
  let tokensDirectosNombre = 0;
  let tokensSinonimosNombre = 0;
  let tokensOtros = 0;

  for (const token of tokens) {
    if (token.length < 2) continue;
    // Ignorar stop words comunes en español
    if (['de', 'la', 'el', 'en', 'para', 'con', 'un', 'una', 'los', 'las', 'del', 'al'].includes(token)) {
      continue;
    }

    // Coincidencia directa en el nombre
    if (nombreNorm.includes(token)) {
      tokensDirectosNombre++;
      if (nombreNorm.startsWith(token)) {
        tokensDirectosNombre += 0.5;
      }
    } else {
      // Coincidencia por sinónimos en el nombre
      let encontroSinonimo = false;
      for (const [clave, sinonimos] of Object.entries(DICCIONARIO_PERUANO)) {
        if (token === clave || sinonimos.includes(token)) {
          if (nombreNorm.includes(clave) || sinonimos.some(s => nombreNorm.includes(s))) {
            tokensSinonimosNombre++;
            encontroSinonimo = true;
            break;
          }
        }
      }

      // Si no fue en nombre, buscar en etiquetas, categoría y descripción
      if (!encontroSinonimo) {
        if (etiqsNorm.some(et => et.includes(token))) {
          tokensOtros += 1.0;
        } else if (catNorm.includes(token)) {
          tokensOtros += 0.7;
        } else if (descNorm.includes(token)) {
          tokensOtros += 0.3;
        }
      }
    }
  }

  score += (tokensDirectosNombre * 3.5);
  score += (tokensSinonimosNombre * 2.5);
  score += (tokensOtros * 0.8);

  return score;
}

// ── Nivel 1: Búsqueda Exacta / Léxica ─────────────────────────────────────────

/**
 * Búsqueda de texto por nombre, descripción, categoría y etiquetas con Reranking léxico.
 */
export async function busquedaExacta(termino: string, maxResultados = 8): Promise<Producto[]> {
  const queryNorm = normalizarTexto(termino);
  if (!queryNorm) return [];
  const tokens = queryNorm.split(/\s+/);

  try {
    const docsData = await getProductosCollectionDocs();
    const productosConScore = docsData
      .map(d => {
        const prod = mapProducto(d.data, d.id);
        const score = calcularScoreLexico(prod, queryNorm, tokens);
        return { prod, score };
      })
      .filter(item => item.prod.disponible && item.score > 0);

    productosConScore.sort((a, b) => b.score - a.score);

    return productosConScore.slice(0, maxResultados).map(item => item.prod);
  } catch (e) {
    console.error('[busquedaExacta] Error:', e);
    return [];
  }
}

// ── Utilidades RAG / Similitud Coseno ───────────────────────────────────────

/**
 * Extrae el array de floats de embedding sin importar cómo esté serializado en Firestore.
 * Soporta VectorValue, MapValue, ArrayValue, _values, etc.
 */
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

/**
 * Calcula la similitud coseno entre dos vectores numéricos.
 * Retorna un valor entre -1 y 1 (o 0 si vectores nulos).
 */
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

// ── Nivel 2: Búsqueda Semántica (Vector Search) ───────────────────────────────

/**
 * Genera un embedding usando la API de Gemini (768 dimensiones nativas).
 */
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
  } catch (e) {
    const fallback = await embeddingModel.embedContent(texto);
    return fallback.embedding.values.slice(0, 768);
  }
}

/**
 * Búsqueda vectorial sobre la colección cachead.
 */
export async function busquedaSemantica(
  queryEmbedding: number[],
  maxResultados = 6
): Promise<Producto[]> {
  try {
    const docsData = await getProductosCollectionDocs();
    return busquedaSemanticaConDocs(queryEmbedding, docsData, maxResultados);
  } catch (err: any) {
    console.error('[RAG] Fallback por similitud coseno falló:', err);
    return [];
  }
}

/**
 * Procesa los documentos cargados y calcula la similitud coseno de forma síncrona.
 */
export function busquedaSemanticaConDocs(
  queryEmbedding: number[],
  productosDocs: any[],
  maxResultados = 6
): Producto[] {
  const productosConScore = productosDocs
    .map(docSnap => {
      const data = typeof docSnap.data === 'function' ? docSnap.data() : (docSnap.data || docSnap);
      const productoId = docSnap.id || (docSnap.data ? docSnap.id : '');
      const producto = mapProducto(data, productoId);
      const vec = extractEmbeddingArray(data.embedding);
      const score = vec ? cosineSimilarity(queryEmbedding, vec) : 0;
      return { producto, score };
    })
    .filter(item => item.producto.disponible);

  productosConScore.sort((a, b) => b.score - a.score);

  // Retornar top resultados con umbral semántico de calidad
  const resultados = productosConScore
    .filter(item => item.score >= 0.46)
    .slice(0, maxResultados)
    .map(item => item.producto);

  if (resultados.length > 0) return resultados;

  // Fallback si ningún score superó 0.46 pero hay resultados disponibles
  return productosConScore.slice(0, Math.min(3, maxResultados)).map(item => item.producto);
}

// ── Router Principal de Búsqueda Híbrida ──────────────────────────────────────

/**
 * Punto de entrada del servicio de búsqueda con Fusión Híbrida y Reranking.
 */
export async function buscar(termino: string, usarIA: boolean): Promise<SearchResult> {
  const inicio = Date.now();
  const terminoLimpio = termino.trim();
  const queryNorm = normalizarTexto(terminoLimpio);
  const tokens = queryNorm.split(/\s+/);

  // Si la IA está deshabilitada o es código de barras numérico → Nivel 1
  if (!usarIA || /^\d{6,}$/.test(terminoLimpio)) {
    const productos = await busquedaExacta(terminoLimpio);
    return { productos, nivel: 1, latencyMs: Date.now() - inicio };
  }

  try {
    // ⚡ PARALELO: Gemini embedding + Productos cacheados en memoria
    const [embedding, docsData] = await Promise.all([
      generarEmbedding(terminoLimpio),
      getProductosCollectionDocs(),
    ]);

    // FUSIÓN HÍBRIDA: Calcular Score Léxico + Score Semántico
    const candidatos = docsData
      .map(docSnap => {
        const data = typeof docSnap.data === 'function' ? docSnap.data() : (docSnap.data || docSnap);
        const productoId = docSnap.id || (docSnap.data ? docSnap.id : '');
        const producto = mapProducto(data, productoId);
        
        const scoreLexico = calcularScoreLexico(producto, queryNorm, tokens);
        const vec = extractEmbeddingArray(data.embedding);
        const scoreSemantico = vec ? cosineSimilarity(embedding, vec) : 0;

        // Puntuación compuesta:
        // Si hay coincidencia de palabras/sinónimos directa, tiene prioridad dominante.
        // La semántica aporta desempate y relevancia contextual.
        let scoreTotal = 0;
        if (scoreLexico > 0) {
          scoreTotal = (scoreLexico * 2.5) + scoreSemantico;
        } else if (scoreSemantico >= 0.46) {
          scoreTotal = scoreSemantico;
        }

        return { producto, scoreTotal, scoreLexico, scoreSemantico };
      })
      .filter(item => item.producto.disponible && item.scoreTotal > 0);

    // Ordenar de mayor a menor relevancia
    candidatos.sort((a, b) => b.scoreTotal - a.scoreTotal);

    const productos = candidatos.slice(0, 8).map(item => item.producto);

    if (productos.length === 0) {
      const exactos = await busquedaExacta(terminoLimpio);
      return { productos: exactos, nivel: 1, latencyMs: Date.now() - inicio };
    }

    return { productos, nivel: 2, latencyMs: Date.now() - inicio };
  } catch (err) {
    console.error('[RAG] Búsqueda híbrida falló, haciendo fallback a Nivel 1:', err);
    const productos = await busquedaExacta(terminoLimpio);
    return { productos, nivel: 1, latencyMs: Date.now() - inicio };
  }
}
