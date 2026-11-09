# Traspaso de ejecución: piloto Skot Junior y Coca-Cola en 27 de Mayo

## 1. Instrucción para el modelo ejecutor

Continúa la implementación existente y ejecuta el piloto descrito aquí. Lee `AGENTS.md`, este documento, `docs/plan-producto-a-pos.md`, `docs/puesta-en-uso-producto-pos.md` y `docs/resultados-producto-pos.md`. Trabaja sobre el estado actual del repositorio: hay numerosos cambios y archivos nuevos sin commit, incluido código del usuario. No reinicies el desarrollo ni descartes modificaciones. Verifica la evidencia antes de dar por completado un requisito.

Este documento incorpora las últimas decisiones del usuario y prevalece sobre las referencias anteriores a una bebida o producto de fábrica pendientes. El ensayo aislado ya se ejecutó, se verificó un respaldo restaurable y se aplicaron las tres migraciones aditivas al Neon configurado. Además, por autorización del usuario, se configuraron Junior/Coca-Cola y se ejecutó allí un ciclo marcado ficticio; la venta de prueba y los movimientos permanecen señalados en kardex. La mercancía física no se recibió ni vendió. El estado y los pendientes están en [resultados del piloto](resultados-piloto-27-mayo.md).

## 2. Decisiones cerradas: no volver a preguntarlas

- El piloto comercial tiene **dos productos**: Skot Junior y Coca-Cola personal.
- Skot Junior es la hamburguesa consumida por el cliente y **se arma al vender en la sucursal**. Fábrica despacha los ingredientes para diez hamburguesas a 27 de Mayo; sucursal confirma la recepción. No se crea una orden de producción de diez hamburguesas terminadas para este piloto.
- El usuario aclaró que el supuesto producto terminado de fábrica era la misma Skot Junior y aceptó abastecer ingredientes. No falta elegir un tercer producto. El soporte genérico de producción y venta de terminados conserva su alcance y sus pruebas existentes.
- La Coca-Cola llega en la botella del proveedor y se vende por botella/unidad a **Bs 7**. No se produce en fábrica. No inventar mililitros, capacidad de paquete ni equivalencias comerciales. Registrar las botellas realmente recibidas; el factor de paquete se toma del empaque cuando sea necesario.
- Skot Junior tiene precio consultado de **Bs 15** en 27 de Mayo; conservarlo salvo una modificación posterior del usuario. Hamburguesa más bebida: **Bs 22** antes de descuentos.
- Las diez unidades de hamburguesa final actualmente registradas en sucursal son **existencias de prueba**, según el usuario. Corregirlas de manera trazable; no convertirlas en ingredientes ni borrar kardex histórico.
- Cortesías confirmadas: administración y encargados pueden autorizar hasta 100 % de descuento; caja puede aplicar hasta 15 %. Una cortesía consume inventario.
- El usuario autorizó cantidades aproximadas de queso, tomate y lechuga para este piloto. No volver a bloquear el ensayo por falta de pesos exactos.

## 3. Receta y unidades

Rendimiento de la receta: **1 hamburguesa**, unidad `unidad`. Guardar una descripción que identifique los valores provisionales y su origen.

| Ingrediente | Por hamburguesa | Para diez | Interpretación |
| --- | --- | --- | --- |
| Carne Skot Junior | 0,100 kg | 1,000 kg | 100 g confirmados |
| Queso | 0,020 kg | 0,200 kg | Una lámina estimada de 20 g |
| Lechuga | 0,05 unidad | 0,50 unidad | Se asume provisionalmente una lechuga entera para veinte porciones |
| Tomate | 0,030 kg | 0,300 kg | Dos rodajas estimadas de 15 g |
| Pan Skot Junior | 1 unidad | 10 unidades | Un pan Junior |

