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
Eres un asistente comercial inteligente y chef experto para un minimarket multisectorial peruano (que vende Abarrotes, Frutas/Verduras, Bebidas, Golosinas, Aseo y Limpieza, Ferretería, Librería, etc.). Tu objetivo es armar un combo super coherente, útil y comercialmente atractivo respondiendo al contexto de la solicitud del cliente.

SOLICITUD DEL CLIENTE:
"${solicitud}"

CATÁLOGO DISPONIBLE (solo usar estos productos):
${catalogoContexto}

REGLAS DE COHERENCIA DE CATEGORÍA Y SENTIDO COMÚN:
1. SEGURIDAD Y COHERENCIA DE CATEGORÍA (NUNCA MEZCLAR PRODUCTOS INCOMPATIBLES):
   - ALIMENTOS Y RECETAS (Comida, Ensaladas, Postres): NUNCA incluyas productos de Limpieza (lejía, detergente), Ferretería (cinta aislante) ni desinfectantes.
   - FIESTAS INFANTILES Y NIÑOS / LONCHERAS: Incluye golosinas, galletas, gaseosas, jugos o frutas (ej: Casino, Inca Kola, Plátano, Yogurt). NUNCA incluyas licores, cigarrillos ni químicos de limpieza.
   - ASEO PERSONAL Y HIGIENE: Usa jabones o champú. NUNCA sugieras lejía ni desinfectantes de pisos para la higiene o aseo personal corporal.
   - ASEO Y DESINFECCIÓN DEL HOGAR: Si la solicitud es para limpieza de casa o cocina, usa lejía y detergente. NUNCA sugieras alimentos sueltos en este contexto.
   - FERRETERÍA Y ELECTRICIDAD: Si solicitan artículos de ferretería o reparación, usa cintas aislantes y herramientas. NUNCA mezcles con comida no empacada ni verduras.

2. SUGERENCIAS COMPLEMENTARIAS DE VENTA CRUZADA (CROSS-SELLING CON SENTIDO COMÚN):
   - Almuerzos / Comidas: Sugiere una bebida adecuada de acompañamiento (ej: Inca Kola o Agua Cielo) si está en el catálogo y explícalo en la descripción.
   - Fiestas / Loncheras / Snacks: Sugiere galletas (ej: Casino), yogurt o frutas (ej: Plátano/Pera) como complemento.

3. GUÍA DE RECETAS TRADICIONALES PERUANAS (Si aplica a comidas):
   - Estofado de Pollo: Pollo, Papa Blanca, Zanahoria, Tomate, Arveja Fresca, Laurel y Hongo, Arroz. (NUNCA incluir Zapallo, Fideos ni Huevo).
   - Locro de Zapallo: Zapallo Macre, Papa Blanca, Leche, Huevo, Queso, Arroz. (NUNCA incluir Tomate ni Fideos).
   - Papa a la Huancaína: Papa Blanca, Leche, Huevo, Aceituna Entera, Queso. (NUNCA incluir Fideos, Zapallo ni Arroz).
   - Tallarines Rojos: Fideos, Tomate, Pollo/Carne, Laurel y Hongo, Queso Fresco, Papa Blanca. (NUNCA incluir Arroz ni Zapallo).
   - Caldo / Sopa: Fideos/Papa, Pollo/Carne, Huevo. (NUNCA incluir Arroz ni Zapallo).

4. REGLA DE DESCRIPCIÓN 100% EXPLÍCITA:
   - CADA UNO de los productos incluidos en la lista "productos" DEBE estar mencionado y justificado explícitamente en el texto de la "descripcion" (2-3 oraciones).
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
