Informe Ejecutivo: Skot ERP
Fecha: 22 de Junio de 2026 
Proyecto: Sistema ERP Multi-Sucursal para "Skot" — Bolivia 
Estado: ✅ Core Comercial Completo · 🔲 Facturación Electrónica Pendiente

1. Resumen Ejecutivo
Skot ERP es una solución de gestión empresarial diseñada a medida para la cadena Skot (Bolivia). Cubre los tres pilares operativos de la empresa:

Unidad	Descripción
🥤 Skot Açaí	POS de bowls por peso con balanza Prix 4 integrada
🍔 Skot Burgers	POS táctil con combos, extras y arquitectura "Cocina en Vivo"
🏭 Fábrica / Almacén	Producción, catálogo de recetas y distribución a sucursales

El sistema puede vender, cobrar, fabricar, controlar inventario y generar reportes de manera completamente integrada. Opera en modo offline-first: si cae internet, las ventas se guardan localmente y se sincronizan automáticamente al recuperar la conexión.

2. Stack Tecnológico
Capa	Tecnología	Rol
Framework	Next.js 14 (App Router) + TypeScript	Frontend + API Routes
Base de datos	PostgreSQL (Neon en prod, local en dev)	Persistencia
ORM	Prisma 5.22	Acceso a datos tipado
UI	Tailwind CSS + Lucide React	Diseño y componentes (con custom selects)
Estado	TanStack Query v5	Cache y sincronización
Offline	IndexedDB (idb-keyval) + Sync Queue	Ventas sin internet
Balanza	Web Serial API	Prix 4 sin drivers adicionales
Imágenes	Cloudinary	CDN para fotos de productos
Charts	Recharts	Analytics visual
Reportes	jsPDF + AutoTable	Exportación PDF
Auth	bcryptjs + JWT (cookie HttpOnly)	Sesión segura
Hosting	Vercel + Neon	Producción

3. Módulos Implementados
🔐 Autenticación y Roles
Login con email + contraseña (bcrypt). Cookie HttpOnly con JWT.
4 roles: ADMIN · MANAGER · CASHIER · WAREHOUSE
Dashboard adaptativo: cada rol ve solo los módulos que le corresponden
Perfil de usuario (/profile): edición de datos y cambio de contraseña con indicador de fortaleza
RBAC en APIs: protección estricta de rutas con `requireAdmin` / `requireAdminOrManager`.

🥤 POS Açaí
Lectura de peso en tiempo real por puerto Serie (Web Serial API)
Selección de base (açaí, pitahaya, etc.) en un flujo rápido directo a cobro.
Cálculo automático: peso neto × precio/kg − tara del recipiente
Flujo de cobro: efectivo, tarjeta, QR (transferencia), mixto
Modo offline: venta queda en cola local y sincroniza al volver internet

🍔 POS Burgers (Cocina en Vivo)
Catálogo de productos en formato "Lista" para evitar recorte en nombres de productos largos.
Modificadores y extras por producto (con precios adicionales)
Combos (producto base + acompañamiento + bebida)
Recetas Dinámicas: Al completar la venta, si un producto tiene una Receta (BOM) configurada, el sistema deduce automáticamente sus ingredientes de la materia prima en inventario (Ej. deduce Pan, Carne y Queso en vez de descontar una "Hamburguesa").
Historial del Turno: panel slide-in lateral con todas las ventas del turno, total acumulado y badge contador
Fix implementado para prevenir dobles-inserciones asíncronas accidentales en el carrito.

🏭 Fábrica
Recetas (BOM): Gestor de recetas para productos finales. Integración de `SearchableSelect` para búsqueda rápida de insumos al armar recetas.
Órdenes de producción: al completar, descuenta materia prima del stock y acredita producto terminado
Dashboard con KPIs: órdenes en proceso, alertas de MP, producción del día

