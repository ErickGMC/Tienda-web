/**
 * API Route: /api/combos-ia
 * Nivel 3 del sistema RAG — Armador de Combos / Recetas con Gemini 1.5 Flash.
 *
 * POST /api/combos-ia
 * Body: { solicitud: string }
 * Ejemplo: { solicitud: "Armame una lonchera escolar para 3 días con S/ 25" }
 *
 * Response:
 * {
 *   titulo: string,               // "Lonchera Escolar 3 Días"
 *   descripcion: string,          // Texto de contexto de la IA
 *   productos: ProductoCombo[],   // Lista de productos con cantidad y subtotal
 *   totalEstimado: number,        // Suma de precios
 *   disponible: boolean           // Si todos están en stock
 * }
 *
 * Si la IA está deshabilitada → retorna { error: 'IA_DISABLED' }
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getIAConfig, generarEmbedding, busquedaSemantica } from '@/lib/rag/ragService';

export interface ProductoCombo {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
  imagenUrl?: string;
}

export interface ComboResponse {
  titulo: string;
  descripcion: string;
  productos: ProductoCombo[];
  totalEstimado: number;
}

export async function POST(request: Request) {
  try {
    // 1. Verificar si la IA está habilitada desde el POS
    const iaConfig = await getIAConfig();
    if (!iaConfig.iaBusquedaHabilitada) {
      return NextResponse.json({ error: 'IA_DISABLED', mensaje: 'El servicio de IA está temporalmente deshabilitado.' }, { status: 503 });
    }

    const body = await request.json();
    const { solicitud } = body;

    if (!solicitud || typeof solicitud !== 'string' || solicitud.trim().length < 5) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
    }

    // 2. Generar embedding de la solicitud y recuperar productos relevantes
    const embedding = await generarEmbedding(solicitud);
    const productosRelevantes = await busquedaSemantica(embedding, 12);

    if (productosRelevantes.length === 0) {
      return NextResponse.json({
        titulo: 'Sin resultados',
        descripcion: 'No encontramos productos disponibles para tu solicitud en este momento.',
        productos: [],
        totalEstimado: 0,
      } as ComboResponse);
    }

    // 3. Construir contexto del catálogo para el LLM
    const catalogoContexto = productosRelevantes
      .filter(p => p.disponible && (p.stock ?? 1) > 0)
      .map(p =>
        `- ID: ${p.id} | ${p.nombre} | Precio: S/ ${p.precio.toFixed(2)} | Stock: ${p.stock ?? 'disponible'} | Categoría: ${p.categoria}`
      )
      .join('\n');

    // 4. Invocar Gemini 1.5 Flash para armar el combo
    const apiKey = process.env.GEMINI_API_KEY!;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_GENERATIVE_MODEL || 'gemini-1.5-flash',
    });

    const prompt = `
Eres el asistente de compras de un minimarket peruano.
Tu tarea es armar un combo de productos basado en la solicitud del cliente, usando solo los productos del catálogo disponible.

SOLICITUD DEL CLIENTE:
"${solicitud}"

CATÁLOGO DISPONIBLE (solo usar estos productos):
${catalogoContexto}

INSTRUCCIONES:
- Elige los productos más adecuados para satisfacer la solicitud.
- Respeta el presupuesto si el cliente lo menciona.
- Responde ÚNICAMENTE con un JSON válido con esta estructura exacta (sin texto adicional):
{
  "titulo": "Nombre corto del combo (máx 5 palabras)",
  "descripcion": "Descripción breve y atractiva del combo (1-2 oraciones)",
  "productos": [
    { "id": "ID_DEL_PRODUCTO", "cantidad": 1 }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();

    // 5. Parsear respuesta JSON del LLM (con limpieza de markdown blocks)
    const jsonStr = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let llmResponse: { titulo: string; descripcion: string; productos: { id: string; cantidad: number }[] };

    try {
      llmResponse = JSON.parse(jsonStr);
    } catch {
      console.error('[combos-ia] Error parseando JSON del LLM:', jsonStr);
      return NextResponse.json({ error: 'Error al procesar la respuesta de la IA' }, { status: 500 });
    }

    // 6. Mapear productos del LLM con datos reales de Firestore
    const productosMap = new Map(productosRelevantes.map(p => [p.id, p]));
    const productosCombo: ProductoCombo[] = llmResponse.productos
      .map(item => {
        const prod = productosMap.get(item.id);
        if (!prod) return null;
        return {
          id: prod.id,
          nombre: prod.nombre,
          precio: prod.precio,
          cantidad: item.cantidad,
          subtotal: prod.precio * item.cantidad,
          imagenUrl: prod.imagenUrl,
        } as ProductoCombo;
      })
      .filter((p): p is ProductoCombo => p !== null);

    const totalEstimado = productosCombo.reduce((acc, p) => acc + p.subtotal, 0);

    const response: ComboResponse = {
      titulo: llmResponse.titulo,
      descripcion: llmResponse.descripcion,
      productos: productosCombo,
      totalEstimado,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API /combos-ia] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', detalle: error.message },
      { status: 500 }
    );
  }
}
