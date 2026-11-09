# Resultados del ensayo aislado: Skot Junior y Coca-Cola

Fecha: 9 de noviembre de 2026. Entorno: PostgreSQL aislado `127.0.0.1:55432/skot_test`. **No es evidencia de mercancía recibida, venta ni caja de la sucursal real.** Los registros de esta ejecución se crearon con sufijo `69570ed8-cac2-4c68-bc0a-8c65bce438ef`.

## Flujo probado

- Fábrica ficticia `cmw9u8rd40000d4tfzsc74xm3` → 27 de Mayo ficticia `cmw9u8rda0001d4tfzqkw8lkl`.
- Skot Junior de prueba `cmw9u8rej000ad4tfffxtoipt`, receta `cmw9u8reo000cd4tfx2e5nwc7`, precio Bs 15. Coca-Cola personal de prueba `cmw9u8rfb000md4tff8xu0xfo`, unidad botella, precio Bs 7.
- Una recepción al inventario de fábrica (`REC-PILOT-69570ED8-CAC2-4C68-BC0A-8C65BCE438EF`) y una transferencia `TRF-2026-0034`, id `cmw9u8rhg001rd4tfvg6kpysr`, en estado `RECEIVED`. Se transfirieron y recibieron las cantidades completas de seis líneas; no se envió hamburguesa terminada.
- Se representaron las diez hamburguesas terminadas de prueba como saldo inicial 10 y se corrigieron a cero mediante movimientos trazables `cmw9u8rfv000vd4tfk87akqze` (entrada de fixture) y `cmw9u8rg70010d4tfgta690po` (ajuste -10). No se modificó ni borró kardex directamente.
- La venta `V-20261109-0236`, id `cmw9u8rl9003jd4tf4utpxpil`, contiene una Junior y una Coca-Cola por Bs 22. Se envió con identificador offline `pilot-69570ed8-cac2-4c68-bc0a-8c65bce438ef`; el reintento fue reconocido como repetición y no creó otra venta ni nuevos movimientos. Las dos líneas conservaron la captura de autorización offline.
- El cierre `cmw9u8rki003gd4tf6axirw2c` terminó `CLOSED`: fondo inicial Bs 0, ventas en efectivo Bs 22, efectivo esperado Bs 22, contado Bs 22 y diferencia Bs 0. La API ignoró un fondo inicial alterado en la solicitud de cierre y usó el de la sesión abierta.

## Inventario y kardex

| Producto | Unidad | En sucursal antes | Movimiento de venta | En sucursal después | ID del movimiento de venta |
| --- | --- | ---: | ---: | ---: | --- |
| Carne Skot Junior | kg | 1,000 | -0,100 | 0,900 | `cmw9u8rlj003od4tfwsdovucj` |
| Queso | kg | 0,200 | -0,020 | 0,180 | `cmw9u8rlj003qd4tfb024573o` |
| Lechuga | unidad | 0,500 | -0,050 | 0,450 | `cmw9u8rlj003sd4tf4qiid73m` |
| Tomate | kg | 0,300 | -0,030 | 0,270 | `cmw9u8rlj003ud4tfu0rvrni9` |
| Pan Skot Junior | unidad | 10 | -1 | 9 | `cmw9u8rlj003wd4tfhdjv4qop` |
| Coca-Cola personal | botella | 10 | -1 | 9 | `cmw9u8rlj003yd4tf2056j45o` |
| Skot Junior terminada | unidad | 0 | 0 | 0 | Sin movimiento de venta |

La transferencia generó seis `TRANSFER_OUT` en fábrica y seis `TRANSFER_IN` en sucursal, todos ligados al documento `TRF-2026-0034`. La recepción repetida fue rechazada. Referencias de kardex y existencias completas están en la salida estructurada `PILOT_EVIDENCE` de `tests/pilot-27-mayo.integration.test.ts`; la prueba también comprueba capacidad inicial de diez hamburguesas, stock insuficiente y falta de autenticación para abrir/cerrar caja.

## Verificación técnica

- En la base aislada, `prisma migrate deploy`: sin migraciones pendientes; `prisma generate`: correcto.
- Pruebas Node de consumo, catálogo/POS, clasificación, pedidos internos, sincronización, autorización offline y este piloto: **10 aprobadas, 0 fallidas**.
- `npx tsc --noEmit --incremental false`: correcto.
- `npm run build`: correcto; Next.js compiló las 53 páginas estáticas y las rutas de API. Advertencia no bloqueante: datos locales de Browserslist desactualizados.
- Playwright `tests/e2e/product-setup.spec.ts` y `tests/e2e/internal-orders.spec.ts`: **8 aprobadas** en 33,4 s, incluidos móvil/escritorio, abastecimiento y venta POS.
- `git -c core.whitespace=cr-at-eol diff --check`: correcto en el estado revisado.

