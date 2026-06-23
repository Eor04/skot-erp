# CONTEXTO.md — Skot ERP

> Documento de referencia completo del proyecto. Actualizar en cada sesión importante.
> **Última actualización: 2026-06-22**

---

## 1. ¿Qué es Skot ERP?

Sistema de gestión empresarial multi-sucursal para la marca **Skot** (Bolivia). Opera:
- 🥤 **Skot Açaí** — Puntos de venta de bowls de açaí por peso (balanza Prix 4)
- 🍔 **Skot Burgers** — Puntos de venta de hamburguesas con modificadores y combos (Arquitectura "Cocina en Vivo")
- 🏭 **Fábrica / Almacén** — Planta de producción, recetas (BOM) y distribución a sucursales

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

> Repo: `c:\Users\hp\Documents\skot-erp`
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
| `WAREHOUSE` | Fábrica: producción, recetas, inventario, pedidos internos |

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
| `ProductType` | `ACAI_BASE`, `ACAI_TOPPING`, `BURGER`, `BURGER_EXTRA`, `BEVERAGE`, `RAW_MATERIAL`, `PACKAGING` |
| `PaymentMethod` | `CASH`, `CARD`, `TRANSFER`, `MIXED` |
| `ProductionOrderStatus` | `DRAFT`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `TransferStatus` | `PENDING`, `IN_TRANSIT`, `RECEIVED`, `CANCELLED` |
| `InventoryStatus` | `AVAILABLE`, `RESERVED`, `IN_TRANSIT` |
| `SyncStatus` | `PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED` |
| `PurchaseOrderStatus` | `PENDING`, `SENT`, `PARTIAL`, `RECEIVED`, `CANCELLED` |

> ⚠️ `BURGER_EXTRA` representa extras/porciones vendibles en el POS (papas, tocino). `PACKAGING` representa empaques (vasos, tapas) rastreables en inventario.

### Labels en español para la UI
El archivo `src/lib/constants.ts` centraliza todos los labels:
- `PRODUCT_TYPE_LABELS` — traduce los types de producto al español para la UI
- `MOVEMENT_TYPE_LABELS` — traduce tipos de movimiento de kardex
- `ROLE_LABELS` — traduce roles de usuarios
- `PAYMENT_LABELS` — traduce métodos de pago (TRANSFER = QR)
- `CURRENCY = 'Bs.'` y `money(amount)` — helper para formatear moneda

### Modelos principales

#### `Product`
`id, name, sku (unique), type (ProductType), unit, imageUrl, category, active`
Relaciones: `Inventory[]`, `BranchProduct[]`, `Recipe[]`, `StockMovement[]`

#### `Recipe` y `RecipeIngredient` (BOM)
Relaciona un producto final con su materia prima y/o empaques. Usado tanto en la Fábrica para Órdenes de Producción como en el POS para "Recetas Dinámicas".

#### `Sale` → `SaleItem` → `SaleItemModifier`
Ventas con soporte para pago mixto (efectivo + tarjeta + transferencia/QR). Campos clave: `totalAmount`, `cashAmount`, `cardAmount`, `transferAmount`, `paymentMethod`, `deletedAt`.
> **Recetas Dinámicas:** Al realizar la venta (`POST /api/pos/sale`), si el producto tiene receta, el sistema descuenta los insumos detallados directamente del inventario local.

#### `CashRegisterClose`
Cierre de caja. Campos adicionales: `openedAt`, `closedAt`, `openedBy`, `sessionStatus` (`OPEN` | `CLOSED`).

#### `StockMovement` (Kardex)
Registro inmutable de todos los movimientos. Tipos: `ENTRADA`, `SALIDA`, `AJUSTE`, `MERMA`, `PRODUCCION`, `TRANSFER_IN`, `TRANSFER_OUT`. Las ventas dinámicas generan salidas de insumos crudos registradas aquí.

#### `PurchaseOrder` → `PurchaseOrderItem`
Pedidos a proveedores externos. Al marcar como `RECEIVED` se incrementa el inventario de la sucursal y se registra en el Kardex atómicamente.

---

## 4. Estructura de Carpetas (estado actual)

