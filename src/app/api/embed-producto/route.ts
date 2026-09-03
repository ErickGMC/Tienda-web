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
 * Infiere conceptos clave y necesidades a partir del nombre y categoría del producto.
 */
function inferirConceptosSemanticos(nombre: string, categoria: string, desc: string): string[] {
  const texto = `${nombre} ${categoria} ${desc}`.toLowerCase();
  const conceptos: string[] = [];

  // Proteína
  if (texto.includes('pollo') || texto.includes('carne') || texto.includes('huevo') || texto.includes('queso') || texto.includes('pescado') || texto.includes('atun') || texto.includes('patasca') || texto.includes('carnero')) {
    conceptos.push('proteina', 'alimento proteico', 'desarrollo muscular', 'fuerza');
  }
  // Hidratación
  if (texto.includes('agua') || texto.includes('sporade') || texto.includes('gatorade') || texto.includes('rehidratante') || texto.includes('cielo') || texto.includes('mineral') || texto.includes('isotonica') || texto.includes('electrolito')) {
    conceptos.push('hidratacion', 'rehidratacion', 'calmar la sed', 'electrolitos', 'deporte');
  }
  // Desayuno
  if (texto.includes('pan') || texto.includes('leche') || texto.includes('huevo') || texto.includes('queso') || texto.includes('avena') || texto.includes('yogurt') || texto.includes('platano')) {
    conceptos.push('desayuno', 'primera comida del dia', 'manana');
  }
  // Almuerzo
  if (texto.includes('arroz') || texto.includes('fideo') || texto.includes('tallarin') || texto.includes('pollo') || texto.includes('menu') || texto.includes('aderezo') || texto.includes('papa') || texto.includes('lenteja')) {
    conceptos.push('almuerzo', 'segundo', 'comida criolla', 'guiso');
  }
  // Limpieza
  if (texto.includes('lejia') || texto.includes('clorox') || texto.includes('desinfectante') || texto.includes('limpieza') || texto.includes('cloro') || texto.includes('aseo')) {
    conceptos.push('limpieza', 'desinfeccion', 'aseo del hogar', 'higiene');
  }
  // Antojo / Dulce
  if (texto.includes('chocolate') || texto.includes('sublime') || texto.includes('galleta') || texto.includes('casino') || texto.includes('morocha') || texto.includes('lentejas') || texto.includes('dulce')) {
    conceptos.push('antojo dulce', 'snack', 'golosina', 'piqueo');
  }
  // Carbohidratos / Energía
  if (texto.includes('arroz') || texto.includes('fideo') || texto.includes('papa') || texto.includes('pan') || texto.includes('harina') || texto.includes('avena')) {
    conceptos.push('carbohidratos', 'energia');
  }

  return conceptos;
}

/**
 * Construye el texto enriquecido para generar el embedding.
 * IMPORTANTE: Formato estructurado y enriquecido ontológicamente para máxima precisión semántica.
 */
function construirTextoRAG(p: {
  nombre: string;
  categoria?: string;
  descripcion?: string;
  etiquetas?: unknown;
  unidadMedida?: string;
  disponible?: boolean;
  precio?: number;
  etiquetaVariante?: string;
  esPrincipalWeb?: boolean;
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

  const conceptos = inferirConceptosSemanticos(p.nombre, p.categoria || '', p.descripcion || '');
  if (conceptos.length > 0) {
    partes.push(`Necesidades y Conceptos: ${conceptos.join(', ')}`);
  }

  if (p.unidadMedida && p.unidadMedida !== 'unidad') {
    partes.push(`Unidad: ${p.unidadMedida}`);
  }

  if (p.etiquetaVariante) {
    partes.push(`Presentación / Variante: ${p.etiquetaVariante}`);
  }

  if (p.esPrincipalWeb) {
    partes.push(`Familia de productos con múltiples presentaciones`);
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

  const { productoId, nombre, descripcion, categoria, etiquetas, precio, unidadMedida, disponible, etiquetaVariante, esPrincipalWeb } = body;

  if (!productoId || typeof productoId !== 'string') {
    return NextResponse.json({ error: 'productoId es requerido' }, { status: 400 });
  }
  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
    return NextResponse.json({ error: 'nombre es requerido' }, { status: 400 });
  }

  // 2. Construir texto RAG
  const textoRAG = construirTextoRAG({ 
    nombre, 
    descripcion, 
    categoria, 
    etiquetas, 
    precio, 
    unidadMedida, 
    disponible, 
    etiquetaVariante, 
    esPrincipalWeb 
  });

  // 3. Generar embedding con Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  const modelo = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';

  if (!apiKey) {
    console.error('[embed-producto] GEMINI_API_KEY no configurada.');
    return NextResponse.json({ error: 'GEMINI_API_KEY no configurada' }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const embeddingModel = genAI.getGenerativeModel({ model: modelo });
    let embeddingValues: number[] = [];
    try {
      const result = await embeddingModel.embedContent({
        content: { role: 'user', parts: [{ text: textoRAG }] },
        outputDimensionality: 768
      } as any);
      embeddingValues = result.embedding.values.slice(0, 768);
    } catch {
      const fallback = await embeddingModel.embedContent(textoRAG);
      embeddingValues = fallback.embedding.values.slice(0, 768);
    }

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