## Entorno Neon configurado en `.env`

### Respaldo y esquema

Antes de escribir, se creó el respaldo `/tmp/skot-private-backups/skot-neon-2026-11-09.dump` (98.087 bytes, SHA-256 `db73075c00c6a51b802ea01070205be86ff204f2dee865100658c930c0e3542a`, permisos `0600`). Se restauró íntegramente en PostgreSQL 18.6 temporal y se verificaron los conteos: 2 sucursales, 6 productos, 5 usuarios, 0 ventas y 20 movimientos. La instancia temporal se eliminó. El respaldo es anterior a las migraciones y al ensayo ficticio remoto; está en `/tmp`, fuera del repositorio.

Después del respaldo se aplicaron las migraciones `20261109170000_explicit_product_consumption`, `20261109180000_product_setup_draft` y `20261109190000_offline_sale_snapshots`. `prisma migrate status` confirmó las 10 migraciones al día. El informe completo posterior a las migraciones quedó con permisos `0600` en `/tmp/skot-product-readiness-post-migration-2026-11-09.json`.

### Configuración y ciclo ficticio autorizado

El usuario autorizó cerrar la caja de prueba olvidada y utilizar existencias simuladas, sin requerir conteo físico. Por eso, las siguientes operaciones están registradas con notas `PRUEBA FICTICIA`; **no representan mercancía, despacho, cobro ni venta física**.

- El producto existente «Skor Junior», SKU `SKOT-JR-HSA` (id `cmw8swiqb0001hqcazmimuzux`), quedó `RECIPE`, con precio Bs 15 y receta de venta nueva `cmw9vcgjz00024gk2r7uavjcf`. La receta histórica de producción `cmw8t2bvi0008hqca2mc00l5y` se conservó sin cambios.
- Se creó «Coca-Cola personal», SKU `COCA-COLA-PERSONAL`, unidad botella, modo `STOCK`, precio Bs 7 en 27 de Mayo (id `cmw9vckow000c4gk2mk9llprp`).
- El saldo de prueba de 10 hamburguesas terminadas en sucursal se corrigió a cero con ajuste autenticado `cmw9vcn18000j4gk2d5168ly5`; el producto terminado no se movió con la venta.
- Recepción ficticia en fábrica: `REC-PILOTO-327D0076-FA53-44CB-8FED-5102E51E9864`, con cinco ingredientes para diez hamburguesas y diez botellas individuales.
- Transferencia `TRF-2026-0002`, id `cmw9vcwny001a4gk26lj92098`, quedó `RECEIVED`. Se rechazó la segunda recepción. Sus notas dicen expresamente que no fue despacho físico.
- Venta `V-20261109-0001`, id `cmw9vdjtp00324gk2zslitqpu`, por Bs 22: una Junior a Bs 15 y una Coca-Cola a Bs 7. Su identificador `PILOTO-PRUEBA-327d0076-fa53-44cb-8fed-5102e51e9864` y la nota de venta la identifican como ficticia. Las dos líneas guardaron su captura offline. Reintentar el mismo ID se devolvió como repetición, sin venta ni descuento adicional.
- El cierre nuevo `cmw9vdf04002z4gk2x3kbmq75` quedó `CLOSED`: apertura Bs 0, esperado Bs 22, contado simulado Bs 22, diferencia Bs 0.
- La sesión de prueba olvidada `cmw8tnr1q003rhqcaizj0er1a` también quedó `CLOSED`, autorizada por el usuario: fondo Bs 300, ventas/gastos Bs 0, efectivo ficticio Bs 300 y diferencia Bs 0. La nota indica que no fue conteo ni efectivo real. Actualmente no hay sesiones abiertas en 27 de Mayo.

### Saldos y kardex remoto de la prueba

En la sucursal se transfirieron los siguientes saldos antes de vender; la venta consumió exactamente una receta y una botella. Después se revirtieron los remanentes ficticios a cero mediante ajustes autenticados. La fábrica volvió a sus saldos de sistema previos (49 unidades de catálogo para cada ingrediente); no se cambió stock de hamburguesa terminada en fábrica (1 unidad).

