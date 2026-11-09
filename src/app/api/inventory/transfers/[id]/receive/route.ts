import { NextRequest, NextResponse } from 'next/server';
import { requireBranchAccess } from '@/lib/branch-access';
import { serializableTransaction, OperationError } from '@/lib/transaction';
import { moveTransferStock } from '@/lib/transfer-stock';

/** Acreditar el destino una sola vez, incluso con recepciones simultáneas. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER']);
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
                    await moveTransferStock(tx, { branchId: transfer.fromBranchId, productId: item.productId,
                        quantity: -item.requestedQty, type: 'TRANSFER_OUT', transferId: transfer.id,
                        reference: transfer.transferNumber, createdBy: access.userId, notes: `Despacho pendiente ${transfer.transferNumber}` });
                }
            }
            for (const item of transfer.items) {
                await moveTransferStock(tx, { branchId: transfer.toBranchId, productId: item.productId,
                    quantity: item.requestedQty, type: 'TRANSFER_IN', transferId: transfer.id,
                    reference: transfer.transferNumber, createdBy: access.userId, notes: `Transferencia ${transfer.transferNumber} recibida` });
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
