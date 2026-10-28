# Pruebas funcionales — 28 de octubre de 2026

**Informe histórico de la primera ronda.** Los ocho fallos se corrigieron después
de esta ejecución. Ver [correcciones y regresión: 148/148](correcciones-funcionales.md)
para el resultado actual.

La ronda detectó ocho fallos reproducibles. La compilación correcta no implica
que los flujos de negocio estén completamente validados.

## Entorno y resultados

Se probó la compilación de producción con `next start`, PostgreSQL local
`skot_erp_test` y Chromium mediante Playwright 1.64.1. No se utilizaron datos ni
servicios de producción. Las herramientas de navegador se instalaron en `/tmp`,
sin modificar `package.json` ni `package-lock.json`.

| Grupo | Comprobaciones | Correctas | Fallidas |
| --- | ---: | ---: | ---: |
| API y operaciones verificadas en PostgreSQL | 52 | 46 | 6 |
| Navegador: accesos, pantallas y POS | 51 | 49 | 2 |
| Navegador: venta completa Açaí y comprobación en PostgreSQL | 1 | 1 | 0 |
| Total | 104 | 96 | 8 |

Además, `npm run test:connection` pasó cargando las variables de `.env`.
Se crearon cuatro sucursales, seis usuarios —uno inactivo—, cinco productos,
inventarios y una receta, todos ficticios. Las operaciones de las pruebas
dejaron ventas, movimientos y otros registros ficticios para inspección.

## Fallos reproducidos

| ID | Prioridad | Resultado observado | Comportamiento requerido |
| --- | --- | --- | --- |
| F01 | Alta | Un usuario `WAREHOUSE` pudo crear una venta: HTTP 201. | Verificar el permiso de venta en el servidor; devolver 403 a almacén. |
| F02 | Alta | Un cajero asignado únicamente a Burger pudo consultar el catálogo Açaí de otra sucursal: HTTP 200. | Comprobar las sucursales asignadas antes de leer o modificar sus datos. |
| F03 | Alta | Una transferencia de 5 kg aumentó el destino en 5 kg, pero el origen permaneció en 101 kg, en vez de bajar a 96 kg. | Descontar el origen una sola vez y conservar las existencias totales entre origen y destino. |
| F04 | Alta | Recibir otra vez el mismo pedido de compras incrementó el stock de 104 a 108 unidades. | Rechazar o ignorar una recepción ya aplicada, sin repetir el ingreso. |
| F05 | Alta | Dos envíos con el mismo `offlineId` crearon dos ventas, con sus descuentos de inventario. | Registrar y comprobar una clave de idempotencia para evitar duplicados en reintentos. |
| F06 | Media | Un ajuste absoluto de inventario a `0` respondió HTTP 400. | Permitir cero como stock final de un ajuste, conservando las validaciones de entradas y salidas. |
| F07 | Alta | La pantalla de compras recibió HTML y falló al interpretarlo como JSON. | Construir correctamente los parámetros de consulta y gestionar los fallos de carga. |
| F08 | Media | La pantalla de sugerencias consultó la API sin `branchId`, recibió HTTP 400 y no mostró las sugerencias. | Proporcionar una sucursal permitida y mostrar los errores al usuario. |

F01 se confirmó con una venta real de prueba, no solamente con una solicitud
incompleta. Esa venta y su cambio de inventario se revirtieron después de la
comprobación.

Referencias para corregir:

- F01: `src/app/api/pos/sale/route.ts` y permisos de `src/lib/auth-middleware.ts`.
- F02: `src/app/api/pos/products/route.ts`. El hallazgo confirma este endpoint;
  falta revisar sistemáticamente el aislamiento de los demás endpoints.
- F03: `src/app/api/inventory/transfers/[id]/approve/route.ts` y
  `src/app/api/inventory/transfers/[id]/receive/route.ts`.
- F04: `src/app/api/admin/purchase-orders/[id]/route.ts`.
- F05: `src/app/api/pos/sale/route.ts`, `src/lib/sync-manager.ts` y el modelo de
  ventas en `prisma/schema.prisma`.
- F06: `src/app/api/inventory/adjustments/route.ts`: las condiciones `!quantity`
  y `qty === 0` rechazan el cero.
- F07: `src/app/admin/purchase-orders/page.tsx`: cuando no hay sucursal, se
  solicita `/api/admin/purchase-orders&limit=50`, sin el signo `?`.
- F08: `src/app/inventory/suggestions/page.tsx` y
  `src/app/api/inventory/suggestions/route.ts`.

## Casos que pasaron

