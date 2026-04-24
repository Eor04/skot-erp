# Manual de Usuario — Skot ERP

> **Versión:** 2.0 · **Moneda:** Bolivianos (Bs.) · **Idioma del sistema:** Español · **Última actualización:** Abril 2026

---

## 1. Acceso al Sistema

### Iniciar Sesión
1. Abrí el navegador y andá a la URL del sistema (o instalalo como app desde el botón "Instalar" en Chrome/Edge)
2. Ingresá tu **correo electrónico** y **contraseña**
3. Click en **"Ingresar"**

> El sistema detecta automáticamente tu rol y te lleva al panel que te corresponde.

### Roles del Sistema

| Rol | ¿Qué puede hacer? |
|---|---|
| 🔴 **Administrador** | Todo el sistema: todas las sucursales, usuarios, productos, reportes, configuración |
| 🟠 **Gerente** | Panel de su sucursal, inventario, ventas, reportes, pedidos |
| 🟡 **Cajero** | Solo el POS de su sucursal, inventario y cierre de caja **de su sucursal** |
| 🔵 **Almacén** | Módulo Fábrica: producción, inventario, pedidos internos |

> **Nota:** Los Cajeros solo ven el inventario y las órdenes correspondientes a su sucursal asignada. No tienen acceso a datos de otras sucursales.

---

## 2. Panel Principal (Dashboard)

Al ingresar verás el panel según tu rol:

### Dashboard Administrador / Gerente
- **KPIs del día:** ventas totales, número de transacciones, efectivo vs tarjeta
- **Campana de alertas** (🔔): notifica stock bajo en tiempo real
- **Acceso rápido** a todos los módulos del sistema

### Dashboard Cajero
Solo ve los botones relevantes a su sucursal:
- POS (Açaí, Burgers o Fábrica según su sucursal)
- Inventario **de su sucursal**
- Cierre de Caja

---

## 3. POS — Punto de Venta

### 🥤 POS Açaí (`/acai`)
**Quién lo usa:** Cajeros y Gerentes de sucursales Açaí

**Flujo de venta:**
1. Colocá el bowl en la balanza → el peso se lee automáticamente
2. Seleccioná la **base** (Açaí, Pitahaya, etc.)
3. Agregá los **toppings** deseados (granola, banana, miel, etc.)
4. El sistema calcula: **peso neto × precio/kg**
5. Elegí el **método de pago:** Efectivo / Tarjeta / Transferencia / Mixto
6. Si es efectivo, ingresá el monto recibido → el sistema calcula el **vuelto**
7. Click en **"Registrar Venta"**

> ⚠️ Si la balanza no está conectada, podés ingresar el peso manualmente.

#### Conexión de Balanza — Dos Modos Disponibles

**Modo 1 — Web Serial (USB directo):**
- Conectás la balanza por USB al equipo donde abre el POS
- Click en **"Conectar Balanza"** → el navegador pide seleccionar el puerto COM
- Solo funciona en Chrome o Edge

**Modo 2 — Red TCP/IP (Nuevo):**
- La balanza Toledo Prix 4 Uno se conecta a la red local (WiFi/LAN)
- En la PC de caja se ejecuta el programa **"Skot Scale Bridge"** (acceso directo en el escritorio)
- En el POS, click en **"Conectar por Red"** → el sistema se conecta automáticamente
- Funciona en cualquier navegador, incluso en tablets de la red local

> 💡 **Recomendado para Producción:** El modo TCP/IP es más estable y permite usar tablets sin puerto USB.

---

### 🍔 POS Burgers (`/burgers`)
**Quién lo usa:** Cajeros y Gerentes de sucursales Burgers

**Flujo de venta:**
1. Hacé click en el producto del grid táctil
2. Si el producto tiene **modificadores** (extra queso, sin cebolla, extra carne, etc.) se abre un modal → seleccioná los que quieras
3. El producto se agrega al **carrito** con su precio actualizado
4. También podés agregar **extras** directamente: los extras y bebidas aparecen en su propia sección del grid
5. Podés aplicar un **descuento** (descuentos mayores al 15% requieren autorización de Admin/Gerente)
6. Click en **"Procesar Pago"** → elegí el método de pago
7. Ingresá el monto recibido si es efectivo → ver el vuelto
8. Click en **"Confirmar Pago"**

