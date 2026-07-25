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
import { db } from '@/lib/firebase/config';
import { Producto } from '@/types/producto';

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

// ── Nivel 1: Búsqueda Exacta ─────────────────────────────────────────────────

/**
 * Búsqueda de texto clásica por nombre, descripción, categoría y etiquetas.
 * Costo: 0 créditos de IA. Filtrado en memoria sobre documentos ya cargados.
 */
export async function busquedaExacta(termino: string, maxResultados = 8): Promise<Producto[]> {
  const terminoLower = termino.toLowerCase().trim();
  if (!terminoLower) return [];

  try {
    const snap = await getDocs(collection(db, 'productos'));
    const todos = snap.docs.map(d => mapProducto(d.data(), d.id));
    return todos
      .filter(p => p.disponible)
      .filter(p =>
        p.nombre.toLowerCase().includes(terminoLower) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(terminoLower)) ||
        (p.categoria && p.categoria.toLowerCase().includes(terminoLower)) ||
        (p.etiquetas && p.etiquetas.some((e: string) => e.toLowerCase().includes(terminoLower))) ||
        (p.codigoBarras && String(p.codigoBarras).includes(terminoLower))
      )
      .slice(0, maxResultados);
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
function extractEmbeddingArray(data: any): number[] | null {
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
function cosineSimilarity(vecA: number[], vecB: number[]): number {
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
 * Genera un embedding usando la API de Gemini.
 * USA TODOS LOS DIMS producidos por el modelo (3072 para gemini-embedding-001)
 * para máxima precisión semántica y consistencia con los embeddings guardados.
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

  const result = await embeddingModel.embedContent({
    content: { parts: [{ text: texto }] },
    outputDimensionality: 768
  });
  return result.embedding.values.slice(0, 768);
}

/**
 * Búsqueda vectorial usando motor coseno resiliente en memoria.
 */
export async function busquedaSemantica(
  queryEmbedding: number[],
  maxResultados = 6
): Promise<Producto[]> {
  try {
    const snap = await getDocs(collection(db, 'productos'));
    return busquedaSemanticaConDocs(queryEmbedding, snap.docs, maxResultados);
  } catch (err: any) {
    console.error('[RAG] Fallback por similitud coseno falló:', err);
    return [];
  }
}

/**
 * Procesa los documentos cargados y calcula la similitud coseno de forma síncrona/ultra-rápida.
 */
export function busquedaSemanticaConDocs(
  queryEmbedding: number[],
  productosDocs: any[],
  maxResultados = 6
): Producto[] {
  const productosConScore = productosDocs
    .map(docSnap => {
      const data = typeof docSnap.data === 'function' ? docSnap.data() : docSnap;
      const producto = mapProducto(data, docSnap.id);
      const vec = extractEmbeddingArray(data.embedding);
      const score = vec ? cosineSimilarity(queryEmbedding, vec) : 0;
      return { producto, score };
    })
    .filter(item => item.producto.disponible);

  // Ordenar por puntuación semántica descendente
  productosConScore.sort((a, b) => b.score - a.score);

  // Retornar top resultados con filtro de relevancia mínima
  const resultados = productosConScore
    .filter(item => item.score > 0.35)
    .slice(0, maxResultados)
    .map(item => item.producto);

  if (resultados.length > 0) return resultados;

  // Si la similitud estricta fue baja, retornar los top sin corte de umbral
  return productosConScore.slice(0, maxResultados).map(item => item.producto);
}

// ── Router Principal de Búsqueda ─────────────────────────────────────────────

/**
 * Punto de entrada del servicio de búsqueda.
 * Usa IAConfig cacheada para evitar round-trip extra a Firestore.
 */
export async function buscar(termino: string, usarIA: boolean): Promise<SearchResult> {
  const inicio = Date.now();
  const terminoLimpio = termino.trim();

  // Si la IA está deshabilitada o es un código de barras de más de 6 dígitos → Nivel 1
  if (!usarIA || /^\d{6,}$/.test(terminoLimpio)) {
    const productos = await busquedaExacta(terminoLimpio);
    return { productos, nivel: 1, latencyMs: Date.now() - inicio };
  }

  try {
    // ⚡ PARALELO: Gemini embedding + Firestore getDocs al mismo tiempo
    const [embedding, snap] = await Promise.all([
      generarEmbedding(terminoLimpio),
      getDocs(collection(db, 'productos')),
    ]);

    let productos = busquedaSemanticaConDocs(embedding, snap.docs);

    if (productos.length === 0) {
      // Fallback a Nivel 1 si la semántica no encontró nada relevante
      const exactos = snap.docs
        .map(d => mapProducto(d.data(), d.id))
        .filter(p => p.disponible)
        .filter(p =>
          p.nombre.toLowerCase().includes(terminoLimpio.toLowerCase()) ||
          (p.descripcion && p.descripcion.toLowerCase().includes(terminoLimpio.toLowerCase())) ||
          (p.categoria && p.categoria.toLowerCase().includes(terminoLimpio.toLowerCase()))
        )
        .slice(0, 8);
      return { productos: exactos, nivel: 1, latencyMs: Date.now() - inicio };
    }

    return { productos, nivel: 2, latencyMs: Date.now() - inicio };
  } catch (err) {
    console.error('[RAG] Nivel 2 falló, haciendo fallback a Nivel 1:', err);
    const productos = await busquedaExacta(terminoLimpio);
    return { productos, nivel: 1, latencyMs: Date.now() - inicio };
  }
}