| SKU | Unidad | Sucursal antes de venta | SALIDA de venta | Sucursal después de limpieza | ID de salida |
| --- | --- | ---: | ---: | ---: | --- |
| `CAR-JR-HSA` | kg | 1,000 | -0,100 | 0 | `cmw9vdm4600374gk2wz3y639s` |
| `QSO-SKT-003` | kg | 0,200 | -0,020 | 0 | `cmw9vdm4700394gk2p0gi70ar` |
| `LCH-SKT-001` | unidad | 0,500 | -0,050 | 0 | `cmw9vdm47003b4gk2ec21bhki` |
| `TME-SKT-002` | kg | 0,300 | -0,030 | 0 | `cmw9vdm48003d4gk2f2effcyw` |
| `PAN-JR-HSA` | unidad | 10 | -1 | 0 | `cmw9vdm48003f4gk2maki2ysd` |
| `COCA-COLA-PERSONAL` | botella | 10 | -1 | 0 | `cmw9vdm48003h4gk2l43bmabz` |
| `SKOT-JR-HSA` terminado | unidad | 0 | 0 | 0 | Sin salida por la venta |

El documento de transferencia tiene seis salidas de fábrica (`TRANSFER_OUT`) y seis entradas de sucursal (`TRANSFER_IN`); sus 12 IDs son `cmw9vd0dx001m4gk2zmpc40n8`, `cmw9vd10n001q4gk2n1nvh6jv`, `cmw9vd1hq001u4gk2ost84p9f`, `cmw9vd1ys001y4gk2vvaxbhxs`, `cmw9vd2d000224gk21ggt53hd`, `cmw9vd2u300264gk214sadjbz`, `cmw9vd62p002b4gk2v6m45e6k`, `cmw9vd6wn002f4gk2ypt3ohr0`, `cmw9vd7hw002j4gk2w8mbw85s`, `cmw9vd81j002n4gk2c2i422gm`, `cmw9vd8rg002r4gk2brjl62c8` y `cmw9vd9bb002v4gk28o74usda`.

Los ajustes de limpieza de saldo ficticio están identificados por SKU: carne `cmw9vdzb6003n4gk2kcyn5sy9`, queso `cmw9ve1du003s4gk2zkuz04tu`, lechuga `cmw9ve2y0003x4gk2uqhs0cr7`, tomate `cmw9ve4zz00424gk23023a0xn`, pan `cmw9ve6no00474gk292womwhw` y Coca-Cola `cmw9ve8sh004c4gk2jo1y0zss`. Los saldos actuales de sistema en sucursal para los seis son cero; Coca-Cola también tiene cero en fábrica. El catálogo/precio permanece configurado, pero POS mostrará disponibilidad cero hasta que exista abastecimiento real.

La base de datos contiene **una venta y movimientos ficticios de prueba**, claramente marcados por `offlineId`/notas y referencias. No deben presentarse como ingresos u operación real en informes comerciales. La tabla central `sync_queue` no tiene pendientes de 27 de Mayo; eso no inspecciona colas guardadas localmente en cada dispositivo.

### Trabajo real todavía pendiente

1. Desplegar el código verificado de este repositorio y configurar en el runtime el `JWT_SECRET` fuerte (o `OFFLINE_SALE_SECRET` estable de 32+ bytes). `REQUIRE_CLASSIFIED_CONSUMPTION` permanece apagado hasta revisar el entorno desplegado completo.
2. Antes de cualquier movimiento real, tomar un respaldo nuevo y revisar las colas offline de cada POS.
3. Cuando se realice físicamente la entrega, registrar cantidades reales, despacho y recepción. El stock de sucursal está en cero; esta prueba no dejó mercancía ficticia disponible.
4. Realizar una venta física y cierre de caja reales; excluir la venta de prueba marcada de los reportes financieros/operativos según la política local.
5. La revisión física de fábrica/sucursal y la operación comercial permanecen pendientes; no se afirma haber recibido o vendido mercancía real.

## Instrucciones por rol

- **Administración:** configurar Junior como preparado por receta y precio Bs 15; registrar Coca-Cola por botella a Bs 7; revisar el diagnóstico antes de publicar. No registrar stock desde el asistente.
- **Fábrica:** comprobar cantidades realmente disponibles, recibir compras reales y despachar a 27 de Mayo los ingredientes para diez unidades mediante un único documento.
- **Sucursal 27 de Mayo:** contar lo recibido, confirmar cantidades reales y revisar disponibilidad antes de abrir venta.
- **Caja:** abrir su sesión, vender una Junior y una Coca-Cola por Bs 22, verificar que se consumen cinco ingredientes y una botella, sincronizar ventas pendientes y cerrar comparando efectivo esperado y contado.
