import { NextRequest, NextResponse } from 'next/server';
import { requireBranchAccess } from '@/lib/branch-access';
import { serializableTransaction, OperationError } from '@/lib/transaction';
import { moveTransferStock } from '@/lib/transfer-stock';

/** Despachar: descontar el origen y marcar IN_TRANSIT en una sola transacción. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER', 'WAREHOUSE']);
        if (access instanceof NextResponse) return access;
        const updated = await serializableTransaction(async tx => {
            const transfer = await tx.stockTransfer.findUnique({ where: { id: params.id }, include: { items: true } });
            if (!transfer) throw new OperationError('Transferencia no encontrada', 404);
            if (!access.allowedBranchIds.includes(transfer.fromBranchId)) throw new OperationError('Sucursal de origen no permitida', 403);
            if (transfer.status !== 'PENDING') throw new OperationError(`No se puede aprobar una transferencia en estado ${transfer.status}`);
            for (const item of transfer.items) {
                if (!Number.isFinite(item.requestedQty) || item.requestedQty <= 0) throw new OperationError('Cantidad de transferencia inválida');
                await moveTransferStock(tx, { branchId: transfer.fromBranchId, productId: item.productId,
                    quantity: -item.requestedQty, type: 'TRANSFER_OUT', transferId: transfer.id,
                    reference: transfer.transferNumber, createdBy: access.userId, notes: `Despacho ${transfer.transferNumber}` });
            }
            return tx.stockTransfer.update({ where: { id: transfer.id }, data: { status: 'IN_TRANSIT', approvedDate: new Date(), approvedBy: access.userId },
                include: { fromBranch: { select: { id: true, name: true } }, toBranch: { select: { id: true, name: true } }, items: { include: { product: { select: { id: true, name: true } } } } } });
        });
        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        if (error instanceof OperationError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        console.error('Error al despachar transferencia:', error);
        return NextResponse.json({ success: false, error: 'Error al aprobar transferencia' }, { status: 500 });
    }
}
