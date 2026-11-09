# Plan de acción: del producto a la venta en POS

Fecha: 9 de noviembre de 2026.

Estado: implementación verificada en base aislada; migraciones aplicadas en el Neon configurado; Junior y Coca-Cola configurados y ensayo remoto ficticio completado. Despliegue de código y operación física pendientes.

Avance: Skot Junior es la hamburguesa de consumo del cliente, armada al vender en sucursal. El usuario definió 100 g de carne, una lámina de queso, lechuga, dos rodajas de tomate y un pan Junior; autorizó aproximaciones para el piloto. Coca-Cola se compra al proveedor y se vende por botella a Bs 7. El destino será 27 de Mayo y la política de cortesías fue confirmada. El piloto final tiene dos productos: el supuesto terminado de fábrica era la misma hamburguesa y el usuario aceptó enviar sus ingredientes. Las decisiones funcionales están cerradas. El siguiente modelo debe seguir el [traspaso de ejecución](plan-ejecucion-piloto-27-mayo.md), que concreta configuración, pasos y evidencia de aceptación.

La lectura inicial encontró la receta de «Skor Junior» con cantidades de prueba y diez hamburguesas terminadas en sucursal. El usuario confirmó que ese saldo era ficticio. El ensayo remoto corrigió Junior terminado a cero con kardex, conservó la receta histórica y seleccionó una nueva receta de venta. La sucursal termina con cero insumos/botellas porque el ensayo fue simulado; requiere abastecimiento físico antes de vender.

## 1. Objetivo y resultado esperado

Permitir configurar un producto para venta desde un único recorrido y que el POS muestre su disponibilidad real. Cada venta debe consumir el inventario que corresponda al modo de preparación del producto, una sola vez y en la sucursal correcta.

El usuario debe poder distinguir entre la configuración inicial, que realiza una vez, y el abastecimiento habitual, que repite según sus necesidades.

Resultados medibles:

- Un producto nuevo se configura desde un único asistente: datos, preparación y venta por sucursal.
- El precio y las sucursales se definen durante el alta, antes de recibir o producir mercancía.
- El sistema explica por qué un producto está pendiente, agotado o disponible.
- Una hamburguesa terminada vendida reduce una unidad de hamburguesa; una preparada al momento reduce sus ingredientes.
- El abastecimiento de un producto ya configurado no exige volver a administrar su catálogo, receta o precio.

## 2. Hallazgos que justifican el trabajo

| Comportamiento actual comprobado | Consecuencia | Cambio previsto |
| --- | --- | --- |
| Crear un producto solo registra el catálogo; no crea inventario ni asignación a sucursales. | El usuario debe descubrir los siguientes pasos en otros módulos. | Incluir preparación, asignaciones y precios en el alta guiada. |
| La recepción incrementa el stock del producto recibido y la producción incrementa el producto resultante. | Recibir la hamburguesa final y luego producirla puede registrar entradas distintas sin que exista esa mercancía física. | Explicar y orientar la recepción de insumos o mercancía comprada según la operación real. |
| El catálogo POS exige producto activo y asignación activa a la sucursal, pero admite precio nulo como cero. | Es posible mostrar productos sin precio comercial definido. | Validar precio y publicación; permitir guardar borradores. |
| La tarjeta Burger usa el stock del producto final para habilitar su venta. | Una hamburguesa preparada al momento queda bloqueada aunque haya ingredientes. | Calcular disponibilidad según el modo de consumo. |
| La venta utiliza cualquier receta encontrada para descontar ingredientes. | Un producto fabricado y transferido puede consumir ingredientes de la sucursal y conservar sus unidades terminadas. | Elegir explícitamente cómo se consume inventario y qué receta corresponde a la venta. |
| La venta multiplica cantidades de receta por unidades vendidas sin dividir por rendimiento. | Una receta de diez unidades puede descontar insumos de diez hamburguesas al vender una. | Normalizar el consumo por rendimiento y unidades. |
| Existen transferencias y pedidos internos con recorridos separados. | Una simplificación podría duplicar solicitudes o movimientos si usa ambos circuitos para el mismo envío. | Mantener un documento operativo por envío y compartir la lógica de inventario. |

