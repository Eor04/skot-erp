# Skot ERP · Preparación de Fase 3

**Estado:** plan y variante de color listos para revisión. No se ha implementado ningún componente de producción. La identidad estructural «Pase de Cocina» y los prototipos aprobados siguen disponibles en [la galería original](./index.html). La [variante de marca](./index-brand.html) cambia solo colores y se activa en cada pantalla con `?palette=brand`.

## 1. Decisión cromática propuesta

La foto entregada corresponde al letrero de **Skot Burger**. El repositorio contiene además [`public/logo-burger.png`](../../../public/logo-burger.png), [`public/logo-acai.png`](../../../public/logo-acai.png) y [`public/logo-skot.png`](../../../public/logo-skot.png). Por ello propongo **tokens compartidos con acento contextual**, sin aplicar el rojo de Burger a las pantallas de Açaí ni a todos los estados del ERP. Los valores vivos extraídos del PNG de Burger son aproximadamente rojo `#F21924` y amarillo `#FEDA16`; la fotografía está afectada por luz y no se toma como manual de marca exacto.

| Uso | Token propuesto | HEX | Criterio |
|---|---|---|---|
| ERP · acción y navegación | `--brand-admin` | `#54294F` | Ciruela sobrio relacionado con el logo general. |
| POS Burger · acción | `--brand-burger` | `#A6262B` | Rojo del logo oscurecido para botones y texto legible. |
| POS Açaí · acción | `--brand-acai` | `#632A62` | Morado del negocio en controles, sin colorear todo el fondo. |
| Acento compartido | `--brand-gold` | `#E1B528` | Amarillo para líneas, indicadores y pequeños acentos; sin texto blanco. |
| Fondo / superficie | `--background` / `--surface` | `#F4F2F0` / `#FFFFFF` | Lectura prolongada y separación de tareas. |
| Texto / secundario | `--foreground` / `--muted` | `#2D2528` / `#5D5358` | Neutros cálidos. |
| Éxito / aviso / error / info | Tokens semánticos | `#1E6849` / `#805208` / `#A52D2D` / `#1F5F80` | Conservan su significado; el estado no depende solo del tono de marca. |

Contraste calculado: blanco/Burger `7,16:1`, blanco/Açaí `10,30:1`, blanco/ERP `11,62:1`, texto/fondo `13,37:1`, secundario/blanco `7,38:1`, texto oscuro/amarillo `7,71:1`. Blanco/amarillo es `1,94:1` y **no se usará**. El rojo vivo del logo/blanco es `4,25:1`: queda reservado al arte de marca; los controles usan el rojo oscuro. Estas parejas verifican la pauta de texto normal de [WCAG 2.2 AA, 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum) para la propuesta, no constituyen una certificación de todas las futuras pantallas.

**Precaución semántica:** el rojo de acción Burger se parece al rojo de error. Las acciones destructivas deberán mostrar texto e icono explícitos y, cuando corresponda, confirmación; nunca se identificarán solo por color.

## 2. Alcance técnico