**Panel de Historial del Turno:**
- Tocá el botón **"Turno"** con el badge contador para ver todas las ventas del turno actual
- Muestra el total acumulado y permite limpiar el historial

**Carrito:**
- Cada ítem muestra el nombre del producto y los **modificadores seleccionados** con su precio adicional
- Podés aumentar/disminuir la cantidad con los botones `+` / `-`
- El ícono 🗑️ elimina el ítem del carrito
- El total se actualiza en tiempo real incluyendo todos los modificadores

---

### 🏭 POS Fábrica (`/factory`)
**Quién lo usa:** Cajeros de sucursal Fábrica

Funciona igual que el POS Burgers pero para ventas internas de la fábrica.

---

### 💰 Cierre de Caja (`/cash-close`)
**Quién lo usa:** Cajeros, Gerentes, Admins

**Abrir caja (inicio del turno):**
1. Tab **"Abrir Caja"**
2. Ingresá el **monto inicial en efectivo**
3. Click en **"Abrir Caja"** → queda registrado con hora y usuario

**Cerrar caja (fin del turno):**
1. Tab **"Cerrar Caja"**
2. Contá el efectivo real y escribilo en **"Efectivo declarado"**
3. El sistema calcula la **diferencia** (sobrante o faltante)
4. Agregá notas si hay diferencia
5. Click en **"Cerrar Caja"** → queda registrado el reporte completo

---

## 4. Inventario

> **Control de acceso:** Los Cajeros solo ven el inventario de su sucursal asignada. Los Gerentes ven su sucursal. Solo los Administradores tienen acceso global a todas las sucursales.

### 📦 Stock por Sucursal (`/inventory/stock`)
**Quién lo usa:** Admin, Gerente, Almacén, Cajero (solo su sucursal)

- Seleccioná la sucursal (Admin y Gerente pueden elegir; el Cajero ve la suya automáticamente)
- Ves todos los productos con su **stock actual, mínimo y máximo**
- Para ajustar stock: click en el producto → ingresá cantidad y motivo:
  - **ENTRADA** — recibiste mercadería
  - **SALIDA** — retiro manual
  - **AJUSTE** — corrección de inventario
  - **MERMA** — producto dado de baja

#### Crear Producto Rápido desde Inventario (Nuevo)
Al agregar stock en el módulo de Recepción, si el producto no existe en el catálogo podés crearlo al instante:
1. Click en **"+ Crear producto"** dentro del formulario de recepción
2. Ingresá nombre, tipo y unidad
3. El producto se crea en el catálogo global y queda disponible de inmediato

---

### 🔄 Transferencias (`/inventory/transfers`)
Mueve stock entre sucursales.

**Crear transferencia:**
1. Click en **"Nueva Transferencia"**
2. Seleccioná sucursal **origen** y **destino**
3. Agregá los productos y cantidades
4. Click en **"Crear"** → queda en estado **PENDIENTE**

**Estados y acciones:**
| Estado | Quién actúa | Acción |
|---|---|---|
| PENDIENTE | Admin / Gerente | ✅ Aprobar o ❌ Rechazar |
| EN TRÁNSITO | Sucursal destino | 📦 Confirmar Recepción |
| RECIBIDO | — | Stock acreditado automáticamente |

> **Nota:** Los Cajeros solo ven las transferencias que involucran su sucursal.

---

### 📋 Pedidos Internos (`/inventory/internal-orders`)
Sucursales solicitan productos a la Fábrica.

**Crear pedido:**
1. Click en **"Nuevo Pedido"**
2. Seleccioná los productos y cantidades necesarias
3. Click en **"Enviar Pedido"** → estado: PENDIENTE

**Flujo completo:**
```
Sucursal crea pedido → PENDIENTE
Admin/Gerente aprueba → APROBADO
Fábrica despacha (con cantidades reales) → DESPACHADO
Sucursal confirma recepción → RECIBIDO ✅
```

> **Nota:** Los Cajeros solo ven los pedidos internos de su sucursal.

---

### 🗂️ Kardex — Movimientos (`/inventory/movements`)
Registro completo e inmutable de todos los movimientos de stock.

