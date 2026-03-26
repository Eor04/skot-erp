/**
 * Configuración de Conexión a Base de Datos
 * Optimizado para Neon Postgres con PgBouncer + Vercel Serverless
 */

import { PrismaClient } from '@prisma/client';

// Extender tipo global para recarga en desarrollo (hot reload)
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Configuración de conexión para Neon + Vercel serverless
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL, // Conexión Pooled (PgBouncer)
      },
    },
  });
};

// Patrón Singleton - previene múltiples instancias de Prisma Client en serverless
const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export { prisma };

/**
 * Notas de Configuración del Pool de Conexiones:
 * 
 * DATABASE_URL debe incluir:
 * - ?pgbouncer=true (habilita modo PgBouncer)
 * - &connection_limit=10 (recomendado para serverless)
 * - &pool_timeout=20 (segundos)
 * 
 * Ejemplo:
 * postgresql://usuario:pass@host.neon.tech:5432/db?pgbouncer=true&connection_limit=10&pool_timeout=20
 * 
 * DIRECT_URL se usa solo para migraciones (sin pooling):
 * postgresql://usuario:pass@host.neon.tech:5432/db
 */

// Función auxiliar para probar conexión a base de datos
export async function testConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Conexión a base de datos exitosa');
    return true;
  } catch (error) {
    console.error('❌ Falló la conexión a base de datos:', error);
    return false;
  }
}

// Manejo de cierre ordenado
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

// Opcional: Estadísticas del pool de conexiones (para monitoreo)
export async function getPoolStats() {
  try {
    const result = await prisma.$queryRaw<Array<{ state: string; count: number }>>`
      SELECT state, count(*) as count 
      FROM pg_stat_activity 
      WHERE datname = current_database()
      GROUP BY state;
    `;
    return result;
  } catch (error) {
    console.error('Error obteniendo estadísticas del pool:', error);
    return [];
  }
}