Se conserva Next.js 14 App Router, React 18, TypeScript, Tailwind CSS 3, CSS personalizado, Lucide React y las fuentes Lexend/Source Sans 3 ya incluidas en los prototipos. `next/font/local` está disponible en [Next.js 14](https://nextjs.org/docs/14/app/building-your-application/optimizing/fonts); `theme.extend` permite incorporar tokens a [Tailwind CSS 3](https://v3.tailwindcss.com/docs/theme). No se propone instalar dependencias ni migrar versiones.

El estado funcional actual se mantiene: `src/app/page.tsx` filtra módulos mediante `showWhen`; `src/app/(pos)/burgers/page.tsx` conserva `useBurgerSale`, combos, descuentos, pagos, impresión y cola offline; `src/app/(pos)/acai/page.tsx` conserva `useAcaiSale`, `useScale`, balanza y sincronización. Los prototipos no sustituyen a esas fuentes de datos.

## 3. Secuencia de implementación en `frontend-new`

| Etapa | Objetivo y archivos previstos | Dependencia y riesgo | Criterio de aceptación |
|---|---|---|---|
| **1. Tokens y fuentes** | Introducir propiedades semánticas en `src/app/globals.css`, extender `tailwind.config.js`, cargar Lexend y Source Sans 3 desde `src/app/layout.tsx` o un módulo compartido de fuentes. Definir contexto `admin`, `burger`, `acai` en el nivel visual adecuado. | Aprobar primero los HEX de esta variante. Riesgo: clases históricas con colores fijos seguirán prevaleciendo. | Tokens visibles en una página de prueba; contraste y fuentes correctos, sin cambio de rutas ni datos. |
| **2. Componentes base** | Crear/adaptar en `src/components/ui/` Button, IconButton, Badge, Status, Card, Input, Select, Tabs, Dialog, Empty/Loading/Error State y patrón de foco. Usar los iconos Lucide existentes. | Depende de tokens. Riesgo: diálogo que pierda foco o bloquee interacción. | Teclado, Escape, retorno de foco, estados disabled/hover/focus y objetivos frecuentes de 48 CSS px. |
| **3. ERP y dashboard** | Adaptar `src/app/page.tsx` y composición compartida de navegación; después `src/app/admin/page.tsx` y `src/app/inventory/page.tsx` según el prototipo. Conservar el filtro `ALL_MODULES.showWhen` y datos de ventas, alertas y caja. | Depende de componentes base. Riesgo: mostrar accesos sin permiso o alterar KPI. | Cada rol ve sus módulos actuales; ventas, pedidos, caja y alertas mantienen valores reales; 375/768/1024/1440 sin solapes. |
| **4. POS Burger** | Adaptar `src/components/pos/burgers/product-grid.tsx`, `cart.tsx`, `modifier-modal.tsx`, `payment-modal.tsx` y el JSX visual de `src/app/(pos)/burgers/page.tsx`. Usar `imageUrl` real cuando exista; conservar el fallback tipográfico. | Depende de tokens y diálogo. Riesgo: mezclar presentación con cálculos, combos o descuentos. | Catálogo pequeño/grande, modificadores, carrito largo y cobro reproducen importes de `useBurgerSale`; impresión y venta offline siguen operativas. |
| **5. POS Açaí** | Extraer solo presentación de lectura, pasos y resumen móvil desde `src/app/(pos)/acai/page.tsx` hacia componentes POS. Conservar `src/hooks/use-scale.ts` y `src/hooks/use-acai-sale.ts`. | Depende de componentes base y del patrón móvil. Riesgo: confundir `scaleStatus`, `isStable`, peso válido y `cart.weightConfirmed`. | Espera, lectura estable, peso confirmado y extras indican el estado real. El botón conserva `isStable && weight > 0.05`; el cobro mantiene `cart.total > 0 && (!hasBowl || cart.weightConfirmed)`. |
| **6. Migración restante** | Aplicar componentes compartidos a módulos administrativos por grupos, sin reescribir cada página a la vez. | Depende de validación de las tres pantallas principales. Riesgo: estilos globales que afecten formularios antiguos. | Formularios, tablas, permisos, filtros y rutas actuales permanecen funcionales. |
| **7. Regresión y cierre** | Validar en Playwright, `tsc` y build; revisar red, teclado y estados offline. Guardar un commit por etapa. | Requiere acceso a datos de prueba y escenarios de balanza. | Flujos ERP/POS y screenshots aprobados; sin regresiones de autenticación, pago, impresión, IndexedDB/localStorage o sincronización. |

## 4. Protección funcional y pruebas

- **No tocar** APIs, Prisma, middleware, contratos de venta, reglas de permisos, `src/lib/sync-manager.ts`, `src/hooks/use-burger-sale.ts`, `src/hooks/use-acai-sale.ts`, `src/hooks/use-scale.ts` ni service worker para aplicar estilos. Si un estado visual requiere datos adicionales, comprobar primero si ya existen en las props.
- Validar ERP con usuarios de rol diferente; mantener exactamente la lógica `showWhen` del dashboard. No añadir KPI inventados.
- Validar Burger con 3, 6 y más de 20 productos, imágenes presentes/ausentes, combos, extras, descuentos, pedidos extensos, método de pago e impresión de comanda.
- Validar Açaí con balanza desconectada, conectada sin lectura, lectura inestable, lectura estable, peso confirmado, extras y cobro. La conectividad no equivale a estabilidad ni confirmación.
- En 375, 768, 1024 y 1440 px comprobar foco no oculto por el dock, sin desbordamiento y objetivos adecuados según [WCAG 2.2, 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum) y [2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum). Probar pedidos largos y textos reales.
- Probar venta online y offline con la cola existente, reintento de sincronización, impresión y cobro antes de dar por terminada la fase. No declarar conformidad WCAG completa solo con capturas.

## 5. Entregable disponible ahora

La [galería de marca](./index-brand.html) permite abrir dashboard, Burger y Açaí con los colores propuestos. Las capturas nuevas están en [`previews/brand/`](./previews/brand/) y las anteriores permanecen en [`previews/refined/`](./previews/refined/). [`validate-brand.cjs`](./validate-brand.cjs) comprueba la variante sin modificar producción; su resultado está en [`validation-brand.json`](./validation-brand.json). El siguiente paso de producción es la **etapa 1** después de validar estos colores concretos.