**Filtros disponibles:**
- Tipo de movimiento (Entrada, Salida, Merma, Transferencia, Producción)
- Sucursal
- Rango de fechas
- Búsqueda por producto o nota

**Exportar:** Click en **"CSV"** para descargar el historial completo (compatible con Excel)

---

### 🗑️ Registro de Mermas (`/inventory/mermas`)
Para registrar productos dados de baja.

1. Seleccioná sucursal y producto (ves el stock actual disponible)
2. Ingresá la cantidad a dar de baja
3. Seleccioná el **motivo:** Vencimiento / Daño físico / Diferencia recepción / Producción / Otro
4. Click en **"Registrar Merma"** → descuenta del stock y registra en Kardex

---

### 🔔 Sugerencias de Reabasto (`/inventory/suggestions`)
El sistema analiza el promedio de ventas y sugiere cuándo y cuánto reabastecer cada producto.

---

## 5. Módulo Fábrica

### 🏭 Dashboard Fábrica (`/factory`)
**Quién lo usa:** Admin, Almacén

KPIs del día: órdenes en proceso, alertas de materia prima, producción completada.

---

### 📖 Recetas (`/factory/recipes`)
Define los ingredientes para producir cada producto.

**Crear receta:**
1. Click en **"Nueva Receta"**
2. Seleccioná el **producto final**
3. Agregá los **ingredientes** con sus cantidades y unidades
4. Definí el **rendimiento** (ej: 10 litros por lote)
5. Click en **"Guardar"**

---

### ⚙️ Órdenes de Producción (`/factory/production`)
**Crear orden:**
1. Click en **"Nueva Orden"**
2. Seleccioná la receta
3. Ingresá la cantidad a producir
4. Click en **"Crear"** → estado: BORRADOR

**Completar orden:**
1. Click en **"Completar"** en la orden
2. El sistema valida que haya materia prima suficiente
3. Al confirmar (transacción atómica):
   - Descuenta materia prima del inventario
   - Registra consumo en Kardex
   - Acredita el producto terminado
   - Registra producción en Kardex

---

### 📦 Materiales / Materia Prima (`/factory/materials`)
Vista del inventario de materias primas en la fábrica con alertas de stock bajo.

---

## 6. Administración

### 🏪 Sucursales (`/admin/branches`)
**Solo Admin**

- Ver todas las sucursales activas
- **Crear/editar** sucursal: nombre, tipo (Açaí / Burgers / Fábrica), dirección, teléfono
- Click en **"Ver Panel"** → resumen de ventas recientes, stock crítico y cierres de caja de esa sucursal

---

### 👤 Usuarios (`/admin/users`)
**Solo Admin**

- Ver todos los usuarios del sistema
- **Crear usuario:** nombre, email, contraseña, rol, sucursal(es) asignada(s)
- **Roles disponibles (en español):** Administrador / Gerente / Cajero / Almacén
- **Asignación de sucursal:**
  - Los **Administradores** tienen acceso global → no requieren sucursal asignada
  - Los demás roles (Gerente, Cajero, Almacén) **deben tener al menos una sucursal asignada**
- **Editar / Desactivar** usuarios existentes

---

### 🛒 Catálogo de Productos (`/admin/products`)
**Admin y Gerente**

- Lista completa de productos con su tipo, SKU y precio base
- **Crear producto:** nombre, SKU, tipo, unidad, categoría, imagen (Cloudinary)
- **Tipos de producto:**

| Tipo | Aparece en |
|---|---|
| Base Açaí | POS Açaí |
| Topping Açaí | POS Açaí |
| Hamburguesa | POS Burgers |
| Extra / Porción | POS Burgers (sección de extras) |
| Bebida | Ambos POS |
| Materia Prima | Solo inventario / fábrica |

---

### 🔧 Modificadores de Productos (`/admin/modifiers`) *(Nuevo)*
**Solo Admin**

Los modificadores son opciones que el cajero puede agregar a un producto en el POS Burgers (ej: extra queso, sin cebolla, doble carne).

