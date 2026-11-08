# Fase 3 · Implementación en `frontend-new`

Estas capturas corresponden a la aplicación Next.js real renderizada con **respuestas de API simuladas**. No representan ventas registradas ni datos de producción. Playwright bloqueó todas las solicitudes POST durante la captura. El pesaje se hizo en servidor de desarrollo con `NEXT_PUBLIC_MOCK_SCALE=true`; los pesos varían porque el simulador existente genera lecturas de ejemplo.

## Vistas

| Pantalla | Escritorio | Móvil |
|---|---|---|
| Dashboard | [1440 px](./previews/mock-dashboard-1440.png) | [375 px](./previews/mock-dashboard-375.png) |
| POS Hamburguesas | [1440 px](./previews/mock-burger-1440.png) | [375 px](./previews/mock-burger-375.png) |
| POS Açaí, lectura estable sin confirmar | [1440 px](./previews/mock-acai-1440.png) | [375 px](./previews/mock-acai-375.png) |
| POS Açaí, peso confirmado | — | [Resumen expandido](./previews/mock-acai-confirmed-sheet-375.png) |
| Apertura de caja | — | [Burger](./previews/mock-cash-gate-burgers-375.png) · [Açaí](./previews/mock-cash-gate-acai-375.png) |

La comprobación de render cubrió 375, 768, 1024 y 1440 px para dashboard, Burger y Açaí: **12 combinaciones, sin error de página ni desbordamiento horizontal**. Además se probaron con APIs simuladas el catálogo, diálogo de modificadores, carrito móvil, pago Burger, extras sin bowl y pago Açaí, y la transición de balanza simulada desde lectura estable hasta peso confirmado y cobro. Un catálogo de 20 productos distintos permitió agregar 20 líneas al pedido y revisar el resumen a 375 y 1440 px sin desbordamiento horizontal. La matriz de roles del inicio se contrastó con ADMIN, MANAGER, CASHIER y WAREHOUSE. Las pruebas de hardware físico, impresión real, venta offline completa y accesibilidad manual con lector de pantalla siguen pendientes según `PHASE-3-PLAN.md`.

La especificación de tokens y componentes integrados está en [`docs/design-system-pase-de-cocina.md`](../../docs/design-system-pase-de-cocina.md). El estado de las siete etapas y sus gates permanece en [`PHASE-3-PLAN.md`](../prototypes/pase-de-cocina/PHASE-3-PLAN.md).
