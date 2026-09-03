/**
 * API Route: /api/combos-ia
 * Nivel 3 del sistema RAG — Armador de Combos / Recetas con Gemini con ordenamiento estricto por relevancia.
 *
 * POST /api/combos-ia
 * Body: { solicitud: string }
 * Ejemplo: { solicitud: "Armame una lonchera escolar para 3 días con S/ 25" }
 *
 * Response:
 * {
 *   titulo: string,               // "Lonchera Escolar 3 Días"
 *   descripcion: string,          // Texto de contexto de la IA
 *   productos: ProductoCombo[],   // Lista de productos ordenados con prioridad a los más directamente relacionados
 *   totalEstimado: number,        // Suma de precios
 *   disponible: boolean           // Si todos están en stock
 * }
 *
 * Si la IA está deshabilitada → retorna { error: 'IA_DISABLED' }
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  getIAConfig, 
  generarEmbedding, 
  busquedaSemantica, 
  busquedaExacta,
  evaluarTierOntologico, 
  normalizarTexto 
} from '@/lib/rag/ragService';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { Producto } from '@/types/producto';

export interface ProductoCombo {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
  imagenUrl?: string;
  tier?: number;
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

    const solicitudLimpia = solicitud.trim();
    const queryNorm = normalizarTexto(solicitudLimpia);
    const tokens = queryNorm.split(/\s+/);

    // 2. Recuperación híbrida de candidatos (vectorial semántica + ontológica léxica)
    const [embedding, exactos] = await Promise.all([
      generarEmbedding(solicitudLimpia),
      busquedaExacta(solicitudLimpia, 20),
    ]);

    const semanticos = await busquedaSemantica(embedding, 35, solicitudLimpia);

    // Unificar y desduplicar candidatos
    const mapaCandidatos = new Map<string, Producto>();
    for (const p of exactos) mapaCandidatos.set(p.id, p);
    for (const p of semanticos) mapaCandidatos.set(p.id, p);

    const productosRelevantes = Array.from(mapaCandidatos.values());

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

    const generarComboAlgoritmico = () => {
      const topProds = productosRelevantes
        .filter(p => p.disponible && (p.stock ?? 1) > 0)
        .slice(0, 5);
      
      const productosCombo: ProductoCombo[] = topProds.map(prod => ({
        id: prod.id,
        nombre: prod.nombre,
        precio: prod.precio,
        cantidad: 1,
        subtotal: prod.precio,
        imagenUrl: prod.imagenUrl,
        tier: 1
      }));

      const totalEstimado = productosCombo.reduce((acc, p) => acc + p.subtotal, 0);

      return NextResponse.json({
        titulo: `Combo: ${solicitudLimpia.slice(0, 25)}`,
        descripcion: 'Seleccionamos los productos más recomendados y disponibles en bodega para tu pedido.',
        productos: productosCombo,
        totalEstimado: Math.round(totalEstimado * 100) / 100,
      } as ComboResponse);
    };

    // 4. Invocar Gemini (Modelo Principal con Respaldo Automático)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[combos-ia] ⚠️ GEMINI_API_KEY no está configurada. Usando fallback algorítmico.');
      return generarComboAlgoritmico();
    }
    const genAI = new GoogleGenerativeAI(apiKey);

    const primaryModelName = process.env.GEMINI_GENERATIVE_MODEL || 'gemini-2.5-flash';
    const fallbackModelName = process.env.GEMINI_FALLBACK_GENERATIVE_MODEL || 'gemini-2.0-flash';

    const prompt = `
ROL Y PERSONAJE:
Eres el casero de confianza y comerciante experto de Minimarket Flor, una bodega peruana de barrio. Conoces al detalle las costumbres de las familias peruanas, la gastronomía criolla, los desayunos de domingo, los lonches, las loncheras de colegio, las reuniones familiares y los hábitos de compra del vecino de a pie.

OBJETIVO GENERAL:
Armar combos de compra 100% coherentes con las costumbres, cultura y tradición del Perú, respondiendo con la máxima precisión y jerarquía a la solicitud del cliente.

SOLICITUD DEL CLIENTE:
"${solicitudLimpia}"

CATÁLOGO DISPONIBLE EN MINIMARKET FLOR (Usa EXCLUSIVAMENTE estos productos con sus IDs exactos):
${catalogoContexto}

REGLAS DE ORO Y PRIORIZACIÓN ESTRICTA:
1. ORDENAMIENTO OBLIGATORIO DE PRODUCTOS:
   - Coloca OBLIGATORIAMENTE en las PRIMERAS posiciones del array "productos" aquellos que satisfacen de forma DIRECTA, PRINCIPAL e INMEDIATA la consulta del cliente:
     * Si pide "hidratación" o "deporte" -> Bebidas isotónicas/rehidratantes (Sporade, Gatorade) y Agua de Mesa DEBEN ser los PRIMEROS.
     * Si pide "proteína" o "desarrollo muscular" -> Carnes, Pollo, Huevos de gallina y Queso DEBEN ser los PRIMEROS.
     * Si pide "desayuno" -> Pan francés, Huevos, Queso fresco, Leche Gloria y Plátano DEBEN ser los PRIMEROS.
     * Si pide "almuerzo criollo" / "receta" -> El plato principal (Pollo, Arroz Blanco, Fideos, Aderezo Laurel y Hongo) DEBE ir PRIMERO.
     * Si pide "antojo" o "dulce" -> Chocolates (Sublime), Galletas (Casino, Morochas) y Lentejitas DEBEN ser los PRIMEROS.
     * Si pide "limpieza" -> Lejía Clorox y desinfectantes DEBEN ser los PRIMEROS.
   - Los productos de guarnición, complementos menores o aderezos secundarios deben colocarse estrictamente DESPUÉS de los productos principales.

2. GASTRONOMÍA Y RECETAS CRIOLLAS:
   - Respetar la autenticidad criolla: Tallarines Rojos/Guisos llevan "Laurel y Hongo", cebolla, tomate, sal. Arroz Blanco Faraón o Papa Blanca de guarnición.

3. CANTIDADES Y UNIDADES:
   - 'cantidad' representa el número de unidades/paquetes (entero entre 1 y 8). NUNCA uses gramos como 250 o 500.

4. PRESUPUESTO:
   - Si el cliente menciona un presupuesto máximo (ej. S/ 20 o S/ 30), el total calculado sumando (precio * cantidad) DEBE ser menor o igual al monto indicado.

5. DESCRIPCIÓN CERCANA Y CRIOLLA:
   - Escribe una explicación cálida (2-3 oraciones), explicando por qué estos productos son ideales para su necesidad y cómo combinarlos.

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
      try {
        const fallbackModel = genAI.getGenerativeModel({ model: fallbackModelName });
        result = await fallbackModel.generateContent(prompt);
      } catch (fallbackErr: any) {
        console.warn(`[combos-ia] ⚠️ Modelos LLM no disponibles. Aplicando fallback algorítmico: ${fallbackErr.message}`);
        return generarComboAlgoritmico();
      }
    }

    const rawText = result.response.text().trim();

    // 5. Parsear respuesta JSON del LLM (con limpieza de markdown blocks)
    const jsonStr = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let llmResponse: { titulo: string; descripcion: string; productos: { id: string; nombre?: string; cantidad: number }[] };

    try {
      llmResponse = JSON.parse(jsonStr);
    } catch {
      console.error('[combos-ia] Error parseando JSON del LLM:', jsonStr);
      return generarComboAlgoritmico();
    }

    // 6. Mapear productos del LLM con datos reales de Firestore (Lookup ultra-resiliente por ID o Nombre)
    const productosById = new Map(productosRelevantes.map(p => [p.id, p]));
    const productosByName = new Map(productosRelevantes.map(p => [p.nombre.toLowerCase().trim(), p]));

    const productosCombo: ProductoCombo[] = llmResponse.productos
      .map((item, originalIndex): ProductoCombo | null => {
        let prod = productosById.get(item.id);
        
        // Fallback por nombre si el LLM tuvo un error en un caracter del ID
        if (!prod && item.nombre) {
          prod = productosByName.get(item.nombre.toLowerCase().trim());
        }
        if (!prod && item.nombre) {
          const itemNombreNorm = item.nombre.toLowerCase();
          prod = productosRelevantes.find(p => 
            p.nombre.toLowerCase().includes(itemNombreNorm) || 
            itemNombreNorm.includes(p.nombre.toLowerCase())
          );
        }

        if (!prod) return null;

        // Normalizar cantidad a rango seguro
        let cantidad = Number(item.cantidad) || 1;
        if (cantidad > 10) cantidad = 1;
        if (cantidad < 1) cantidad = 1;

        // Evaluar tier ontológico respecto a la solicitud
        const evalOnto = evaluarTierOntologico(prod, queryNorm, tokens);

        return {
          id: prod.id,
          nombre: prod.nombre,
          precio: prod.precio,
          cantidad,
          subtotal: prod.precio * cantidad,
          imagenUrl: prod.imagenUrl,
          tier: evalOnto.tier > 0 ? evalOnto.tier : (originalIndex + 10)
        };
      })
      .filter((p): p is ProductoCombo => p !== null);

    // 7. Reordenamiento garantizado: Tier 1 primero -> Tier 2 -> Complementos
    productosCombo.sort((a, b) => {
      const tierA = a.tier ?? 99;
      const tierB = b.tier ?? 99;
      return tierA - tierB;
    });

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
