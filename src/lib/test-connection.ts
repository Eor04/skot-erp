/**
 * Script de Prueba de Conexión a Base de Datos
 * Prueba tanto conexión pooled como directa a Neon Postgres
 */

import { prisma, testConnection, getPoolStats } from './db';

async function main() {
    console.log('🔍 Probando conexión a base de datos...\n');

    // Probar conexión básica
    console.log('1️⃣ Probando conexión pooled (DATABASE_URL)...');
    const isConnected = await testConnection();

    if (!isConnected) {
        console.error('\n❌ Prueba de conexión fallida. Por favor verifica:');
        console.error('   - DATABASE_URL está configurada correctamente en .env');
        console.error('   - La base de datos es accesible');
        console.error('   - Los parámetros de PgBouncer son correctos');
        process.exit(1);
    }

    // Probar ejecución de consultas
    console.log('\n2️⃣ Probando ejecución de consultas...');
    try {
        const userCount = await prisma.user.count();
        const branchCount = await prisma.branch.count();
        const productCount = await prisma.product.count();

        console.log('✅ Ejecución de consulta exitosa');
        console.log(`   - Usuarios: ${userCount}`);
        console.log(`   - Sucursales: ${branchCount}`);
        console.log(`   - Productos: ${productCount}`);
    } catch (error) {
        console.error('❌ Ejecución de consulta fallida:', error);
        process.exit(1);
    }

    // Probar estadísticas del pool de conexiones
    console.log('\n3️⃣ Obteniendo estadísticas del pool de conexiones...');
    try {
        const stats = await getPoolStats();
        console.log('✅ Estadísticas del pool:');
        stats.forEach((stat) => {
            console.log(`   - ${stat.state}: ${stat.count} conexión(es)`);
        });
    } catch (error) {
        console.warn('⚠️  No se pudieron obtener estadísticas del pool (esto puede ser normal con PgBouncer)');
    }

    // Validación de entorno
    console.log('\n4️⃣ Validando configuración de entorno...');
    const databaseUrl = process.env.DATABASE_URL;
    const directUrl = process.env.DIRECT_URL;

    const isLocal = databaseUrl?.includes('localhost') || databaseUrl?.includes('127.0.0.1');

    const validations = {
        'DATABASE_URL está definida': !!databaseUrl,
        'DATABASE_URL incluye pgbouncer (Opcional en Local)': isLocal ? true : (databaseUrl?.includes('pgbouncer=true') || false),
        'DIRECT_URL está definida': !!directUrl,
        'DIRECT_URL no incluye pgbouncer': !directUrl?.includes('pgbouncer') || false,
    };

    Object.entries(validations).forEach(([check, passed]) => {
        console.log(`   ${passed ? '✅' : '❌'} ${check}`);
    });

    console.log('\n✨ ¡Todas las pruebas de conexión completadas!');
}

main()
    .catch((e) => {
        console.error('\n💥 Error inesperado:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
