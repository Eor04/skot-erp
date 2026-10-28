# Correcciones funcionales — 28 de octubre de 2026

Los ocho fallos de la [primera ronda](pruebas-funcionales.md) se corrigieron y se
repitieron las pruebas en un esquema nuevo de la base local `skot_erp_test`.
La compilación de producción terminó correctamente y pasaron las 148
comprobaciones ejecutadas, sin fallos.

## Cambios, por prioridad

1. **Permiso de venta.** El servidor consulta el usuario activo y su rol actual.
   Solo `ADMIN`, `MANAGER` y `CASHIER` pueden crear ventas. No se permite atribuir
   una venta a otro usuario mediante el cuerpo de la solicitud.
2. **Sucursales.** Se centralizó la autorización en `src/lib/branch-access.ts`.
   El catálogo y el historial POS rechazan sucursales ajenas. Las consultas de
   inventario, kardex, movimientos, ajustes, recepciones, mermas, alertas, caja,
   gastos, sugerencias, transferencias y pedidos internos filtran por asignación
   incluso cuando no se envía `branchId`. El selector de sucursales devuelve solo
   las asignadas al usuario; administración mantiene todas las activas.
3. **Transferencias.** La aprobación descuenta el origen, crea su kardex y marca
   `IN_TRANSIT` en una transacción. La recepción acredita el destino una sola
   vez. Cancelar un despacho devuelve su stock una sola vez; cancelar uno
   pendiente no altera existencias. Las transferencias que ya estaban en tránsito
   y no tenían movimiento de despacho descuentan el origen al recibirse.
4. **Compras.** La recepción lee y modifica el estado dentro de una transacción
   serializable con reintentos de conflictos. Repetir `RECEIVED` devuelve el
   pedido existente, sin volver a ingresar stock. Los pedidos finalizados no se
   pueden reabrir. Se respetan cantidades recibidas iguales a cero y se rechazan
   ítems pertenecientes a otro pedido.
5. **Reintentos offline.** Se añadió `offlineId` persistente, único por sucursal,
   y una huella del contenido. Un reenvío idéntico devuelve la venta original
   con HTTP 200 y `replayed: true`; el primer ingreso devuelve HTTP 201.
   Reutilizar la clave con datos diferentes responde 409. El índice de base de
   datos y los reintentos evitan duplicados incluso con envíos simultáneos. La
   validación y el descuento de stock de la venta se ejecutan en la misma
   transacción serializable.
6. **Ajuste a cero.** `AJUSTE` acepta cero como existencia final. Entradas y
   salidas siguen requiriendo cantidades positivas; se rechazan cantidades
   negativas o no finitas. El cálculo y el kardex son transaccionales.
7. **Lista de compras.** La consulta utiliza `URLSearchParams`, incluyendo el
   signo `?` aunque no haya filtro de sucursal. Los errores finalizan la carga y
   se muestran al usuario.
8. **Sugerencias.** Se selecciona una sucursal permitida antes de consultar.
   La pantalla consume `data.suggestions`, utiliza la cantidad calculada por la
   API y permite cambiar de sucursal. Los errores se muestran en pantalla y no
   se presentan como un resultado saludable de inventario.

`src/lib/transaction.ts` reúne el manejo de transacciones serializables y los
reintentos de conflictos de escritura.

## Verificación

| Grupo | Correctas | Fallidas |
| --- | ---: | ---: |
| Suite original de API | 52 | 0 |
| Regresión de permisos, existencias y concurrencia | 39 | 0 |
| Suite original de navegador | 51 | 0 |
| Venta Açaí completa con comprobación en PostgreSQL | 1 | 0 |
| Regresión de compras y sugerencias en navegador | 5 | 0 |
| Total | 148 | 0 |

También pasaron TypeScript y `npm run build`. `package-lock.json` no cambió.

Los casos adicionales incluyen doble aprobación y doble recepción simultáneas,
cancelación y recepción de transferencias antiguas, recepción parcial de compras,
reenvíos offline simultáneos, reutilización conflictiva de claves, dos ventas
compitiendo por la última unidad, acceso a sucursales ajenas y usuario desactivado
con una sesión anterior. En el navegador se verificaron el producto sugerido con
stock bajo, el selector restringido y la recuperación ante errores de carga
simulados.

## Base de datos y despliegue

Se añadió la migración:

`prisma/migrations/20261028190000_add_sale_offline_idempotency/migration.sql`

Es aditiva: agrega dos columnas anulables y el índice único
`sales_branchId_offlineId_key`. Los registros existentes conservan sus valores y
las ventas históricas mantienen `offlineId = NULL`.

La migración ya se aplicó a la base local de pruebas. **Antes de usar esta versión
en otro entorno se deben aplicar las migraciones de ese entorno**:

```bash
npm run prisma:migrate:deploy
npm run build
```

No se desplegó ni se modificó una base de producción. No se recalcularon ventas
duplicadas ni saldos históricos de transferencias recibidas antes de la
corrección; corregir esos registros requiere una revisión de datos independiente.

## Repetir las pruebas

Seguir la preparación y ejecución de la [guía funcional](pruebas-funcionales.md).
Después de la suite de API y antes de las pruebas de navegador, ejecutar:

```bash
node --env-file=.env scripts/functional/regression.cjs
```

Con Playwright disponible según la guía, ejecutar además:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/skot-erp-browsers node --env-file=.env scripts/functional/browser-regression.cjs
```

Los reportes actuales están en `.local/test-db/functional-*-results.json`; las
capturas, en `.local/test-db/browser/`. Los resultados y credenciales anteriores
se conservaron en `.local/test-db/runs/before-fixes-*`, excluidos de Git.

El esquema activo de regresión está indicado en `.env`. Las credenciales actuales
de los usuarios ficticios están en `.local/test-db/functional-fixtures.json`.
La aplicación local se dejó iniciada en `http://localhost:3100`.

## Alcance

Estas pruebas cubren las correcciones anteriores y los flujos ya verificados.
Se mantienen pendientes las pruebas de balanza física, Cloudinary real,
impresión, dispositivos móviles y operación completa sin conexión con el service
worker. Los ensayos de concurrencia son casos controlados; no constituyen una
prueba de carga ni una auditoría completa de todos los endpoints del sistema.