Referencias principales: `src/app/api/admin/products/route.ts`, `src/app/api/admin/branch-products/route.ts`, `src/app/api/pos/products/route.ts`, `src/app/api/pos/sale/route.ts`, `src/components/pos/burgers/product-grid.tsx`, `src/app/api/factory/production/[id]/complete/route.ts` y `prisma/schema.prisma`.

## 3. Reglas de negocio propuestas

### 3.1. Modo de consumo explícito

La categoría comercial —hamburguesa, bebida, base Açaí— no determina cómo se consume inventario.

| Modo | Ejemplo | Cómo obtiene existencias | Qué consume la venta |
| --- | --- | --- | --- |
| Stock del producto | Bebida comprada o producto terminado en fábrica | Recepción, producción o traslado recibido | Cantidad del producto en la sucursal |
| Ingredientes al vender | Skot Junior armada en cocina de la sucursal | Se abastecen sus ingredientes | Cantidades de una receta de venta explícita |

Una materia prima puede mantenerse en inventario sin publicarse en POS. Se debe distinguir su uso como insumo de su habilitación comercial.

Para la primera versión, el modo será consistente para el mismo producto en todas las sucursales. Los casos que realmente requieran modalidades distintas se resolverán antes de migrarlos; no se inferirán del stock existente.

La fábrica puede elaborar componentes que luego utiliza la sucursal, pero el soporte de recetas por etapas requiere revisar los selectores actuales: hoy los ingredientes del formulario se limitan a materia prima. El piloto no dependerá de recetas anidadas ni de expandirlas recursivamente durante una venta.

### 3.2. Recetas y cantidades

- Las órdenes de producción conservan una receta seleccionada explícitamente.
- Los productos que consumen ingredientes al vender tienen una única receta de venta seleccionada explícitamente.
- Tener una receta de producción no cambia automáticamente cómo vende el POS ese producto.
- Consumo de un ingrediente = cantidad de la receta × unidades vendidas / rendimiento de la receta.
- Las unidades deben coincidir con las del inventario o tener una conversión definida. Se rechazan combinaciones sin conversión; no se interpreta un gramo como un kilogramo.
- La merma no se aplicará de nuevo de forma implícita. Se documentará si ya está incluida en las cantidades; cualquier cambio a su cálculo se tratará expresamente.
- Los componentes se descuentan desde su propio stock, sin volver a consumir la receta con la que fueron fabricados.

Ejemplo: una receta rinde 10 hamburguesas y requiere 1,2 kg de carne y 10 panes. Vender dos consume 0,24 kg y dos panes.

### 3.3. Publicación y disponibilidad

Para habilitar comercialmente un producto en una sucursal se exige producto activo, asignación activa, tipo compatible con el POS, precio válido y configuración de preparación completa.

La falta de stock no elimina su configuración comercial. Un producto correctamente configurado puede mostrarse como agotado.

| Estado visible | Condición | Acción que ofrece el sistema |
| --- | --- | --- |
| Borrador | Faltan datos generales o modo de preparación | Completar producto |
| Falta receta | Consume ingredientes y no tiene receta de venta válida | Configurar receta |
| Sin asignar | No se eligió esa sucursal | Asignar sucursal |
| Falta precio | No existe un precio válido para su unidad de venta | Definir precio |
| Desactivado | Se retiró de venta | Activar, si cumple requisitos |
| Agotado | Configuración completa sin existencias suficientes | Abastecer |
| Disponible | Configuración completa y capacidad suficiente | Vender |

Los pendientes se calculan a partir de los datos; no se mantienen múltiples estados manuales que puedan contradecirse.

En venta por unidad, el precio normal debe ser mayor que cero. En venta por peso, debe existir precio por kilogramo válido. Toppings incluidos, componentes gratuitos de combos y cortesías se revisan como reglas explícitas para no bloquear operaciones legítimas ni habilitar ventas gratuitas por falta de configuración.

