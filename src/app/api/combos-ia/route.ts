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

    const primaryModelName = process.env.GEMINI_GENERATIVE_MODEL || 'gemini-2.5-flash';
    const fallbackModelName = process.env.GEMINI_FALLBACK_GENERATIVE_MODEL || 'gemini-2.0-flash';

    const prompt = `
ROL Y PERSONAJE:
Eres el casero de confianza y comerciante experto de Minimarket Flor, una bodega peruana de barrio. Conoces al detalle las costumbres de las familias peruanas, la gastronomía criolla, los desayunos de domingo, los lonches, las loncheras de colegio, las reuniones familiares y los hábitos de compra del vecino de a pie.

OBJETIVO GENERAL:
Armar combos de compra 100% coherentes con las costumbres, cultura y tradición del Perú, respondiendo a la solicitud del cliente (recetas criollas, almuerzos, desayunos, fiestas, loncheras escolares, piqueos, limpieza de casa, etc.).

SOLICITUD DEL CLIENTE:
"${solicitud}"

CATÁLOGO DISPONIBLE EN MINIMARKET FLOR (Usa EXCLUSIVAMENTE estos productos con sus IDs exactos):
${catalogoContexto}

MARCO DE IDENTIDAD CULTURAL Y COSTUMBRES PERUANAS:
1. GASTRONOMÍA Y RECETAS CRIOLLAS:
   - Respetar la autenticidad de la sazón criolla:
     * Los tuco y aderezos tradicionales (Tallarines Rojos, Estofados, Secos) llevan infaltablemente "Laurel y Hongo", cebolla, tomate y sal.
     * Los guisos de almuerzo (Estofado, Guiso de pollo, Seco) se acompañan con su Arroz Blanco (Faraón) o Papa Blanca de guarnición.
     * NUNCA distorsionar recetas criollas agregando insumos extraños.
2. DESAYUNO DE BARRIO / DOMINGO:
   - Pan francés, queso fresco, huevos de gallina, leche Gloria, plátano de seda / fruta.
3. LONCHE TRADICIONAL / ANTOJO DE TARDE:
   - Pan francés, queso, galletas (Casino, Morochas), yogurt Gloria, chocolate Sublime, leche.
4. FIESTAS / PIQUEOS / REUNIONES / NOCHE DE PELÍCULAS:
   - Gaseosa (Inca Kola, KR), galletas rellenas Casino, chocolate Sublime, Lentejas Nestlé.
5. DEPORTE / CALOR / REHIDRATACIÓN:
   - Sporade, Agua de Mesa Cielo, Bio Bebida de Aloe.
6. LIMPIEZA DEL HOGAR:
   - Clorox Lejía.
7. REGLAS ESTRICTAS DE CANTIDADES Y UNIDADES:
   - 'cantidad' representa el número de unidades/paquetes a comprar (número entero entre 1 y 8).
   - NUNCA uses cantidades en gramos como 250 o 500. Si el producto cuesta S/ 18, cantidad: 1 significa 1 porción/paquete.
8. PRESUPUESTO:
   - Si el cliente menciona un presupuesto máximo (ej. S/ 20 o S/ 30), el costo total calculado sumando (precio * cantidad) DEBE ser igual o menor al presupuesto.
9. DESCRIPCIÓN CERCANA Y CRIOLLA:
   - Escribe una explicación cálida, de "casero de confianza" (2-3 oraciones), mencionando cómo disfrutar o combinar los productos elegidos.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta (sin bloques de código markdown ni texto adicional):
{
  "titulo": "Título atractivo y criollo (máx 5 palabras)",
  "descripcion": "Descripción cálida y explicativa de los productos y su uso (2-3 oraciones).",
  "productos": [
    { "id": "ID_EXACTO_DEL_CATALOGO", "nombre": "Nombre del producto", "cantidad": 1 }
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
    let llmResponse: { titulo: string; descripcion: string; productos: { id: string; nombre?: string; cantidad: number }[] };

    try {
      llmResponse = JSON.parse(jsonStr);
    } catch {
      console.error('[combos-ia] Error parseando JSON del LLM:', jsonStr);
      return NextResponse.json({ error: 'Error al procesar la respuesta de la IA' }, { status: 500 });
    }

    // 6. Mapear productos del LLM con datos reales de Firestore (Lookup ultra-resiliente por ID o Nombre)
    const productosById = new Map(productosRelevantes.map(p => [p.id, p]));
    const productosByName = new Map(productosRelevantes.map(p => [p.nombre.toLowerCase().trim(), p]));

    const productosCombo: ProductoCombo[] = llmResponse.productos
      .map((item): ProductoCombo | null => {
        let prod = productosById.get(item.id);
        
        // Fallback por nombre si el LLM tuvo un error en un caracter del ID
        if (!prod && item.nombre) {
          prod = productosByName.get(item.nombre.toLowerCase().trim());
        }
        if (!prod && item.nombre) {
          // Búsqueda por inclusión de substring
          const itemNombreNorm = item.nombre.toLowerCase();
          prod = productosRelevantes.find(p => 
            p.nombre.toLowerCase().includes(itemNombreNorm) || 
            itemNombreNorm.includes(p.nombre.toLowerCase())
          );
        }

        if (!prod) return null;

        // Normalizar cantidad a rango seguro (mín 1, máx 10 unidades para evitar errores de gramos)
        let cantidad = Number(item.cantidad) || 1;
        if (cantidad > 10) cantidad = 1;
        if (cantidad < 1) cantidad = 1;

        return {
          id: prod.id,
          nombre: prod.nombre,
          precio: prod.precio,
          cantidad,
          subtotal: prod.precio * cantidad,
          imagenUrl: prod.imagenUrl,
        };
      })
      .filter((p): p is ProductoCombo => p !== null);

    const totalEstimado = productosCombo.reduce((acc, p) => acc + p.subtotal, 0);

    const response: ComboResponse = {
      titulo: llmResponse.titulo || 'Combo Personalizado',
      descripcion: llmResponse.descripcion || 'Productos seleccionados según tu solicitud.',
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
