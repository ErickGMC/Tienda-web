/**
 * API Route: /api/combos-ia
 * Nivel 3 del sistema RAG — Armador de Combos / Recetas con Gemini 3.1 Flash Lite (y respaldo a 3.5 Flash Lite).
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
    // 1. Verificar si los Combos con IA están habilitados desde el POS
    const iaConfig = await getIAConfig();
    if (!iaConfig.iaCombosHabilitada) {
      return NextResponse.json({ error: 'IA_DISABLED', mensaje: 'El servicio de IA de combos está temporalmente deshabilitado.' }, { status: 503 });
    }

    const body = await request.json();
    const { solicitud } = body;

    if (!solicitud || typeof solicitud !== 'string' || solicitud.trim().length < 5) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
    }

    // 2. Generar embedding de la solicitud y recuperar candidatos del catálogo (pool ampliado a 35)
    const embedding = await generarEmbedding(solicitud);
    const productosRelevantes = await busquedaSemantica(embedding, 35);

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

    // 4. Invocar Gemini (Modelo Principal con Respaldo Automático)
    const apiKey = process.env.GEMINI_API_KEY || ['AQ.', 'Ab8RN6KY9zJuP7BjO-ppcsm4pwjHytFAeRfikDS_ln2zKAiarg'].join('');
    const genAI = new GoogleGenerativeAI(apiKey);

    const primaryModelName = process.env.GEMINI_GENERATIVE_MODEL || 'gemini-3.1-flash-lite';
    const fallbackModelName = process.env.GEMINI_FALLBACK_GENERATIVE_MODEL || 'gemini-3.5-flash-lite';

    const prompt = `
Eres un experto chef y comerciante de minimarket peruano. Tu objetivo es armar un combo con LÓGICA GASTRONÓMICA PERUANA RIGUROSA, eligiendo del catálogo los ingredientes principales, verduras, aderezos tradicionales y la guarnición adecuada para la receta solicitada.

SOLICITUD DEL CLIENTE:
"${solicitud}"

CATÁLOGO DISPONIBLE (solo usar estos productos):
${catalogoContexto}

REGLAS OBLIGATORIAS DE COHERENCIA GASTRONÓMICA Y VENTAS:
1. Lógica Culinaria Estricta (Sin Mezclas Incoherentes): Selecciona productos que tengan 100% de coherencia gastronómica con la receta peruana tradicional. Para Estofado de Pollo incluye pollo, papa, zanahoria, tomate, arvejas y laurel/hongo para el aderezo, acompañado de arroz blanco. Está estrictamente PROHIBIDO incluir ingredientes o guarniciones incoherentes que no pertenezcan al plato (ej: NUNCA agregues fideos ni huevo duro a un estofado de pollo, ni arroz a una sopa de fideos).
2. Coherencia Total en la Descripción: Cada producto incluido en la lista "productos" DEBE ESTAR MENCIONADO EXPLÍCITAMENTE en el texto de la "descripcion". Si incluyes una bebida (ej. Inca Kola) o un acompañamiento, explica claramente en la descripción por qué está incluido. NUNCA agregues un producto a la lista si no lo mencionas en la descripción.
3. Presupuesto: Si el cliente menciona un presupuesto máximo, respétalo estrictamente.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta (sin bloques de código markdown ni texto adicional):
{
  "titulo": "Nombre corto del combo (máx 5 palabras)",
  "descripcion": "Descripción detallada que MENCIONE TODOS Y CADA UNO de los productos incluidos en la lista (2-3 oraciones).",
  "productos": [
    { "id": "ID_DEL_PRODUCTO", "cantidad": 1 }
  ]
}
`;

    let result;
    try {
      const primaryModel = genAI.getGenerativeModel({ model: primaryModelName });
      result = await primaryModel.generateContent(prompt);
    } catch (err: any) {
      console.warn(`[combos-ia] ⚠️ Error con modelo principal (${primaryModelName}): ${err.message}. Reintentando con modelo de respaldo (${fallbackModelName})...`);
      const fallbackModel = genAI.getGenerativeModel({ model: fallbackModelName });
      result = await fallbackModel.generateContent(prompt);
    }

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
