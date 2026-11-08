# Skot ERP · Pase de Cocina · Fase 2.1

**Preparación de Fase 3:** [plan técnico y paleta contextual](./PHASE-3-PLAN.md) · [vista previa con colores de marca](./index-brand.html). La variante usa el logo Burger compartido por el propietario y los logos existentes del repositorio. La composición original de Fase 2.1 permanece disponible en esta galería y en `previews/refined/`.

Prototipos aislados para revisar el refinamiento visual antes de implementar en Next.js. Abrir [la galería](./index.html). Todos los importes, productos, estados de hardware y pedidos de estas páginas son **datos de demostración**; no hay API, sesión, cálculo de venta ni persistencia conectados. La identidad aprobada «Pase de Cocina» permanece intacta. La [especificación de Fase 2](./README-phase-2.md) y sus capturas originales en [`previews/`](./previews/) conservan la referencia anterior; las nuevas capturas están en [`previews/refined/`](./previews/refined/).

## Ajustes del Design System

No cambian la paleta, Lexend, Source Sans 3 ni las reglas cromáticas aprobadas. La capa [`refinement.css`](./refinement.css) aporta estos ajustes:

| Elemento | Ajuste aplicado |
|---|---|
| Jerarquía | Ventas del día ocupa 1,2 columnas relativas y lleva un acento vertical. Los otros KPI conservan escala parecida. Alertas pasa antes de módulos en móvil. |
| Catálogo | Tarjeta de 180 px mínimos en escritorio, nombre de 19 px, precio de 20 px, categoría compacta, etiqueta de personalización y acción «Agregar» de 48 px. Grid adaptable con tarjetas de 226–296 px, sin estirar los catálogos de tres resultados. |
| Fotografía opcional | `.product-media` admite un `<img>` real con `object-fit: cover`; ninguna maqueta inventa fotografías. La composición sin imagen sigue completa. |
| Pedido | Línea con precio base, modificadores y sus incrementos, cantidad y total de línea. El total general tiene mayor jerarquía. En escritorio solo las líneas se desplazan; subtotal, total y cobro permanecen visibles. |
| Modificadores | Diálogo nativo con casillas, precios adicionales, total calculado en la demostración, foco inicial, cierre con Escape y retorno de foco. |
| Açaí | Visor de 56 px (48 px en móvil) y cuatro hechos separados: conexión, estabilidad, validez del peso y confirmación. Tarjetas ajustadas a su contenido. |
| Móvil POS | Barra inferior de 76 px con `env(safe-area-inset-bottom)` y botón «Revisar pedido». El resumen es un `<dialog>` inferior, cerrado por defecto, con desplazamiento interno. |
| Interacción | Controles frecuentes de 48 CSS px, foco visible, selección/inhabilitación de tarjetas y filtros de categoría de demostración. |

La capa [`refinement.js`](./refinement.js) solo demuestra interacciones visuales. No modifica reglas de venta ni toca almacenamiento.

## Antes y después

| Pantalla | Problema inicial | Solución aplicada y mejora esperada | Archivos | Evidencia y validación |
|---|---|---|---|---|
| Dashboard | Cuatro KPI equivalentes y prioridad móvil de módulos sobre alertas. | Ventas gana prioridad moderada; alerta aparece después del resumen en móvil. Navegación activa y grupos más legibles. | `dashboard.html`, `refinement.css` | [Antes 1440](./previews/dashboard-1440.png) · [Después 1440](./previews/refined/dashboard-1440.png) · [Después 375](./previews/refined/dashboard-375-viewport.png). Playwright: 375/768/1024/1440, navegación, KPI, alertas y desbordamiento. |
| POS Hamburguesas | Tarjetas uniformes; combos y extras estirados; pedido poco desglosado; modal sin impacto económico visible. | Categoría, nombre, precio y acción legibles; grid con ancho acotado; ticket con bases, extras y totales de línea; subtotal/total/cobro fijos en escritorio; diálogo con total vivo. | `burger.html`, `refinement.css`, `refinement.js` | [Antes 1440](./previews/burger-1440.png) · [Después 1440](./previews/refined/burger-1440.png) · [Combos 1440](./previews/refined/burger-combos-1440.png) · [Pedido extenso 1440](./previews/refined/burger-long-1440.png) · [Modificadores 375](./previews/refined/burger-modifier-375-viewport.png). Playwright: catálogos de 3, 6 y 20 tarjetas, filtros, pedido largo, diálogo, total de demostración y teclado. |
| POS Açaí | La barra inferior tapaba la lectura y el resumen quedaba muy abajo; lectura estable y peso confirmado podían confundirse; tarjetas se estiraban. | Dock persistente sin superposición del contenido; resumen inferior accesible bajo demanda; estados «esperando», «estable sin confirmar» y «confirmado»; lectura mayor; tarjetas compactas. | `acai.html`, `refinement.css`, `refinement.js` | [Antes extras 375](./previews/acai-extras-375-viewport.png) · [Después extras 375](./previews/refined/acai-extras-375-viewport.png) · [Resumen abierto](./previews/refined/acai-extras-375-sheet.png) · [Esperando 1440](./previews/refined/acai-waiting-1440.png) · [Estable 375](./previews/refined/acai-stable-375-viewport.png). Playwright: estados, pedido largo, cobro, foco, 375/768/1024/1440. |

