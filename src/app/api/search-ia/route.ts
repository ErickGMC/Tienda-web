/**
 * API Route: /api/search-ia
 * Nivel 2 del sistema RAG — Búsqueda Semántica Vectorial.
 *
 * POST /api/search-ia
 * Body: { termino: string }
 * Response: { productos: Producto[], nivel: 1 | 2, latencyMs: number, iaHabilitada: boolean }
 *
 * Si la IA está deshabilitada desde el POS (web_config/ia.iaBusquedaHabilitada = false),
 * retorna los resultados del Nivel 1 (búsqueda exacta) sin consumir créditos de API.
 */

import { NextResponse } from 'next/server';
import { buscar, getIAConfig } from '@/lib/rag/ragService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { termino } = body;

    if (!termino || typeof termino !== 'string' || termino.trim().length < 2) {
      return NextResponse.json({ error: 'Término de búsqueda inválido' }, { status: 400 });
    }

    // Verificar si la IA está habilitada desde el POS
    const iaConfig = await getIAConfig();
    const usarIA = iaConfig.iaBusquedaHabilitada;

    const resultado = await buscar(termino.trim(), usarIA);

    return NextResponse.json({
      ...resultado,
      iaHabilitada: usarIA,
    });
  } catch (error: any) {
    console.error('[API /search-ia] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', detalle: error.message },
      { status: 500 }
    );
  }
}
