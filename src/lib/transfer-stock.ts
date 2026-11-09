import { Prisma } from '@prisma/client';
import { OperationError } from './transaction';

/** Movimiento de un producto dentro de una transacción serializable del documento. */
export async function moveTransferStock(tx: Prisma.TransactionClient, input: {
    branchId: string; productId: string; quantity: number; type: string; reference: string;
    createdBy: string; notes: string; transferId?: string;
}) {
    if (!Number.isFinite(input.quantity) || input.quantity === 0) throw new OperationError('Cantidad de movimiento inválida');
    const key = { branchId: input.branchId, productId: input.productId };
    const previous = await tx.inventory.findUnique({ where: { branchId_productId: key } });
    if (input.quantity < 0 && (!previous || previous.currentStock < -input.quantity)) throw new OperationError('Stock insuficiente en el origen');
    const updated = await tx.inventory.upsert({ where: { branchId_productId: key },
        create: { ...key, currentStock: input.quantity, minStock: 0 },
        update: { currentStock: { increment: input.quantity }, lastUpdated: new Date() } });
    await tx.stockMovement.create({ data: { ...key, inventoryId: updated.id, quantity: input.quantity,
        type: input.type, reference: input.reference, transferId: input.transferId,
        previousStock: previous?.currentStock ?? 0, newStock: updated.currentStock,
        createdBy: input.createdBy, notes: input.notes } });
}
