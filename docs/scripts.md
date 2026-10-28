# Scripts del proyecto

Ejecutar los comandos desde la raíz del repositorio, con las dependencias
instaladas y las variables de entorno que necesite cada herramienta disponibles
en el proceso. La reorganización no añade carga automática de archivos `.env`.

## Organización

| Carpeta | Contenido |
| --- | --- |
| `scripts/diagnostics/` | Consultas de productos, sucursales, SKU, tipos y conexión a la base de datos. |
| `scripts/data/` | Exportación, limpieza de datos y ajuste de existencias. |
| `scripts/seeds/` | Cargas complementarias de administrador, recetas y productos Açaí. |
| `scripts/functional/` | Datos ficticios y pruebas de API y navegador para el entorno local aislado. |
| `archive/scripts/` | Parches históricos de interfaz y sustituciones de código. |

Los nombres de los archivos se conservan. `prisma/seed.ts` sigue siendo el seed
principal y conserva sus comandos. `scale-bridge/` mantiene sus scripts y su
instalación independiente.

## Diagnóstico

```bash
npm run test:connection
npx tsx scripts/diagnostics/check-db.ts
npx tsx scripts/diagnostics/check-branch.ts
npx tsx scripts/diagnostics/check-skus.ts
npx tsx scripts/diagnostics/check-old-types.ts
```

`npm run test:connection` conserva su nombre y ahora apunta a
`scripts/diagnostics/test-connection.ts`.

El alcance, los resultados y los comandos de las pruebas funcionales están en
[pruebas-funcionales.md](pruebas-funcionales.md).

## Datos y cargas complementarias

| Archivo | Operación existente |
| --- | --- |
| `scripts/data/export-data.js` | Lee usuarios y productos y genera `prisma/seed_prueba.ts`. La exportación incluye hashes de contraseñas. |
| `scripts/data/cleanup-old-acai.ts` | Limpia datos antiguos de Açaí. |
| `scripts/data/cleanup-specific.ts` | Elimina relaciones y existencias de productos específicos y desactiva productos. |
| `scripts/data/set-acai-stock.ts` | Ajusta existencias y relaciones de productos por sucursal. |
| `scripts/seeds/seed-admin.js` | Crea el administrador con los valores definidos en el script. |
| `scripts/seeds/seed-recipes.ts` | Crea o reemplaza ingredientes de una receta específica. |
| `scripts/seeds/seed-acai-products.ts` | Carga productos Açaí. |

Para ejecutar un archivo JavaScript se utiliza `node <ruta>`; para TypeScript,
`npx tsx <ruta>`. Estas herramientas conservan su lógica original y se ejecutan
manualmente, después de revisar los datos y el entorno al que apuntan.

## Archivo histórico

`archive/scripts/` conserva 48 scripts de correcciones puntuales, incluidas las
variantes `v2`, `v3` y `final`. No forman parte de los comandos de desarrollo,
compilación ni migración. Modifican archivos fuente y no deben ejecutarse en lote.

Las rutas basadas en `__dirname` se ajustaron para seguir apuntando a la raíz
original. Las rutas relativas al directorio de ejecución mantienen el requisito
de ejecutar desde la raíz del repositorio.

`archive/scripts/fix-rec.js` ya tenía un error de sintaxis antes del movimiento;
se conserva como referencia histórica, sin corregir ni ejecutar.
