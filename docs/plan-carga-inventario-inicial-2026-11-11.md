# Plan de carga inicial desde fotografías

Preparado y ampliado el 11 de noviembre de 2026 con la nueva hoja de plásticos y la clasificación por tipos. Este documento registra el plan ejecutado y los controles realizados. Los resultados reales están en `docs/resultados-carga-inventario-inicial-2026-11-11.md`.

## 1. Objetivo y decisiones del usuario

Crear el catálogo y las existencias de las fotografías y crear la sucursal **Skot Burger - 27 de mayo**. El usuario confirmó:

- Todas las existencias están en fábrica/almacén, cuyo nombre es **fabrica**. Crear esta ubicación con tipo `FABRICA`; no repartir ni duplicar el inventario entre sucursales.
- Crear **Skot Burger - 27 de mayo**, tipo `HAMBURGUESAS`, activa y sin existencias iniciales. No inventar dirección ni teléfono.
- Las imágenes 1, 2 y 3 son de açaí. Las imágenes 5 y 6 muestran la misma hoja de hamburguesas; cargarla una sola vez como hamburguesas. La imagen 7 contiene suministros de distribución interna, no destinados a venta.
- La nueva foto titulada «Plástico» añade 17 artículos. Se incorpora como **imagen 8** para no confundirla con las fotos de la primera entrega. La nueva foto de papel higiénico/vasos repite la imagen 7 y no añade saldos. La captura del selector de tipos es una referencia de clasificación, no una lista de productos.
- Crear el nuevo tipo **SUPPLY**, etiqueta **Suministros (plásticos y otros)**, para artículos no alimenticios de distribución interna. La clasificación completa está en la columna `tipo` del CSV; su destino de uso está en `uso`. Esta ampliación reemplaza la indicación anterior de registrar todos los insumos como RAW_MATERIAL.
- Respecto a las unidades, el usuario indicó **«analizalo y ponlo tu»**. Las unidades inferidas del manifiesto están autorizadas como criterio de carga; no volver a exigir que indique cada unidad. Conservar la distinción entre inferencia y texto explícito.
- Conservar al administrador `admin@skot.com` y su contraseña. No crear usuarios de prueba ni volver a vaciar la base.

La separación ACAI/HAMBURGUESAS/SUMINISTROS es una clasificación del manifiesto, no tres almacenes. No se solicita crear una sucursal comercial de açaí, productos terminados de hamburguesa, recetas, precios, ventas, compras ni despachos.

## 2. Datos transcritos y cantidades de control

El archivo [inventario-inicial-2026-11-11.csv](inventario-inicial-2026-11-11.csv) es el manifiesto de carga completo, UTF-8 y con encabezado. Incluye SKU estable, grupo, imagen/línea de origen, nombre, cantidad absoluta, unidad, origen de unidad, tipo real de producto, subcategoría, uso y observaciones. Usar un parser CSV real, por ejemplo `papaparse`, ya instalado; no separar ingenuamente por comas.

| Grupo | Fotografías únicas | Productos | Con saldo positivo | Con saldo cero |
| --- | --- | ---: | ---: | ---: |
| Açaí | 1, 2, 3 | 39 | 39 | 0 |
| Hamburguesas | 4, 5, excepto gas | 22 | 14 | 8 |
| Suministros | 7, 8 y gas de la 4 | 22 | 20 | 2 |
| Total | 7 hojas únicas | 83 | 73 | 10 |

Son **17 altas adicionales** respecto del manifiesto anterior de 66 filas. Los SKU de las filas anteriores se conservan; Gas chico y Gas grande pasan al grupo/tipo de suministros pero mantienen `INI-BUR-016` y `INI-BUR-017` y uso HAMBURGUESAS. No deducir el tipo por el prefijo del SKU.

Referencia de imágenes de esta ampliación: la nueva hoja «Plástico» es `/tmp/codex-clipboard-b9cHzr.png` (imagen 8 del CSV); `/tmp/codex-clipboard-EkccVV.png` repite la imagen 7 original; `/tmp/codex-clipboard-UeoXBe.png` muestra el selector del enum. Las rutas temporales pueden caducar: el CSV conserva la transcripción y las referencias por línea para el traspaso.

