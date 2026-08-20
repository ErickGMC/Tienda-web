/**
 * API Route: /api/revalidate
 * ================================================================
 * Webhook de invalidación de caché llamado por tienda-pos (firebaseSync.cjs)
 * después de sincronizar productos o banners con Firestore.
 *
 * Esto garantiza que la Tienda-web refleje los cambios del POS
 * en < 2 segundos, en lugar de esperar el TTL de 5 minutos del caché.
 *
 * POST /api/revalidate
 * Headers: x-revalidate-secret: <EMBED_SECRET>
 * Body: { tags?: string[] }
 * ================================================================
 */

import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // 1. Verificar secret de seguridad
  const secret = process.env.EMBED_SECRET || process.env.REVALIDATE_SECRET;
  const requestSecret = request.headers.get('x-revalidate-secret');

  if (secret && requestSecret !== secret) {
    console.warn('[revalidate] Intento de acceso no autorizado.');
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: { tags?: string[] } = {};
  try {
    body = await request.json();
  } catch {
    // Body vacío — revalidar todo por defecto
  }

  // 2. Revalidar los tags solicitados o todos por defecto
  const tagsToRevalidate: string[] = body.tags && Array.isArray(body.tags)
    ? body.tags
    : ['productos', 'banners', 'web_config'];

  const revalidated: string[] = [];

  for (const tag of tagsToRevalidate) {
    try {
      revalidateTag(tag);
      revalidated.push(tag);
    } catch (err: any) {
      console.warn(`[revalidate] Error al revalidar tag "${tag}":`, err.message);
    }
  }

  // 3. Revalidar la ruta raíz si se actualizaron productos o banners
  if (tagsToRevalidate.includes('productos') || tagsToRevalidate.includes('banners')) {
    try {
      revalidatePath('/', 'layout');
    } catch (err: any) {
      console.warn('[revalidate] Error al revalidar path:', err.message);
    }
  }

  console.log(`[revalidate] ✅ Tags invalidados: ${revalidated.join(', ')}`);

  return NextResponse.json({
    revalidated: true,
    tags: revalidated,
    timestamp: new Date().toISOString(),
  });
}
