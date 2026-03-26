# CONTEXTO.md — Skot ERP

> Documento de referencia completo del proyecto. Actualizar en cada sesión importante.
> **Última actualización: 2026-03-17**

---

## 1. ¿Qué es Skot ERP?

Sistema de gestión empresarial multi-sucursal para la marca **Skot** (Bolivia). Opera:
- 🥤 **Skot Açaí** — Puntos de venta de bowls de açaí por peso (balanza Prix 4)
- 🍔 **Skot Burgers** — Puntos de venta de hamburguesas con modificadores y combos
- 🏭 **Fábrica / Almacén** — Planta de producción y distribución a sucursales

**Moneda: Bolivianos (Bs.)**

**Stack tecnológico:**
| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| Base de datos | PostgreSQL (Neon en producción, local en desarrollo) |
| ORM | Prisma 5.22 |
| UI | Tailwind CSS + Lucide React |
| Estado async | TanStack Query v5 |
| Offline | IndexedDB (idb-keyval) |
| Balanza | Web Serial API (Prix 4) |
| Imágenes | Cloudinary |
| Reportes | jsPDF + AutoTable |
| Charts | Recharts |
| Auth hashing | bcryptjs |

**Variables de entorno (.env):**
```env
DATABASE_URL=postgresql://postgres:12345678@localhost:5432/SkotDB
DIRECT_URL=postgresql://postgres:12345678@localhost:5432/SkotDB
NODE_ENV=development
JWT_SECRET=skot-erp-jwt-secret-local-2026
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=Skot
CLOUDINARY_API_KEY=482798597671274
CLOUDINARY_API_SECRET=q0oiA5glTBdHi0QV9nFVft0QQZw
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=skot-products
# Para producción (Neon): usar pgbouncer=true en DATABASE_URL
```

> Repo: `c:\Users\Orihuela\Desktop\Skot`
> Dev: `npm run dev` → `localhost:3000`

---

## 2. Sistema de Autenticación y Roles

### Sistema de Login implementado
- **Página:** `/login` — formulario email + contraseña
- **API:** `POST /api/auth/login` — valida usuario con bcrypt, retorna cookie de sesión
- **API:** `GET /api/auth/me` — devuelve el usuario actual
- **API:** `POST /api/auth/logout` — borra la cookie
- **Contexto:** `src/lib/session-context.tsx` — `useSession()` hook disponible en toda la app

### Roles y acceso

| Rol | Acceso |
|---|---|
| `ADMIN` | Todo el sistema, todas las sucursales |
| `MANAGER` | Dashboard de su sucursal, inventario, pedidos, reportes |
| `CASHIER` | Solo POS de su sucursal, inventario y cierre de caja de su sucursal |
| `WAREHOUSE` | Fábrica: producción, inventario, pedidos internos |

### Dashboard condicional por rol
- **Cajero**: ve solo POS (de su sucursal: Açaí, Burgers o Fábrica según rama asignada), Inventario y Cierre de Caja de su sucursal
- **Admin/Manager**: ve panel completo con Analytics, Sucursales, Ventas, etc.
- La lógica de routing se basa en `user.role` y `user.branches[0].type` obtenidos del hook `useSession()`

### Tabla `UserBranch`
Relación muchos-a-muchos entre usuarios y sucursales. Un cajero puede estar en múltiples sucursales pero su dashboard se filtra por la primera asignada (o la que corresponda según el login).

---

## 3. Base de Datos — Schema Prisma

### ENUMs actuales

| Enum | Valores |
|---|---|
| `UserRole` | `ADMIN`, `MANAGER`, `CASHIER`, `WAREHOUSE` |
| `BranchType` | `ACAI`, `HAMBURGUESAS`, `FABRICA` |
| `ProductType` | `ACAI_BASE`, `ACAI_TOPPING`, `BURGER`, `BURGER_EXTRA`, `BEVERAGE`, `RAW_MATERIAL` |
| `PaymentMethod` | `CASH`, `CARD`, `TRANSFER`, `MIXED` |
| `ProductionOrderStatus` | `DRAFT`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `TransferStatus` | `PENDING`, `IN_TRANSIT`, `RECEIVED`, `CANCELLED` |
| `InventoryStatus` | `AVAILABLE`, `RESERVED`, `IN_TRANSIT` |
| `SyncStatus` | `PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED` |
| `PurchaseOrderStatus` | `PENDING`, `SENT`, `PARTIAL`, `RECEIVED`, `CANCELLED` |