**Crear modificador:**
1. Andá a **Administración → Modificadores**
2. Click en **"Nuevo Modificador"**
3. Completá:
   - **Nombre:** ej. "Extra Queso"
   - **Categoría:** agrupa los modificadores en el modal del POS (ej. "Extras", "Opciones", "Salsas")
   - **Precio adicional:** en Bs. (puede ser 0 si es sin costo)
   - **Estado:** Activo / Inactivo
4. Click en **"Guardar"**

**Editar / desactivar modificador:**
- Click en el modificador en la lista → editá los campos → **"Guardar cambios"**
- Desactivar un modificador lo oculta del POS sin eliminarlo

> Los modificadores activos aparecen automáticamente en el modal del POS al seleccionar cualquier hamburguesa o extra.

---

### 🛍️ Pedidos a Proveedores (`/admin/purchase-orders`)
**Admin y Gerente**

Para registrar compras a proveedores externos.

1. Click en **"Nuevo Pedido"**
2. Ingresá proveedor, fecha esperada y productos con precios
3. Estados: PENDIENTE → ENVIADO → PARCIAL → RECIBIDO
4. Al marcar como **RECIBIDO** → el inventario se actualiza automáticamente + registro en Kardex

---

### 🔔 Alertas de Stock (`/admin/alerts`)
Panel con todos los productos en stock bajo o por vencer.
- **Crítico:** stock por debajo del mínimo configurado
- La campana 🔔 en el header actualiza este conteo en tiempo real

---

### 🔧 Configuración de Balanza (`/admin/scale-config`)
**Solo Admin**

Para configurar la balanza Prize 4 por sucursal:

**Modo USB (Web Serial):**
- Puerto COM (COM1-COM8 o ttyUSB)
- Baud rate (9600 por defecto)
- Tara en kg (peso del recipiente vacío)
- Activar/desactivar la balanza

**Modo TCP/IP (Bridge — Nuevo):**
- El puente TCP/IP se configura directamente en el archivo `scale-bridge/bridge.js` de la PC de caja
- Variables configurables: `SCALE_IP` (IP de la balanza en la red), `SCALE_PORT` (por defecto 9000), `WS_PORT` (por defecto 8765)
- El POS Açaí se conecta al bridge en `ws://localhost:8765`

---

## 7. Reportes y Analytics

### 📊 Analytics (`/admin/analytics`)
Filtros: período (hoy, 7d, 14d, 30d, mes, año) y sucursal.
- Gráfico de ingresos diarios (Açaí vs Burgers vs Total)
- Gráfico de cantidad de ventas por día
- Distribución de métodos de pago (pie chart)
- Exportar CSV / PDF

### 📈 Reportes Avanzados (`/admin/reports`)
**Tab "Por Cajero":**
- Ranking de cajeros por ingresos del período
- Métricas: ventas, ingresos, ticket promedio, desglose por método de pago, horas trabajadas

**Tab "Por Turno":**
- Historial de cada sesión de caja: cajero, apertura, cierre, duración, ventas del turno
- Diferencias de caja resaltadas en rojo

### 📋 Historial de Ventas (`/admin/sales`)
Lista paginada con filtros de sucursal, fecha, método de pago. Muestra el desglose de cada venta.

---

## 8. Mi Perfil (`/profile`)

Cualquier usuario puede:
- Ver y editar su información personal (nombre, email)
- **Cambiar contraseña:**
  1. Ingresá la contraseña actual
  2. Ingresá la nueva contraseña (el indicador muestra la fortaleza en tiempo real)
  3. Click en **"Guardar"**

---

## 9. Gastos Operativos (`/expenses`)

Registro de gastos por sucursal.

1. Seleccioná la sucursal
2. Elegí la categoría: Proveedor / Servicios / Mantenimiento / Sueldos / Logística / Otro
3. Ingresá monto, descripción y proveedor (opcional)
4. Click en **"Registrar Gasto"**

---

## 10. Modo Offline

El sistema funciona **sin internet** para ventas en POS:
- Las ventas se guardan localmente en el dispositivo
- La barra naranja **"Sin conexión"** aparece en la parte superior
- Al recuperar internet, las ventas se sincronizan automáticamente
- El ícono de sincronización muestra el progreso

---

## 11. Instalar como App (PWA)

En Chrome / Edge:
1. Abrí la URL del sistema
2. Click en el ícono 📥 en la barra del navegador
3. Click en **"Instalar"**