## 4. Experiencia propuesta

### 4.1. Configuración inicial: asistente «Preparar producto para venta»

Se accede desde `/admin/products` y permite continuar la configuración de un producto existente.

1. **Producto:** nombre, SKU, categoría, unidad e imagen opcional. Permite guardar borrador.
2. **Preparación:** elegir «Vendo unidades en stock» o «Se prepara al vender». Mostrar receta de producción opcional para el primer caso y receta de venta obligatoria para el segundo. Reutilizar recetas e ingredientes existentes.
3. **Venta:** seleccionar varias sucursales, ingresar un precio común y permitir excepciones por sucursal. Revisar pendientes y activar las asignaciones completas.

Al terminar, mostrar un resultado verificable por sucursal: «Configurado; falta abastecimiento», «Disponible» o el pendiente concreto. Configurar un producto no inventa stock ni confirma una recepción física.

El asistente mantiene los datos entre pasos. Si se guarda incompleto, el producto permanece como borrador. La publicación y las asignaciones se confirman de forma atómica para evitar activaciones parciales sin explicación.

### 4.2. Operación habitual

**Producto elaborado en fábrica:** recibir insumos cuando sea necesario → producir → finalizar con cantidad real → despachar → confirmar recepción en sucursal → vender unidades terminadas.

**Producto preparado en sucursal:** recibir o trasladar ingredientes → confirmar su recepción → vender; el sistema consume la receta de venta. No necesita fabricar y trasladar una hamburguesa final para habilitar el botón del POS.

**Producto comprado para reventa:** recibir mercancía en el punto habilitado → trasladar si corresponde → vender. No necesita receta ni orden de producción.

La configuración de receta y precio ocurre una vez y se modifica cuando cambia el producto. Las recepciones y los envíos pueden incluir varios productos.

### 4.3. Acciones contextuales

- Desde el producto: «Completar configuración», «Ver disponibilidad por sucursal» y «Abastecer».
- Desde una orden completada: «Preparar envío», con producto, origen y cantidad precargados; validar la cantidad realmente disponible al despachar.
- Desde sucursal: «Recibir envío», con los productos ya cargados.
- Desde un pendiente de precio: abrir la configuración comercial del producto y sucursal concretos.

Se puede reducir navegación y precargar formularios. La finalización de producción, el despacho y la recepción conservan confirmaciones porque representan hechos físicos distintos.

## 5. Fases de ejecución y criterios de aceptación

### Fase 0 — Confirmar operación y clasificar datos existentes

**Responsables funcionales:** administración, fábrica y encargado de una sucursal piloto.

**Trabajo:**

- Confirmar dónde se arma Skot Junior y qué mercancía entrega fábrica.
- Piloto final confirmado por el usuario: Skot Junior preparada en sucursal y Coca-Cola por botella a Bs 7. La prueba genérica de producto terminado de fábrica se conserva en la implementación, pero no requiere elegir un tercer producto para este piloto.
- Generar un informe de productos, recetas, rendimientos, unidades, stock por sucursal, asignaciones y precios. Incluir ventas offline pendientes conocidas.
- Identificar productos con varias recetas, precios ausentes, stock final e ingredientes simultáneos y uso actual de combos, extras y Açaí.
- Clasificar explícitamente los productos del piloto; marcar como pendientes los casos ambiguos.
- Acordar la política de precios para cortesías y componentes incluidos.

**Entregable:** matriz producto → modo de consumo → receta de venta, si aplica → sucursales → pendientes de datos.

**Aceptación:** cada producto del piloto tiene una modalidad validada y unidades coherentes. Ningún saldo se cambia por deducción automática a partir de sus recetas.

### Fase 1 — Modelo de datos y lógica común de consumo

**Dependencia:** clasificación del piloto.

**Trabajo:**