> ⚠️ `BURGER_EXTRA` es nuevo (añadido 2026-03-02). Representa extras/porciones vendibles en el POS de hamburguesas (papas, chorizo, porciones de carne extra) que también tienen inventario.

### Labels en español para la UI
El archivo `src/lib/constants.ts` centraliza todos los labels:
- `PRODUCT_TYPE_LABELS` — traduce los types de producto al español para la UI
- `MOVEMENT_TYPE_LABELS` — traduce tipos de movimiento de kardex
- `ROLE_LABELS` — traduce roles de usuarios
- `PAYMENT_LABELS` — traduce métodos de pago
- `CURRENCY = 'Bs.'` y `money(amount)` — helper para formatear moneda

### Modelos principales

#### `User`
`id, email, name, password (bcrypt), role (UserRole), active, createdAt, deletedAt`
Relaciones: `UserBranch[]`, `Sale[]`, `CashRegisterClose[]`

#### `Branch`
`id, name, type (BranchType), address, phone, active, requireCashClose, settings (Json)`
Relaciones: `UserBranch[]`, `Inventory[]`, `Sale[]`, `StockTransfer[]`, `ProductionOrder[]`

#### `Product`
`id, name, sku (unique), type (ProductType), unit, imageUrl, category, active`
Relaciones: `Inventory[]`, `BranchProduct[]`, `Recipe[]`, `StockMovement[]`

#### `BranchProduct`
Tabla intermedia Producto-Sucursal. Campos: `customPrice` (precio especial por sucursal), `pricePerKg` (para açaí por peso), `isAvailable`.
> ⚠️ En la API `/api/pos/products`, el campo `price` es alias de `customPrice` para compatibilidad con los hooks de venta.

#### `Inventory`
`id, branchId, productId, currentStock, minStock, maxStock, status, cost`
Restricción única: `[branchId, productId]`

#### `Sale` → `SaleItem` → `SaleItemModifier`
Ventas con soporte para pago mixto (efectivo + tarjeta + transferencia). Campos clave: `totalAmount`, `cashAmount`, `cardAmount`, `transferAmount`, `paymentMethod`, `deletedAt`.

#### `CashRegisterClose`
Cierre de caja. Campos adicionales: `openedAt`, `closedAt`, `openedBy`, `sessionStatus` (`OPEN` | `CLOSED`).
- Se **abre** con `POST /api/cash-close/open`
- Se **cierra** con `POST /api/cash-close` (busca la sesión abierta y la cierra)

#### `StockTransfer` → `StockTransferItem`
Transferencias entre sucursales. Estados: `PENDING → IN_TRANSIT → RECEIVED → CANCELLED`

#### `StockMovement` (Kardex)
Registro inmutable de todos los movimientos. Tipos: `ENTRADA`, `SALIDA`, `AJUSTE`, `MERMA`, `PRODUCCION`, `TRANSFER_IN`, `TRANSFER_OUT`.
> La API `/api/inventory/movements` devuelve `{ data: { movements: [], totals: {} } }` — no un array plano.

#### `InternalOrder` → `InternalOrderItem`
Pedidos internos de sucursales a fábrica. Estados: `PENDING → APPROVED → DISPATCHED → RECEIVED → CANCELLED`

#### `PurchaseOrder` → `PurchaseOrderItem`
Pedidos a proveedores externos. Campos: `orderNumber`, `supplier`, `totalAmount`, `expectedDate`, `receivedDate`. Estados: `PENDING → SENT → PARTIAL → RECEIVED → CANCELLED`.
Al marcar como `RECEIVED` se incrementa el inventario de la sucursal y se registra en el Kardex atómicamente.

#### `ProductionOrder`
Órdenes de producción en fábrica. Estados: `DRAFT → SCHEDULED → IN_PROGRESS → COMPLETED → CANCELLED`

---

## 4. Estructura de Carpetas (estado actual)