```
src/
├── app/
│   ├── page.tsx                    # Dashboard principal (condicional por rol)
│   ├── login/page.tsx              # Página de login
│   ├── (pos)/                      # POS de sucursales
│   │   ├── acai/page.tsx           # POS Açaí (balanza + carrito)
│   │   ├── burgers/page.tsx        # POS Burgers (list layout + combos)
│   │   └── cash-close/page.tsx     # Cierre de caja (abrir/cerrar sesión)
│   ├── factory/                    # Módulo Fábrica
│   │   ├── page.tsx                # Dashboard fábrica con KPIs
│   │   ├── production/page.tsx     # Órdenes de producción
│   │   ├── recipes/                # Catálogo de Recetas con SearchableSelect
│   │   └── materials/page.tsx      # Inventario de Materia Prima en fábrica
│   ├── inventory/                  # Módulo Inventario
│   │   ├── stock/, transfers/, internal-orders/, movements/, suggestions/, mermas/
│   ├── expenses/page.tsx           # Registro de gastos por sucursal
│   ├── admin/
│   │   ├── products/, branches/, users/, sales/, analytics/, alerts/, scale-config/
│   └── api/
│       ├── auth/, admin/, factory/, inventory/, cash-close/, pos/, expenses/
├── components/
│   ├── pos/burgers/                # ProductList, Cart, ModifierModal, PaymentModal
│   ├── ui/searchable-select.tsx    # Select personalizado con filtro
│   └── offline-banner.tsx
├── hooks/
│   ├── use-acai-sale.ts            # Carrito açaí
│   ├── use-burger-sale.ts          # Carrito burgers (mutación doble-clic corregida)
│   ├── use-scale.ts                # Balanza Prix 4
│   └── use-sync-queue.ts           # Cola offline
└── lib/
    ├── prisma.ts, auth.ts, session-context.tsx, constants.ts, require-role.ts
```

---

## 5. APIs — Referencia Rápida

| Endpoint | Método | Body / Notas |
|---|---|---|
| `/api/inventory/internal-orders/[id]/approve` | **POST** | `{ approvedBy, status? }` — status='CANCELLED' para rechazar |
| `/api/inventory/internal-orders/[id]/dispatch` | **POST** | `{ dispatchedBy, items: [{itemId, dispatchedQty}] }` |
| `/api/inventory/internal-orders/[id]/receive` | **POST** | `{ receivedBy, items: [{itemId, receivedQty}] }` |
| `/api/inventory/transfers/[id]/approve` | **PATCH** | `{ approvedBy }` |
| `/api/inventory/transfers/[id]/receive` | **PATCH** | `{ receivedBy }` → acredita stock en destino + kardex |
| `/api/pos/sale` | **POST** | Registra venta, y descuenta MP al vuelo si detecta **Receta Dinámica** |
| `/api/admin/products` | **GET** | Protegido con `middleware.ts`. Accesible por ADMIN, MANAGER, WAREHOUSE. |

### API de ventas y Centralizador (Timezone Aware)
`GET /api/admin/sales?branchId=&from=&to=&limit=&offset=`
Corrige el desfase de Timezone inyectando fechas locales del cliente.

---

## 6. Flujos de Negocio Completos

### Flujo de Venta Açaí
```
Cajero inicia sesión → ve solo POS Açaí de su sucursal
  → Coloca bowl en balanza Prix 4 (Web Serial API)
  → Sistema lee peso automáticamente
  → Selecciona método de pago
  → API POST /api/pos/sale → descuenta empaques/stock + registro kardex
```