- Agregar a `Product` un modo explícito de consumo y una referencia opcional a su receta de venta. Mantener las recetas seleccionadas por las órdenes de producción.
- Validar que la receta de venta corresponda al producto y que sus ingredientes, cantidades y rendimiento sean válidos.
- Incorporar una versión de configuración para identificar cambios de modo, receta y unidad relevantes para ventas offline.
- Crear un servicio común para calcular consumos y disponibilidad. Usarlo desde catálogo y venta.
- Para unidades en stock, usar el stock del producto. Para preparados al momento, calcular la capacidad por el ingrediente limitante, normalizando por rendimiento y unidades.
- Sumar los requerimientos de todo el carrito: dos productos que comparten ingredientes no pueden consumir cada uno la misma existencia disponible.
- Revalidar existencias dentro de la transacción de venta; conservar reintentos e idempotencia.
- Revisar la finalización de producción para que solicitudes repetidas o simultáneas no consuman ni produzcan dos veces.

**Archivos principales:** `prisma/schema.prisma`, migración nueva, servicio en `src/lib/`, API de venta y finalización de producción.

**Aceptación:** vender un producto en stock descuenta solo ese producto; vender un preparado consume su receta normalizada; una repetición no genera nuevos consumos. Las transacciones concurrentes no dejan stock negativo en ventas online.

### Fase 2 — Precio, publicación y disponibilidad coherentes

**Dependencia:** servicio de consumo de fase 1.

**Trabajo:**

- Centralizar la validación de publicación por sucursal y devolver pendientes concretos.
- Aplicar permisos y alcance de sucursal en las operaciones de asignación y precio.
- Evitar activar un producto sin precio válido o receta requerida. Permitir conservar configuración incompleta como borrador.
- Validar en el servidor la habilitación comercial y el precio autorizado al cobrar, contemplando descuentos, combos, modificadores y reglas de gratuidad explícitas.
- Actualizar `/api/pos/products` para devolver disponibilidad calculada y motivo de bloqueo.
- Actualizar tarjetas y carrito Burger para usar esa disponibilidad, y compartir los criterios con Açaí respetando venta por peso.
- Refrescar disponibilidad después de una venta y ofrecer una respuesta clara cuando otra caja haya consumido las existencias.
- Revisar `BURGER_EXTRA`: actualmente no forma parte del filtro principal Burger. Acordar si aparece como producto, modificador o porción y alinear catálogo y cobro sin duplicarlo.

**Archivos principales:** APIs de productos POS, venta y precios por sucursal; `product-grid.tsx`, `use-burger-sale.ts`, páginas POS y componentes Açaí afectados.

**Aceptación:** no se cobra un producto incompleto por un precio cero accidental. Un preparado con ingredientes suficientes puede venderse sin stock de hamburguesas terminadas. La tarjeta y el servidor aplican las mismas reglas de consumo.

### Fase 3 — Alta guiada y edición comercial en lote

**Dependencia:** reglas estabilizadas de fases 1 y 2.

**Trabajo:**

- Implementar el asistente de tres pasos en administración, reutilizando campos y formularios actuales.
- Permitir seleccionar o crear la receta dentro del recorrido y continuar productos ya existentes.
- Permitir selección múltiple de sucursales, precio común y excepciones.
- Crear una operación de publicación en lote con validación de permisos y transacción; si falla, informar los pendientes y evitar activación parcial.
- Agregar disponibilidad y acciones de continuación en la lista de productos.
- Mantener `/admin/branch-products` como herramienta de edición masiva usando las mismas reglas.
- Respetar roles: administración gestiona el catálogo y precios; fábrica registra producción y abastecimiento; sucursal recibe; cajero vende. La interfaz no amplía permisos de API.

**Aceptación:** configurar un producto y habilitarlo comercialmente en dos sucursales se completa desde el asistente; no requiere visitar manualmente las pantallas de recetas y precios. Guardar un borrador permite retomarlo sin duplicar SKU ni recetas.

### Fase 4 — Abastecimiento con menos navegación

**Dependencia:** fase 2; se puede desarrollar antes de terminar el asistente.

**Trabajo:**