```
src/
├── app/
│   ├── page.tsx                    # Dashboard principal (condicional por rol)
│   ├── login/page.tsx              # Página de login
│   ├── (pos)/                      # POS de sucursales
│   │   ├── acai/page.tsx           # POS Açaí (balanza + carrito + toppings)
│   │   ├── burgers/page.tsx        # POS Burgers (grid táctil + modificadores)
│   │   ├── factory/page.tsx        # POS Fábrica
│   │   └── cash-close/page.tsx     # Cierre de caja (abrir/cerrar sesión)
│   ├── factory/                    # Módulo Fábrica
│   │   ├── page.tsx                # Dashboard fábrica con KPIs
│   │   ├── production/page.tsx     # Órdenes de producción
│   │   ├── recipes/page.tsx        # Recetas
│   │   └── materials/page.tsx      # Inventario de Materia Prima en fábrica
│   ├── inventory/                  # Módulo Inventario
│   │   ├── page.tsx                # Dashboard inventario
│   │   ├── stock/page.tsx          # Stock por sucursal (edición inline)
│   │   ├── transfers/page.tsx      # Transferencias entre sucursales
│   │   ├── internal-orders/page.tsx # Pedidos internos a fábrica
│   │   ├── movements/page.tsx      # Kardex
│   │   └── suggestions/page.tsx    # Sugerencias de reabasto
│   ├── expenses/page.tsx           # Registro de gastos por sucursal
│   ├── admin/
│   │   ├── page.tsx                # Dashboard admin
│   │   ├── products/page.tsx       # Catálogo global de productos (CRUD)
│   │   ├── branches/page.tsx       # Sucursales (CRUD)
│   │   ├── branches/[id]/page.tsx  # Panel detalle de sucursal
│   │   ├── users/page.tsx          # Usuarios (CRUD)
│   │   ├── sales/page.tsx          # Historial de ventas con filtros
│   │   ├── analytics/page.tsx      # Analytics y reportes con filtros
│   │   ├── purchase-orders/page.tsx # Gestión de Pedidos a Proveedores
│   │   └── alerts/page.tsx         # Alertas de stock bajo
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts      # POST login
│       │   ├── logout/route.ts     # POST logout
│       │   └── me/route.ts         # GET usuario actual
│       ├── admin/
│       │   ├── products/route.ts   # GET + POST productos
│       │   ├── branches/route.ts   # GET + POST sucursales
│       │   ├── branches/[id]/route.ts    # PATCH + DELETE sucursal
│       │   ├── branches/[id]/overview/route.ts  # GET resumen de sucursal
│       │   ├── users/route.ts      # GET + POST usuarios
│       │   ├── users/[id]/route.ts # PATCH + DELETE usuario
│       │   ├── sales/route.ts      # GET ventas (filtra por branchId, from, to)
│       │   └── purchase-orders/... # GET, POST, PATCH (cambio estado / recibe stock)
│       ├── factory/
│       │   ├── production/route.ts
│       │   ├── production/[id]/complete/route.ts
│       │   └── recipes/route.ts
│       ├── inventory/
│       │   ├── transfers/route.ts
│       │   ├── transfers/[id]/approve/route.ts   # PATCH aprobar → IN_TRANSIT
│       │   ├── transfers/[id]/cancel/route.ts    # PATCH cancelar
│       │   ├── transfers/[id]/receive/route.ts   # PATCH confirmar recepción + stock
│       │   ├── movements/route.ts               # Retorna { data: { movements, totals } }
│       │   ├── stock/adjust/route.ts            # POST ajuste de stock + kardex
│       │   ├── suggestions/route.ts
│       │   └── internal-orders/
│       │       ├── route.ts                     # GET + POST
│       │       ├── [id]/approve/route.ts        # POST (acepta status:'CANCELLED' para rechazar)
│       │       ├── [id]/dispatch/route.ts       # POST con { dispatchedBy, items[] }
│       │       └── [id]/receive/route.ts        # POST con { receivedBy, items[] }
│       ├── cash-close/
│       │   ├── route.ts            # GET sesión activa / POST cierre
│       │   └── open/route.ts       # POST apertura de caja
│       ├── pos/
│       │   └── products/route.ts   # GET productos por branchId (price = alias de customPrice)
│       └── expenses/route.ts       # GET + POST gastos
├── components/
│   ├── pos/burgers/                # ProductGrid, Cart, ModifierModal, PaymentModal
│   └── offline-banner.tsx
├── hooks/
│   ├── use-acai-sale.ts            # Carrito açaí
│   ├── use-burger-sale.ts          # Carrito burgers
│   ├── use-scale.ts                # Balanza Prix 4
│   ├── use-sync-queue.ts           # Cola offline
│   └── use-network-status.ts
└── lib/
    ├── prisma.ts
    ├── auth.ts                     # Helpers de sesión (cookies)
    ├── session-context.tsx         # useSession() hook
    ├── constants.ts                # CURRENCY='Bs.', PRODUCT_TYPE_LABELS, etc.
    └── utils/export.ts             # Exportar PDF/CSV
```

