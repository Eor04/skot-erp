# Skot ERP — Pase de Cocina · Fase 2

Prototipos visuales aislados. Se abren desde [index.html](./index.html) en un navegador; no están montados en Next.js ni consumen API, sesión o almacenamiento del ERP. Los importes, nombres y cantidades visibles son **datos de demostración**. Los enlaces entre estados solo cambian la maqueta.

## 1. Design System visual

**Idea rectora.** La composición toma del pase de cocina la separación inmediata entre tarea, estado y pedido. La marca aparece en una línea de estado y en acciones puntuales. El resto de las superficies permanece claro para soportar jornadas largas de lectura.

| Token | HEX | Aplicación |
|---|---|---|
| Primary | `#1E5A48` | Acción principal, selección y ubicación activa |
| Secondary | `#9B432F` | Énfasis gastronómico ocasional |
| Accent | `#D0A342` | Línea de atención, nunca texto blanco encima |
| Background | `#F1F4F1` | Área de trabajo |
| Surface | `#FFFFFF` | Controles, catálogo, pedido, tablas |
| Foreground | `#172822` | Texto principal |
| Muted | `#4D6258` | Texto secundario |
| Border | `#768A7D` | Bordes funcionales |
| Success | `#1E6849` | Confirmación |
| Warning | `#805208` | Atención |
| Error | `#A52D2D` | Error o acción destructiva |
| Info | `#1F5F80` | Información |

Complementos de superficie: `#D8E1D9` para separadores decorativos, `#E6EEE8` para selección, `#F6EBCB` para aviso y `#F8E9E5` para error. El visor de balanza usa `#173B31` con texto claro. El foco utiliza `#174B78`.

Las relaciones calculadas para los pares principales son: `Foreground/Background` **13,90:1**; `Muted/Background` **5,92:1**; blanco/Primary **8,04:1**; blanco/Secondary **6,49:1**; Foreground/Accent **6,60:1**; texto claro/visor de balanza **11,81:1**. Los bordes funcionales alcanzan **3,68:1** sobre Surface y **3,32:1** sobre Background. Los colores semánticos de estado con blanco superan **6,7:1**. Blanco sobre Accent da **2,33:1** y no se utiliza. La regla de contraste WCAG 2.2 AA es 4,5:1 para texto normal, 3:1 para texto grande y 3:1 para información no textual esencial. Cada estado de producción necesitará una verificación propia.

**Fuentes.** Lexend variable para títulos, cantidades destacadas y la marca textual del prototipo; Source Sans 3 variable para datos, lectura continua y controles. Ambas están alojadas dentro de esta carpeta para revisar las maquetas sin conexión. Sus licencias OFL se incluyen en `fonts/`. Escala: 13 px metadatos, 14 px etiquetas, 16 px cuerpo, 19–20 px encabezados de sección, 24–30 px títulos y 28–56 px importes o lectura de balanza. Los números usan cifras tabulares.

**Medidas.** Espaciado base de 4, 8, 12, 16, 24 y 32 px. Radios de 8 px para controles, 11–12 px para paneles y 14 px para diálogos. Sombras solo en superposiciones. Bordes y separadores ordenan información; no hay gradientes ni animaciones de entrada. Los iconos de las maquetas usan geometría de línea compatible con el lenguaje Lucide; en producción se reutilizará `lucide-react` existente.

## 2. Dashboard administrativo

[Abrir maqueta](./dashboard.html) · [Captura 1440 px](./previews/dashboard-1440.png) · [Captura 375 px](./previews/dashboard-375.png)

Vista de **administrador**. Navegación por Operación y Seguimiento, con ubicación activa y los módulos existentes. El resumen es una banda de cuatro KPI: ventas del día, pedidos, cajas abiertas y alertas críticas, campos que ya consulta `src/app/page.tsx`. Abajo hay accesos por tarea y un bloque de alertas prioritarias. La composición reserva mayor ancho a navegación y trabajo, y trata la alerta como una excepción visible. Los datos son de ejemplo.

