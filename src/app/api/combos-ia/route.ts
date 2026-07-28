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
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

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

    // 1.1 Rate Limiting por IP
    const clientIp = getClientIp(request);
    const limit = checkRateLimit(clientIp, 10, 60_000); // 10 peticiones/min por IP
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'RATE_LIMIT_EXCEEDED', mensaje: 'Demasiadas solicitudes. Por favor intente en un minuto.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { solicitud } = body;

    if (!solicitud || typeof solicitud !== 'string' || solicitud.trim().length < 5 || solicitud.length > 300) {
      return NextResponse.json({ error: 'Solicitud inválida (debe tener entre 5 y 300 caracteres)' }, { status: 400 });
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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[combos-ia] ❌ GEMINI_API_KEY no está configurada.');
      return NextResponse.json({ error: 'Servicio de IA deshabilitado' }, { status: 500 });
    }
    const genAI = new GoogleGenerativeAI(apiKey);

    const primaryModelName = process.env.GEMINI_GENERATIVE_MODEL || 'gemini-3.1-flash-lite';
    const fallbackModelName = process.env.GEMINI_FALLBACK_GENERATIVE_MODEL || 'gemini-3.5-flash-lite';

    const prompt = `
ROL Y PERSONAJE:
Eres un comerciante y chef experto nacido y criado en Lima, Perú. Conoces al detalle la cultura, costumbres, gastronomía criolla, modismos culinarios y hábitos de consumo del limeño de a pie.

OBJETIVO GENERAL:
Armar combos de compra 100% coherentes con las costumbres, cultura y tradición de Lima, Perú, respondiendo a CUALQUIER solicitud del cliente (recetas, almuerzos, desayunos, fiestas, loncheras escolares, limpieza de casa, ferretería, etc.).

SOLICITUD DEL CLIENTE:
"${solicitud}"

CATÁLOGO DISPONIBLE (solo usar estos productos):
${catalogoContexto}

MARCO DE IDENTIDAD CULTURAL Y COSTUMBRES LIMEÑAS (Aplica a CUALQUIER consulta de forma universal):

1. GASTRONOMÍA Y RECETAS LIMEÑAS CRIOLLAS:
   - Respetar la autenticidad estricta de la sazón criolla de Lima:
     * Los tuco y aderezos limeños tradicionales (Tallarines Rojos, Estofados, Secos) llevan infaltablemente "Laurel y Hongo" si está disponible en el catálogo.
     * NUNCA distorsionar las recetas criollas agregando insumos ajenos a la costumbre limeña (ej: En Lima los Tallarines Rojos JAMÁS llevan huevo duro; el Estofado NO lleva fideos ni zapallo; el Locro NO lleva tomate; la Huancaína NO lleva fideos).
     * Los guisos de almuerzo limeños (Estofado, Locro, Seco) se acompañan siempre con su Arroz Blanco de guarnición.

2. FIESTAS, EVENTOS Y LONCHERAS LIMEÑAS:
   - Cumpleaños / Fiestas infantiles: Involucran gaseosa (Inca Kola / Coca-Cola), galletas (Casino), jugos, yogurt o frutas (Plátano/Pera). NUNCA licores ni químicos de limpieza.
   - Lonchecito / Desayuno Limeño: Pan, queso fresco, huevo, leche/café, fruta.

3. HOGAR Y MULTISECTORIAL:
   - Limpieza y desinfección de casa: Usa lejía y detergente. NUNCA mezcles con alimentos no empacados ni sugieras lejía para aseo corporal.

4. REGLA DE DESCRIPCIÓN EXPLICITA:
   - MENCIONA Y JUSTIFICA en la "descripcion" (2-3 oraciones) CADA UNO de los productos incluidos en la lista "productos".
5. Presupuesto: Si el cliente menciona un presupuesto máximo, respétalo estrictamente.

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
      .map((item): ProductoCombo | null => {
        const prod = productosMap.get(item.id);
        if (!prod) return null;

        return {
          id: prod.id,
          nombre: prod.nombre,
          precio: prod.precio,
          cantidad: item.cantidad,
          subtotal: prod.precio * item.cantidad,
          imagenUrl: prod.imagenUrl,
        };
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