---

## 5. APIs — Referencia Rápida

### ⚠️ Métodos HTTP importantes (no confundir)

| Endpoint | Método | Body |
|---|---|---|
| `/api/inventory/internal-orders/[id]/approve` | **POST** | `{ approvedBy, status? }` — status='CANCELLED' para rechazar |
| `/api/inventory/internal-orders/[id]/dispatch` | **POST** | `{ dispatchedBy, items: [{itemId, dispatchedQty}] }` |
| `/api/inventory/internal-orders/[id]/receive` | **POST** | `{ receivedBy, items: [{itemId, receivedQty}] }` |
| `/api/inventory/transfers/[id]/approve` | **PATCH** | `{ approvedBy }` |
| `/api/inventory/transfers/[id]/cancel` | **PATCH** | `{ approvedBy }` |
| `/api/inventory/transfers/[id]/receive` | **PATCH** | `{ receivedBy }` → acredita stock en destino + kardex |
| `/api/cash-close/open` | **POST** | `{ branchId, userId, openingCash }` |
| `/api/cash-close` | **POST** | Cierra sesión abierta existente |

### API de ventas (admin)
`GET /api/admin/sales?branchId=&from=&to=&limit=&offset=`
Retorna: `{ data: Sale[], pagination: {}, summary: { totalAmount, cashTotal, cardTotal, transferTotal } }`

### API de alertas de stock (polling)
`GET /api/inventory/alerts`
Retorna: `{ success: true, data: { summary: { critical, totalLowStock, totalExpiring } } }`
Usado por `useStockAlerts` para el <NotificationBell /> global en toda la aplicación.

### API de productos (POS)
`GET /api/pos/products?branchId=&type=`
Retorna productos con: `{ id, name, price (=customPrice), pricePerKg, customPrice, type, unit }`
> `price` es alias de `customPrice` para compatibilidad con `use-acai-sale.ts` y `use-burger-sale.ts`

### API de movimientos (Kardex)
`GET /api/inventory/movements?branchId=&type=&from=&to=`
Retorna: `{ success, data: { movements: [], totals: {} } }` — NO un array plano

### API de analytics
`GET /api/admin/sales?branchId=&from=&to=&limit=500` + agrupado en el frontend

---

## 6. Flujos de Negocio Completos

### Flujo de Venta Açaí
```
Cajero inicia sesión → ve solo POS Açaí de su sucursal
  → Coloca bowl en balanza Prix 4 (Web Serial API)
  → Sistema lee peso automáticamente
  → Selecciona toppings (se suman por kg)
  → Selecciona método de pago
  → API POST /api/pos/sale → descuenta stock + registro kardex
```

### Flujo de Venta Burgers
```
Cajero inicia sesión → ve POS Burgers de su sucursal
  → Selecciona producto en grid táctil
  → Modal de modificadores
  → Descuento (>15% requiere MANAGER/ADMIN)
  → Modal de pago (efectivo/tarjeta/QR/mixto)
  → Calcula vuelto automáticamente
```

### Flujo de Transferencia (Fábrica → Sucursal)
```
Usuario crea transferencia en /inventory/transfers
  → Estado: PENDING
  → Admin/Manager ve botón "Aprobar" → estado: IN_TRANSIT  [PATCH /approve]
  → Sucursal destino ve botón "Confirmar recepción"         [PATCH /receive]
  → Estado: RECEIVED — stock acreditado automáticamente en destino + kardex
```

### Flujo de Pedido Interno (Sucursal solicita a Fábrica)
```
Sucursal crea pedido en /inventory/internal-orders
  → Estado: PENDING
  → Admin/Manager: "Aprobar"   [POST /approve]  → estado: APPROVED
  → Fábrica: "Despachar"       [POST /dispatch con items[]] → estado: DISPATCHED + descuenta stock fábrica
  → Sucursal: "Confirmar rec." [POST /receive  con items[]] → estado: RECEIVED + acredita stock sucursal
```