## Vistas para revisar

- [Dashboard](./dashboard.html).
- [Burger: productos](./burger.html), [combos](./burger.html?view=combos), [extras](./burger.html?view=extras), [modificadores](./burger.html?view=modifier), [pedido extenso](./burger.html?order=long), [catálogo de 20](./burger.html?catalog=large), [tarjeta seleccionada](./burger.html?selected=1) y [tarjeta inhabilitada](./burger.html?disabled=1).
- [Açaí: esperando lectura](./acai.html?state=waiting), [lectura estable sin confirmar](./acai.html), [peso confirmado y extras](./acai.html?state=extras), [pedido extenso](./acai.html?state=extras&order=long).

Los enlaces del Açaí representan transiciones visuales fijas. «Lectura estable» no significa «peso confirmado». El indicador «Balanza conectada» y los 0,428 kg son datos de demostración, no una lectura real. En el código funcional actual, el botón de confirmar solo se habilita con `isStable && weight > 0.05` y el cobro del bowl exige peso confirmado y total positivo; esta maqueta no cambia esas condiciones. La existencia de un precio o un estado de producto debe confirmarse con datos reales en Fase 3.

## Responsive y accesibilidad comprobados

| Ancho | Adaptación |
|---|---|
| 1440 | Dashboard con sidebar; POS con tarea y pedido lateral. En pedidos extensos, el pedido desplaza sus líneas sin mover el total. |
| 1024 | POS aún en dos columnas; catálogo adaptable de dos tarjetas; acciones principales visibles. |
| 768 | Pedido lateral se sustituye por resumen inferior; Açaí conserva tarjetas de trabajo en dos columnas sin estirarlas. |
| 375 | Trabajo en una columna; categorías en carril propio; dock fijo y resumen expandible con áreas seguras. |

Se ejecutó [`validate-refinement.cjs`](./validate-refinement.cjs) con Chromium de Playwright: **52 comprobaciones de escenario**, **38 capturas refinadas**, **0 fallos en la pasada final**. El [resultado completo](./validation-results.json) registra cada estado y ancho. Se comprobaron carga de fuentes, errores JS, desbordamiento horizontal, objetivos frecuentes ≥48 CSS px, focos de acciones cercanas al dock, apertura/cierre del resumen con Escape, retorno de foco, un solo cobro en el resumen Açaí, scroll de pedidos extensos, total del diálogo de modificadores (Bs. 47,00 → Bs. 54,00), filtros, estados de tarjeta seleccionada/inhabilitada, galería y tres estados de balanza. En 1024/1440 se verificó que el ticket largo mantiene visible el pie con total y cobro.

Pares de color revisados por cálculo de luminancia: texto principal/fondo **13,90:1**, texto secundario/blanco **6,56:1**, categoría/fondo de etiqueta **5,78:1**, pimentón/blanco **6,49:1**, blanco/acción verde **8,04:1**, aviso/fondo amarillo **5,65:1**, descripción/visor **9,57:1**, foco/blanco **9,07:1**. Cumplen el mínimo de 4,5:1 para texto normal de [WCAG 2.2, 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum). Los objetivos frecuentes superan los 24 CSS px de [2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum); se buscó 48 px por uso táctil. La inspección de foco aplica [2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum). Estas comprobaciones no certifican toda la aplicación ni sustituyen pruebas con lectores de pantalla o datos reales.

## Skills y recursos aplicados

Se releen `.agents/skills/ui-ux-pro-max/SKILL.md` y `.agents/skills/frontend-design/SKILL.md`, además de las reglas locales de UI y `docs/ui-design-system.md`. UI/UX Pro Max se consultó en su búsqueda local para tamaño táctil, foco no oculto, tarjetas y dashboard denso; su referencia rápida orientó los objetivos de 48 px y la navegación de teclado. Frontend Design guió la jerarquía de importes, el lenguaje visual ligado al flujo de cocina y la contención de acentos y movimiento. Se mantuvieron los tokens aprobados; la identidad gana personalidad mediante estados y estructura operativa.

## Preparación de Fase 3

Implementar después de aprobación: `ProductCard` con imagen opcional, `CategorySelector`, `CartItem`, `OrderSummary` con cuerpo desplazable, `MobileOrderSheet`, `ModifierDialog`, `ScaleDisplay`, `ScaleStatus`, `StepProgress`, `MetricBand`, `AlertPanel` y navegación administrativa. Adaptar las piezas funcionales existentes en Next.js 14; conservar rutas, permisos, cálculo de venta, interfaz de balanza, `canCobrar`, TanStack Query y sincronización offline/IndexedDB. La validación de producción deberá repetir los escenarios visuales con datos y reglas reales.
