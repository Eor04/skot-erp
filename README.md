# 🥤🍔 SKOT ERP — Sistema de Gestión Multi-Sucursal

> ERP multi-tenant para la red de tiendas **Skot Açaí** y **Skot Burgers**, con módulo de fábrica, punto de venta offline-first e integración de balanza Prix 4.

---

## 📑 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Arquitectura Tecnológica](#arquitectura-tecnológica)
3. [Estructura de Carpetas](#estructura-de-carpetas)
4. [Módulos del Sistema](#módulos-del-sistema)
5. [Requisitos Previos](#requisitos-previos)
6. [Instalación Local](#instalación-local)
7. [Variables de Entorno](#variables-de-entorno)
8. [Base de Datos](#base-de-datos)
9. [Despliegue en Producción (Vercel + Neon)](#despliegue-en-producción-vercel--neon)
10. [Scripts Disponibles](#scripts-disponibles)
11. [Reglas de Arquitectura](#reglas-de-arquitectura)
12. [Seguridad y Multi-Tenancy](#seguridad-y-multi-tenancy)
13. [Sistema Offline-First](#sistema-offline-first)
14. [Credenciales por Defecto](#credenciales-por-defecto)

---

## Descripción General

**Skot ERP** es un sistema de gestión empresarial construido para redes de tiendas de Açaí y Hamburguesas. Cuenta con:

- **POS táctil** optimizado para tablets (Açaí por peso + Burgers con modificadores)
- **Integración de balanza** Prix 4 para despacho de Açaí
- **Fábrica / Producción** con recetas, órdenes de producción y kardex de movimientos
- **Inventario inteligente** con alertas automáticas y transferencias entre sucursales
- **Sincronización offline-first** para operar sin internet y sincronizar al reconectarse
- **Panel administrativo** con reportes, gestión de productos, usuarios y sucursales

---

## Arquitectura Tecnológica

| Capa | Tecnología |
|---|---|
| **Frontend** | Next.js 14+ (App Router) + TypeScript estricto |
| **Estilos** | Tailwind CSS + shadcn/ui + variantes custom para POS |
| **Estado servidor** | TanStack Query v5 (caching, invalidación, optimistic updates) |
| **Estado cliente** | Zustand (carrito activo, usuario autenticado) |
| **Base de Datos** | PostgreSQL (Neon) + Prisma ORM + Connection Pooling (PgBouncer) |
| **Offline** | IndexedDB via `idb-keyval` + Sync Queue personalizada |
| **Imágenes** | Cloudinary (catálogo de productos) |
| **Reportes** | jsPDF + jsPDF-AutoTable + Recharts |
| **Deploy** | Vercel Pro (Serverless Functions + Edge Network) |

---

## Estructura de Carpetas

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx              # Página de inicio de sesión
│   ├── (dashboard)/
│   │   └── admin/                      # Panel administrativo
│   ├── (pos)/
│   │   ├── acai/page.tsx               # POS Açaí (venta por peso + balanza)
│   │   └── burgers/page.tsx            # POS Burgers (modificadores + carrito)
│   ├── (factory)/                      # Módulo de fábrica y producción
│   ├── inventory/                      # Gestión de inventario
│   └── api/                            # Route Handlers (API REST)
│       ├── auth/
│       ├── products/
│       ├── sales/
│       ├── inventory/
│       └── factory/
│
├── components/
│   ├── ui/                             # Componentes shadcn/ui base
│   ├── pos/
│   │   ├── acai/                       # Componentes exclusivos POS Açaí
│   │   └── burgers/                    # Componentes exclusivos POS Burgers
│   ├── admin/                          # Componentes del panel admin
│   └── scale/                          # Lector de balanza Prix 4
│
├── lib/
│   ├── db.ts                           # Cliente Prisma singleton
│   ├── query-client.ts                 # Configuración TanStack Query + persistencia
│   ├── sync-engine.ts                  # Motor de sincronización offline
│   ├── auth-middleware.ts              # Contexto de usuario y permisos
│   └── scale/                          # Utilidades de comunicación balanza
│
├── hooks/
│   ├── use-burger-sale.ts              # Estado del carrito Burgers
│   ├── use-scale.ts                    # Hook de balanza Prix 4
│   ├── use-network-status.ts           # Detección de conexión
│   └── use-sync-queue.ts              # Gestión de cola offline
│
├── stores/                             # Zustand stores
│   └── use-auth-store.ts
│
└── types/                              # Tipos TypeScript globales
```

---

## Módulos del Sistema

### 🥤 POS Açaí
- Venta por peso con lectura en tiempo real desde balanza Prix 4
- Configuración de precios por sucursal
- Selección visual de toppings
- Soporte offline total

### 🍔 POS Burgers
- Catálogo de productos con imagen
- Selección de modificadores (puntos de cocción, extras, etc.)
- Gestión de carrito con descuentos
- Procesamiento de pagos (efectivo / Yape / tarjeta)

### 🏭 Fábrica / Producción
- Gestión de recetas con cálculo de materia prima necesaria
- Órdenes de producción con seguimiento de estado
- Descuento automático de inventario al completar producción
- Kardex de movimientos de stock

### 📦 Inventario
- Stock en tiempo real por sucursal y ubicación
- Alertas inteligentes (stock bajo / crítico)
- Transferencias entre sucursales con trazabilidad
- Historial de movimientos (entrante, saliente, ajuste, producción)

### 🔧 Panel Admin
- Gestión de usuarios, roles y sucursales
- Catálogo de productos con imágenes (Cloudinary)
- Reportes de ventas con gráficos (Recharts)
- Exportación a PDF y CSV

---

## Requisitos Previos

- **Node.js** 18.17 o superior
- **npm** 9+ (incluido con Node.js)
- **PostgreSQL** 15+ (local) o cuenta en [Neon](https://neon.tech) (producción)
- **Git**

---

## Instalación Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-org/skot-erp.git
cd skot-erp
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales locales (ver sección [Variables de Entorno](#variables-de-entorno)).

### 4. Generar el cliente Prisma

```bash
npm run prisma:generate
```

### 5. Ejecutar migraciones

```bash
npm run prisma:migrate:dev
```

### 6. Poblar la base de datos con datos iniciales

```bash
npm run prisma:seed
```

### 7. Verificar conexión a la base de datos

```bash
npm run test:connection
```

### 8. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en **http://localhost:3000**

---

## Variables de Entorno

Copia `.env.example` como `.env` y completa los valores:

```env
# =============================================
# BASE DE DATOS
# =============================================

# Conexión pooled (para la aplicación — usa PgBouncer)
DATABASE_URL="postgresql://usuario:password@host.neon.tech:5432/skot_db?pgbouncer=true&connection_limit=10&pool_timeout=20"

# Conexión directa (solo para migraciones Prisma — sin pooling)
DIRECT_URL="postgresql://usuario:password@host.neon.tech:5432/skot_db"

# =============================================
# APLICACIÓN
# =============================================

NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# JWT para autenticación
JWT_SECRET="tu-clave-secreta-muy-larga-y-segura"

# =============================================
# CLOUDINARY (imágenes de productos)
# =============================================

CLOUDINARY_CLOUD_NAME="tu-cloud-name"
CLOUDINARY_API_KEY="tu-api-key"
CLOUDINARY_API_SECRET="tu-api-secret"
```

> **⚠️ Importante:** Nunca subas el archivo `.env` al repositorio. Está incluido en `.gitignore`.

### Diferencia entre `DATABASE_URL` y `DIRECT_URL`

| Variable | Uso | PgBouncer |
|---|---|---|
| `DATABASE_URL` | Consultas de la aplicación (serverless) | ✅ Sí (`?pgbouncer=true`) |
| `DIRECT_URL` | Migraciones Prisma (`migrate dev/deploy`) | ❌ No |

---

## Base de Datos

### Modelos Principales

| Modelo | Descripción |
|---|---|
| `User` | Usuarios del sistema con roles |
| `Branch` | Sucursales (tenants) |
| `Product` | Catálogo unificado (Açaí, Burgers, Materia Prima) |
| `Inventory` | Stock por sucursal y ubicación |
| `Sale` / `SaleItem` | Transacciones POS |
| `Recipe` / `RecipeItem` | Recetas de producción |
| `ProductionOrder` | Órdenes de fábrica |
| `StockMovement` | Kardex de movimientos |
| `StockTransfer` | Transferencias entre sucursales |
| `StockAlert` | Alertas de stock bajo/crítico |
| `ScaleConfig` | Configuración de balanza Prix 4 |
| `SyncQueue` | Cola de sincronización offline |

### Tipos de Producto (`ProductType`)

```
ACAI_BASE      → Bases de Açaí (S, M, L, XL)
ACAI_TOPPING   → Toppings (granola, frutas, etc.)
BURGER         → Hamburguesas y combos
BEVERAGE       → Bebidas
RAW_MATERIAL   → Materia prima para producción
```

### Roles de Usuario (`UserRole`)

```
ADMIN       → Acceso total a todas las sucursales
MANAGER     → Gestión de su sucursal
CASHIER     → Solo acceso al POS
WAREHOUSE   → Gestión de inventario y producción
```

### Comandos útiles de Prisma

```bash
npm run prisma:generate        # Generar cliente Prisma
npm run prisma:migrate:dev     # Crear y ejecutar migración (desarrollo)
npm run prisma:migrate:deploy  # Aplicar migraciones en producción
npm run prisma:seed            # Poblar datos de ejemplo
npm run prisma:studio          # Explorador visual (http://localhost:5555)
npm run prisma:reset           # ⚠️ Reiniciar BD (elimina todos los datos)
```

---

## Despliegue en Producción (Vercel + Neon)

### Paso 1: Configurar base de datos en Neon

1. Crear cuenta en [neon.tech](https://neon.tech)
2. Crear nuevo proyecto → Base de datos: `skot_db`
3. Copiar las cadenas de conexión desde el panel de Neon:
   - **Pooled connection** → para `DATABASE_URL`
   - **Direct connection** → para `DIRECT_URL`

### Paso 2: Crear proyecto en Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

O conectar el repositorio desde el [panel de Vercel](https://vercel.com/dashboard).

### Paso 3: Configurar variables de entorno en Vercel

En **Vercel Dashboard → Settings → Environment Variables**, agrega:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | URL pooled de Neon con `?pgbouncer=true` |
| `DIRECT_URL` | URL directa de Neon |
| `JWT_SECRET` | Clave aleatoria segura (mínimo 32 caracteres) |
| `NEXT_PUBLIC_APP_URL` | `https://skot.vercel.app` |
| `CLOUDINARY_CLOUD_NAME` | Tu cloud name de Cloudinary |
| `CLOUDINARY_API_KEY` | Tu API key de Cloudinary |
| `CLOUDINARY_API_SECRET` | Tu API secret de Cloudinary |
| `NODE_ENV` | `production` |

### Paso 4: Ejecutar migraciones en producción

```bash
# Con la DIRECT_URL configurada en tu .env local apuntando a Neon:
npm run prisma:migrate:deploy

# Poblar datos iniciales en Neon:
npm run prisma:seed
```

### Paso 5: Desplegar

```bash
vercel --prod
```

### Configuración recomendada de Vercel (`vercel.json`)

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

---

## Scripts Disponibles

```bash
# Desarrollo
npm run dev                    # Servidor de desarrollo (http://localhost:3000)
npm run build                  # Compilar para producción
npm run start                  # Iniciar servidor de producción

# Base de datos
npm run prisma:generate        # Generar cliente Prisma
npm run prisma:migrate:dev     # Migrar en desarrollo
npm run prisma:migrate:deploy  # Migrar en producción
npm run prisma:seed            # Poblar datos iniciales
npm run prisma:studio          # Explorador visual de BD
npm run prisma:reset           # ⚠️ Resetear BD completa

# Diagnóstico
npm run test:connection        # Verificar conexión a la BD
```

---

## Reglas de Arquitectura

Estas reglas son **obligatorias** para mantener la integridad del sistema:

1. **`branchId` en todas las queries** — Toda consulta de TanStack Query debe incluir el `branchId` activo para garantizar el aislamiento de datos por sucursal.

2. **Offline → SyncQueue** — Toda mutación ejecutada sin conexión debe encolarse en `SyncQueue` (IndexedDB). Se sincroniza automáticamente al recuperar la red.

3. **Sin localStorage para datos sensibles** — Usar siempre **IndexedDB** (via `idb-keyval`) para tokens, datos de venta y cola de sincronización.

4. **POS táctil de alto rendimiento** — El objetivo es ≤ 120ms de respuesta al toque. Usar optimistic updates y evitar re-renders innecesarios.

5. **Separación de módulos** — Factory y POS son módulos independientes, pero **comparten la lógica de inventario** a través de las rutas `/api/inventory/`.

---

## Seguridad y Multi-Tenancy

El aislamiento de datos entre sucursales se implementa a nivel de consulta:

```typescript
import { getUserContext, Permissions } from '@/lib/auth-middleware';

// Obtener sucursales accesibles del usuario
const context = await getUserContext(userId);

// Consultar solo datos de las sucursales permitidas
const sales = await prisma.sale.findMany({
  where: { branchId: { in: context.allowedBranchIds } }
});

// Verificar permisos antes de operar
if (!Permissions.canManageInventory(context.role)) {
  return new Response('Permisos insuficientes', { status: 403 });
}
```

**Comportamiento por rol:**
- `ADMIN` → Accede a todas las sucursales
- `MANAGER` → Solo sus sucursales asignadas
- `CASHIER` → Solo POS de su sucursal
- `WAREHOUSE` → Inventario y producción de su sucursal

---

## Sistema Offline-First

El motor de sincronización (`sync-engine.ts`) gestiona la cola de operaciones pendientes:

```
Venta offline
     ↓
IndexedDB (SyncQueue)  ←── prioridad: SALE > INVENTORY > CLOSURE
     ↓
Reconexión detectada (use-network-status.ts)
     ↓
SyncEngine.processQueue()
     ↓  (orden: prioridad ASC → fecha ASC)
API REST → Base de datos
     ↓
Eliminar de IndexedDB
```

**Tipos de eventos sincronizados:**

| Tipo | Prioridad |
|---|---|
| `SALE` | 1 (más alta) |
| `INVENTORY_UPDATE` | 2 |
| `CASH_CLOSURE` | 3 |

---

## Credenciales por Defecto

Tras ejecutar `npm run prisma:seed`:

| Campo | Valor |
|---|---|
| **Email** | `admin@skot.com` |
| **Contraseña** | `Admin123!` |
| **Rol** | `ADMIN` |

**Sucursales de prueba creadas:**
1. **Skot Açaí Centro** — Tienda de Açaí con balanza Prix 4 configurada
2. **Skot Burgers Plaza** — Restaurante de hamburguesas

> ⚠️ **Cambia las credenciales por defecto antes de desplegar en producción.**

---

## 📝 Licencia

MIT © Skot Team
