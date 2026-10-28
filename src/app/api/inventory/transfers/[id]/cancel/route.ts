import { NextRequest, NextResponse } from 'next/server';
import { requireBranchAccess } from '@/lib/branch-access';
import { serializableTransaction, OperationError } from '@/lib/transaction';

/** Cancelar devuelve al origen el stock que ya fue despachado. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER', 'WAREHOUSE']);
        if (access instanceof NextResponse) return access;
        const { reason } = await request.json().catch(() => ({}));
        const updated = await serializableTransaction(async tx => {
            const transfer = await tx.stockTransfer.findUnique({ where: { id: params.id }, include: { items: true } });
            if (!transfer) throw new OperationError('Transferencia no encontrada', 404);
            if (!access.allowedBranchIds.includes(transfer.fromBranchId)) throw new OperationError('Sucursal de origen no permitida', 403);
            if (!['PENDING', 'IN_TRANSIT'].includes(transfer.status)) throw new OperationError(`No se puede cancelar una transferencia en estado ${transfer.status}`);
            const dispatched = await tx.stockMovement.findFirst({ where: { transferId: transfer.id, type: 'TRANSFER_OUT' } });
            if (transfer.status === 'IN_TRANSIT' && dispatched) {
                for (const item of transfer.items) {
                    const inv = await tx.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: transfer.fromBranchId, productId: item.productId } } });
                    const after = await tx.inventory.update({ where: { id: inv.id }, data: { currentStock: { increment: item.requestedQty }, lastUpdated: new Date() } });
                    await tx.stockMovement.create({ data: {
                        branchId: transfer.fromBranchId, productId: item.productId, inventoryId: inv.id,
                        type: 'TRANSFER_RETURN', quantity: item.requestedQty, previousStock: inv.currentStock,
                        newStock: after.currentStock, transferId: transfer.id, reference: transfer.transferNumber,
                        createdBy: access.userId, notes: `Cancelación ${transfer.transferNumber}`,
                    } });
                }
            }
            return tx.stockTransfer.update({ where: { id: transfer.id }, data: { status: 'CANCELLED',
                notes: reason ? `${transfer.notes ? transfer.notes + ' | ' : ''}Cancelada: ${reason}` : transfer.notes } });
        });
        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        if (error instanceof OperationError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        console.error('Error al cancelar transferencia:', error);
        return NextResponse.json({ success: false, error: 'Error al cancelar transferencia' }, { status: 500 });
    }
}