### Flujo de Cierre de Caja
```
Cajero abre caja → POST /api/cash-close/open
  → Registra sesión con openedAt, openedBy, openingCash
  → Durante el día: ventas se registran normalmente
  → Al finalizar: POST /api/cash-close
  → Busca sesión OPEN, calcula ventas del período
  → Registra closedAt, totalSales, closingCash, sessionStatus=CLOSED
  → Admin puede ver historial detallado con horarios
```

### Flujo de Producción Fábrica
```
Operario crea Orden de Producción (receta + cantidad)
  → Sistema valida materia prima disponible
  → Al "Completar": transacción Prisma atómica
      ① Descuenta materia prima del inventario fábrica
      ② Registra KARDEX de consumo por ingrediente
      ③ Agrega producto terminado al inventario
      ④ Registra KARDEX de producción
      ⑤ Orden → COMPLETED
```

---

## 7. Páginas de Administrador

### `/admin` — Dashboard Admin
Métricas del día: ventas totales, número de transacciones, efectivo vs. tarjeta.
Acceso rápido a todos los módulos.

### `/admin/branches` — Sucursales
CRUD completo. Cada tarjeta tiene botón **"Ver panel"** → `/admin/branches/[id]`

### `/admin/branches/[id]` — Panel de Sucursal
Vista de resumen de una sucursal: ventas recientes, stock crítico, historial de cierres de caja.
API: `GET /api/admin/branches/[id]/overview`

### `/admin/analytics` — Analytics y Reportes
Filtros:
- **Período:** Hoy, 7d, 14d, 30d, Mes, Año
- **Sucursal:** Todas, o selección por nombre (los botones se generan dinámicamente con `/api/admin/branches`)
- Gráfico de ventas (diario o mensual si período = Año)
- KPIs: Total Bs., Nº ventas, Efectivo, Tarjeta, Transferencia
- Exportar CSV/PDF con nombre descriptivo según filtros activos

### `/admin/sales` — Historial de Ventas
Lista paginada con filtros. Muestra desglose de cada venta.

### `/admin/products` — Catálogo de Productos
- CRUD de productos globales
- Categorías (con labels en español): Base Açaí, Topping Açaí, Hamburguesa, **Extra/Porción**, Bebida, Materia Prima, Empaque
- Precios en Bs.

---

## 8. Páginas de Cajero / POS

### `/acai` — POS Açaí
Hook `use-acai-sale.ts`. Productos con `pricePerKg` desde `BranchProduct`. Integración real con API de ventas.
> ⚠️ Maneja productos sin precio (precio 0) mostrando una advertencia banner en UI sin romper el POS.
> ⚠️ Integración real con balanza (Web Serial API).

### `/burgers` — POS Burgers
Hook `use-burger-sale.ts`. Grid táctil, modificadores, **combos**, descuentos. Carrito de compras unificado e integración real a la API.

### `/cash-close` — Cierre de Caja
Sistema de sesiones: tab "Abrir Caja" y tab "Cerrar Caja".
Al abrir queda registro con hora y monto inicial. Al cerrar calcula ventas del período.

### `/expenses` — Gastos
Registro de gastos por sucursal (proveedores, insumos, etc.).

---

## 9. Inventario

### `/inventory/stock` — Stock por Sucursal
Selección de sucursal. Tabla con edición inline:
- Ajustar stock (con motivo: ENTRADA, SALIDA, AJUSTE, MERMA)
- API: `POST /api/inventory/stock/adjust` → actualiza inventario + registra en kardex atómicamente

### `/inventory/transfers` — Transferencias
Botones disponibles según estado:
- **PENDING**: Aprobar ✅ / Rechazar ❌ (solo admin)
- **IN_TRANSIT**: Confirmar recepción 📦 (cualquier usuario)

### `/inventory/internal-orders` — Pedidos Internos
Botones según estado (se generan dinámicamente en la tarjeta del pedido):
- **PENDING**: Aprobar ✅ / Rechazar ❌
- **APPROVED**: Despachar 🚚
- **DISPATCHED**: Confirmar recepción 📦

### `/admin/purchase-orders` — Pedidos a Proveedores
Módulo para registrar compras a proveedores externos. Modal dinámico de selección de productos y cálculo de subtotales.
La recepción de un pedido (`RECEIVED`) actualiza automáticamente el inventario y genera logs en Kardex de tipo `IN`.

