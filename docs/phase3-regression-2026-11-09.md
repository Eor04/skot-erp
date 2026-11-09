# Fase 3 · cierre de migración visual y regresión

Fecha: 9 de noviembre de 2026. Rama: `frontend-new`.

## Alcance terminado

- Las 42 rutas `page.tsx` usan el contexto visual de «Pase de Cocina». La migración restante se integró por catálogo, administración, inventario, fábrica, cuenta y caja.
- TypeScript (`tsc --noEmit`), `git diff --check` y `next build` finalizaron correctamente tras la última integración.
- Una comparación de las páginas migradas contra el commit anterior no detectó endpoints ni métodos HTTP eliminados. Esta comparación no prueba equivalencia total de la lógica comercial.

## Evidencia ejecutada con datos simulados

| Área | Comprobación | Resultado |
|---|---|---|
| Administración | 12 rutas a 375 y 1440 px, JWT ADMIN, GET simulados, escrituras bloqueadas | HTTP 200, tema aplicado, sin errores de página ni desbordamiento del documento. Usuarios, sucursales y combos abrieron diálogo. |
| Inventario y caja | 10 rutas a 375 y 1440 px, JWT ADMIN, GET simulados, escrituras bloqueadas | HTTP 200, sin errores de página ni desbordamiento. Payloads de apertura de caja, gasto, transferencia, ajuste y merma comprobados. |
| Fábrica | 8 rutas a 375 y 1440 px; rutas operativas también con WAREHOUSE | Sin errores de página ni desbordamiento. Payloads simulados de recetas, orden, recepción y finalización comprobados. |
| Diálogos | Usuarios, sucursales, combos, modificadores, compras, producción, recepción, pedido interno, merma y gastos | Foco inicial dentro, Escape cierra y devuelve foco al disparador en los casos ensayados. Producción y recepción se comprobaron también con WAREHOUSE. |
| Caja abierta/cierre | CASHIER y MANAGER a 375 px, escrituras interceptadas | Render sin desbordamiento; payload de cierre con sesión, usuario, apertura, efectivo y notas. Cierre Açaí generó la solicitud de reposición esperada, también interceptada. |
| Balanza configurada | 375, 1024 y 1440 px, API simulada | El formulario conservó sucursal, puerto, baud rate, tara y estado en el payload; sin errores de página ni desbordamiento. |
| Permisos de página | ADMIN, MANAGER, CASHIER y WAREHOUSE; rutas admin, fábrica, inventario y POS | Los 200/307 coincidieron con las reglas actuales de middleware. MANAGER puede abrir la página de Usuarios por URL, pero la API de Usuarios exige ADMIN; el enlace no se muestra a MANAGER. Hallazgo heredado, sin ampliación de permisos. |
| Cola offline Burger | LocalStorage aislado, fallo de sincronización simulado, recarga y reintento exitoso | Venta pendiente pasó a `failed`, persistió tras recarga y se retiró de la cola tras respuesta de éxito. Ninguna venta real se registró. |
| POS Burger y Açaí | Pruebas simuladas previas registradas en `PHASE-3-PLAN.md` | Catálogo de 20 productos, ticket móvil, modificadores, extras sin bowl, peso simulado y cobro visual. Las pruebas no sustituyen hardware ni impresión reales. |

Todos los POST/PUT/PATCH/DELETE de estas comprobaciones se interceptaron en Playwright. El servidor se reconstruyó una sola vez al final; se verificó que su CSS respondió 200 antes de repetir el control móvil de Burger.

## Límites de aceptación operativa

- **Balanza y bridge reales:** pendiente comprobación en dispositivo físico. El flujo simulado no valida el protocolo ni la latencia real.
- **Impresión:** pendiente comprobación con impresora y configuración del local.
- **Offline integral:** la cola Burger se probó de forma aislada. Queda pendiente ensayo de venta completa Açaí y Burger sin red, recuperación, reintento y ausencia de duplicados con backend de pruebas.
- **Accesibilidad manual:** falta recorrido con lector de pantalla y revisión completa de WCAG 2.2 AA. Las pruebas de foco y teclado cubren diálogos concretos.
- **Rendimiento:** falta comparación reproducible de latencia POS, carga de imágenes y dispositivos objetivo con la línea base.
- **Permisos:** el acceso directo de MANAGER a `/admin/users` muestra una discrepancia existente entre página y API. Requiere decisión funcional separada; no se alteró autorización durante el rediseño.
- **Peso Açaí:** sigue la diferencia heredada entre el umbral visual de confirmación (`> 0.05 kg`) y la guarda interna (`> 0.02 kg`), documentada en el plan. No se modificaron reglas comerciales.

La migración visual está completa. La aceptación operativa total requiere las comprobaciones anteriores en un entorno controlado con hardware y datos de prueba.