### Flujo de Venta Burgers (Cocina en Vivo)
```
Cajero inicia sesión → ve POS Burgers de su sucursal
  → Selecciona producto en el catálogo (formato Lista scrolleable)
  → Modal de modificadores o Extras
  → Modal de pago (efectivo/tarjeta/QR/mixto)
  → Calcula vuelto automáticamente
  → API POST /api/pos/sale lee receta (ej. 1 Pan, 1 Carne, 1 Queso) y descuenta Insumos directamente
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

## 7. Páginas Principales

### `/admin/analytics` — Analytics y Reportes
Filtros por Período y Sucursal. Gráficos de ventas y KPIs de métodos de pago. Las consultas SQL fueron ajustadas para considerar la zona horaria (Timezone Fix).

### `/admin/products` — Catálogo de Productos
CRUD de productos globales. Ahora los tipos están estrictamente tipados (BURGER, BURGER_EXTRA, RAW_MATERIAL, PACKAGING) para que el routing al POS no envíe productos equivocados (ej. evitar que las hamburguesas salgan en el POS de Açaí).

### `/factory/recipes` — Recetas
El módulo para construir el BOM (Bill of Materials). Implementa el nuevo `<SearchableSelect />` para encontrar insumos filtrando por nombre en lugar de un `select` nativo blanco, mejorando la UX.

### `/inventory/movements` — Kardex
Filtros por tipo, sucursal, fechas. Columna `ant. → nuevo` stock para auditoría estricta. Las ventas dinámicas de la sucursal Burgers se reportan aquí directamente como "Salida (Receta Dinámica)".

---

## 8. Decisiones Técnicas Importantes

| Decisión | Justificación |
|---|---|
| **Recetas Dinámicas en POS** | Elimina la necesidad de "Órdenes de Producción" en el local de Fast-Food. Permite controlar stock crudo al instante. |
| **Searchable Select Custom** | Resuelve el bug de Windows donde el `<select>` nativo fuerza fondo blanco en dark mode. |
| **Middlewares sobre Roles** | Se añadió `WAREHOUSE` al middleware de `/api/admin/products` para que Fábrica pueda ver el catálogo al armar recetas. |
| **List Layout en Burgers** | Las hamburguesas tienen nombres muy largos ("Combo Junior + Porción papas"). El formato Grid los cortaba. El formato Lista permite scrollear y leer. |

---

## 9. Estado Actual del Sistema (Actualizado a 2026-06-22)

### ✅ Completado y funcional

| Módulo | Estado |
|---|---|
| Login / Sesión / Roles | ✅ |
| POS Açaí (balanza + carrito) | ✅ |
| POS Burgers (List Layout + combos + **Cocina en Vivo**) | ✅ Descuenta materia prima al vuelo vía receta |
| Cierre de caja (abrir/cerrar sesión) | ✅ Completo con desglose por cajero |
| Catálogo de productos global (CRUD) | ✅ BURGER_EXTRA y PACKAGING incluidos |
| Analytics con Timezone Fix | ✅ Gráficos precisos a hora local |
| Pedidos a Proveedores (Purchase Orders) | ✅ Completo + actualiza inventario al recibir |
| Kardex (movimientos de stock) | ✅ Filtros tipo+fecha+búsqueda, exportación CSV con BOM |
| Transferencias (crear + aprobar + recibir) | ✅ recepción acredita stock |
| Pedidos internos | ✅ |
| Producción fábrica (crear + completar con transacción) | ✅ |
| Recetas de producción | ✅ Con SearchableSelect |
| Sistema offline (IndexedDB + sync queue) | ✅ Integrado en hooks de POS |
| Balanza Prix 4 (Web Serial API) | ✅ Integrado en POS UI |
| **Registro de Mermas** | ✅ `/inventory/mermas` — formulario, KPIs del día, historial |

### 🔲 Blocker Principal para Producción Total

| Item | Notas |
|---|---|
| **Integración Facturación Electrónica (SIN)** | 🔲 Pendiente (Generar CUFD, firmar XMLs) — blocker principal legal para Bolivia |

---

## 10. Correcciones y Optimizaciones Recientes (2026-06-22)

### 🍔 POS Burgers: Cálculos y Arquitectura
- **Recetas Dinámicas (Cocina en Vivo):** Se modificó `api/pos/sale/route.ts` para leer la tabla `Recipe`. Al vender un producto, si este tiene receta, deduce los `RecipeIngredient` (Materia prima) del inventario local. Si no tiene, deduce el producto final.
- **Double-Click Cart Fix:** Corregido un error en `use-burger-sale.ts` donde un doble clic rapidísimo sobre un producto ocasionaba que se sumara x2 pero de manera asíncrona corrupta, perdiendo el rastreo de cantidades exactas en React state.
- **Layout de Lista:** El Grid View fue reemplazado por un List View para los productos en el POS Burgers, evitando textos recortados.

### 🏭 UI y Permisos de Fábrica
- **Filtro Select:** Se introdujo `SearchableSelect` en la creación y edición de recetas.
- **Middleware WAREHOUSE:** Se corrigió el bug de "dropdowns en blanco" que sucedía porque el rol `WAREHOUSE` estaba siendo bloqueado por el middleware al intentar consultar la lista de productos (`GET /api/admin/products`).

### 📊 Reportes Zonas Horarias
- **Timezone Fix en Analytics:** Se corrigió un bug grave en `/api/admin/sales` y el Dashboard donde las ventas de la tarde/noche "desaparecían" del reporte de "Hoy" debido al desfase de horas entre la UI (Local Time) y la Base de Datos Postgres (UTC). Ahora las fechas viajan normalizadas desde el cliente.