Las cantidades representan el saldo actual contado, no cantidades que deban sumarse a otras existencias. No sumar cantidades de unidades diferentes para informar un total físico.

Ejemplos de comprobación: leche en polvo 59 bolsas; carne Junior 210 unidades; carne clásica 430 unidades; tomate 20 kg; lechuga 15 cabezas; papa 360 porciones; vasos de 250 ml 100 unidades y de 400 ml 300 unidades. También verificar 10.000 hojas para bandeja/papas, 5.000 hojas para hamburguesas, 1.500 vasos de 12 oz, 1.000 vasos de 16 oz, 400 vasos de 1 kilo, 1.000 tapas de 12 oz, 1.000 de 16 oz, 400 de 1 kilo, 500 vasos de 500 ml y 100 tapas de 500 ml. Los diez artículos con cero deben existir también en inventario.

## 3. Unidades y lecturas que deben quedar documentadas

- `bolsa`, `bote`, `envase`, `paquete`, `rollo`, `balde`, `porcion`, `unidad`, `kg`, `caja`, `hoja` son cadenas en `Product.unit`, no nuevos enums. Conservar las cadenas del CSV para que las referencias sean consistentes.
- Bolsas, botes y envases representan la presentación contada. No inventar sus pesos, volúmenes ni factores de conversión. En particular, no convertir los medallones a kg ni los 50 envases de aceite a 50 litros.
- Durazno se interpreta como 6 kg de fruta; mantequilla como 50 unidades de presentación; huevo como 30 piezas; papel higiénico como 8 rollos. Son inferencias delegadas por el usuario, no mediciones confirmadas. Guardar ese origen en la descripción y el informe.
- La foto 4, línea 7, parece decir **«3 baldes sal negra»**; la línea 14 registra **«0 salsa negra»**. Mantener ambos registros tal como los distingue el manifiesto, con sus unidades y nota de lectura. No fusionarlos ni convertir baldes a envases. Si la imagen permite corregir inequívocamente «sal» por «salsa», registrar la corrección en el informe, sin sumar las dos presentaciones ni perder la trazabilidad.
- «Coco blanca» se normaliza a Coco blanco, «Copuazu» a copoazú y «Mousse» se escribe de forma uniforme. Mora y sandía se interpretan como golosinas por estar junto a dientes/ositos/ladrillos. Brownie no se convierte en mousse ni Tapioca en un volumen arbitrario.
- Mondadientes: 2 cajas; palitos: 2 paquetes; servilletas: 6 paquetes; bolsitas para salsa: 20 paquetes; bolsas medianas: 16 paquetes; chicas: 20 paquetes; tamaño uva: 8 paquetes. Los conteos por caja/paquete son inferidos y no autorizan multiplicar por piezas desconocidas. «Tamaño uva» se conserva como lectura literal sin inventar dimensiones.
- Los vasos de 12 oz, 16 oz, 1 kilo, 250 ml, 400 ml y 500 ml son presentaciones distintas. «1 kilo» describe el vaso vacío y no cambia su unidad a kg. No convertir onzas a ml para fusionar productos; tampoco igualar las cantidades de tapas y vasos. Las hojas se cuentan por hoja, no por paquete.
- Si la presentación real se conoce después, cualquier corrección de unidad con existencias requiere conciliación y movimiento trazable. `src/lib/product-unit.ts` impide reinterpretar silenciosamente unidades con stock o recetas. Este plan no introduce conversiones ni recetas.

## 4. Estado comprobado y código de referencia

Consulta de solo lectura realizada al preparar el plan: **0 sucursales, 0 productos, 0 inventarios** y un único usuario activo con rol ADMIN, `admin@skot.com`. La limpieza anterior ya se ejecutó. Revalidar al iniciar; no reutilizar IDs de documentos antiguos ni restaurar el piloto anterior.

Leer `AGENTS.md` y revisar:

