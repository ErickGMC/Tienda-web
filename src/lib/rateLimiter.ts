/**
 * rateLimiter.ts
 * Rate limiter en memoria para endpoints serverless/API routes.
 * Limita peticiones por IP en una ventana de tiempo deslizante.
 */

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitStore>();

// Limpiar la memoria periódicamente para evitar fugas de memoria
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(ip);
    }
  }
}, 60_000);

/**
 * Valida si la IP supera el límite de peticiones permitido.
 * @param ip Dirección IP o identificador de cliente
 * @param maxRequests Máximo de peticiones permitidas en el intervalo
 * @param windowMs Duración de la ventana en milisegundos (ej: 60000 = 1 min)
 * @returns { allowed: boolean, remaining: number }
 */
export function checkRateLimit(
  ip: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = store.get(ip);

  if (!record || now > record.resetTime) {
    store.set(ip, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count };
}

/**
 * Helper para extraer la IP cliente del objeto Request.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
