import { NextRequest, NextResponse } from 'next/server';
import { requireBranchAccess } from '@/lib/branch-access';
import { serializableTransaction, OperationError } from '@/lib/transaction';

/** Acreditar el destino una sola vez, incluso con recepciones simultáneas. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER', 'WAREHOUSE']);
        if (access instanceof NextResponse) return access;
        const updated = await serializableTransaction(async tx => {
            const transfer = await tx.stockTransfer.findUnique({ where: { id: params.id }, include: { items: true } });
            if (!transfer) throw new OperationError('Transferencia no encontrada', 404);
            if (!access.allowedBranchIds.includes(transfer.toBranchId)) throw new OperationError('Sucursal de destino no permitida', 403);
            if (transfer.status !== 'IN_TRANSIT') throw new OperationError(`No se puede recibir una transferencia en estado ${transfer.status}`);
            // Compatibilidad con transferencias en tránsito aprobadas antes de esta corrección.
            const dispatched = await tx.stockMovement.findFirst({ where: { transferId: transfer.id, type: 'TRANSFER_OUT' } });
            if (!dispatched) {
                for (const item of transfer.items) {
                    if (!Number.isFinite(item.requestedQty) || item.requestedQty <= 0) throw new OperationError('Cantidad de transferencia inválida');
                    const inv = await tx.inventory.findUnique({ where: { branchId_productId: { branchId: transfer.fromBranchId, productId: item.productId } } });
                    if (!inv || inv.currentStock < item.requestedQty) throw new OperationError('Stock insuficiente en el origen del despacho pendiente');
                    const after = await tx.inventory.update({ where: { id: inv.id }, data: { currentStock: { decrement: item.requestedQty }, lastUpdated: new Date() } });
                    await tx.stockMovement.create({ data: {
                        branchId: transfer.fromBranchId, productId: item.productId, inventoryId: inv.id,
                        type: 'TRANSFER_OUT', quantity: -item.requestedQty, previousStock: inv.currentStock,
                        newStock: after.currentStock, transferId: transfer.id, reference: transfer.transferNumber,
                        createdBy: access.userId, notes: `Despacho pendiente ${transfer.transferNumber}`,
                    } });
                }
            }
            for (const item of transfer.items) {
                const key = { branchId: transfer.toBranchId, productId: item.productId };
                const inv = await tx.inventory.findUnique({ where: { branchId_productId: key } });
                const after = await tx.inventory.upsert({ where: { branchId_productId: key },
                    create: { ...key, currentStock: item.requestedQty, minStock: 0 },
                    update: { currentStock: { increment: item.requestedQty }, lastUpdated: new Date() } });
                await tx.stockMovement.create({ data: {
                    ...key, inventoryId: after.id, type: 'TRANSFER_IN', quantity: item.requestedQty,
                    previousStock: inv?.currentStock ?? 0, newStock: after.currentStock,
                    transferId: transfer.id, reference: transfer.transferNumber, createdBy: access.userId,
                    notes: `Transferencia ${transfer.transferNumber} recibida`,
                } });
                await tx.stockTransferItem.update({ where: { id: item.id }, data: { receivedQty: item.requestedQty } });
            }
            return tx.stockTransfer.update({ where: { id: transfer.id }, data: { status: 'RECEIVED', receivedDate: new Date(), receivedBy: access.userId },
                include: { fromBranch: { select: { name: true } }, toBranch: { select: { name: true } }, items: { include: { product: { select: { name: true } } } } } });
        });
        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        if (error instanceof OperationError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        console.error('Error al recibir transferencia:', error);
        return NextResponse.json({ success: false, error: 'Error al recibir transferencia' }, { status: 500 });
    }
}