- Login de administrador, gerente, cajero y almacén; rechazo de contraseña
  incorrecta, campos vacíos y usuario inactivo; cierre de sesión mediante API.
- Restricciones de acceso a usuarios, creación de productos y módulo de fábrica
  para roles no permitidos. La redirección de páginas protegidas se verificó en
  el navegador, manteniendo el origen `localhost`.
- Catálogos Burger/Açaí, precios fijos y por kilogramo.
- Apertura de caja y rechazo de doble apertura; venta Burger, gasto y cierre:
  apertura de Bs. 100 + venta de Bs. 40 - gasto de Bs. 5 = Bs. 135 esperados.
- Ventas completas desde el navegador, comprobadas en PostgreSQL: Burger por
  Bs. 20 y Açaí con peso neto simulado de 1,25 kg a Bs. 60/kg, total Bs. 75.
- Rechazo de venta por stock insuficiente sin crear venta ni descontar stock.
- Recepción de mercancía, salida manual, merma y movimientos de kardex.
- Producción programada y completada: consumo de 6 kg y obtención de 4 kg;
  rechazo de una segunda finalización.
- Rechazo de una segunda recepción de transferencia. Esto no corrige F03.
- Consultas de ventas, reportes, gastos, stock, kardex y resumen de fábrica.
- Carga inicial de las principales pantallas administrativas, de inventario y
  fábrica, salvo F07 y F08. Esta comprobación de carga no equivale a probar cada
  formulario o acción de esas pantallas.
- Conexión de balanza simulada, confirmación de peso y restauración de la IP
  guardada sin errores de hidratación.

## Scripts y evidencias

Los scripts están en `scripts/functional/`. Ejecutarlos desde la raíz, solamente
contra el entorno local preparado. Comprueban el destino local de la base antes
de operar. No ejecutar el seed principal con usuarios predefinidos.

```bash
# Preparar un conjunto nuevo: rechaza sobrescribir fixtures existentes.
node --env-file=.env scripts/functional/prepare.cjs

# Iniciar la compilación de producción ya verificada.
npm run start -- --hostname 127.0.0.1 --port 3100

# En otra terminal, con la aplicación iniciada:
node --env-file=.env scripts/functional/api.cjs

# Herramientas externas al proyecto, necesarias para las pruebas de navegador:
npm install --prefix /tmp/skot-erp-functional-tools --no-save --package-lock=false playwright@1.64.1
PLAYWRIGHT_BROWSERS_PATH=/tmp/skot-erp-browsers /tmp/skot-erp-functional-tools/node_modules/.bin/playwright install chromium --only-shell

PLAYWRIGHT_BROWSERS_PATH=/tmp/skot-erp-browsers node --env-file=.env scripts/functional/browser.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/skot-erp-browsers node --env-file=.env scripts/functional/browser-acai.cjs
```

La suite de API depende del estado inicial: debe ejecutarse una vez por conjunto
recién preparado. Repetirla sobre los registros anteriores no reproduce ese
estado, especialmente la apertura de caja y sus totales. Preparar de nuevo un
entorno local limpio antes de repetir la ronda completa. Los scripts devuelven
un código distinto de cero si encuentran fallos; no convierten fallos esperados
del sistema en pruebas aprobadas.

Los resultados y las capturas están excluidos de Git:

- `.local/test-db/functional-api-results.json`
- `.local/test-db/functional-browser-results.json`
- `.local/test-db/functional-acai-results.json`
- `.local/test-db/browser/`

Las cuentas de acceso y sus contraseñas aleatorias están en
`.local/test-db/functional-fixtures.json`, con permisos de lectura restringidos.
No copiar ese archivo a documentación pública. Para probar manualmente, abrir
`http://localhost:3100`, evitando cambiar entre `localhost` y `127.0.0.1` durante
la sesión, porque las cookies pertenecen al hostname con el que se ingresó.

## Pendiente y alcance

Esta ronda identifica fallos; no modifica la lógica del sistema para corregirlos.
Antes de dar por validados estos flujos deben corregirse F01–F08 y repetirse sus
casos de regresión en un entorno nuevo.

No se verificaron balanza física ni puente TCP/USB, cargas reales a Cloudinary,
impresión física, todos los formularios CRUD, navegadores distintos de Chromium,
pantallas móviles, ni concurrencia intensiva. El reenvío offline se probó en la
API; falta la prueba completa sin conexión con el service worker y recuperación
de red. Las pruebas de navegador de esta ronda bloquearon el service worker para
aislar la versión compilada de cachés anteriores.
