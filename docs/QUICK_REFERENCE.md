# Arquitectura de Base de Datos - Referencia Rápida

## 📁 Estructura de Archivos
```
Skot/
├── prisma/
│   ├── schema.prisma          # Esquema de base de datos
│   └── seed.ts                # Datos iniciales
├── src/
│   └── lib/
│       ├── db.ts              # Conexión a base de datos
│       ├── auth-middleware.ts # Auth Multi-tenant
│       └── test-connection.ts # Prueba de conexión
├── .env.example               # Plantilla de entorno
├── package.json               # Dependencias
├── tsconfig.json              # Configuración TypeScript
└── README.md                  # Documentación completa
```

## 🚀 Comandos de Inicio Rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar entorno
cp .env.example .env
# Edita .env con tus credenciales de Neon Postgres

# 3. Generar Cliente Prisma
npm run prisma:generate

# 4. Ejecutar migraciones
npm run prisma:migrate:dev

# 5. Poblar base de datos (Seed)
npm run prisma:seed

# 6. Probar conexión
npm run test:connection
```

## 🔑 Inicio de Sesión Predeterminado
- Email: `admin@skot.com`
- Contraseña: `Admin123!`

## 📊 Resumen de Modelos

| Modelo | Propósito | Multi-Tenant |
|-------|---------|--------------|
| User | Autenticación y autorización | No |
| Branch | Ubicaciones de tiendas (tenants) | No (es el tenant) |
| Product | Catálogo de productos | No |
| Inventory | Rastreo de stock | Sí (`branchId`) |
| Sale | Transacciones de ventas | Sí (`branchId`) |
| SaleItem | Líneas de venta | Vía Sale |
| ScaleConfig | Configuración balanza Prix 4 | Sí (`branchId`) |
| SyncQueue | Cola de sincronización offline | Sí (`branchId`) |

## 🔐 Roles de Usuario

- **ADMIN**: Acceso total a todas las sucursales
- **MANAGER**: Gestionar sucursales asignadas
- **CASHIER**: Procesar ventas, ver inventario
- **WAREHOUSE**: Gestionar inventario

## 🌐 Cadenas de Conexión

**DATABASE_URL** (Pooled):
```
postgresql://...?pgbouncer=true&connection_limit=10&pool_timeout=20
```

**DIRECT_URL** (Migraciones):
```
postgresql://... (sin parámetros)
```
