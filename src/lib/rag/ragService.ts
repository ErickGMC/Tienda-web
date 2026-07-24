/**
 * ragService.ts
 * Servicio de búsqueda semántica (RAG) para la Tienda Web.
 *
 * NIVELES DE BÚSQUEDA:
 *  Nivel 1 — Búsqueda exacta (Firestore query por nombre/código). Siempre activo. Costo $0.
 *  Nivel 2 — Búsqueda semántica (embedding + findNearest con Firebase Admin SDK). Solo cuando IA está habilitada.
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
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Producto } from '@/types/producto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ── Tipos ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  productos: Producto[];
  nivel: 1 | 2;
  latencyMs: number;
}

export interface IAConfig {
  iaBusquedaHabilitada: boolean;
}

// ── Admin SDK Helper ─────────────────────────────────────────────────────────

function getAdminDb() {
  if (getApps().length === 0) {
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'minimarket-flor-8d7f9',
    });
  }
  return getFirestore();
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
    etiquetas = Object.values(rest.etiquetas).filter(e => typeof e === 'string');
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
    const adminDb = getAdminDb();
    const snap = await adminDb.collection('web_config').doc('ia').get();
    if (snap.exists) {
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
 * Costo: 0 créditos de IA.
 */
export async function busquedaExacta(termino: string, maxResultados = 8): Promise<Producto[]> {
  const terminoLower = termino.toLowerCase().trim();
  if (!terminoLower) return [];

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
 * Genera un embedding de 768 dimensiones usando la API de Gemini.
 */
export async function generarEmbedding(texto: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelo = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';

  if (!apiKey) throw new Error('[RAG] GEMINI_API_KEY no configurada en .env');

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const embeddingModel = genAI.getGenerativeModel({ model: modelo });

  const result = await embeddingModel.embedContent(texto);
  return result.embedding.values.slice(0, 768);
}

/**
 * Búsqueda vectorial usando `findNearest` de Firebase Admin SDK en el servidor.
 */
export async function busquedaSemantica(
  queryEmbedding: number[],
  maxResultados = 6
): Promise<Producto[]> {
  const adminDb = getAdminDb();
  const vectorQuery = adminDb.collection('productos').findNearest({
    vectorField: 'embedding',
    queryVector: FieldValue.vector(queryEmbedding.slice(0, 768)),
    limit: maxResultados,
    distanceMeasure: 'COSINE',
  });

  const snap = await vectorQuery.get();
  const resultados = snap.docs
    .map(d => mapProducto(d.data(), d.id))
    .filter(p => p.disponible);

  return resultados;
}

// ── Router Principal de Búsqueda ─────────────────────────────────────────────

/**
 * Punto de entrada del servicio de búsqueda.
 */
export async function buscar(termino: string, usarIA: boolean): Promise<SearchResult> {
  const inicio = Date.now();
  const palabras = termino.trim().split(/\s+/);
  const esConsultaSimple = palabras.length <= 2 || /^\d{6,}$/.test(termino.trim());

  if (esConsultaSimple || !usarIA) {
    const productos = await busquedaExacta(termino);
    return { productos, nivel: 1, latencyMs: Date.now() - inicio };
  }

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
