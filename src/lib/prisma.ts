/**
 * Alias de compatibilidad para @/lib/prisma
 * Re-exporta el cliente Prisma desde db.ts
 * Usado por los route handlers generados en conversaciones anteriores.
 */
export { prisma } from './db';
export { testConnection, disconnectDatabase, getPoolStats } from './db';