### `/inventory/movements` — Kardex
Filtros por tipo, sucursal, fechas. El estado `movements` se extrae de `data.data.movements` (no es array plano).

---

## 10. Tipos de Producto — Clasificación

| `type` en DB | Label UI | ¿Aparece en POS? | ¿En inventario? | Notes |
|---|---|---|---|---|
| `ACAI_BASE` | Base Açaí | ✅ Açaí POS | ✅ | Se vende por peso en balanza |
| `ACAI_TOPPING` | Topping Açaí | ✅ Açaí POS | ✅ | Precio por kg |
| `BURGER` | Hamburguesa | ✅ Burger POS | ✅ | Precio por unidad |
| `BURGER_EXTRA` | Extra / Porción | ✅ Burger POS | ✅ | Papas, chorizo, porciones extra |
| `BEVERAGE` | Bebida | ✅ Ambos POS | ✅ | Agua, gaseosas |
| `RAW_MATERIAL` | Materia Prima | ❌ | ✅ | Pan, carne, tomates — solo inventario/fábrica |

---

## 11. Decisiones Técnicas Importantes

| Decisión | Justificación |
|---|---|
| `price` alias de `customPrice` en API POS | Compatibilidad con los hooks use-acai-sale y use-burger-sale que validan `product.price > 0` |
| 
> Después de cambiar el `schema.prisma`, siempre ejecutar `npx prisma db push` y `npx prisma generate`, luego reiniciar el servidor.

---

## 13. Estado Actual del Sistema (2026-03-25)

### ✅ Completado y funcional

| Módulo | Estado |
|---|---|
| Login / Sesión / Roles | ✅ |
| Dashboard condicional por rol | ✅ Incluye KPI de Caja Activa y NotificationBell |
| POS Açaí (balanza + carrito + toppings) | ✅ API Real conectada |
| POS Burgers (grid + combos + modificadores + **historial de turno**) | ✅ Panel slide-in con total acumulado |
| POS Fábrica | ✅ |
| Cierre de caja (abrir/cerrar sesión) | ✅ Completo con reportes admin + **desglose por cajero** |
| Registro de gastos por sucursal | ✅ |
| Catálogo de productos global (CRUD) | ✅ BURGER_EXTRA y COMBO incluidos |
| Gestión de sucursales (CRUD + panel detalle) | ✅ |
| Gestión de usuarios (CRUD) | ✅ |
| Historial de ventas con filtros | ✅ |
| Analytics con filtro de sucursal y período | ✅ Gráficos Recharts en vivo |
| Pedidos a Proveedores (Purchase Orders) | ✅ Completo + actualiza inventario al recibir |
| Stock por sucursal (edición inline + ajuste) | ✅ API unificada y filtros M.P. |
| Kardex (movimientos de stock) | ✅ **Reescrito** con filtros tipo+fecha+búsqueda, KPIs, exportación CSV con BOM |
| Transferencias (crear + aprobar + recibir) | ✅ recepción acredita stock |
| Pedidos internos (crear + aprobar + despachar + recibir) | ✅ |
| Producción fábrica (crear + completar con transacción) | ✅ Dashboard completo |
| Recetas de producción | ✅ |
| Panel de sucursal para admin | ✅ |
| Sugerencias de reabasto | ✅ |
| Exportar PDF/CSV | ✅ Desde reportes, analytics y **Kardex** |
| Sistema offline (IndexedDB + sync queue) | ✅ Integrado en hooks de POS |
| Balanza Prix 4 (Web Serial API) | ✅ Integrado en POS UI |
| Notificaciones Globales de Stock | ✅ Polling `useStockAlerts` en Header |
| Moneda Bs. en toda la UI | ✅ |
| Labels de tipos en español | ✅ (via constants.ts) |
| **Upload de imágenes (Cloudinary)** | ✅ API `/api/admin/upload-image` + componente `ImageUpload` |
| **Perfil de Usuario** | ✅ `/profile` con tabs: info personal + cambio contraseña con indicador fortaleza |
| **Registro de Mermas** | ✅ `/inventory/mermas` — formulario, KPIs del día, historial |
| **Configuración de Balanza** | ✅ `/admin/scale-config` — puerto/baudRate/tara por sucursal |

### 🔲 Pendiente / Mejorar