Conservar las unidades de catálogo existentes: queso y tomate siguen en kg; lechuga sigue en unidad. No implementar una conversión automática de láminas a kg ni cambiar la unidad de productos con historial. No aplicar merma adicional implícita. El consumo es cantidad de receta × unidades vendidas / rendimiento.

Para uso permanente, pesar una muestra de láminas/rodajas y medir el rendimiento de la lechuga. Esa medición posterior no bloquea este piloto autorizado.

## 4. Registros identificados por consulta de solo lectura

Revalidar IDs, SKU, estado y unidades al comenzar, porque la base puede haber cambiado.

| Registro | Identificador | SKU / dato |
| --- | --- | --- |
| Skor Burger - 27 de mayo | `cmw8svbi80000hqcabm8l74i4` | Sucursal `HAMBURGUESAS` |
| Fabrica | `cmw8t4brz000fhqcapsrs2ytf` | Sucursal `FABRICA` |
| Skor Junior | `cmw8swiqb0001hqcazmimuzux` | `SKOT-JR-HSA`, tipo `BURGER`, unidad `unidad` |
| Receta existente de Junior | `cmw8t2bvi0008hqca2mc00l5y` | Rendimiento consultado: 1 |
| Carne Skot Junior | `cmw8sy8r20003hqca73qkqdem` | `CAR-JR-HSA`, kg |
| Queso | `cmw8szv2a0006hqcawsranoc2` | `QSO-SKT-003`, kg |
| Lechuga | `cmw8syz2a0004hqcaqrcg6gjo` | `LCH-SKT-001`, unidad |
| Tomate | `cmw8szj7m0005hqcalwkxpv2i` | `TME-SKT-002`, kg |
| Pan Skot Junior | `cmw8sxdgn0002hqcazt6pjc7w` | `PAN-JR-HSA`, unidad |

El nombre de catálogo tiene la variante «Skor Junior»; usar el SKU existente, sin crear otra hamburguesa por la diferencia ortográfica. La consulta inicial no encontró Coca-Cola; durante la prueba ficticia se creó con SKU `COCA-COLA-PERSONAL`, unidad botella y precio Bs 7. Antes de repetir cualquier alta, comprobar que ese registro siga siendo el mismo y no duplicarlo.

La receta antigua contiene cantidades de ensayo incorrectas (1 kg para varios ingredientes). Registrar su estado anterior y seleccionar explícitamente la receta corregida como receta de venta. Revisar referencias de producción antes de editar una receta compartida; si hay órdenes dependientes, crear una versión de receta para el piloto y seleccionarla sin alterar esas órdenes.

## 5. Implementación existente que debe aprovecharse

| Área | Archivos / comportamiento |
| --- | --- |
| Modelo | `prisma/schema.prisma`: `consumptionMode`, `saleRecipeId`, `setupDraft`, `SaleItem.offlineSnapshot` |
| Migraciones aditivas | `20261109170000_explicit_product_consumption`, `20261109180000_product_setup_draft`, `20261109190000_offline_sale_snapshots` |
| Cálculos | `src/lib/inventory-consumption.ts`, `consumption-config.ts`, `validate-sale-prices.ts` |
| Asistente | `/admin/products/setup`, `/api/admin/product-setup`; guarda producto, receta y asignaciones en transacción |
| POS | `/api/pos/products`, `/api/pos/sale`, páginas Burger/Açaí; suma ingredientes de todo el carrito y valida stock en transacción serializable |
| Offline | `offline-sale-authorization.ts`, `sync-manager.ts`; firmas por usuario/sucursal, precio y configuración originales, vencimiento de treinta días e idempotencia |
| Abastecimiento | «Abastecer» desde producto precarga ingredientes si consume receta; «Preparar envío» desde producción precarga transferencias |
| Movimientos | `transfer-stock.ts`, APIs de transferencias y pedidos internos; despacho descuenta origen y recepción acredita destino |
| Diagnóstico / clasificación | `scripts/diagnostics/product-readiness.ts`, `scripts/data/classify-consumption.ts` con simulación y `--apply` |

