# Entorno local de pruebas

La base `skot_erp_test` utiliza una instancia PostgreSQL 17 propia del proyecto,
disponible solamente en `127.0.0.1:55432`. No conecta con producción.
Se creó vacía y se aplicaron las siete migraciones del repositorio. Se verificó
la conexión y la existencia de 31 tablas, incluida la de control de migraciones.
No se ejecuta automáticamente el seed existente, que contiene usuarios y hashes
de contraseñas predefinidos. Las pruebas de inicio de sesión necesitarán usuarios
ficticios con contraseñas de prueba conocidas.

## Variables

`.env` contiene las credenciales locales y una clave JWT aleatoria. Está excluido
de Git, al igual que `.local/test-db/`, donde se guardan los archivos de PostgreSQL.
`.env.example` es una plantilla sin credenciales reales: copiarla por sí sola no
crea la base ni configura una contraseña en PostgreSQL.

`DATABASE_URL` y `DIRECT_URL` apuntan a la misma instancia, porque este entorno
local no utiliza un pooler externo. `NEXT_PUBLIC_MOCK_SCALE=true` permite probar
la interfaz de balanza sin hardware. Cloudinary queda sin configurar: la carga
real de imágenes requiere credenciales de una cuenta de pruebas.

Next.js y la CLI de Prisma cargan `.env`. Los scripts ejecutados directamente con
`tsx` necesitan que las variables se carguen en su proceso. En esta máquina,
Node 24 permite utilizar:

```bash
node --env-file=.env --import tsx scripts/diagnostics/test-connection.ts
```

El comando `npm run test:connection` también puede usarse exportando previamente
las variables del archivo al proceso. Su definición se conserva sin cambios.

## Iniciar y detener PostgreSQL

Desde la raíz del repositorio, en esta máquina Linux:

```bash
# Estado
/usr/lib/postgresql/17/bin/pg_ctl -D .local/test-db/data status

# Iniciar después de reiniciar la computadora
/usr/lib/postgresql/17/bin/pg_ctl -D .local/test-db/data -l .local/test-db/server.log -w start

# Detener
/usr/lib/postgresql/17/bin/pg_ctl -D .local/test-db/data -m fast -w stop
```

Los datos permanecen en disco al detener PostgreSQL. No eliminar
`.local/test-db/` si se desea conservarlos. El entorno restringido del agente
puede requerir permisos adicionales para abrir o acceder al puerto local.

## Preparación y verificación

```bash
npm run prisma:migrate:deploy
npm run prisma:generate
npm run build
```

Las migraciones preparan las tablas; no crean datos ficticios para los flujos de
ventas, inventario o permisos. La compilación y las pruebas funcionales son pasos
posteriores a la configuración del entorno.

La primera ronda funcional y los datos ficticios preparados se describen en
[pruebas-funcionales.md](pruebas-funcionales.md).

Después de corregir los fallos se preparó un esquema nuevo `regression_*` dentro
de esta misma base, sin borrar los resultados anteriores. `.env` apunta al
esquema activo. Ver [correcciones y resultados actuales](correcciones-funcionales.md).
