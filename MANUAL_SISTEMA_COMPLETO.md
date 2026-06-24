# 📘 MANUAL DE USO COMPLETO — SKOT ERP
### Sistema de Gestión para Skot Açaí & Burgers
**Versión:** Junio 2026 | **Nivel:** Principiante (no se necesita experiencia previa)

---

> **¿Para quién es este manual?**
> Para cualquier persona que vaya a usar el sistema SKOT ERP, sin importar si eres cajero, gerente, encargado de fábrica o administrador. Está escrito de forma simple y directa, explicando cada módulo desde cero.

---

## 📋 ÍNDICE

1. [¿Qué es SKOT ERP?](#1-qué-es-skot-erp)
2. [Cómo entrar al sistema](#2-cómo-entrar-al-sistema)+
3. [Los 4 Roles del sistema](#3-los-4-roles-del-sistema)
4. [El Dashboard principal](#4-el-dashboard-principal)
5. [MÓDULO: POS Açaí](#5-módulo-pos-açaí)
6. [MÓDULO: POS Burgers](#6-módulo-pos-burgers)
7. [MÓDULO: Cierre de Caja](#7-módulo-cierre-de-caja)
8. [MÓDULO: Gastos](#8-módulo-gastos)
9. [MÓDULO: Inventario](#9-módulo-inventario)
10. [MÓDULO: Fábrica y Almacén](#10-módulo-fábrica-y-almacén)
11. [MÓDULO: Administración](#11-módulo-administración)
12. [Conceptos importantes del sistema](#12-conceptos-importantes-del-sistema)
13. [Flujo de trabajo del día a día](#13-flujo-de-trabajo-del-día-a-día)
14. [Preguntas frecuentes](#14-preguntas-frecuentes)

---

## 1. ¿Qué es SKOT ERP?

SKOT ERP es el sistema de gestión de toda la empresa Skot. Es como el "cerebro" que conecta todo:

- 🥤 Las ventas de Açaí (con la balanza)
- 🍔 Las ventas de Hamburguesas
- 🏭 La fábrica donde se preparan las carnes y panes
- 📦 El inventario de todas las sucursales
- 💰 El dinero que entra y sale de caja
- 📊 Los reportes para que los dueños vean cómo va el negocio

**¿Para qué sirve tener todo en un sistema?**
Sin este sistema, cada cosa se haría a mano: una libreta para ventas, otra para inventario, llamadas telefónicas para pedir insumos, etc. Con SKOT ERP todo queda registrado automáticamente, en tiempo real, y cualquier persona autorizada puede ver la información desde cualquier computadora.

---

## 2. Cómo entrar al sistema

### Paso a paso:
1. Abrí el navegador (Chrome o Edge recomendado)
2. Escribí la dirección del sistema en la barra de arriba
3. Verás una pantalla de login con dos campos:
   - **Email:** Tu correo electrónico asignado por el administrador
   - **Contraseña:** La clave que te dieron al crear tu usuario
4. Hacé clic en **"Iniciar sesión"**

### ¿Qué pasa si te equivocás la contraseña?
El sistema te mostrará un mensaje de error en rojo. Volvé a intentarlo. Si no recordás tu contraseña, contactá al administrador para que la restablezca.

### ¿Cuándo se cierra la sesión?
La sesión permanece activa hasta que hagás clic en el botón **"Cerrar sesión"** (ícono de salida en la esquina). No se cierra sola mientras estás usando el sistema.

---

## 3. Los 4 Roles del sistema

El sistema tiene 4 tipos de usuario. Según tu rol, verás diferentes opciones:

### 🟣 ADMINISTRADOR (Admin)
**¿Quién es?** El dueño o encargado máximo del sistema.
**¿Qué puede hacer?** Todo. Ve todas las sucursales, todos los datos, puede crear/editar usuarios, productos, sucursales, reportes globales.
**¿Qué ve en el menú?** Todos los módulos sin excepción.

### 🔵 GERENTE (Manager)
**¿Quién es?** El encargado de una o varias sucursales.
**¿Qué puede hacer?** Vender, cerrar caja, ver inventario de su sucursal, ver reportes de su sucursal.
**¿Qué NO puede?** Crear usuarios, editar el catálogo de productos global, ver datos de otras sucursales.

### 🟢 CAJERO (Cashier)
**¿Quién es?** El empleado que atiende al cliente y registra las ventas.
**¿Qué puede hacer?** Usar el POS (Açaí o Burgers), cerrar caja, registrar gastos, ver el inventario de su sucursal.
**¿Qué NO puede?** Ver reportes generales, crear productos, gestionar otras sucursales.

### 🟠 ALMACÉN/FÁBRICA (Warehouse)
**¿Quién es?** El encargado de la fábrica o almacén central.
**¿Qué puede hacer?** Recibir mercadería de proveedores, gestionar recetas de producción, crear órdenes de producción, ver y gestionar el inventario completo de la fábrica, aprobar y despachar pedidos internos de las sucursales.
**¿Qué NO puede?** Usar el POS, ver reportes de ventas globales, gestionar usuarios.

---

## 4. El Dashboard principal

Cuando entrás al sistema lo primero que ves es el **Dashboard** (pantalla de inicio). Esta pantalla es diferente para cada rol — solo muestra los módulos a los que tenés acceso.

### ¿Qué hay en el Dashboard?

**Parte superior:**
- **Tu nombre y rol** (ej: "Ana Martínez — Cajero")
- **Indicadores del día** (Admin/Manager): total vendido hoy, cantidad de órdenes
- **Alertas de stock bajo:** Si hay productos con poca existencia, aparece un aviso naranja/rojo con el número de productos afectados
- **Estado de cajas:** Si hay cajas abiertas en las sucursales
- **Campana de notificaciones** 🔔: Alertas de inventario crítico

**Centro de la pantalla:**
Tarjetas de acceso a los módulos. Cada tarjeta tiene:
- Emoji e ícono representativo
- Nombre del módulo
- Descripción corta
- Badge/etiqueta del tipo de módulo

Hacé clic en cualquier tarjeta para entrar al módulo.

---

## 5. MÓDULO: POS Açaí 🥤

**¿Quién lo usa?** Cajeros y Gerentes de sucursales Açaí.
**¿Para qué sirve?** Para registrar la venta de bowls de açaí pesados en la balanza Prix 4.

> **⚠️ Requisito previo: La caja debe estar abierta.**
> Antes de vender, alguien debe haber abierto la sesión de caja del día en el módulo **Cierre de Caja**. Si la caja está cerrada, el POS te lo avisará y no podrás entrar.

### Paso 1: Seleccionar el sabor del bowl

Al abrir el POS Açaí verás los sabores disponibles para esa sucursal (con su precio por kg).

**Bowl de un solo sabor:**
- Tocá el botón del sabor → queda resaltado

**Bowl mixto (varios sabores):**
- Tocá el primer sabor → se marca como seleccionado
- Tocá un segundo sabor → ambos quedan marcados con una etiqueta "Mixto"
- Podés seleccionar hasta 3 sabores
- El precio que se cobra será el **promedio** de los precios de los sabores elegidos
- *Ejemplo: Clásico (Bs. 60/kg) + Fresa (Bs. 65/kg) = Bs. 62.50/kg para ese bowl*

**¿El cliente solo quiere extras sin bowl?**
Tocá **"Venta sin bowl"** para ir directamente a los extras.

### Paso 2: Pesaje con la Balanza Prix 4

Después de elegir el sabor, la pantalla muestra la sección de la balanza:

- **Peso en tiempo real:** Se actualiza automáticamente mientras hay cambios en la balanza
- **Indicador de estabilidad:**
  - 🟡 *"Estabilizando..."* — la balanza está midiendo, esperá
  - 🟢 *"Peso estable"* — el peso ya se capturó y es confiable
- **Precio calculado:** El peso medido × el precio/kg del sabor seleccionado

**Cómo conectar la balanza:**

*Por USB:*
Conectá el cable a la computadora, tocá **"Conectar USB"** y dale permiso cuando el navegador lo pida.

*Por Red (WiFi/cable de red):*
La balanza usa un pequeño programa llamado "bridge" instalado en la computadora de la tienda. Ingresá la IP del bridge en el campo que aparece y tocá **"Conectar por Red"**. Esta conexión es más estable y recomendada.

> El sistema no permite confirmar una venta si el peso es menor a 0.02 kg, para evitar ventas vacías por error.

### Paso 3: Extras y bebidas

Después del pesaje, la pantalla muestra todos los extras disponibles (toppings, frutas, granolas, bebidas, etc.):

- Cada extra muestra su precio unitario y el stock disponible
- Tocá **+** para agregar una unidad
- Tocá **-** para quitar
- No podés agregar más unidades de las que hay en stock
- El total abajo se actualiza sumando: bowl pesado + extras seleccionados

### Paso 4: Cobrar

Tocá **"Cobrar"**. Se abre la pantalla de pago con 4 opciones:

| Método | ¿Cómo funciona? |
|---|---|
| **Efectivo** | Ingresás el monto que te da el cliente. El sistema calcula el vuelto automáticamente. |
| **Tarjeta** | Confirmás el monto. El cobro físico va por el POS bancario por separado. |
| **QR / Transferencia** | Confirmás que recibiste la transferencia y el sistema la registra. |
| **Mixto** | El cliente paga parte en efectivo y parte con tarjeta/QR. Ingresás cuánto en cada método. |

Al confirmar el pago:
- La venta queda registrada con número único (ej: `V-20240623-0015`)
- El stock de los extras vendidos se descuenta automáticamente del inventario
- El resumen del turno se actualiza en tiempo real

### Modo offline
Si se va el internet durante la venta, aparece una barra naranja en la parte superior. Las ventas se siguen guardando localmente y se sincronizan automáticamente cuando vuelve la conexión.

---

## 6. MÓDULO: POS Burgers 🍔

**¿Quién lo usa?** Cajeros y Gerentes de sucursales Hamburguesas.
**¿Para qué sirve?** Para registrar ventas de hamburguesas, combos y extras.

> **⚠️ Requisito previo: La caja debe estar abierta.**

### La pantalla del POS Burgers

La pantalla está dividida en dos áreas:
- **Izquierda/Centro:** El catálogo con 3 pestañas
- **Derecha:** El carrito de la venta actual

#### Pestaña "Productos"
Lista todas las hamburguesas e ítems individuales de la sucursal.

**Agregar un producto:**
- Tocá el producto → se agrega al carrito
- Para agregar más del mismo: volvé a tocarlo o usá el **+** en el carrito
- Para personalizar: tocá el ícono ✏️ del ítem en el carrito

#### Pestaña "Combos"
Lista de combos disponibles (ej: "Combo Clásico = Hamburguesa + Papas + Bebida" a precio especial).

Cuando cobrás un combo, el sistema divide internamente sus partes y distribuye el precio proporcionalmente. El total siempre es exacto.

#### Pestaña "Extras"
Extras sueltos: papas adicionales, bebidas, salsas, acompañamientos.

### Modificadores (personalizaciones)

Los modificadores son las formas de personalizar una hamburguesa:
- "Sin queso"
- "Doble carne"
- "Extra salsa picante"
- "Sin cebolla"

**Cómo agregarlos:**
1. Tocá el ítem en el carrito → se abre el panel de modificadores
2. Los modificadores están agrupados por categoría (Proteínas, Salsas, Verduras, etc.)
3. Seleccioná los que apliquen
4. Tocá "Confirmar"

Los modificadores quedan anotados en el ticket. Algunos tienen costo adicional y otros no, según cómo estén configurados por el Admin.

### El carrito

El carrito muestra:
- Cada ítem con su cantidad, modificadores y precio
- Subtotal acumulado
- Campo de descuento opcional (por porcentaje o monto fijo)
- Total final a cobrar

Para quitar un ítem: tocá el ícono 🗑️
Para vaciar el carrito: tocá "Cancelar" o limpiar carrito

### Historial del turno
Botón en la parte superior con el número de ventas del turno. Muestra las últimas 20 ventas. Útil para verificar un cobro o consultar una venta reciente.

### Pago y "Cocina en Vivo"
Los métodos de pago son los mismos que en Açaí (Efectivo, Tarjeta, QR, Mixto).

**La diferencia clave:** Al confirmar la venta, si la hamburguesa tiene una receta configurada en el sistema, el inventario no descuenta la hamburguesa en sí sino **sus ingredientes de fabricación** (carne, pan, queso, etc.) directamente de la fábrica. Esto se llama **Cocina en Vivo** y es completamente automático — el cajero no hace nada especial.

---

## 7. MÓDULO: Cierre de Caja 💰

**¿Quién lo usa?** Cajeros y Gerentes.
**¿Para qué sirve?** Abrir y cerrar el turno de trabajo, registrar el efectivo real en caja y (en Açaí) solicitar reposición de insumos a la fábrica.

### Abrir una sesión (inicio del turno)

1. Entrá al módulo **Cierre de Caja**
2. Si no hay caja abierta, verás el formulario de apertura
3. Ingresá el **monto de sencillo inicial** (cuánto efectivo hay para dar cambio)
4. Tocá **"Abrir caja"**
5. El sistema registra la hora exacta de apertura

Desde ese momento podés vender.

### El resumen del turno

En cualquier momento podés ver el resumen en tiempo real:
- Total vendido en efectivo
- Total vendido en tarjeta
- Total vendido por QR/transferencia
- Gastos registrados en el turno
- Ingreso neto estimado = ventas en efectivo − gastos en efectivo

Esto te ayuda a saber cuánto efectivo debería haber en la caja antes de contarlo físicamente.

### Cerrar la sesión (fin del turno)

1. Tocá **"Cerrar caja"**
2. Ingresá el **efectivo real** contado físicamente en la caja
3. El sistema calcula la **diferencia**:
   - Positiva (sobra dinero): posible error de cálculo o dinero extra no registrado
   - Negativa (falta dinero): posible gasto no registrado o error de cobro
4. Revisás la diferencia y confirmás el cierre

El registro queda guardado con: cajero, hora apertura, hora cierre, totales por método, diferencia.

### 📦 Solicitar Reposición de Insumos (solo sucursales Açaí)

Esta sección aparece **únicamente** en el formulario de cierre de las sucursales Açaí. Es el sistema para pedir insumos a la fábrica sin llamadas telefónicas.

**Cómo usarlo:**
1. En el formulario de cierre, verás el acordeón **"Solicitar Reposición de Insumos"**
2. Los productos están **agrupados por categoría** (FRUTAS, HELADOS, TOPPINGS, CEREALES, etc.)
3. Tocá una categoría para expandirla y ver sus productos
4. En cada producto, ingresá la cantidad que necesitás (dejá en 0 los que no necesitás)
5. Al confirmar el cierre, el sistema **crea automáticamente un Pedido Interno** a la Fábrica por las cantidades ingresadas

Ese pedido aparecerá inmediatamente en el módulo **Pedidos Internos** de la Fábrica para que lo procesen.

> **¿Por qué los productos están agrupados así?**
> Las categorías se generan automáticamente desde el campo "categoría" de cada producto en el catálogo. Si mañana se crea un producto con categoría "PROTEINAS", aparecerá como una nueva pestaña automáticamente, sin modificar el código.

### Historial de cierres

Debajo del formulario: lista de los últimos 15 cierres de la sucursal con fecha, cajero, totales y diferencia.

---

## 8. MÓDULO: Gastos 🧾

**¿Quién lo usa?** Todos los roles.
**¿Para qué sirve?** Registrar cualquier pago o egreso de dinero de la sucursal.

### ¿Por qué registrar los gastos?

Cada vez que se paga algo con dinero de la empresa (una bolsa de hielo, gas, limpieza, insumos de emergencia, etc.), debe quedar en el sistema para que:
1. El cierre de caja sea exacto (los gastos en efectivo se restan del efectivo esperado)
2. El administrador pueda auditar todos los gastos

### Cómo registrar un gasto

1. Tocá **"+ Nuevo Gasto"**
2. Completá el formulario:

| Campo | Descripción |
|---|---|
| **Categoría** | PROVEEDOR / SERVICIOS / MANTENIMIENTO / SUELDOS / LOGISTICA / OTRO |
| **Monto** | Cuánto se pagó |
| **Método de pago** | Efectivo, Tarjeta o Transferencia |
| **Proveedor** | A quién se le pagó (opcional) |
| **Notas** | Descripción adicional (opcional) |

3. Tocá **"Registrar"**

> Los Cajeros y Gerentes solo ven gastos de su propia sucursal. El Administrador ve todos los gastos de todas las sucursales con filtros por sucursal, categoría y fecha.

---

## 9. MÓDULO: Inventario 📦

**¿Quién lo usa?** Cajeros, Gerentes y Administradores.
**¿Para qué sirve?** Ver el stock actual, gestionar transferencias entre sucursales, procesar pedidos internos, registrar mermas y ver el historial de movimientos (kardex).

### Vista principal

Tabla con todos los productos del inventario de tu sucursal (o de todas si sos Admin):

| Columna | Qué muestra |
|---|---|
| Nombre / SKU | Identificación del producto |
| Stock actual | Cuántas unidades/kg hay ahora |
| Stock mínimo | El umbral configurado como alerta |
| Barra de nivel | Visual del estado (rojo/amarillo/verde) |
| Estado | Sin stock / Stock bajo / Normal |

**Filtros disponibles:**
- Buscador por nombre o SKU
- Botones de estado (filtros rápidos): tocá uno para filtrar, volvé a tocarlo para quitar el filtro
- Selector de sucursal (Admin/Gerente)

---

### Sub-módulo: Transferencias

Para mover stock físicamente de una sucursal a otra.

**Flujo completo:**

```
Sucursal A crea la transferencia
        ↓ (estado: PENDING)
Sucursal A despacha → stock se deduce de A
        ↓ (estado: IN_TRANSIT)
Sucursal B confirma la recepción → stock se acredita en B
        ↓ (estado: RECEIVED)
```

Cada paso queda registrado en el kardex con la hora y el responsable.

---

### Sub-módulo: Pedidos Internos

Las sucursales piden stock a la fábrica/almacén. Tienen un ciclo de aprobación más formal que las transferencias:

**Flujo completo:**

```
Sucursal solicita productos y cantidades
        ↓ (estado: PENDING)
Fábrica aprueba (puede ajustar cantidades)
        ↓ (estado: APPROVED)
Fábrica despacha físicamente
        ↓ (estado: DISPATCHED)
Sucursal confirma la recepción → stock acreditado
        ↓ (estado: RECEIVED)
```

> **Regla de seguridad importante:** Quien despacha NO puede confirmar la recepción. Son acciones de personas distintas para evitar errores o fraudes.

**Editar cantidades:**
- Estado PENDING: la sucursal puede editar las cantidades solicitadas
- Estado APPROVED: la fábrica puede editar la cantidad a despachar
- Los campos editables aparecen como cuadros de número con fondo oscuro y borde de color

---

### Sub-módulo: Mermas

Registro de productos que se pierden, dañan o vencen.

**¿Por qué registrarlas?**
Si no registrás una merma, el sistema muestra más stock del que hay en realidad. Al registrarla:
- El stock se descuenta correctamente
- Queda el historial de pérdidas para análisis

**Cómo registrar una merma:**
1. Tocá **"Nueva Merma"**
2. Elegí el producto
3. Ingresá la cantidad perdida
4. Elegí el motivo: Vencimiento / Daño físico / Error de producción / Otro
5. Notas opcionales
6. El sistema valida que no puedas registrar más merma del stock disponible

---

### Sub-módulo: Kardex

El **historial completo e inmutable** de todos los movimientos de stock. Es el libro contable del inventario.

**Tipos de movimientos:**

| Tipo | Cuándo ocurre |
|---|---|
| `ENTRADA` | Llegada de mercadería de proveedor |
| `SALIDA` | Stock que sale (venta, transferencia) |
| `AJUSTE` | Corrección manual del stock |
| `MERMA` | Pérdida registrada |
| `PRODUCCION` | Stock generado al completar una Orden de Producción |
| `TRANSFER_IN` | Llegada por transferencia |
| `TRANSFER_OUT` | Salida por transferencia |
| Venta con receta | `"Venta V-XXXXXXXX-XXXX (Receta Dinámica)"` |

> El kardex es inmutable: no se puede borrar ni editar un movimiento pasado. Esto garantiza la trazabilidad total del inventario.

Podés **exportar el kardex a CSV** para analizarlo en Excel.

---

### Sub-módulo: Sugerencias de Reabasto

Analiza el historial de consumo de cada producto y calcula cuándo sería conveniente hacer un nuevo pedido. Es una herramienta de ayuda para el gerente o encargado de compras.

---

## 10. MÓDULO: Fábrica y Almacén 🏭

**¿Quién lo usa?** Personal de Almacén (rol WAREHOUSE) y Administradores.
**¿Para qué sirve?** Toda la operación del almacén central: recibir mercadería, gestionar recetas, producir para hamburguesas y despachar pedidos internos.

### El Dashboard de Fábrica

Al entrar verás 4 KPIs en tiempo real:

| KPI | Qué mide |
|---|---|
| Órdenes activas | Órdenes de producción en curso |
| Pendientes | Pedidos internos de sucursales sin procesar |
| Recetas activas | Recetas habilitadas en el sistema |
| Producción del día | Total de kg producidos hoy |

---

### Sub-módulo: Recepción de Mercadería

**¿Para qué sirve?**
Cuando llega una entrega de un proveedor externo, se registra aquí. Esto acredita el stock en el inventario de la fábrica.

> **Importante:** Todos los insumos de Açaí (pulpa, toppings, bases, granolas, etc.) entran por aquí porque el açaí **se compra a proveedores**, no se produce en la fábrica.

**Cómo registrar una recepción:**
1. Tocá **"Nueva Recepción"**
2. Elegí el proveedor (o escribí el nombre)
3. Agregá los productos recibidos con sus cantidades y costos
4. Confirmá

Cada recepción queda registrada en el kardex como movimiento de tipo `ENTRADA`.

---

### Sub-módulo: Recetas (BOM)

**¿Qué es una receta (BOM)?**
BOM significa "Bill of Materials" (Lista de Materiales). Es la fórmula de cómo se hace un producto. Ejemplos reales del negocio:

- **Receta "Carne Clásica Preparada":**
  Ingredientes: 1.2 kg carne molida + condimentos → Rinde: 1 kg carne preparada (merma 17%)
- **Receta "Pan Artesanal":**
  Ingredientes: 500g harina + 10g levadura + agua → Rinde: 10 unidades de pan

**¿Para qué se usan las recetas en el sistema?**
Las recetas tienen dos usos críticos:

1. **Órdenes de Producción:** Cuando la fábrica produce, el sistema sabe exactamente qué materia prima consumir y qué producto terminado acreditar al inventario.
2. **Ventas con "Cocina en Vivo":** Cuando se vende una hamburguesa en el POS, el sistema consulta su receta y descuenta los ingredientes directamente del inventario de la fábrica, automáticamente.

**La lista de recetas muestra:**
- Nombre de la receta y categoría del producto resultante
- Rendimiento (cuánto produce)
- Número de ingredientes
- Merma estimada
- Estado: Activa / Inactiva

Tocá ▼ en cualquier receta para ver su lista de ingredientes.

**Cómo crear una nueva receta:**
1. Tocá **"+ Nueva Receta"**
2. Completá la información general:
   - **Nombre** (ej: "Carne Junior Preparada")
   - **Descripción** (opcional)
   - **Producto resultante:** El producto que genera esta receta (buscalo por nombre)
   - **Rendimiento:** Cuántas unidades/kg produce
   - **Unidad:** kg, unidades, litros, etc.
   - **Merma estimada (%):** Porcentaje de pérdida esperada (ej: 5%)
   - **Notas operativas:** Instrucciones para el operario (opcional)
3. Agregá los ingredientes:
   - Tocá **"+ Agregar Ingrediente"**
   - Buscá el insumo por nombre (buscador en tiempo real)
   - Ingresá la cantidad
   - La unidad se completa automáticamente
   - Repetí para cada ingrediente
4. Tocá **"Guardar Receta"**

**Cómo editar una receta:**
1. En la lista, tocá el botón **"✏️ Editar"** (color ámbar) de la receta
2. El formulario de edición carga con todos los datos existentes
3. Modificá lo que necesites: campos generales, ingredientes (agregar, quitar, cambiar cantidades)
4. También podés activar/desactivar la receta con el toggle "Activa / Inactiva"
5. Tocá **"Guardar Cambios"**

> **¿Editar una receta afecta el inventario pasado?**
> No. Editar la receta es solo cambiar la fórmula en papel. No genera ningún movimiento de stock. Las ventas anteriores quedan con los valores de cuando se realizaron.

> **¿Cómo aparecen los nuevos productos en el buscador de ingredientes?**
> Automáticamente. Cuando el Admin crea un nuevo producto en el catálogo, aparece disponible para seleccionarlo como ingrediente o como producto resultante de una receta.

---

### Sub-módulo: Órdenes de Producción

**¿Para qué sirve?**
Para registrar cuando la fábrica prepara un lote de producto. **Solo aplica para hamburguesas** — carnes preparadas, mezclas, panes. Los insumos de Açaí se compran a proveedores.

**Ejemplos de uso:**
- "Hoy preparamos 5 kg de carne clásica para el fin de semana"
- "Amasamos 50 panes artesanales"
- "Mezclamos condimentos para la carne lomino"

**Cómo crear una orden:**
1. Tocá **"+ Nueva orden"**
2. Elegí la **receta** (solo aparecen recetas de productos tipo Burger)
3. Elegí la **sucursal/fábrica** donde se produce
4. Ingresá la **cantidad a producir**
5. Fecha programada (opcional)
6. Nombre del responsable
7. Notas (opcional)
8. Tocá **"Crear orden"** → queda en estado **SCHEDULED**

**Cuando termina la producción física:**
1. Localizá la orden en la lista
2. Tocá **"✓ Completar"**
3. El sistema automáticamente:
   - Descuenta la materia prima de la receta del inventario de la fábrica
   - Acredita el producto terminado en el inventario
   - Registra todos los movimientos en el kardex

Los estados posibles de una orden son: SCHEDULED → IN_PROGRESS → COMPLETED o CANCELLED.

---

### Sub-módulo: Inventario de Fábrica

Muestra **todo el stock** de la fábrica o sucursal seleccionada, sin restricciones de tipo de producto. Incluye materia prima, productos terminados, empaques, bebidas, etc.

**Filtros disponibles:**
- Selector de sucursal
- Buscador por nombre o SKU
- Botones de estado (Sin stock / Stock bajo / Normal)
- **Pestañas de tipo:** Se generan automáticamente según los tipos de producto que existan en el inventario. Ejemplo: si hay BURGER, ACAI_TOPPING y RAW_MATERIAL, aparecen 4 pestañas (Todo + una por tipo).

---

## 11. MÓDULO: Administración ⚙️

**¿Quién lo usa?** Solo Administradores.
**¿Para qué sirve?** Panel de control total del sistema. Todo lo que usan los demás roles se configura desde aquí.

El panel se divide en 4 secciones grandes:

---

### Sección 1: Gestión Operacional

#### 👥 Usuarios
Gestión de todas las cuentas del sistema.

**Crear un usuario:**
1. Tocá **"+ Nuevo usuario"**
2. Completá nombre, email, contraseña inicial, rol y sucursales asignadas
3. Guardá

**Roles disponibles:** ADMIN, MANAGER, CASHIER, WAREHOUSE

**Editar / Desactivar:** Podés editar cualquier dato o desactivar un usuario. Uno desactivado no puede entrar al sistema.

> Los roles determinan qué módulos y acciones están disponibles. Un CASHIER de sucursal Açaí solo verá el POS Açaí, no el POS Burgers.

#### 🏪 Sucursales
Configuración de cada local del negocio.

Cada sucursal tiene un **Tipo** que es el campo más importante:

| Tipo | Qué sucursal es | ¿Qué módulos activa? |
|---|---|---|
| `ACAI` | Local de Açaí | POS Açaí con balanza, Reposición en Cierre de Caja |
| `HAMBURGUESAS` | Local de Burgers | POS Burgers con Cocina en Vivo |
| `FABRICA` | Fábrica/almacén | Producción, Recepción, Pedidos Internos |
| `WAREHOUSE` | Almacén secundario | Inventario, Pedidos Internos |

#### 📋 Cierres de Caja (vista Admin)
Vista global de todos los cierres de todas las sucursales. Filtros por sucursal, fecha, estado. Útil para auditar o verificar si una sucursal olvidó cerrar caja.

#### 🧾 Gastos (vista Admin)
Vista global de todos los gastos con filtros por sucursal, categoría y fecha. Exportable.

---

### Sección 2: Inventario & Catálogo

#### 📦 Productos
El catálogo maestro. **Todo lo que existe en el sistema pasa por aquí primero.**

**Campos al crear un producto:**

| Campo | Descripción |
|---|---|
| Nombre | Nombre completo del producto |
| SKU | Código único identificador (ej: `ACB-FRESA-001`) |
| Tipo | Define el comportamiento del producto (ver tabla abajo) |
| Categoría | Etiqueta libre para agrupar (ej: `FRUTAS`, `HELADOS`) |
| Unidad | kg, gr, unidades, litros, ml, bolsa |
| Precio | Precio de referencia |
| Stock mínimo | Umbral de alerta de stock bajo |
| Imagen | Foto del producto |

**Tipos de producto y qué activan:**

| Tipo | Cuándo usarlo | Dónde aparece |
|---|---|---|
| `ACAI_BASE` | Sabores del bowl de açaí | POS Açaí (botones de sabor) |
| `ACAI_TOPPING` | Toppings del bowl | POS Açaí (sección extras), Cierre de Caja (reposición) |
| `BURGER` | Hamburguesas finales | POS Burgers |
| `BURGER_EXTRA` | Extras de burgers (papas, bebidas) | POS Burgers |
| `RAW_MATERIAL` | Materia prima de producción | Fábrica, ingredientes de recetas |
| `BEVERAGE` | Bebidas | POS Açaí extras, POS Burgers |
| `PACKAGING` | Empaques, recipientes | Solo inventario |

> **Importante:** Crear el producto en el catálogo NO lo agrega al inventario de ninguna sucursal. Para eso necesitás asignarlo en "Precios por Sucursal".

> **¿Cómo agrego una nueva categoría a la Reposición del Cierre de Caja?**
> Simplemente creá un producto con la categoría nueva (ej: `PROTEINAS`). Automáticamente aparecerá como nueva pestaña en el acordeón de Reposición la próxima vez que abran el cierre de caja.

#### 🗂️ Combos
Paquetes de productos a precio especial en el POS Burgers.

**Crear un combo:**
1. Nombre (ej: "Combo Clásico")
2. Precio del combo
3. Agregar los ítems que incluye con sus cantidades
4. Activar

Aparecen automáticamente en la pestaña "Combos" del POS Burgers.

#### 🎛️ Modificadores
Las personalizaciones disponibles en el POS Burgers al editar un ítem del carrito.

**Campos:** Nombre del modificador, precio adicional (puede ser Bs. 0), categoría de agrupación.

Ejemplos: "Sin queso" (Bs. 0), "Doble carne" (Bs. 8), "Extra salsa" (Bs. 3)

#### 💲 Precios por Sucursal
Aquí se vincula un producto con una sucursal y se define su precio en esa sucursal.

**¿Por qué existe esto?**
Un mismo producto puede tener precios distintos en diferentes sucursales. Al asignar un producto a una sucursal:
1. Ese producto aparece disponible en el POS de esa sucursal
2. Se crea automáticamente un registro en el inventario de esa sucursal (stock inicial en 0)

#### 🔔 Alertas de Stock
Lista todos los productos con stock Crítico o Bajo en todas las sucursales. Útil para planificar compras a proveedores.

#### 📊 Kardex Global
Historial de movimientos de inventario de todas las sucursales. Filtrable y exportable a CSV.

#### 🛒 Pedidos a Proveedores
Módulo para gestionar órdenes de compra a proveedores externos: crear pedidos, hacer seguimiento y registrar la recepción.

---

### Sección 3: Ventas y Finanzas

#### 🧾 Historial de Ventas
Lista de todas las ventas registradas en el sistema.

**Filtros disponibles:** Sucursal, fecha, método de pago, cajero.

Para cada venta se muestra: número de venta, sucursal, cajero, ítems, total, método de pago y hora.

#### 📈 Reportes y Analytics
El panel de análisis de rendimiento del negocio.

**Filtros de período:** Hoy / Últimos 7 días / Últimos 14 días / Últimos 30 días / Este mes / Este año

**Filtros de sucursal:** Botones con los nombres de las sucursales. Podés elegir una o ver todas juntas.

**Lo que muestra:**

| Indicador | Descripción |
|---|---|
| 4 KPIs principales | Ingresos totales, Ventas realizadas, Ticket promedio, Ingresos de hoy |
| Gráfico de barras | Ingresos por período (diario o mensual) |
| Gráfico de dona | Distribución por método de pago (Efectivo / Tarjeta / QR) |
| Top 6 productos | Los productos que más ingresos generaron |
| Gráfico de línea | Evolución de la cantidad de ventas en el tiempo |

**Exportación:**
- **CSV:** Datos crudos para analizar en Excel
- **PDF:** Reporte formateado para imprimir o enviar por WhatsApp/email

---

### Sección 4: Configuración

#### ⚖️ Balanza (Prix 4)
Configuración de la conexión de la balanza para cada sucursal Açaí:
- Tipo de conexión: USB o Red
- IP del bridge (si es por red)
- Puerto de conexión

---

## 12. Conceptos importantes del sistema

### 🔄 Recetas Dinámicas (Cocina en Vivo)

Cuando se vende una hamburguesa con receta configurada en el POS Burgers:

1. El sistema busca la receta de ese producto
2. Descuenta automáticamente los **ingredientes de la receta** del inventario de la fábrica
3. El cajero no hace nada extra — sucede en el momento del cobro

*Sin receta:* El sistema descuenta directamente el producto del inventario local.
*Con receta:* El sistema descuenta los ingredientes de la fábrica (Cocina en Vivo).

### 🔗 Cadena de abastecimiento completa

```
PROVEEDOR EXTERNO
    ↓
    Recepción de Mercadería en Fábrica
    ↓
FÁBRICA — Materia Prima (harina, carne, pulpa, toppings, etc.)
    ↓
    Para Hamburguesas: Órdenes de Producción (carne preparada, panes)
    Para Açaí: El producto ya está listo, pasa directo
    ↓
FÁBRICA — Producto Terminado
    ↓
    Pedidos Internos / Transferencias
    ↓
SUCURSAL — Stock disponible para vender
    ↓
    Venta en POS (con o sin Receta Dinámica)
    ↓
CLIENTE
```

### 📁 El Kardex (libro de movimientos)

El kardex es el registro histórico e inmutable de todos los movimientos de stock. Funciona como un libro contable:
- Cada entrada y cada salida queda registrada con fecha, hora, tipo, cantidad y responsable
- No se puede borrar ni editar un movimiento del pasado
- Garantiza la trazabilidad total del inventario

### 📶 Modo Offline

Si se va el internet durante una venta:
- Aparece una barra naranja en la parte superior del POS
- Las ventas se siguen guardando localmente en la computadora
- Cuando vuelve el internet, se sincronizan automáticamente
- No se pierde ninguna venta

---

## 13. Flujo de trabajo del día a día

### Turno de un Cajero Açaí

```
1. Llegás al local
2. Abrís "Cierre de Caja" → Abrís sesión con el sencillo inicial
3. Vas al "POS Açaí" y vendés durante tu turno
4. Si hay un gasto (gas, limpieza, etc.): lo registrás en "Gastos"
5. Al final del turno, volvés a "Cierre de Caja"
6. Usás el acordeón de Reposición para pedir lo que falta
7. Contás el efectivo físico de la caja
8. Ingresás el monto contado y confirmás el cierre
```

### Turno de un Cajero Burgers

```
1. Llegás al local
2. Abrís "Cierre de Caja" → Abrís sesión
3. Vas al "POS Burgers" y vendés (los ingredientes se descuentan solos)
4. Registrás gastos si los hay
5. Al final: cerrás caja normalmente
```

### Día en la Fábrica (Rol Almacén)

```
1. Abrís el Dashboard de Fábrica
2. Revisás los pedidos internos pendientes de las sucursales
3. Aprobás los pedidos (con las cantidades que hay disponibles)
4. Despachás físicamente y lo marcás en el sistema
5. Si llegó mercadería de proveedor: la registrás en "Recepción de Mercadería"
6. Si toca producir (carnes, panes): creás una Orden de Producción
7. Cuando termina la producción: completás la orden → stock se acredita solo
8. Verificás el Inventario completo de la fábrica
```

### Revisión semanal (Admin)

```
1. Abrís "Administración → Reportes"
2. Filtrás por "Últimos 7 días"
3. Revisás: ventas por sucursal, top productos, métodos de pago
4. Abrís "Alertas de Stock" → ves qué productos necesitan reabasto
5. Exportás el reporte a PDF si necesitás enviarlo
```

---

## 14. Preguntas frecuentes

**¿Qué pasa si el cajero cierra caja con diferencia (sobra o falta dinero)?**
El sistema permite cerrar igual. La diferencia queda registrada en el historial de cierres para que el Gerente o Admin la revise y analice la causa.

**¿Puedo hacer una venta sin que haya una caja abierta?**
No. El POS (Açaí y Burgers) tiene un control de acceso que bloquea el ingreso si no hay una sesión de caja activa para esa sucursal.

**¿Qué pasa si edito una receta que ya se usó en ventas anteriores?**
Las ventas pasadas no se modifican — quedan registradas con los valores que tenían en ese momento. La receta actualizada se usa a partir del siguiente pedido.

**¿Puedo borrar o anular una venta?**
No directamente. Las ventas son registros permanentes. Si hay un error de cobro, se corrige mediante un ajuste de inventario manual o un registro de gasto compensatorio.

**¿Cómo agrego un nuevo sabor de Açaí al POS?**
1. Admin → Productos → Crear producto con tipo `ACAI_BASE`
2. Admin → Precios por Sucursal → Asignar a la sucursal Açaí con su precio por kg
3. Aparecerá automáticamente en el POS Açaí

**¿Cómo agrego un nuevo topping/extra al POS Açaí?**
1. Admin → Productos → Crear producto con tipo `ACAI_TOPPING` y la categoría que corresponda
2. Admin → Precios por Sucursal → Asignarlo a la sucursal
3. Aparecerá en los extras del POS Açaí Y en el acordeón del Cierre de Caja

**¿Cómo agrego una nueva categoría en la Reposición del Cierre de Caja?**
Solo creá un producto con la nueva categoría (ej: `PROTEINAS`). Automáticamente aparecerá como una pestaña nueva en el acordeón. No se necesita tocar el código.

**¿Cómo agrego una nueva hamburguesa al POS Burgers?**
1. Admin → Productos → Crear producto con tipo `BURGER`
2. Admin → Precios por Sucursal → Asignarlo a la sucursal Burgers con su precio
3. (Opcional) Admin → Recetas → Crear receta para ese producto si quiere Cocina en Vivo
4. Aparecerá automáticamente en el POS Burgers

**¿Para qué sirven las Órdenes de Producción si las ventas ya descuentan ingredientes solos?**
Son para dos cosas diferentes. Las Órdenes de Producción son para cuando la **fábrica prepara un lote físico** (ej: 5 kg de carne preparada para el fin de semana). Las Recetas Dinámicas son para que la **venta en el POS** descuente ingredientes automáticamente. Son dos eslabones distintos de la cadena del negocio.

**¿El Açaí también usa Órdenes de Producción?**
No. El Açaí (pulpa, bases, toppings) se compra directamente a proveedores. Entra al sistema por **Recepción de Mercadería** en la Fábrica. Las Órdenes de Producción solo son para hamburguesas.

**¿Qué es el SKU?**
El SKU (Stock Keeping Unit) es el código único de identificación de cada producto. Como el DNI del producto. Sirve para buscarlo rápido y evitar confusiones entre productos con nombres similares.

**¿Se puede acceder al sistema desde cualquier dispositivo?**
Sí. El sistema es web y funciona en cualquier navegador moderno (Chrome, Edge, Firefox) desde cualquier dispositivo con acceso a internet.

**¿Qué pasa si la balanza se desconecta durante una venta?**
El POS Açaí te avisa que perdió la conexión con la balanza. No podrás capturar el peso hasta que se reconecte. Las demás funciones del sistema siguen funcionando normalmente.

---

*📘 Manual SKOT ERP — Uso interno de la empresa*
*Para soporte técnico o dudas, contactar al administrador del sistema 77848278-75175055.*
