import { NextRequest, NextResponse } from 'next/server';
import { requireBranchAccess } from '@/lib/branch-access';
import { OperationError, serializableTransaction } from '@/lib/transaction';
import { validateOrderQuantities } from '@/lib/internal-order-quantities';
import { moveTransferStock } from '@/lib/transfer-stock';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER', 'WAREHOUSE']);
        if (access instanceof NextResponse) return access;
        const { items } = await request.json();
        const result = await serializableTransaction(async tx => {
            const order = await tx.internalOrder.findUnique({ where: { id: params.id }, include: { items: true, fromBranch: true } });
            if (!order) throw new OperationError('Pedido no encontrado', 404);
            if (!access.allowedBranchIds.includes(order.toBranchId)) throw new OperationError('Fábrica no permitida', 403);
            if (order.status !== 'APPROVED') throw new OperationError(`No se puede despachar un pedido en estado ${order.status}`, 409);
            const values = validateOrderQuantities(order.items, items, 'dispatchedQty', line => line.approvedQty ?? line.requestedQty, true);
            for (const item of order.items) {
                const quantity = values.get(item.id)!;
                if (quantity > 0) await moveTransferStock(tx, { branchId: order.toBranchId, productId: item.productId,
                    quantity: -quantity, type: 'TRANSFERENCIA', reference: order.orderNumber, createdBy: access.userId,
                    notes: `Despacho pedido interno → ${order.fromBranch.name}` });
                await tx.internalOrderItem.update({ where: { id: item.id }, data: { dispatchedQty: quantity } });
            }
            return tx.internalOrder.update({ where: { id: order.id }, data: { status: 'DISPATCHED', dispatchedBy: access.userId, dispatchedAt: new Date() } });
        });
        return NextResponse.json({ success: true, data: result, message: 'Pedido despachado correctamente' });
    } catch (error) {
        if (error instanceof OperationError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        console.error('Error despachando pedido:', error);
        return NextResponse.json({ success: false, error: 'No se pudo despachar el pedido' }, { status: 500 });
    }
}