- Añadir «Preparar envío» desde producción completada y «Abastecer» desde el producto.
- Precargar origen, producto, unidad y cantidades disponibles, con validación al confirmar.
- Definir la entrada operativa: pedidos internos para solicitudes de sucursal; transferencias para envíos iniciados desde origen. Un mismo envío no crea ambos circuitos.
- Extraer o reutilizar la lógica común de despacho y recepción para conservar existencias y registrar kardex una sola vez.
- Mantener la confirmación de recepción por la sucursal; no publicar precios automáticamente al recibir mercancía.
- Mostrar si el destino carece de configuración comercial antes de enviar, con enlace para completarla. El traslado de insumos sigue permitido.
- Revisar la recepción para orientar al usuario según tipo de abastecimiento y evitar sugerir stock inicial ficticio.

**Aceptación:** desde una producción completada se prepara un envío sin buscar nuevamente el producto. Crear el envío no mueve stock; despachar descuenta origen; recibir acredita destino, una sola vez. Solicitud, despacho y recepción mantienen sus responsables.

### Fase 5 — Migración, piloto y puesta en uso

**Dependencia:** fases 1–4 verificadas en un entorno de prueba.

**Trabajo:**

- Preparar una migración aditiva y un comando de clasificación con modo de simulación, informe de cambios y ejecución repetible.
- No asignar modalidad por la mera existencia de recetas; aplicar la clasificación revisada de fase 0.
- Firmar en el servidor el precio y la configuración autorizados que recibe la caja; vincular la autorización a usuario, sucursal, producto y vencimiento. La sincronización usa esa captura, aunque el catálogo cambie después, y vuelve a comprobar stock e idempotencia.
- Las ventas sin autorización válida, vencida o con existencia insuficiente se conservan para conciliación. La clave de firma debe mantenerse estable durante la vida máxima de la cola y rotarse solo después de sincronizar o conciliar las cajas.
- Revisar saldos físicos y registrar cualquier corrección mediante ajustes trazables. No convertir automáticamente stock de hamburguesas en ingredientes ni recalcular ventas históricas.
- Activar el nuevo flujo en una sucursal piloto y restringir su activación a productos clasificados.
- Observar un ciclo completo de abastecimiento, venta, kardex y cierre antes de extenderlo.
- Documentar el uso por rol con ejemplos reales del piloto.

**Aceptación:** ventas, stock y kardex coinciden en el piloto; no hay productos ambiguos activados; una venta offline se sincroniza una sola vez con su configuración válida.

**Recuperación:** conservar respaldo previo y registro de clasificación. Si aparecen diferencias, detener nuevas operaciones de los productos afectados, conciliar operaciones ya realizadas y corregir hacia adelante. No restaurar ciegamente saldos anteriores sobre ventas o traslados posteriores.

## 6. Pruebas obligatorias

Ejecutar en una base aislada con datos ficticios y sesiones por rol. La compilación no sustituye las pruebas de inventario.

| Caso | Resultado verificable |
| --- | --- |
| Crear producto sin abastecimiento | Se guarda y configura sin generar stock. |
| Publicar sin precio | Se informa el pendiente y no se habilita el cobro normal. |
| Configurar dos sucursales | Guarda asignaciones y precios elegidos; no altera otras sucursales. |
| Fabricar y transferir 10 unidades; vender una | Fábrica consume ingredientes al producir; sucursal pasa de 10 a 9 unidades finales, sin consumir ingredientes locales. |
| Receta para 10 unidades; vender dos | Consume exactamente dos décimas de las cantidades de receta. |
| Preparado con cero stock final e ingredientes suficientes | Aparece disponible y permite cobrar. |
| Preparado con un ingrediente insuficiente | Aparece agotado o con capacidad menor; el servidor rechaza la cantidad imposible. |
| Dos productos del carrito comparten ingrediente | Se valida su consumo agregado. |
| Unidad sin conversión | Se rechaza con explicación antes de publicar o producir. |
| Dos cajas venden la última unidad | Solo se confirma la cantidad físicamente disponible online. |
| Repetir completar producción, recibir o sincronizar | No se duplican existencias, movimientos ni ventas. |
| Precio cambia o receta se edita con ventas offline | La firma válida conserva precio y consumo originales; la operación idempotente vuelve a validar existencias. Autorizaciones vencidas o inventario insuficiente requieren conciliación. |
| Combo, modificador, cortesía y Açaí por peso | Conservan cantidades, precios y consumo definidos para cada caso. |
| Cajero intenta cambiar precios o acceder a otra sucursal | La API rechaza la operación. |
| Asistente a 375 y 1440 px | Permite completar los pasos, operar con teclado y entender errores y pendientes. |

