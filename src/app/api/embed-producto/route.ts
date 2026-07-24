/**
 * API Route: /api/embed-producto
 * ================================================================
 * Genera el vector de embedding (768 dims) de un producto y lo
 * guarda en Firestore usando Firebase Admin SDK.
 *
 * Este endpoint es llamado automáticamente por el POS (firebaseSync.cjs)
 * después de sincronizar un producto a Firestore.
 *
 * POST /api/embed-producto
 * Headers: x-embed-secret: <EMBED_SECRET>
 * Body: {
 *   productoId: string,
 *   nombre: string,
 *   descripcion?: string,
 *   categoria?: string,
 *   etiquetas?: string[] | string,
 *   precio?: number,
 *   unidadMedida?: string,
 *   disponible?: boolean
 * }
 * ================================================================
 */

import { NextResponse } from 'next/server';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Next.js: máximo 30s para esta función serverless

// ── Helpers ────────────────────────────────────────────────────────────────────

function getAdminDb() {
  if (getApps().length === 0) {
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'minimarket-flor-8d7f9',
    });
  }
  return getFirestore();
}

/**
 * Parsea las etiquetas que pueden llegar como string JSON,
 * objeto, o array desde el POS.
 */
function parsearEtiquetas(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(e => typeof e === 'string');
  if (typeof raw === 'object') return Object.values(raw as Record<string, unknown>).filter(e => typeof e === 'string') as string[];
  if (typeof raw === 'string') {
    let val: unknown = raw;
    for (let i = 0; i < 5; i++) {
      try {
        val = JSON.parse(val as string);
        if (Array.isArray(val)) return (val as unknown[]).filter(e => typeof e === 'string') as string[];
        if (typeof val !== 'string') return [];
      } catch {
        return [];
      }
    }
  }
  return [];
}

/**
 * Construye el texto enriquecido para generar el embedding.
 * IMPORTANTE: Este formato debe ser idéntico al usado en el
 * script generate_embeddings.cjs para consistencia semántica.
 */
function construirTextoRAG(p: {
  nombre: string;
  categoria?: string;
  descripcion?: string;
  etiquetas?: unknown;
  unidadMedida?: string;
  disponible?: boolean;
  precio?: number;
}): string {
  const partes: string[] = [
    `Producto: ${p.nombre}`,
    `Categoría: ${p.categoria || 'Sin categoría'}`,
  ];

  if (p.descripcion && p.descripcion.trim()) {
    partes.push(`Descripción: ${p.descripcion.trim()}`);
  }

  const etiquetas = parsearEtiquetas(p.etiquetas);
  if (etiquetas.length > 0) {
    partes.push(`Etiquetas: ${etiquetas.join(', ')}`);
  }

  if (p.unidadMedida && p.unidadMedida !== 'unidad') {
    partes.push(`Unidad: ${p.unidadMedida}`);
  }

  partes.push(`Disponible: ${p.disponible !== false ? 'Sí' : 'No'}`);

  if (p.precio != null && Number(p.precio) > 0) {
    partes.push(`Precio: S/ ${Number(p.precio).toFixed(2)}`);
  }

  return partes.join('. ');
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1. Verificar secret de seguridad
  const embedSecret = process.env.EMBED_SECRET;
  const requestSecret = request.headers.get('x-embed-secret');

  if (embedSecret && requestSecret !== embedSecret) {
    console.warn('[embed-producto] Intento de acceso no autorizado.');
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { productoId, nombre, descripcion, categoria, etiquetas, precio, unidadMedida, disponible } = body;

  if (!productoId || typeof productoId !== 'string') {
    return NextResponse.json({ error: 'productoId es requerido' }, { status: 400 });
  }
  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
    return NextResponse.json({ error: 'nombre es requerido' }, { status: 400 });
  }

  // 2. Construir texto RAG
  const textoRAG = construirTextoRAG({ nombre, descripcion, categoria, etiquetas, precio, unidadMedida, disponible });

  // 3. Generar embedding con Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  const modelo = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';

  if (!apiKey) {
    console.error('[embed-producto] GEMINI_API_KEY no configurada.');
    return NextResponse.json({ error: 'GEMINI_API_KEY no configurada' }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const embeddingModel = genAI.getGenerativeModel({ model: modelo });
    const result = await embeddingModel.embedContent(textoRAG);
    const embeddingValues = result.embedding.values.slice(0, 768);

    // 4. Guardar en Firestore con Admin SDK
    const adminDb = getAdminDb();
    await adminDb.collection('productos').doc(productoId).update({
      texto_rag: textoRAG,
      embedding: FieldValue.vector(embeddingValues),
      embedding_generado_en: new Date().toISOString(),
    });

    console.log(`[embed-producto] ✅ Embedding de ${embeddingValues.length} dims guardado para: "${nombre}" (${productoId})`);

    return NextResponse.json({
      success: true,
      productoId,
      dims: embeddingValues.length,
      texto_rag: textoRAG,
    });
  } catch (err: any) {
    console.error(`[embed-producto] ❌ Error generando embedding para "${nombre}":`, err.message);
    return NextResponse.json(
      { error: 'Error generando embedding', detalle: err.message },
      { status: 500 }
    );
  }
}
