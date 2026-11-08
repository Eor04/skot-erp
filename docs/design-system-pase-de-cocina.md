# Pase de Cocina · Design System de Skot ERP

Estado: base de Fase 3 integrada en `frontend-new`. Esta guía describe la implementación actual y los límites para migrar el resto de los módulos. La referencia visual aprobada sigue en `design/prototypes/pase-de-cocina/`.

## Identidad y contextos

`skot-experience` activa los tokens solo en rutas migradas. `data-brand="admin"`, `"burger"` o `"acai"` selecciona el color de acción. El atributo expresa el contexto visual de la ruta; no autoriza usuarios, elige sucursal, calcula ventas ni modifica estados.

| Token | Admin | Burger | Açaí | Uso |
|---|---|---|---|---|
| `--brand-primary` | `#54294F` | `#A6262B` | `#632A62` | Acción primaria, foco de jerarquía y enlaces principales |
| `--brand-secondary` | `#A6262B` | `#A6262B` | `#8B4B82` | Acento secundario contextual, con uso limitado |
| `--brand-accent` | `#E1B528` | compartido | compartido | Indicador/acento pequeño; texto oscuro encima |
| `--background` | `#F4F2F0` | compartido | compartido | Fondo de trabajo |
| `--surface` | `#FFFFFF` | compartido | compartido | Tarjetas, diálogos, ticket |
| `--foreground` | `#2D2528` | compartido | compartido | Texto principal |
| `--muted` | `#5D5358` | compartido | compartido | Texto secundario |
| `--border` | `#867A80` | compartido | compartido | Controles funcionales |
| `--line-subtle` | `#DED8D9` | compartido | compartido | Separadores decorativos |

Los estados de éxito, aviso, error e información usan `--success`, `--warning`, `--error` y `--info`; no heredan el color Burger/Açaí. Sus fondos pálidos se definen como `--status-*-bg`. El visor de balanza usa `--scale-display`. En botones de marca se usa texto blanco; sobre el oro, texto oscuro. Los pares principales de la variante fueron comprobados en `PHASE-3-PLAN.md`; cada estado nuevo exige medición propia.

## Tipografía y ritmo

`next/font/local` carga Lexend para títulos/importes destacados y Source Sans 3 para lectura y controles, desde `src/assets/fonts/`; se conservan sus licencias OFL. Los importes y pesos usan cifras tabulares. La escala de trabajo prioriza 14–16 px en etiquetas y cuerpo, 18–20 px en títulos de sección, 24–30 px en encabezados y cifras de 24–72 px donde el flujo operativo lo justifica. El espaciado parte de 4, 8, 12, 16, 24 y 32 px. Los controles comunes usan radio de 8 px; tarjetas 12 px; diálogos 12–16 px. Se reservan sombras para diálogos; las superficies se separan por borde y espacio.

## Componentes disponibles

| Componente | Ubicación | Contrato |
|---|---|---|
| `Button` | `src/components/ui/button.tsx` | `variant` primary/secondary/quiet/danger, `size` default/touch, atributos nativos y `disabled` |
| `Card` | `src/components/ui/card.tsx` | Superficie y borde compartidos; contenido/composición del consumidor |
| `StatusBadge` | `src/components/ui/status-badge.tsx` | Estado neutral/success/warning/error/info con texto explícito |
| `Dialog` | `src/components/ui/dialog.tsx` | `<dialog>` nativo, foco inicial, Escape, retorno de foco, `labelledBy` obligatorio |
| `ProductGrid` | `src/components/pos/burgers/product-grid.tsx` | Datos reales, imagen opcional, categoría y callbacks; no calcula venta |
| `Cart` | `src/components/pos/burgers/cart.tsx` | Recibe importes de `useBurgerSale`; ticket desplazable y resumen móvil |
| `ModifierModal`, `PaymentModal` | `src/components/pos/burgers/` | Selección y captura visual; importes finales y venta permanecen en flujo existente |
| `AcaiOrderSummary` | `src/components/pos/acai/order-summary.tsx` | Recibe carrito, guardas y callbacks; resumen lateral o móvil sin cálculo comercial |
| `CashGate` | `src/components/pos/cash-gate.tsx` | Presenta estado de caja de `useCashSession`, sin alterar apertura |

Crear primitivas adicionales solo para consumidores reales; evitar tres versiones de un mismo botón o tarjeta. Conservar API y estado comercial fuera de las piezas visuales. `src/app/pase-de-cocina.css` aloja tokens, grid de catálogo y reglas de área segura. `tailwind.config.js` mapea nombres semánticos a variables CSS mediante clases literales detectables por Tailwind 3. Los estilos anteriores siguen activos en rutas no migradas.

## ERP y POS

- **ERP:** `/` y `/admin` usan superficies claras, encabezados y módulos por tarea. El inicio conserva `ALL_MODULES.showWhen` y los endpoints de ventas, alertas y caja. La navegación no sustituye permisos de middleware/API.
- **Burger:** `/burgers` usa rojo de acción y catálogo de tarjetas con foto opcional. El total y cobro permanecen accesibles mientras el ticket se desplaza; móvil usa barra persistente y diálogo de pedido. `useBurgerSale` conserva cantidades, modificadores, descuentos y totales.
- **Açaí:** `/acai` usa morado de acción, visor oscuro de lectura y diferencia lectura estable de peso confirmado. El resumen móvil es expandible. La confirmación conserva el `disabled={!isStable || weight <= 0.05}` actual y el cobro conserva `cart.total > 0 && (!hasBowl || cart.weightConfirmed)`. Se permiten extras sin bowl como antes. `useScale` y `useAcaiSale` no se cambiaron.

## Accesibilidad y responsive

Verificar 375, 768, 1024 y 1440 px. Acciones frecuentes del POS tienen objetivo de 48 CSS px cuando corresponde. Toda acción iconográfica necesita nombre accesible; los diálogos tienen título, foco gestionado, Escape y retorno al disparador. La barra móvil reserva `env(safe-area-inset-bottom)` y el contenido deja espacio inferior para no quedar tapado. Mantener texto y estado además del color; no inferir “offline” por tener ventas pendientes ni “sincronizado” por estar la cola vacía. Respetar `prefers-reduced-motion`.

## Migración pendiente

Las páginas de `src/app/inventory/`, `factory/`, `expenses/`, `admin/*` y las vistas de reporte/formulario aún usan estilos propios. Migrarlas por lotes después de validar permisos, hardware, caja y offline con entornos aislados. No retirar reglas antiguas antes de revisar sus consumidores. La matriz de etapas, riesgos y aceptación está en `design/prototypes/pase-de-cocina/PHASE-3-PLAN.md`.