Verificación anterior documentada: nueve pruebas Node, ocho Playwright de asistente/POS/abastecimiento, cinco de impresión, tipos y build. Son antecedentes; ejecutar los controles apropiados a las modificaciones nuevas. No repetir baterías sin un cambio o preocupación concreta que lo justifique.

## 6. Secuencia de ejecución

### A. Comprobar entorno y preparar evidencia

1. Inspeccionar `git status`, instrucciones locales, esquema y migraciones. Separar lo implementado de lo que realmente está aplicado en el entorno objetivo.
2. La `.env` configurada apuntaba a Neon remoto. No ejecutar fixtures, resets ni pruebas de inventario contra esa URL. No imprimir secretos ni guardar credenciales en documentos o git.
3. Identificar el PostgreSQL aislado `127.0.0.1:55432/skot_test`; existía un contenedor `skot-erp-agent-test`. Comprobar su estado antes de reutilizarlo. Crear fixtures con IDs nuevos para evitar mezclar saldos de pruebas anteriores. La tercera migración se corrigió durante el ensayo anterior: el SQL final crea `sale_items."offlineSnapshot"`; la columna local inicial `offline_snapshot` fue renombrada. Revisar esquema y migraciones actuales, sin tomar el historial local como prueba de una instalación limpia.
4. En el entorno objetivo real, obtener un respaldo recuperable, un informe previo de catálogo/recetas/precios/inventario y revisar las colas offline de cada caja antes de clasificar o ajustar saldos. El servidor no puede inferir completamente esas colas locales.
5. No pedir otra vez datos comerciales ya resueltos. Si falta acceso al entorno, evidencia de entregas físicas o sincronización de una caja, identificar exactamente ese impedimento y continuar el trabajo independiente posible.

### B. Preparar y comprobar configuración comercial

1. Aplicar migraciones pendientes y regenerar Prisma en el entorno aislado; coordinar esquema y aplicación en cualquier despliegue posterior.
2. Configurar una clave estable `OFFLINE_SALE_SECRET` de al menos 32 caracteres o utilizar un `JWT_SECRET` fuerte. No rotarla con ventas pendientes. Los secretos locales de prueba no se reutilizan en producción.
3. Configurar Junior mediante el asistente o su API: `RECIPE`, rendimiento 1, cinco ingredientes de la tabla, receta explícita, sucursal 27 de Mayo, precio Bs 15. Conservar el producto/SKU existente en el entorno objetivo. Guardar nota de aproximaciones.
4. Configurar Coca-Cola personal: `BEVERAGE`, unidad `unidad` equivalente a una botella, `STOCK`, precio Bs 7 y asignación a 27 de Mayo. No crear receta, producción ni stock por el mero alta del producto.
5. Corregir el saldo ficticio de diez hamburguesas a cero mediante `/api/inventory/adjustments`, tipo `AJUSTE`, cantidad absoluta `0`, motivo que documente la limpieza del piloto y sesión autorizada. Revisar el saldo actual antes de hacerlo: si hubo operaciones posteriores, conciliar primero. No hacer una actualización directa sin movimiento de kardex.
6. El endpoint legado `/api/inventory/stock/adjust` no es el recomendado para este trabajo: al preparar el traspaso se observó que carece del control de acceso del endpoint `/api/inventory/adjustments`. Usar la operación autenticada y transaccional existente.

### C. Abastecer y recibir