| Archivo | Uso |
| --- | --- |
| `prisma/schema.prisma` | Modelos `Branch`, `Product`, `Inventory`, `StockMovement`, `UserBranch`, `BranchProduct` |
| `src/app/api/inventory/adjustments/route.ts` | Patrón existente: saldo absoluto AJUSTE y diferencia en kardex |
| `src/lib/transaction.ts` | Manejo de transacciones serializables |
| `src/lib/product-unit.ts` | Protección de unidades con existencias |
| `src/app/api/pos/products/route.ts` | Los productos ofrecidos en caja dependen de `BranchProduct` activo |
| `src/app/api/inventory/transfers/` | Flujo de abastecimiento posterior, fuera de esta carga |

No ejecutar `prisma/seed.ts`, `scripts/seeds/seed-acai-products.ts` ni `scripts/data/set-acai-stock.ts`: incluyen artículos no solicitados, saldos/precios de ejemplo o asignaciones masivas. Los planes del piloto anterior sirven solo como antecedente técnico y no reemplazan este nuevo conteo.

## 5. Modelo de datos propuesto

1. `Branch`: crear/reutilizar `fabrica` (`FABRICA`) y `Skot Burger - 27 de mayo` (`HAMBURGUESAS`), ambas activas. Conservar `requireCashClose` por defecto; dirección y teléfono vacíos. Como el nombre no es único en el esquema, buscar primero y detectar duplicados, sin un `upsert` por nombre inválido. No reutilizar una coincidencia con tipo incompatible.
2. `Product`: usar los SKU del CSV (`INI-ACAI-001..039`, `INI-BUR-001..024`, `INI-SUM-001..020`), nombres, unidades y clasificación explícita. Crear con `active=true`, `deletedAt=null`, `consumptionMode=STOCK`, `saleRecipeId=null`. Asignar `Product.type = fila.tipo` y `Product.category = fila.categoria`. La columna `uso` documenta a qué negocio sirve el artículo; no cambia la ubicación de stock. Seguir la matriz de tipos de la sección 5A y aplicar primero la migración de SUPPLY. No usar `BURGER` para medallones ni almacenar SUPPLY como RAW_MATERIAL.
3. Incluir en `Product.description` el grupo, uso, referencia de lote, imagen/línea de origen, unidad explícita/inferida y observaciones. No utilizar `setupDraft` como sustituto de esta trazabilidad ni inventar columnas.
4. `Inventory`: un registro por producto en `fabrica`, `currentStock` igual a la cantidad del CSV, `minStock=0`, `status=AVAILABLE`, sin costos, lotes, fabricación ni vencimientos inventados. Usar la clave única `branchId_productId`.
5. `StockMovement`: por cada saldo positivo nuevo, registrar `ENTRADA`, cantidad igual al saldo, `previousStock=0`, `newStock=cantidad`, `inventoryId`, `branchId`, `productId`, `createdBy` del administrador y referencia estable `INI-FOTOS-20261111:<sku>`. Notas: saldo inicial según conteo de fotografías, grupo, fuente y unidad inferida/expresa. Para los diez saldos cero, crear inventario, sin movimiento vacío; el manifiesto y el informe documentan su apertura.
6. No crear `BranchProduct` activo ni precios: no se está habilitando venta. Los plásticos, papel y gas deben permanecer disponibles para inventario/transferencias y fuera de caja. No desactivar globalmente los productos para ocultarlos del POS.
7. El administrador ya tiene acceso global por rol; no necesita `UserBranch` para funcionar. No crear relaciones de usuarios, cajas ni sesiones salvo que la implementación actual demuestre una necesidad concreta.

## 5A. Clasificación por tipo y uso

La captura enumera valores de **`Product.type`**, un enum PostgreSQL/Prisma. `Product.category` es texto para subcategorías (VASOS, TAPAS, CARNES, COBERTURAS, etc.). `Branch.type=FABRICA` indica ubicación. Son tres conceptos distintos: no crear una sucursal «Plásticos» ni guardar el nuevo tipo únicamente como texto libre.

