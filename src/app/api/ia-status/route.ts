/**
 * API Route: /api/ia-status
 * Endpoint ligero para verificar si la IA está habilitada desde el POS.
 *
 * GET /api/ia-status
 * Response: { iaHabilitada: boolean }
 */

import { NextResponse } from 'next/server';
import { getIAConfig } from '@/lib/rag/ragService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const iaConfig = await getIAConfig();
    return NextResponse.json(
      { iaHabilitada: iaConfig.iaBusquedaHabilitada },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ iaHabilitada: false, error: error.message }, { status: 200 });
  }
}
