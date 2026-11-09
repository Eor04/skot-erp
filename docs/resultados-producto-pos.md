# Resultados de implementación y pruebas

Fecha de la revisión: 9 de noviembre de 2026.

La implementación y las migraciones se probaron con PostgreSQL 17 en la base aislada `127.0.0.1:55432/skot_test`, con productos y usuarios ficticios. Posteriormente, las tres migraciones aditivas se aplicaron al Neon de `.env` después de validar un respaldo restaurable. Por instrucción del usuario se configuraron allí los dos productos y se hizo una prueba remota con movimientos/venta ficticios etiquetados.

## Comportamientos comprobados

- Una receta con rendimiento diez descuenta dos décimas de sus insumos cuando se venden dos unidades. El producto terminado, si se vende por stock, descuenta sus propias unidades.
- El sistema suma los ingredientes compartidos de un carrito y rechaza la venta si el total excede lo disponible. Dos cajas que intentan vender la última unidad no pueden descontarla dos veces.
- El POS calcula disponibilidad de preparados a partir de ingredientes y limita a unidades completas la cantidad agregada al carrito.
- El servidor contrasta precios de sucursal, combos y modificadores. En Açaí mixto se reparte el peso en partes iguales entre los sabores seleccionados y se descuenta cada sabor.
- Una venta offline conserva precio y receta originales aunque ambos cambien antes de sincronizar. El servidor verifica autorizaciones firmadas ligadas a usuario y sucursal, registra la captura validada para auditoría, vuelve a comprobar el stock y no duplica la venta al reintentar el identificador.
- Combos y extras también sincronizan con el precio firmado originalmente. Las autorizaciones alteradas, vencidas, de otra sucursal o de otro usuario se rechazan; los catálogos cacheados se separan por usuario y sucursal.
- Una cortesía como descuento total hecha por administración registra total cero y aun así descuenta el producto físico. El servidor rechaza descuentos mayores al 15 % hechos directamente por caja.
- Dos finalizaciones simultáneas de la misma producción generan un solo resultado. En transferencias y pedidos internos, despacho y recepción mueven stock una vez. Una recepción parcial de pedido interno registra la diferencia.
- «Abastecer» desde un producto preparado carga sus ingredientes con cantidades por unidad de receta y avisa que el usuario debe ajustarlas al volumen que necesita; para productos de stock carga el producto terminado. La API requiere rol administrativo.
- El enlace de configuración desde un aviso de transferencia abre la sucursal y el producto de destino correspondientes, sin bloquear traslados de insumos.
- El asistente guarda y retoma borradores, habilita precios en varias sucursales y no crea existencias. Una caja sin permisos no puede cambiar precios y un encargado no puede cambiarlos en una sucursal ajena.

## Verificación ejecutada

- `node --import tsx --test` sobre consumo, clasificación, POS, pedidos internos, sincronización offline, autorizaciones firmadas y piloto completo de 27 de Mayo: **10 pruebas aprobadas**. Incluyen PostgreSQL, cambios offline de precio/receta y de combo/extra, cortesías, transacciones simultáneas, venta Bs 22, kardex, cierre y restricciones de acceso. Los IDs del escenario están en [resultados del piloto](resultados-piloto-27-mayo.md).
- Playwright sobre `product-setup.spec.ts` y `internal-orders.spec.ts`: **8 pruebas aprobadas**, en móvil y escritorio. Incluyen borrador, alta, abastecimiento de producto por stock e ingredientes, POS, pedidos internos, producción y transferencia.
- Playwright sobre `comanda-print.spec.ts`: **5 pruebas aprobadas** de formato e invocación de impresión simulada.
- `npx tsc --noEmit --incremental false`: aprobado.
- `npm run build`: aprobado con las URL de la base aislada. El sistema informó que la base de datos local de Browserslist está desactualizada.
- `git -c core.whitespace=cr-at-eol diff --check`: aprobado respetando los archivos CRLF existentes.

Las pruebas de impresión no sustituyen la verificación con impresora térmica. El flujo Açaí por peso se comprobó en la API con datos ficticios; la balanza física requiere una prueba en el equipo de caja.

## Ensayo aislado y piloto real pendiente

El ensayo aislado completo se ejecutó y documentó en [resultados del piloto](resultados-piloto-27-mayo.md): receta provisional, transferencia/recepción de ingredientes y botellas, venta por Bs 22, seis movimientos de consumo, reintento offline idempotente y cierre con diferencia cero. Esto no es mercancía ni venta real.

En el Neon configurado, Junior quedó clasificado como `RECIPE` y selecciona la receta provisional nueva; la receta histórica permanece. Coca-Cola personal se creó como `STOCK`, SKU `COCA-COLA-PERSONAL`, botella a Bs 7. Se corrigieron las diez hamburguesas de prueba a cero mediante kardex. Una recepción, transferencia, venta offline Bs 22 y cierre quedaron marcados como ficticios; los saldos remanentes de ingredientes/botellas se ajustaron a cero. La venta de prueba sigue en la base, identificada por `PILOTO-PRUEBA-...`, y no representa ingresos reales. Código aún no desplegado; cola local de POS no revisada y abastecimiento físico pendiente. Ver [resultado del piloto](resultados-piloto-27-mayo.md).

Las tres migraciones dejan los productos existentes sin clasificar; mientras `REQUIRE_CLASSIFIED_CONSUMPTION` no sea `true`, conservan el comportamiento anterior. Se deben revisar el informe, las colas offline y los saldos antes de desplegar y clasificar. El código nuevo necesita aplicar las migraciones de esquema antes de conectarse a una base que aún no las tenga. El procedimiento y la recuperación se detallan en [puesta en uso](puesta-en-uso-producto-pos.md).
