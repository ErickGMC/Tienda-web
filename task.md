# TAREAS DE IMPLEMENTACIÓN - OPTIMIZACIÓN TIENDA WEB

## Fase 1: Caché de Backend y Optimización de Firestore
- [x] Reemplazar lecturas masivas de Firestore por Caché (`unstable_cache`) en `src/lib/rag/ragService.ts`
- [x] Actualizar `REVALIDATE_TIME` a 300s y optimizar `logAnalyticsEvent` en `src/lib/actions.ts`

## Fase 2: Seguridad e Integridad de API Keys
- [x] Eliminar fallback de `GEMINI_API_KEY` en `src/app/api/combos-ia/route.ts`
- [x] Crear Rate Limiter en `src/lib/rateLimiter.ts` y aplicarlo a `/api/combos-ia` y `/api/search-ia`

## Fase 3: Optimización de Assets y Core Web Vitals (LCP)
- [x] Remover `unoptimized={true}` y optimizar `sizes` en `src/components/productos/ProductCard.tsx`
- [x] Mejorar placeholder visual cuando el producto no tiene imagen

## Fase 4: Potenciación de UX y Cotización por WhatsApp
- [x] Mejorar `src/components/ui/WhatsAppFAB.tsx` con badge dinámico de lista y cotización masiva por WhatsApp

## Fase 5: Auditoría, Build y Pruebas E2E
- [x] Ejecutar compilación de verificación `npm run build`
- [x] Iniciar servidor `npm run dev` y realizar prueba E2E con `browser_subagent`
