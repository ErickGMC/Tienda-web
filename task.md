# TAREAS DE IMPLEMENTACIÓN - REDISEÑO DE VISUALIZADOR DE FAMILIAS

## Fase 1: Creación del Slide-over Drawer / Bottom Sheet de Alta Densidad
- [x] Crear `src/components/productos/FamilyDetailDrawer.tsx` con arquitectura dual (Slide-over en escritorio y Bottom Sheet en móvil).
- [x] Implementar micro-buscador en vivo dentro de la familia para familias con >4 presentaciones.
- [x] Implementar filas ultra-compactas (densidad ~50px de altura por producto) con micro-acciones `+` y badge dinámico.
- [x] Implementar sticky footer unificado con botón WhatsApp de consulta consolidada y acceso directo a lista.

## Fase 2: Integración y Retrocompatibilidad
- [x] Actualizar `src/components/productos/FamilyDetailModal.tsx` como wrapper retrocompatible.
- [x] Integrar `FamilyDetailDrawer` en `src/components/productos/TiendaCatalog.tsx`.

## Fase 3: Auditoría y Verificación de Tipos
- [x] Validar tipos TypeScript y ejecutar compilación (`npm run build` exitoso sin errores).

## Fase 4: Pruebas E2E con Browser Subagent
- [x] Lanzar servidor Next.js local y probar navegación con `browser_subagent`.
- [x] Probar apertura de familia, densidad visual de productos, adición a lista y consulta por WhatsApp en Desktop y Móvil.
- [x] Capturar capturas de pantalla de validación y generar walkthrough.