| Tipo en base | Cantidad | Artículos y criterio |
| --- | ---: | --- |
| `ACAI_TOPPING` | 39 | Alimentos de açaí de las imágenes 1–3: coberturas, leche, cereales, golosinas, frutos secos, mousses, fruta y brownie; se usan como complementos. Mantener subcategorías y presentaciones del CSV. |
| `RAW_MATERIAL` | 18 | Ingredientes de hamburguesas: carnes, panes, verduras, papa, tocino, salsas, mantequilla, huevo y aceite. El conteo por porción/unidad no demuestra que sean extras listos para vender. |
| `BEVERAGE` | 4 | Los cuatro refrescos, todos con saldo cero. |
| `SUPPLY` (nuevo) | 22 | Veinte artículos de las hojas 7–8 y las dos presentaciones de gas. Se abastecen internamente y no se venden. |
| `ACAI_BASE` | 0 | Las fotos no incluyen helados ni base de açaí. No inventarlos. |
| `BURGER` | 0 | No se contaron hamburguesas terminadas; carne Junior no es una hamburguesa Junior. |
| `BURGER_EXTRA` | 0 | No se confirmó ningún extra comercial terminado con venta separada. No confundir insumos con el producto final. |

`NULL` en la captura no es una categoría que deba crearse o cargarse. Ninguna de las 83 filas queda sin tipo. El tipo alimenticio tampoco activa la venta por sí solo; se mantiene la carga sin precios ni asignaciones comerciales.

Uso inferido de suministros:

| Uso (`uso` en CSV) | Artículos |
| --- | --- |
| HAMBURGUESAS | Palitos, hojas para bandeja/papas, envolturas de hamburguesas, bolsitas para salsa y gas chico/grande. |
| ACAI | Vasos y tapas de 12 oz, 16 oz y presentación de 1 kilo. |
| AMBOS | Mondadientes, servilletas, bolsas por tamaño, vasos de 250/400/500 ml y tapas de 500 ml. No hay evidencia para restringir estos insumos a un único negocio. |
| GENERAL | Papel higiénico. |

Todos permanecen en fábrica hasta una transferencia real. El campo de uso es metadato documental, no una autorización ni una nueva columna obligatoria del esquema.

## 6. Implementación que hará el siguiente modelo

### A0. Incorporar SUPPLY en esquema y aplicación

Esta ampliación requirió cambios de esquema y código; se aplicaron antes de cargar. Ver resultados e inspección final del repositorio.

1. Añadir `SUPPLY` a `enum ProductType` en `prisma/schema.prisma`. Crear una migración SQL que **añada** el valor al tipo PostgreSQL existente, sin recrear tablas, truncar datos ni modificar los otros seis valores. Revisar/aplicar y confirmar esa migración por separado antes de insertar productos SUPPLY: no añadir el valor y consumirlo dentro de la misma transacción de carga. Regenerar Prisma.
2. Mostrar la etiqueta **Suministros (plásticos y otros)** en altas, edición, filtros, recepción, stock, materiales de fábrica y kardex. Revisar `src/lib/constants.ts`, `src/app/admin/products/page.tsx`, `src/app/admin/products/setup/page.tsx`, `src/app/admin/branch-products/page.tsx`, `src/app/factory/materials/page.tsx`, `src/app/factory/receiving/page.tsx` y `src/app/inventory/stock/page.tsx`.
3. En `src/app/api/admin/products/route.ts`, `src/app/api/admin/products/[id]/route.ts` y `src/app/api/admin/product-setup/route.ts`, aceptar y persistir SUPPLY como SUPPLY. El alias visual histórico PACKAGING debe resolver al nuevo tipo para nuevas altas, sin crear otro enum ni reclasificar masivamente productos ajenos al manifiesto. Eliminar para este flujo el fallback que oculta suministros como RAW_MATERIAL.
4. Corregir la confusión actual entre categoría y tipo en el formulario de productos: `openEdit` prioriza `product.category` y `handleSubmit` envía esa categoría como `type`. Los artículos del CSV tienen subcategorías como VASOS/CARNES; su edición debe cargar el selector con `product.type` y enviar tipo/subcategoría por separado, conservando ambos. Adaptar también el asistente para no perder las subcategorías al guardar. No permitir que editar «Vaso» lo convierta silenciosamente en materia prima.
5. Mantener SUPPLY fuera de `SELLABLE_TYPES`, de las materias primas alimenticias de recetas (`src/lib/recipe-product-options.ts`) y de publicación comercial. Rechazar asignación comercial activa y venta de SUPPLY en las APIs, aunque una petición manual intente asignarlo o venderlo. Revisar el POS y la sincronización offline donde validan los tipos vendibles; ocultarlo en la UI no basta.
6. Conservar recepción, inventario, kardex, pedidos internos y transferencias de SUPPLY para abastecer sucursales. Esas operaciones no requieren precio ni receta de venta. Comprobar que los filtros de fábrica no lo omiten por aceptar únicamente los tipos antiguos.
7. Validar migración y regeneración de cliente, alta/edición por API, filtro en materiales, exclusión de venta y una transferencia en entorno aislado. Añadir pruebas de integración focalizadas para persistencia de SUPPLY, preservación de subcategoría y rechazo de venta. Con los cambios de código, ejecutar tipos y build, además de las pruebas pertinentes; no probar transferencias ficticias en el almacén real.