| Item | Notas |
|---|---|
| **Integración Facturación Electrónica (SIN)** | 🔲 Pendiente (Generar CUFD, firmar XMLs) — blocker principal para producción |
| **Prisma db push ScaleConfig** | ⚠️ Ejecutar manualmente: `npx prisma db push --accept-data-loss` para crear tabla `scale_configs` |

---

## 14. Mejoras Implementadas — Sesión 2026-03-25

### Alta Prioridad — COMPLETADAS

#### 🔐 Seguridad de APIs (`src/lib/require-role.ts`)
- Creado helper `requireRole(request, roles[])` con aliases `requireAdmin` y `requireAdminOrManager`
- Aplicado a:
  - `POST /api/admin/products` → `requireAdminOrManager`
  - `POST /api/admin/users` → `requireAdmin`
  - `PATCH /api/admin/purchase-orders/[id]` → `requireAdminOrManager`
- Corregido bug en Kardex de pedidos: campos `previousStock`, `newStock`, `notes`, `reference`, `createdBy` ahora coinciden con el schema real de `StockMovement`

#### ☁️ Cloudinary (ya implementado, confirmado)
- API: `POST /api/admin/upload-image` — SDK oficial, transf. 800×800, auto quality/format
- Componente: `<ImageUpload />` — drag & drop, preview, límite 5MB
- `next.config.js` con `res.cloudinary.com` en `remotePatterns`

#### 👤 Perfil de Usuario (ya implementado, confirmado)
- Página `/profile` con tabs: Información personal + Cambio de Contraseña
- API `GET/PUT /api/profile/password` — verifica contraseña actual, hashea con bcrypt
- Indicador de fortaleza en tiempo real (Rojo → Amarillo → Verde)

### Media Prioridad — COMPLETADAS

#### 📋 Historial del Turno en POS Burgers
- Estado `turnHistory: TurnSale[]` acumula ventas exitosas del turno (máx. 20)
- Botón "Turno" con badge contador en el header del POS
- Panel deslizante lateral (slide-in) con lista de ventas, total del turno acumulado y botón limpiar
- Datos por venta: número, hora, método de pago, cantidad de ítems, total

#### 📊 Kardex Mejorado (`/inventory/movements`)
- Filtros: tipo (botones), búsqueda por producto/sucursal/nota, rango de fechas (desde/hasta)
- KPIs: total movimientos, entradas acumuladas, salidas acumuladas
- Columna `ant. → nuevo` stock para auditoría
- **Exportar CSV** con BOM UTF-8 (compatible Excel) incluyendo todos los campos
- Botón "Limpiar filtros" cuando hay filtros activos
- Carga hasta 500 movimientos desde la API

#### 👷 Desglose por Cajero en Cierres de Caja
- Tabla: nueva columna "Cajero" con nombre del usuario que abrió la sesión
- API `GET /api/admin/cash-closes` ahora incluye `user: { id, name, email }` en el `include`
- Cada fila es expandible (click) → muestra desglose: efectivo, tarjeta, transferencia, apertura de caja + notas

### Baja Prioridad — COMPLETADAS

#### 🗑️ Módulo de Mermas (`/inventory/mermas`)
- Formulario: selección de sucursal (ADMIN elige, cajero ve la suya), búsqueda de producto con stock actual
- Campos: cantidad, motivo (`MermaReason` enum: Vencimiento, Daño físico, Diferencia recepción, Producción, Otro), notas
- Validación: cantidad no puede superar el stock disponible
- Al guardar: POST a `/api/inventory/movements` con `type: 'MERMA'` y cantidad negativa → descuenta stock + registra Kardex
- KPIs del día: total unidades dada de baja, productos afectados
- Historial de mermas del turno actual con link al Kardex completo

#### ⚖️ Configuración de Balanza (`/admin/scale-config`)
- Selector de sucursal (filtra tipo ACAI primero)
- Campos: modelo (`modelName`), N° serie, puerto COM (COM1-COM8 + ttyUSB), baud rate, tara en kg
- Toggle de activación de la balanza
- Indicador de si existe config previa o se creará nueva
- API: `GET/POST /api/admin/scale-config` con upsert por `branchId`
- Schema Prisma: modelo `ScaleConfig` con `@@map("scale_configs")` y relación 1-1 con `Branch`
- **Pendiente**: ejecutar `npx prisma db push` para crear la tabla en la DB

---