## 3. POS Hamburguesas

[Catálogo](./burger.html) · [Combos](./burger.html?view=combos) · [Extras](./burger.html?view=extras) · [Modificadores](./burger.html?view=modifier) · [Captura móvil](./previews/burger-375-viewport.png)

El catálogo usa tarjetas táctiles de nombre, categoría, precio y acción. Las pestañas separan productos, combos y extras, como el flujo actual. “Con extras” abre una vista de diálogo de modificadores. El pedido permanece en la columna derecha en escritorio, con cantidades, modificadores, subtotal, descuento y cobro. En 768 y 375 px pasa debajo del catálogo y una barra inferior mantiene visible el total y el acceso al pedido. La apertura de caja, las condiciones de pago y las fórmulas reales se mantienen fuera de estas maquetas.

## 4. POS Açaí

[Pesaje sin confirmar](./acai.html) · [Extras tras confirmar](./acai.html?state=extras) · [Captura móvil de pesaje](./previews/acai-pesaje-375-viewport.png)

El progreso muestra cinco **hitos visuales**: sabores, pesaje, confirmación de peso, extras y cobro. La implementación actual agrupa estos hitos en tres estados de página y un diálogo de pago; la propuesta no requiere cambiar esa lógica. El visor oscuro concentra peso, unidad y lectura estable. La acción “Confirmar peso” precede a los extras. El pedido indica “Peso pendiente” y “Cobrar” permanece inactivo en esa vista; la vista posterior muestra peso confirmado, extras y cobro. El enlace entre vistas representa una transición visual fija; no calcula ni registra ventas.

## 5. Responsive

| Ancho | Dashboard | POS |
|---|---|---|
| **1440 px** | Barra lateral, KPI en una banda de cuatro, módulos y alertas en dos columnas. | Catálogo y pedido en columnas; tres tarjetas de producto por fila. |
| **1024 px** | Misma estructura con márgenes y KPI más compactos. | Dos columnas; dos tarjetas por fila; pedido aún visible lateralmente. |
| **768 px** | Navegación horizontal, KPI 2×2, módulos y alertas apilados. | Catálogo a ancho completo, pedido después; barra inferior con total y acción. |
| **375 px** | Navegación y contenido lineal; módulos en una columna. | Categorías desplazables dentro de su propia zona, tarjetas en una columna, barra inferior y controles táctiles amplios. |

La barra inferior reserva espacio de desplazamiento para que no tape el final del contenido. Las acciones frecuentes de agregar, cambiar cantidad y volver al dashboard miden 48×48 CSS px en las maquetas; las demás acciones principales miden al menos 44 px de alto. Los enlaces compactos cumplen al menos el mínimo web de 24 CSS px o deberán verificarse contra las excepciones pertinentes. El foco es visible y se respeta `prefers-reduced-motion`.

## 6. Inventario de componentes para implementación

| Compartidos | Administración | POS |
|---|---|---|
| `Button`, `IconButton`, `Badge`, `StatusPill`, `Input`, `Select`, `Dialog`, `Tabs`, `Card`, `PageHeader`, `EmptyState`, `LoadingState`, `ErrorState` | `AdminShell`, `Sidebar`, `Header`, `MetricBand`, `ModuleLink`, `AlertPanel`, `DataTable`, `FilterBar`, `ChartPanel` | `POSHeader`, `CategorySelector`, `ProductCard`, `ModifierDialog`, `CartItem`, `OrderSummary`, `PaymentAction`, `ScaleDisplay`, `StepProgress`, `SyncStatus` |

La propuesta visual no obliga a crear un componente para cada nombre si una composición existente puede adaptarse limpiamente. Los contratos de venta, balanza y almacenamiento permanecen en sus módulos actuales.

## 7. Plan para la siguiente fase