Agregar pruebas automatizadas de cálculo y de integración transaccional para los casos de consumo, concurrencia e idempotencia. Incorporar las pruebas del asistente al flujo de navegador. Ejecutar comprobación de tipos y `npm run build` sobre la entrega; documentar comandos y resultados reales.

## 7. Entregas y orden de prioridad

| Entrega | Fases | Resultado para revisión |
| --- | --- | --- |
| A — Definición operativa | 0 | Matriz del piloto, modalidades y reglas de precio validadas. |
| B — Inventario y POS coherentes | 1 y 2 | Migración, servicio de consumo, publicación y cobro corregidos, con pruebas. |
| C — Configuración sencilla | 3 | Asistente completo, edición en lote y estados explicativos. |
| D — Abastecimiento conectado | 4 | Acciones desde producto y producción, sin duplicar documentos. |
| E — Puesta en uso | 5 | Clasificación aplicada, piloto conciliado y guía por rol. |

La entrega B es requisito para activar el nuevo flujo. La interfaz del asistente se puede diseñar mientras se implementa, pero su publicación utiliza las reglas ya verificadas.

## 8. Alcance y condiciones de cierre

El trabajo incluye configuración, consumo de inventario, disponibilidad, precios por sucursal y navegación de abastecimiento. El diseño debe contemplar las ventas offline y los productos actuales; cualquier incompatibilidad encontrada se resuelve antes del piloto.

Quedan como trabajos separados la conversión a un inventario completo por múltiples lotes/FIFO, recetas con expansión recursiva, planificación automática de producción y recálculo de información histórica. Los identificadores de lote actuales no deben presentarse como trazabilidad completa por lote.

El plan se considera implementado cuando el piloto permite configurar y vender los productos elegidos, cada operación produce el movimiento correcto una sola vez, los pendientes son comprensibles y el abastecimiento habitual no requiere repetir el alta comercial.

La decisión funcional confirmada es que Skot Junior se arma en la sucursal. La sección 9 registra la receta del piloto con aproximaciones autorizadas; estas no constituyen medidas definitivas de cocina. Las 10 unidades de prueba no representan existencias físicas y no deben usarse como saldo de apertura.

Nota de trabajo: al redactar el plan ya existía una modificación local en `src/app/api/factory/production/[id]/complete/route.ts`. La implementación debe revisarla e integrarla sin sobrescribirla.

## 9. Ejecución del piloto en 27 de Mayo

El ensayo aislado y el ciclo remoto ficticio ya quedaron ejecutados. En Neon, Junior usa modo `RECIPE` y conserva Bs 15; Coca-Cola personal se creó en modo `STOCK` a Bs 7. La corrección trazable dejó Junior terminado en cero; el ciclo ficticio dejó los insumos/botellas de sucursal en cero y conserva la venta de prueba marcada. Quedan pendientes despliegue de código y abastecimiento/venta físicos. Consulta el [traspaso](plan-ejecucion-piloto-27-mayo.md) y el [informe con IDs](resultados-piloto-27-mayo.md).

### 9.1. Receta provisional para una hamburguesa

Rendimiento: **1 unidad**. Se conservan las unidades actuales de inventario.