En iOS (iPhone / iPad):
1. Abrí en Safari
2. Toca el botón **Compartir** (cuadrado con flecha)
3. Seleccioná **"Agregar a pantalla de inicio"**

---

## 12. Guía de Balanza TCP/IP (Nuevo)

### ¿Qué es el Scale Bridge?
El Scale Bridge es un programa liviano que corre en la PC de caja y actúa como intermediario entre la balanza Toledo Prix 4 Uno (conectada a la red local) y el navegador.

### Cómo iniciar el bridge
1. En el escritorio de la PC de caja, doble click en **"Conectar Balanza.bat"**
2. Se abre una ventana negra de consola — no la cierres
3. Verás el mensaje: `✅ WebSocket listo en ws://localhost:8765`
4. Abrí el POS Açaí en el navegador → click en **"Conectar por Red"**

### Verificar que la balanza está en la red
- Entrá al menú de la Toledo Prix 4 Uno → **Configuración → Red → Ver IP**
- Confirmá que esa IP esté configurada en el bridge (archivo `scale-bridge/bridge.js`, variable `SCALE_IP`)

### Solución de problemas

| Problema | Solución |
|---|---|
| La consola del bridge muestra "No se pudo conectar" | Verificá que la balanza está encendida y conectada a la red. Confirmá la IP en la Toledo. |
| El POS no encuentra el bridge | Asegurate de que el bridge está corriendo (ventana negra abierta). Usá el mismo equipo o la misma red local. |
| El peso no se actualiza en el POS | El bridge puede mostrar "Peso recibido" en la consola — si no, verificá los cables de red de la balanza. |
| Lecturas erráticas | Colocá la balanza en superficie plana. Verificá que no haya vibración. |

---

## 13. Guía Rápida por Rol

### Como CAJERO
1. Entrar → ir al POS de tu sucursal
2. Abrir caja al inicio del turno (`/cash-close`)
3. Registrar ventas durante el turno
4. Ver stock **de tu sucursal** si es necesario
5. Cerrar caja al final del turno

> Los cajeros **no pueden ver** datos de otras sucursales, otros turnos ni gestionar el catálogo global.

### Como GERENTE
Todo lo del cajero más:
- Ver reportes de tu sucursal
- Aprobar transferencias y pedidos internos
- Autorizar descuentos mayores al 15%
- Gestionar pedidos a proveedores

### Como ADMINISTRADOR
Acceso completo. Adicionalmente:
- Crear y gestionar usuarios (con asignación de sucursal por rol)
- Configurar sucursales y balanzas
- Ver analytics y reportes de **todas** las sucursales
- Gestionar el catálogo global de productos
- **Crear y gestionar modificadores de productos**
- Ver y gestionar todas las transferencias y pedidos internos

### Como ALMACÉN (Fábrica)
- Gestionar órdenes de producción
- Administrar recetas
- Ver y ajustar inventario de fábrica
- Atender pedidos internos de sucursales

---

## 14. Resumen de Mejoras — Versión 2.0

| Mejora | Descripción |
|---|---|
| 🔌 **Balanza TCP/IP** | Nuevo modo de conexión a la Toledo Prix 4 Uno por red local. Incluye el programa **Scale Bridge** con reconexión automática y soporte multiplataforma. |
| 🔒 **Control de acceso por rol** | Los Cajeros ahora solo ven stock, transferencias y pedidos internos de su sucursal asignada. |
| 👥 **Gestión de usuarios mejorada** | Los Administradores ya no requieren sucursal asignada. Roles mostrados en español en la interfaz. |
| 🔧 **Módulo de Modificadores** | CRUD completo de modificadores de productos. Los Admin definen y organizan extras/opciones que aparecen en el POS Burgers. |
| ➕ **Creación rápida de productos** | Desde el módulo de Recepción/Inventario se pueden crear nuevos productos al vuelo sin salir del flujo de trabajo. |
| 🛒 **POS Burgers mejorado** | El carrito muestra los modificadores seleccionados por ítem con su precio. Los extras y bebidas tienen su propia sección en el grid. |

---

*Skot ERP v2.0 — Desarrollado para Skot Bolivia*