1. En el ensayo aislado, registrar mediante recepción los ingredientes para diez hamburguesas en fábrica, usando los totales de la tabla. No introducir hamburguesas finales en inventario.
2. Elegir un documento operativo: pedido interno si solicita la sucursal, transferencia si inicia fábrica. No generar ambos para la misma entrega. Para este ensayo puede utilizarse una transferencia iniciada desde fábrica.
3. Crear el envío de los cinco ingredientes, despachar desde fábrica y confirmar su recepción en 27 de Mayo con las cantidades realmente recibidas. Crear un envío no mueve stock. Despacho y recepción sí lo mueven.
4. Para Coca-Cola, el ensayo puede registrar diez botellas ficticias como fixture. No asumir que diez botellas son un paquete. En operación real, registrar el número de botellas del proveedor donde físicamente se reciben; transferir después si primero ingresaron a fábrica.
5. En el entorno real, no confirmar recepción, despacho, compra ni venta ficticios como si fueran hechos físicos. El ensayo usa base aislada; el piloto operativo usa documentos y cantidades reales.

### D. Ejecutar ventas y conciliar

1. Comprobar antes de vender: Junior tiene stock final cero y capacidad para diez hamburguesas por sus ingredientes; Coca-Cola tiene diez botellas en el fixture; ambos están activos, asignados y con precio.
2. Abrir caja en el ensayo con usuario autorizado. Vender una Junior y una Coca-Cola, sin combo ni descuento: cobrar **Bs 22**.
3. Verificar la matriz de saldos de la sección 7 y el kardex: cinco salidas de ingredientes y una salida de bebida. La venta no produce ni descuenta una unidad de hamburguesa final.
4. En escenarios separados, probar ingrediente limitante, cortesía autorizada y venta offline: firma, precio/receta capturados, reenvío idempotente y captura de auditoría persistida. Si no hay stock o la autorización venció, conservar la venta para conciliación, sin cambiar datos silenciosamente.
5. Comprobar que caja no puede cambiar precios, operar sucursales ajenas ni autorizar un descuento superior al 15 %.
6. Cerrar caja del ensayo, verificar importes y documentar ventas, transferencias, recepciones y ajustes con sus identificadores. Una prueba de inventario sola no prueba cierre de caja.

### E. Llevar al entorno objetivo y cerrar

1. Preparar resultados del ensayo y lista exacta de operaciones a aplicar. Continuar conforme a las autorizaciones existentes; no introducir permisos adicionales para lecturas, revisiones o arreglos reversibles.
2. Aplicar al entorno real únicamente configuración y movimientos respaldados por su estado actual y hechos operativos. Revalidar los IDs de la sección 4. No replicar automáticamente fixtures, usuarios ficticios o ventas de prueba.
3. Activar restricciones a productos clasificados cuando todos los productos/componentes que venderá ese entorno estén revisados. `REQUIRE_CLASSIFIED_CONSUMPTION` es global al entorno; no activarla sin revisar sus efectos en el resto del catálogo.
4. Observar un ciclo operativo de abastecimiento, recepción, venta y cierre; adjuntar evidencia. Si el ciclo físico o el despliegue no se ejecutan, decir qué quedó pendiente: no declarar el plan completo solo por compilar o pasar pruebas aisladas.

## 7. Resultado cuantitativo esperado del ensayo principal

Supone sucursal sin saldos previos, recepción exacta para diez hamburguesas y diez botellas, y una sola venta de una hamburguesa más una bebida. Comparar decimales con tolerancia numérica y no por representación binaria exacta.

| Existencia en 27 de Mayo | Antes de venta | Después de venta |
| --- | --- | --- |
| Carne | 1,000 kg | 0,900 kg |
| Queso | 0,200 kg | 0,180 kg |
| Lechuga | 0,50 unidad | 0,45 unidad |
| Tomate | 0,300 kg | 0,270 kg |
| Pan | 10 unidades | 9 unidades |
| Coca-Cola | 10 botellas | 9 botellas |
| Hamburguesa final | 0 | 0 |
| Capacidad de Junior | 10 hamburguesas | 9 hamburguesas |

Total de venta: Bs 22. La disponibilidad se calcula desde ingredientes y el stock de bebida. Repetir la sincronización de una venta ya aceptada no vuelve a cobrar, descontar inventario ni generar kardex.

## 8. Comandos y controles

