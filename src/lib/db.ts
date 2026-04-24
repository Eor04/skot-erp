/**
 * Configuración de Conexión a Base de Datos
 * Optimizado para Neon Postgres (local: directo, producción: pgBouncer + Vercel)
 */

import { PrismaClient } from '@prisma/client';

// Extender tipo global para recarga en desarrollo (hot reload)
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    // Sin log de queries — las rutas API ya logean sus propios errores.
    // Prisma imprime logs muy verbosos que no aportan en producción/dev.
    log: [],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
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
 * Ejecuta una query Prisma con reintentos automáticos.
 * Útil para manejar el cold start de Neon (primer request tras inactividad).
 *
 * @param fn    Función async que ejecuta la query
 * @param opts  { retries, delayMs } — por defecto 2 reintentos con 1500ms de espera
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const { retries = 3, baseDelayMs = 1000 } = opts;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isColdStart =
        err?.message?.includes("Can't reach database") ||
        err?.message?.includes('connection pool') ||
        err?.message?.includes('ECONNREFUSED') ||
        err?.message?.includes('Timed out');
      if (!isColdStart || attempt >= retries) break;
      const delay = baseDelayMs * Math.pow(2, attempt); // 1s, 2s, 4s...
      console.warn(
        `[DB] Neon cold start, reintentando en ${delay}ms... (${attempt + 1}/${retries})`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

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

// Estadísticas del pool de conexiones (para monitoreo admin)
export async function getPoolStats() {
  try {
    const result = await prisma.$queryRaw<Array<{ state: string; count: number }>>`
      SELECT state, count(*) as count 
      FROM pg_stat_activity 
      WHERE datname = current_database()
      GROUP BY state;
    `;
    return result;
  } catch {
    return [];
  }
}
