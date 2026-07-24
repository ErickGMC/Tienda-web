/**
 * ragService.ts
 * Servicio de búsqueda semántica (RAG) para la Tienda Web.
 *
 * NIVELES DE BÚSQUEDA:
 *  Nivel 1 — Búsqueda exacta (Firestore query por nombre/código). Siempre activo. Costo $0.
 *  Nivel 2 — Búsqueda semántica (embedding + findNearest). Solo cuando IA está habilitada.
 *
 * La verificación de si la IA está habilitada se hace antes de llamar a este servicio
 * (en el API route), leyendo el documento `web_config/ia` en Firestore.
 */

import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  VectorValue,
  findNearest,
  DistanceMeasure,
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
}

// ── Utilidades ───────────────────────────────────────────────────────────────

/**
 * Mapea un documento de Firestore al tipo Producto del cliente.
 * Excluye el campo `embedding` (VectorValue) para no serializar un binario innecesario.
 */
function mapProducto(docData: any, id: string): Producto {
  const { embedding, ...rest } = docData;
  let etiquetas: string[] = [];
  if (Array.isArray(rest.etiquetas)) {
    etiquetas = rest.etiquetas;
  } else if (typeof rest.etiquetas === 'string') {
    try { etiquetas = JSON.parse(rest.etiquetas); } catch { etiquetas = []; }
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

/**
 * Lee la configuración de IA desde Firestore.
 * Retorna false si el documento no existe o hay error (fail-safe).
 */
export async function getIAConfig(): Promise<IAConfig> {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'web_config', 'ia'));
    if (snap.exists()) {
      return { iaBusquedaHabilitada: Boolean(snap.data()?.iaBusquedaHabilitada) };
    }
  } catch (e) {
    console.warn('[RAG] Error leyendo web_config/ia:', e);
  }
  return { iaBusquedaHabilitada: false };
}

// ── Nivel 1: Búsqueda Exacta ─────────────────────────────────────────────────

/**
 * Búsqueda de texto clásica por nombre del producto.
 * Utiliza un rango de Firestore para simular un LIKE `%term%` en el prefijo.
 * Costo: 0 créditos de IA.
 */
export async function busquedaExacta(termino: string, maxResultados = 8): Promise<Producto[]> {
  const terminoLower = termino.toLowerCase().trim();
  if (!terminoLower) return [];

  // Estrategia: rango de caracteres unicode para prefix-match en Firestore
  const inicio = terminoLower;
  const fin = terminoLower + '\uf8ff';

  const q = query(
    collection(db, 'productos'),
    where('disponible', '==', true),
    where('nombre', '>=', inicio),
    where('nombre', '<=', fin),
    orderBy('nombre'),
    limit(maxResultados)
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => mapProducto(d.data(), d.id));
}

// ── Nivel 2: Búsqueda Semántica (Vector Search) ───────────────────────────────

/**
 * Genera un embedding de 768 dimensiones usando la API de Gemini text-embedding-004.
 * Solo se llama desde Server Components / API Routes (no expone la API key al cliente).
 * @param texto Texto a vectorizar.
 * @returns Array de 768 floats.
 */
export async function generarEmbedding(texto: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  // gemini-embedding-001 es el sucesor de text-embedding-004 (deprecado)
  const modelo = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';

  if (!apiKey) throw new Error('[RAG] GEMINI_API_KEY no configurada en .env');

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const embeddingModel = genAI.getGenerativeModel({ model: modelo });

  const result = await embeddingModel.embedContent(texto);
  return result.embedding.values;
}

/**
 * Búsqueda vectorial usando `findNearest` de Firestore Native Vector Search.
 * Requiere que los productos tengan el campo `embedding` (VectorValue 768 dims) indexado.
 * @param queryEmbedding Vector de la consulta del usuario (768 dims).
 * @param maxResultados Número máximo de productos a retornar.
 */
export async function busquedaSemantica(
  queryEmbedding: number[],
  maxResultados = 6
): Promise<Producto[]> {
  const productosRef = collection(db, 'productos');

  const vectorQuery = findNearest(
    productosRef,
    'embedding',
    VectorValue.fromArray(queryEmbedding),
    {
      limit: maxResultados,
      distanceMeasure: DistanceMeasure.COSINE,
    }
  );

  const snap = await getDocs(vectorQuery);
  const resultados = snap.docs
    .map(d => mapProducto(d.data(), d.id))
    .filter(p => p.disponible); // Filtrado adicional de productos deshabilitados

  return resultados;
}

// ── Router Principal de Búsqueda ─────────────────────────────────────────────

/**
 * Punto de entrada del servicio de búsqueda.
 * Decide automáticamente qué nivel usar:
 *  - Si la consulta parece un código de barras o tiene <=2 palabras → Nivel 1 (exacta).
 *  - Si es una frase con intención → Nivel 2 (semántica, si IA habilitada).
 * @param termino Texto ingresado por el usuario.
 * @param usarIA Si false, fuerza siempre Nivel 1.
 */
export async function buscar(termino: string, usarIA: boolean): Promise<SearchResult> {
  const inicio = Date.now();
  const palabras = termino.trim().split(/\s+/);
  const esConsultaSimple = palabras.length <= 2 || /^\d{6,}$/.test(termino.trim());

  // Nivel 1 siempre si es consulta simple o IA apagada
  if (esConsultaSimple || !usarIA) {
    const productos = await busquedaExacta(termino);
    return { productos, nivel: 1, latencyMs: Date.now() - inicio };
  }

  // Nivel 2: Búsqueda Semántica
  try {
    const embedding = await generarEmbedding(termino);
    const productos = await busquedaSemantica(embedding);
    return { productos, nivel: 2, latencyMs: Date.now() - inicio };
  } catch (err) {
    console.error('[RAG] Nivel 2 falló, haciendo fallback a Nivel 1:', err);
    const productos = await busquedaExacta(termino);
    return { productos, nivel: 1, latencyMs: Date.now() - inicio };
  }
}