Exportar en el proceso las URL de la base aislada; no usar la `.env` remota para las pruebas. Los tests de integración rechazan destinos distintos de `127.0.0.1:55432/skot_test`. Configurar secretos locales de prueba fuera del repositorio.

```bash
npx prisma migrate deploy
npx prisma generate
node --import tsx --test tests/inventory-consumption.test.ts tests/product-pos.integration.test.ts tests/classify-consumption.integration.test.ts tests/internal-orders.integration.test.ts tests/sync-manager.test.ts tests/offline-sale-authorization.test.ts
npx tsc --noEmit --incremental false
npm run build
git -c core.whitespace=cr-at-eol diff --check
```

Para pruebas de navegador, iniciar aplicación en `127.0.0.1:3100` con las mismas URL y secretos locales que el proceso de prueba. Evitar build y servidor dev simultáneos sobre `.next`.

```bash
npx playwright test tests/e2e/product-setup.spec.ts tests/e2e/internal-orders.spec.ts --workers=1
```

Agregar o adaptar una prueba del piloto concreto si la cobertura existente no demuestra la matriz anterior, los cinco ingredientes, los precios Bs 15/Bs 7 o el cierre. Corregir fallos antes de ampliar pruebas; conservar la cobertura genérica de producto terminado, combos y Açaí. No borrar historial para conseguir que una prueba pase.

## 9. Entregables y condiciones de cierre

- [x] Plan original, guía y resultados reflejan el piloto final de dos productos.
- [x] Configuración reproducible del ensayo aislado con receta provisional y precios confirmados. Los SKUs del fixture están marcados como piloto y usan IDs únicos.
- [x] Informe con saldos previos/posteriores, IDs de documentos, venta por Bs 22, movimientos y cierre de caja; separa ensayo aislado de operación real.
- [x] Evidencia de no duplicación y controles de acceso, stock y venta offline.
- [x] Registro y verificación de las migraciones aplicadas en el ensayo aislado y en el Neon configurado; respaldo previo restaurado en PostgreSQL 18.6.
- [x] Guía breve por rol: administración configura; fábrica abastece ingredientes; sucursal recibe; caja vende y cierra.
- [x] Operación real pendiente indicada con precisión: desplegar el código verificado, revisar las colas locales de POS antes de operar y, cuando se haga el abastecimiento físico, registrar lo realmente recibido/despachado/vendido y conciliar el cierre. El ciclo remoto solicitado fue ficticio y está documentado por separado.

Resultados y observaciones de entorno: [informe del ensayo, respaldo y preflight](resultados-piloto-27-mayo.md). La sesión remota olvidada fue cerrada y conciliada de forma ficticia por autorización del usuario. La operación comercial física sigue pendiente: despliegue del código, revisión de colas offline locales y registro de abastecimiento/venta físicos. El usuario autorizó existencias simuladas para la prueba; el conteo físico no era requisito para ejecutar ese ensayo.

No exigir una receta medida de cocina ni un tercer producto para continuar: los aproximados y el alcance de dos productos fueron resueltos por el usuario. No confundir esa autorización con evidencia de entregas físicas que todavía no ocurrieron.

## 10. Mensaje sugerido para iniciar al siguiente modelo

> Continúa desde `docs/plan-ejecucion-piloto-27-mayo.md` y `docs/resultados-piloto-27-mayo.md`. El ensayo aislado y el ciclo remoto ficticio ya se ejecutaron; el respaldo/restauración y las tres migraciones del Neon se verificaron. No repitas fixtures ni descartes cambios locales. La sesión `cmw8tnr1q003rhqcaizj0er1a` está cerrada y conciliada como prueba ficticia. Antes de operación comercial física, despliega el código compatible con el esquema y revisa las colas offline locales; registra únicamente cantidades realmente recibidas/despachadas/vendidas y concilia caja. El usuario autorizó cantidades simuladas para el ensayo y no exige conteo físico para esa prueba. No pidas de nuevo pesos aproximados ni un tercer producto.