1. Aprobar estas vistas, sus estados y los detalles de lenguaje antes de tocar producción.
2. Llevar los tokens a `src/app/globals.css`, `src/app/experience.css`, `src/app/module-workspace.css` y `tailwind.config.js`; verificar contrastes de todos los estados.
3. Construir componentes base en `src/components/ui/`, empezando por botones, controles, diálogos y estados accesibles.
4. Adaptar `src/app/layout.tsx`, `src/app/admin/layout.tsx`, `src/app/inventory/layout.tsx` y navegación visible sin cambiar rutas ni permisos. Ajustar `src/app/page.tsx` con las mismas fuentes de datos.
5. Adaptar visualmente `src/app/(pos)/burgers/page.tsx`, `src/app/(pos)/acai/page.tsx`, `src/components/pos/burgers/product-grid.tsx`, `cart.tsx`, `modifier-modal.tsx`, `payment-modal.tsx` y `src/components/pos/cash-gate.tsx`. Conservar hooks de venta, cálculos, balanza y cola offline.
6. Validar con Playwright cada flujo y estado en 1440, 1024, 768 y 375 px, además de teclado, foco, contraste, desconexión y sincronización. Migrar después el resto de las páginas administrativas por lotes.

## Evaluación visual de las tres pantallas

| Criterio | Dashboard | POS Hamburguesas | POS Açaí |
|---|---|---|---|
| Coherencia con Pase de Cocina | Banda de métricas y estados | Pedido como pase visible | Lectura de balanza y progreso |
| Identidad gastronómica | Vocabulario de operación | Producto y pedido en primer plano | Venta por peso como rasgo propio |
| Jerarquía | KPI, alerta y módulo | Producto, pedido y cobro | Peso, confirmación y cobro |
| Accesibilidad | Pares de color y navegación etiquetada | Acciones de 48 px y nombres visibles | Estado expresado en texto; cobro deshabilitado antes del peso |
| Legibilidad | Datos tabulares y títulos cortos | Precio grande y descripción secundaria | Peso y unidad de lectura inmediata |
| Distribución | Dos zonas de trabajo en escritorio | Catálogo y pedido simultáneos | Paso activo y pedido simultáneos |
| Consistencia | Tokens, botones, bordes e iconos comunes | Mismos tokens con mayor escala táctil | Mismos tokens con visor de instrumento |
| Tacto | Enlaces y acciones amplios | Agregar y cantidad de 48 px | Confirmar peso y cobrar destacados |
| Responsive | KPI 4→2×2; módulos 2→1 | 3→2→1 tarjetas; pedido inferior | Instrumento y resumen apilados |
| Diferenciación ERP/POS | Vista para decidir y navegar | Vista para registrar venta | Vista para pesar y cobrar |

La fila de accesibilidad expresa decisiones verificadas en estas maquetas, no conformidad completa de la aplicación. El diálogo de modificadores necesita gestión de foco, cierre por teclado y pruebas con lector de pantalla cuando se implemente funcionalmente.

## Validación efectuada en Fase 2

Se renderizaron **24 combinaciones** de pantalla/estado y ancho con Chromium de Playwright, incluida la galería. No hubo errores de página ni desbordamiento horizontal; Lexend y Source Sans 3 cargaron en todas las vistas. Se inspeccionaron visualmente las capturas principales y se comprobó que los objetivos interactivos visibles de las tres pantallas no bajan de 24 CSS px en los cuatro anchos. Los prototipos no ejecutan ventas, no tienen una implementación completa de los diálogos ni equivalen a una certificación WCAG de la aplicación. La validación funcional y accesible completa corresponde a la fase de implementación.

**Skills consultadas:** `UI/UX Pro Max` (estilo de dashboard denso, reglas de tamaño táctil y foco, tipografía empresarial) y `Frontend Design` (identidad ligada al contexto, tipografía deliberada, estructura informativa, movimiento contenido y revisión visual). La documentación previa del proyecto se leyó para conocer restricciones, pero la apariencia de estas maquetas sigue la identidad Pase de Cocina aprobada en Fase 1.
