# Puesta en uso del flujo de producto a POS

Este documento acompaña la implementación de `plan-producto-a-pos.md`. La migración y las pruebas descritas aquí deben ejecutarse primero en una copia aislada de los datos.

El siguiente modelo debe utilizar [el traspaso de ejecución](plan-ejecucion-piloto-27-mayo.md), que incorpora las últimas decisiones del usuario y la matriz de resultados esperados del piloto.

Estado del piloto al 9 de noviembre de 2026: las tres migraciones aditivas están aplicadas en el Neon configurado después de un respaldo restaurado en PostgreSQL 18.6. El código nuevo aún no está desplegado. Por autorización se configuraron Junior y Coca-Cola y se ejecutó un ciclo remoto ficticio; el saldo final de insumos en sucursal quedó en cero, sin afirmar recepción física. La sesión olvidada quedó cerrada. El [informe](resultados-piloto-27-mayo.md) detalla la venta/movimientos marcados y los pasos físicos pendientes.

## Decisiones registradas

- Skot Junior se arma al vender en la sucursal: corresponde **ingredientes al preparar**. El piloto se realizará en «Skor Burger - 27 de mayo» utilizando el SKU existente `SKOT-JR-HSA`. La sección 9 del [plan](plan-producto-a-pos.md#9-ejecución-del-piloto-en-27-de-mayo) registra los 100 g de carne confirmados y las cantidades aproximadas autorizadas de queso, tomate y lechuga.
- Las 10 unidades encontradas en el inventario de sucursal son datos de prueba, no un saldo físico inicial. No se deben conservar como disponibilidad ni convertirlas en ingredientes.
- La bebida será Coca-Cola personal, comprada por paquetes y vendida en la botella del proveedor a **Bs 7 por unidad**. No se requiere inventar volumen ni factor de empaque. El producto mencionado como terminado de fábrica era Skot Junior: el usuario aceptó despachar ingredientes y armarla en sucursal. El piloto se limita a estos dos productos.
- Los productos quedan sin clasificar tras la migración salvo los dos del piloto: Skot Junior está en `RECIPE` y Coca-Cola en `STOCK`. Los otros cinco ingredientes siguen sin clasificación pero no se venden en POS. No interpretar otras recetas como clasificación automática.
- Durante la transición `REQUIRE_CLASSIFIED_CONSUMPTION` puede permanecer desactivada. Cuando se hayan revisado los productos de venta y los componentes de combos, configurarla como `true` en el entorno de la aplicación impide vender productos sin modalidad. Reiniciar la aplicación tras cambiarla.
- Las autorizaciones de precio y receta offline se firman durante 30 días y quedan ligadas a la sucursal y usuario de caja. La venta conserva la captura verificada en sus líneas para auditoría; la caja guarda su catálogo cacheado por usuario y sucursal. Configura `OFFLINE_SALE_SECRET` con un secreto aleatorio de al menos 32 caracteres (o usa el `JWT_SECRET` fuerte existente), igual en todos los servidores y estable hasta sincronizar las colas. Cambiar esa clave invalida autorizaciones pendientes; antes de rotarla, sincroniza o concilia cada caja. El stock se valida al sincronizar, así que una autorización de precio no permite inventario negativo.
- El usuario confirmó la política de cortesías: administración y encargados pueden autorizar hasta el 100 % de descuento; caja puede aplicar hasta el 15 %. Una cortesía sigue registrando los movimientos de inventario.

## Antes de cambiar la configuración

1. Inventariar las cajas y sincronizar sus ventas offline pendientes. El estado de estas colas se guarda en cada navegador y no puede conocerse completamente desde la base de datos.
2. Generar un respaldo y verificar cómo recuperarlo. La migración agrega campos, pero la operación posterior puede crear ventas y movimientos que no deben perderse en una restauración indiscriminada.
3. Generar el informe de solo lectura. Funciona antes y después de las migraciones de consumo:

   ```bash
   umask 077; node --import tsx scripts/diagnostics/product-readiness.ts > /tmp/informe-productos.json
   ```

   Para scripts ejecutados directamente, exportar previamente `DATABASE_URL` y `DIRECT_URL` del entorno de destino. El informe incluye recetas, unidades, existencias, asignaciones, precios y combos; guardarlo en un lugar privado.

4. Revisar con fábrica y sucursales el modo de cada producto, la receta de venta, el rendimiento y las unidades. Comparar existencias físicas y kardex. Registrar cualquier diferencia mediante un ajuste trazable; no transformar automáticamente productos terminados en ingredientes.
5. Revisar las recetas con varias versiones y los precios ausentes. El asistente impide publicar una receta inválida o un precio comercial ausente. Una receta de venta puede usar un componente fabricado como ingrediente, consumiendo el stock de ese componente.

## Migración y clasificación

Aplicar las migraciones con `npm run prisma:migrate:deploy` únicamente sobre la base preparada para el despliegue. Regenerar el cliente y desplegar aplicación y esquema de forma coordinada. Los campos nuevos son aditivos y no clasifican productos ni ajustan saldos.

La clasificación puede realizarse desde **Administración → Productos → Preparar para venta** o desde el botón de preparación de cada producto. Para clasificar una lista revisada se dispone de `scripts/data/classify-consumption.ts`:

```json
[
  { "productId": "ID_REVISADO", "mode": "RECIPE", "recipeId": "ID_RECETA_REVISADA" },
  { "productId": "ID_OTRO_PRODUCTO", "mode": "STOCK" }
]
```

Guardar el archivo fuera del repositorio y ejecutar primero la simulación:

```bash
node --import tsx scripts/data/classify-consumption.ts /ruta/privada/clasificacion.json
```

El resultado muestra valores anteriores y propuestos. La simulación no escribe datos. Tras revisar el archivo, `--apply` aplica todas las filas en una transacción; una receta inválida cancela toda la operación y repetirla no duplica cambios. No se seleccionan recetas automáticamente. La clasificación por sí sola no asigna precios ni sucursales.

## Piloto y operación

1. Configurar Skot Junior como preparación al vender, con la receta confirmada y precios en las sucursales piloto. El asistente guarda el producto, la receta y las asignaciones en una transacción y no genera stock.
2. Abastecer ingredientes en cada sucursal y comprobar la disponibilidad que muestra el asistente y el POS. Vender una unidad y comparar los movimientos con las cantidades de receta divididas por su rendimiento.
3. Coca-Cola personal quedó creada por botella a Bs 7 en el Neon; el ciclo de prueba descontó una botella y la existencia se limpió de vuelta a cero. En operación real, recibir las botellas físicas y verificar que cada venta descuente una unidad. Desde el catálogo, «Abastecer» abre un pedido: Junior precarga ingredientes y una bebida precarga su propio producto. Despacho y recepción se confirman por separado. El piloto de Junior no exige una orden de producción de hamburguesas terminadas; el soporte genérico de producción conserva sus pruebas existentes.
4. Comprobar una venta offline, su sincronización y una segunda sincronización del mismo identificador. El servidor verifica la firma ligada a usuario, sucursal, precio y configuración que recibió la caja; aunque el precio o la receta cambien después, contabiliza los valores autorizados al vender. Si falta inventario, la firma no existe, venció o no coincide, la cola queda para conciliación manual. Las ventas offline anteriores a las autorizaciones firmadas también requieren conciliación.
5. Validar físicamente que el despacho y la recepción coinciden, revisar kardex y cierre de caja, y documentar cualquier diferencia antes de ampliar el piloto.

Para un Açaí mixto el POS distribuye el peso en partes iguales entre los sabores seleccionados y descuenta cada uno. La interfaz presenta esa regla al cajero.

Las asignaciones activas que se desmarquen en el asistente se desactivan solo dentro de las sucursales comerciales a las que el usuario tiene acceso. Las sucursales ajenas no se modifican.

## Pruebas locales reproducibles

Las pruebas de integración rechazan cualquier URL que no apunte a `127.0.0.1:55432/skot_test`. Preparar una base PostgreSQL aislada con ese nombre, aplicar las migraciones y exportar sus URL en el proceso. No utilizar una base de producción para estas pruebas.

```bash
OFFLINE_SALE_SECRET='secreto-local-de-pruebas-de-mas-de-32-caracteres' node --import tsx --test tests/inventory-consumption.test.ts tests/product-pos.integration.test.ts tests/classify-consumption.integration.test.ts tests/internal-orders.integration.test.ts tests/sync-manager.test.ts tests/offline-sale-authorization.test.ts tests/pilot-27-mayo.integration.test.ts
npm run build
```

Para la prueba de navegador, iniciar la aplicación en `127.0.0.1:3100` contra esa misma base, configurar el mismo `JWT_SECRET` en el servidor y en el proceso de prueba y la misma `OFFLINE_SALE_SECRET` en ambos procesos, y ejecutar:

```bash
OFFLINE_SALE_SECRET='secreto-local-de-pruebas-de-mas-de-32-caracteres' npx playwright test tests/e2e/product-setup.spec.ts tests/e2e/internal-orders.spec.ts --workers=1
```

Los datos ficticios creados por las pruebas permanecen en la base aislada. El equipo debe revisar el informe, las colas offline y los saldos antes de aplicar cualquier clasificación en una base real.