### A. Preparar un importador reproducible

Se creó `scripts/data/import-initial-inventory.ts` con simulación por defecto y aplicación explícita mediante `--apply`. Leer el CSV con ruta resuelta desde la raíz del repositorio. No incrustar credenciales ni imprimir `.env` o URL de conexión completas.

La simulación debe consultar la base y presentar las dos ubicaciones, las 83 filas, unidades inferidas, cantidades, ceros y acciones previstas, pero no realizar escrituras. Validar columnas, SKU únicos, nombres/unidades no vacíos, números finitos no negativos, grupo permitido y conteos de la sección 2. No usar condiciones como `if (!cantidad)` que descarten ceros.

Comprobar el administrador y la estructura actual. Si hay un SKU existente con datos distintos, o un artículo parecido con otro SKU, incluirlo como conflicto: no duplicar por ortografía ni sustituir sus unidades. Preservar cualquier dato ingresado después de este plan. Aplicar únicamente la migración aditiva SUPPLY descrita en A0; no hacer resets ni ejecutar semillas. Validar `tipo` contra los siete valores del enum actualizado y `uso` contra ACAI/HAMBURGUESAS/AMBOS/GENERAL.

### B. Garantizar transacción e idempotencia

Aplicar la carga validada dentro de una transacción serializable con tiempo suficiente para el PostgreSQL remoto y reintentos limitados por conflictos serializables. Adquirir un bloqueo de transacción estable para este lote antes de buscar/crear ubicaciones, porque `Branch.name` y `StockMovement.reference` no son únicos. Todas las ejecuciones de este importador deben usar el mismo bloqueo.

- Primera aplicación sobre base vacía: dos ubicaciones, 83 productos, 83 inventarios de fábrica y 73 entradas iniciales; cero inventarios en la sucursal y cero asignaciones comerciales.
- Reejecución del mismo lote: detectar referencia por SKU y reutilizar los registros existentes; cero nuevas entradas, sin volver a sumar el stock. Si hubo ventas o transferencias posteriores, no restaurar el saldo del CSV ni exigir que el stock siga en el valor inicial; reportar los movimientos posteriores. Verificar contra el movimiento inicial registrado y sus metadatos.
- Si otro ejecutor ya aplicó la versión anterior de 66 filas, conservar sus IDs, saldos y kardex; añadir únicamente las 17 filas nuevas y sus 17 entradas iniciales. Aplicar la reclasificación autorizada de tipo/subcategoría/uso a los SKU de este manifiesto, registrando valores anteriores y nuevos, sin cambiar cantidades/unidades ni tocar artículos ajenos. Esa actualización de metadatos no es una nueva entrada de stock. Cualquier diferencia de cantidades o unidades sigue siendo un conflicto que debe conciliarse.
- Una referencia existente con importe/unidad/producto incompatibles es un conflicto; no silenciarlo. Si hay stock previo sin referencia de este lote, no sobrescribirlo ni acumularlo: resolver la discrepancia con el conteo y registrar un `AJUSTE` con diferencia real si corresponde.
- Registrar todos los IDs y acciones para el informe. Si falla alguna escritura o validación final, revertir toda la transacción. No confirmar una carga parcial ni borrar información para lograr los conteos esperados.

