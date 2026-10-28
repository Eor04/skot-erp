import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export class OperationError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}

/** Reintenta conflictos de escritura; cada intento vuelve a leer el estado. */
export async function serializableTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
        try {
            return await prisma.$transaction(fn, {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                timeout: 15000,
                maxWait: 5000,
            });
        } catch (error: any) {
            if (error?.code !== 'P2034' || attempt >= 4) throw error;
            await new Promise(resolve => setTimeout(resolve, 30 * (attempt + 1)));
        }
    }
}