| Ingrediente existente | Cantidad por hamburguesa | Origen del valor |
| --- | --- | --- |
| Carne Skot Junior | 0,100 kg | 100 g confirmados por el usuario |
| Queso | 0,020 kg | Aproximación piloto para una lámina de 20 g |
| Lechuga | 0,05 unidad | Aproximación piloto: una lechuga entera rinde 20 porciones |
| Tomate | 0,030 kg | Aproximación piloto: dos rodajas de 15 g |
| Pan Skot Junior | 1 unidad | Una unidad confirmada por el usuario |

El queso permanece en kg para este ensayo: no se cambia la unidad de un producto con historial. La lechuga se interpreta provisionalmente como una pieza entera; se anotará esta interpretación en la receta. No se añade merma implícita. Antes de extender el uso se pesarán láminas y rodajas y se medirá el rendimiento de la lechuga.

### 9.2. Orden de trabajo y evidencia de aceptación

1. **Preparar el entorno piloto.** Guardar respaldo y reporte previo del entorno objetivo, revisar las colas offline de las cajas y ensayar primero en una base aislada. Aplicar las tres migraciones aditivas y configurar las claves de autorización offline. Evidencia: esquema actualizado y reporte anterior a los cambios.
2. **Configurar la hamburguesa.** Continuar el SKU existente sin duplicarlo; seleccionar consumo `RECIPE`, guardar la receta provisional y habilitarla en 27 de Mayo conservando Bs 15. Separar los diez saldos de prueba mediante ajuste trazable cuando corresponda al entorno objetivo. Evidencia: hamburguesa configurada, sin stock ficticio de producto final.
3. **Abastecer ingredientes.** En el ensayo usar cantidades para diez hamburguesas: 1 kg de carne, 0,2 kg de queso, 0,5 unidad de lechuga, 0,3 kg de tomate y diez panes. Despachar desde fábrica y confirmar recepción en 27 de Mayo. En operación real, registrar exclusivamente lo entregado y recibido. Evidencia: un documento de envío, salidas de fábrica y entradas de sucursal una sola vez.
4. **Configurar Coca-Cola personal.** Crear o reutilizar el SKU, unidad de venta botella/unidad, consumo `STOCK`, asignación a 27 de Mayo y precio Bs 7. No inventar volumen en ml ni cantidad de botellas por paquete. Si llega a fábrica, transferirla después; si el proveedor entrega en sucursal, recibirla allí. Evidencia: vender una bebida descuenta una botella y no utiliza receta ni producción.
5. **Comprobar caja y conciliación.** Vender una hamburguesa y una Coca-Cola por Bs 22; comprobar kardex y descuento exacto de ingredientes/botella. Ensayar agotamiento de ingrediente, cortesía autorizada, venta offline con cambio posterior de receta/precio y reenvío del mismo identificador. Evidencia: stock, importes y cierre coinciden; cada movimiento aparece una vez. La política confirmada permite hasta 100 % a administración/encargados y hasta 15 % directamente a caja.
6. **Cerrar el piloto.** Registrar saldos iniciales/finales y documentos, dejar señalados todos los datos aproximados, medir los pesos reales y corregir hacia adelante antes de extender a otras sucursales. La clasificación de productos ajenos al piloto sigue pendiente; una restricción global a productos clasificados solo se activa después de revisar todos los productos y componentes que ese entorno venderá.

### 9.3. Decisiones cerradas y pendiente de ejecución

- El usuario confirmó que el producto mencionado como terminado era Skot Junior y aceptó despachar sus ingredientes para diez hamburguesas. No falta elegir un producto fabricado adicional.
- Coca-Cola se vende en la botella del proveedor a Bs 7. El factor de paquete y las cantidades físicas se registrarán al recibir la mercancía; no bloquean preparar el ensayo por botellas individuales.

Se puede ejecutar el ensayo de los dos productos con la información disponible. La operación en el entorno real requiere comprobar el estado actual, preparar el despliegue y registrar únicamente los hechos físicos de abastecimiento y venta. El modelo ejecutor debe informar la evidencia y distinguirla de los resultados del entorno aislado.