### C. Verificar y aplicar al entorno configurado

Validar primero el parser y la simulación. Si se prueba escritura/idempotencia, usar PostgreSQL aislado; no ejecutar fixtures de ventas ni pruebas destructivas sobre el Neon de `.env`. Comprobar que una segunda aplicación en el ensayo no agrega productos, inventario o movimientos. Como esta versión también cambia esquema, formularios y validación de tipos, ejecutar los controles de A0; el conteo se prueba sin ventas ni movimientos ficticios en la base real.

Después de revisar la simulación sin conflictos, aplicar al destino configurado conforme a la solicitud de carga del usuario. No pedir nuevamente decisiones ya resueltas aquí. El estado limpio comprobado debe revalidarse al ejecutar; una diferencia debe conciliarse, no descartarse.

Comandos propuestos, una vez creado el importador:

```bash
npx tsx scripts/data/import-initial-inventory.ts
npx tsx scripts/data/import-initial-inventory.ts --apply
```

La simulación y la aplicación se ejecutaron con estos comandos; el resultado está documentado en el informe.

## 7. Criterios de aceptación e informe final

- Las dos ubicaciones tienen nombre/tipo correctos; no hay sucursal adicional de açaí ni stock duplicado en 27 de mayo.
- Las 83 filas del CSV tienen correspondencia SKU/producto/inventario en fábrica. En primera carga, existen 73 saldos positivos y diez ceros. La imagen 6 no genera otras siete filas.
- El kardex explica las 73 entradas iniciales y conserva las referencias por SKU y las unidades inferidas. Ningún producto ni suministro tiene precio inventado ni `BranchProduct` activo creado por el importador.
- SUPPLY existe realmente en el enum y es visible en fábrica, recepción y filtros. Se conservan sus subcategorías al editar; los 22 suministros están disponibles para abastecimiento y rechazados por venta/publicación comercial. No se simula la categoría guardándola como RAW_MATERIAL.
- El administrador conserva su cuenta y contraseña. No aparecen usuarios, ventas, recetas, cierres o transferencias ficticias.
- Cada cantidad/unidad se verifica individualmente contra el CSV antes de confirmar la transacción; tras confirmar, se vuelve a consultar la persistencia. La idempotencia se demuestra en base aislada o mediante una nueva simulación sin cambios previstos, sin reajustar saldos reales.
- Se generó `docs/resultados-carga-inventario-inicial-2026-11-11.md` con fecha real de carga, ubicación objetivo sin secretos, IDs de las dos sucursales, resumen por grupo, mapeo SKU/ID/tipo/subcategoría/uso/unidad/saldo, migración aplicada y comprobaciones de UI/API, movimientos, inferencias y conflictos si existen. El borrado previo no debe repetirse.
- Al cerrar, informar claramente qué fue planificado, qué fue realmente cargado y qué comprobaciones se hicieron. No declarar la sucursal lista para vender: aquí se carga almacén, sin recetas ni precios de venta.

## 8. Mensaje para iniciar al modelo ejecutor

> Ejecuta `docs/plan-carga-inventario-inicial-2026-11-11.md` usando `docs/inventario-inicial-2026-11-11.csv`. Todas las existencias van a `fabrica` (FABRICA); crea también `Skot Burger - 27 de mayo` (HAMBURGUESAS), sin stock inicial. Son 83 productos: 39 açaí, 22 ingredientes/bebidas de hamburguesas y 22 suministros (incluido gas); la imagen 6 repite la 5 y pertenece a hamburguesas. La nueva hoja de plásticos es la imagen 8; la nueva foto de papel higiénico/vasos repite la 7. Añade el tipo real SUPPLY con migración aditiva, actualiza UI/API y usa las columnas tipo/categoria/uso del CSV; protege los suministros contra publicación y venta. El usuario delegó la elección de unidades: usa las inferencias documentadas sin inventar conversiones. Conserva admin@skot.com y su contraseña; no repitas el vaciado ni el piloto anterior. Implementa simulación y --apply, carga atómica con kardex e idempotencia, valida y aplica conforme al plan. No habilites suministros para venta ni inventes precios o recetas. Entrega el informe de resultados con evidencia real.