📦 Inventario Multi-Sucursal
Stock por sucursal con edición inline de cantidades
Kardex completo: filtros tipo/fecha/búsqueda, auditoría ant.→nuevo, exportación CSV con BOM UTF-8. Las salidas por Cocina en Vivo se registran detalladamente.
Transferencias: Solicitud → Aprobación (Admin) → Despacho → Recepción (acredita stock)
Pedidos Internos: Sucursal solicita a fábrica con flujo asíncrono (Fábrica no puede auto-recibirse, solo despachar).
Pedidos a Proveedores (Purchase Orders): B2B con recepción parcial/total, acredita inventario.
Registro de Mermas (/inventory/mermas): formulario con motivo (Vencimiento / Daño / Producción / Otro), validación contra stock actual, KPIs del día, historial del turno.
Sugerencias de reabasto predictivas basadas en promedio de ventas.

💰 Cierre de Caja
Apertura de sesión con monto inicial, cierre con declaración de efectivo real
Cálculo automático de diferencia (sobrante/faltante)
Panel Admin con historial de sesiones, filtros por sucursal y período
Desglose por cajero: fila expandible con efectivo / tarjeta / QR / apertura
Exportación PDF del resumen de cierre

📊 Reportes y Analytics
Dashboard de métricas: ventas por período, productos top, métodos de pago (Recharts)
Ajuste estricto de Zona Horaria implementado en las consultas para asegurar que ninguna venta local se pierda por desfase horario con el servidor UTC.
Historial de ventas con filtros y desglose individual.
Exportación CSV/PDF.

🧾 Gastos Operativos
Registro de gastos categorizados (Alquiler, Servicios, Insumos, Personal, Otros)
KPIs por período y sucursal, historial con filtro por categoría

☁️ Catálogo y Productos
CRUD completo de productos (nombre, SKU, tipo, unidad, precio base, imagen Cloudinary)
Precios diferenciados por sucursal (BranchProduct.customPrice)
Tipos clasificados correctamente: ACAI_BASE, ACAI_TOPPING, BURGER, BURGER_EXTRA, BEVERAGE, RAW_MATERIAL, PACKAGING.

⚙️ Configuración de Balanza
Página /admin/scale-config: modelo, N° serie, puerto COM, baud rate, tara por sucursal

4. Seguridad
Capa	Mecanismo
Autenticación	Cookie HttpOnly + JWT (no accesible desde JS)
Autorización de UI	Dashboard filtra módulos por role + branchType
Autorización de API	Middlewares restrictivos (Ej. catálogo abierto a WAREHOUSE para Recetas)
Rutas protegidas	Middleware Next.js redirige a /login si no hay sesión
Contraseñas	bcryptjs con salt rounds = 12

5. Estado de Implementación
✅ Producción-Ready
Todos los flujos de venta (POS Açaí, POS Burgers con Recetas Dinámicas)
Control de inventario completo con trazabilidad exacta en Kardex
Cierre de caja con desglose por cajero
Analytics robusto a prueba de zonas horarias locales
Gestión de usuarios, sucursales y productos (CRUD completo)
Seguridad RBAC
Módulo de mermas y gastos operativos

⚠️ Pendiente Técnico Menor
Ejecutar npx prisma db push para crear tabla scale_configs (conflicto de definición duplicada en schema a resolver)

🔲 Blocker Principal para Producción Total
Facturación Electrónica (SIN — Bolivia): generación de CUFD, firma de XML de emisión, facturas de contingencia offline. Sin esto, el sistema no puede emitir facturas legales.

6. Roadmap Q3/Q4 2026
Prioridad	Item	Esfuerzo estimado
🟡 Media	App móvil / PWA para gestión remota	2 semanas
🟡 Media	Reportes avanzados por cajero y turno	1 semana
🟢 Baja	Programa de fidelización / puntos	2-3 semanas
🟢 Baja	Integración con apps de delivery (PedidosYa, Uber Eats)	2-3 semanas

Conclusión: Skot ERP tiene el 100% del core comercial operativo. Incorporó con éxito la arquitectura de "Cocina en Vivo", resolviendo la problemática del fast-food de descontar materia prima instantáneamente sin recurrir a fábricas intermedias en local. El sistema está pulido a nivel UI/UX y control de datos (Timezone Fix), y solo aguarda la integración gubernamental con Impuestos Nacionales para salir a producción final.