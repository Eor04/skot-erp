import { NextRequest, NextResponse } from 'next/server';
import { requireBranchAccess } from '@/lib/branch-access';
import { OperationError, serializableTransaction } from '@/lib/transaction';
import { validateOrderQuantities } from '@/lib/internal-order-quantities';
import { moveTransferStock } from '@/lib/transfer-stock';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER']);
        if (access instanceof NextResponse) return access;
        const { items } = await request.json();
        const result = await serializableTransaction(async tx => {
            const order = await tx.internalOrder.findUnique({ where: { id: params.id }, include: { items: true } });
            if (!order) throw new OperationError('Pedido no encontrado', 404);
            if (!access.allowedBranchIds.includes(order.fromBranchId)) throw new OperationError('Sucursal de destino no permitida', 403);
            if (order.status !== 'DISPATCHED') throw new OperationError(`No se puede recibir un pedido en estado ${order.status}`, 409);
            const values = validateOrderQuantities(order.items, items, 'receivedQty', line => line.dispatchedQty ?? 0, false);
            for (const item of order.items) {
                const quantity = values.get(item.id)!;
                if (quantity > 0) await moveTransferStock(tx, { branchId: order.fromBranchId, productId: item.productId,
                    quantity, type: 'TRANSFERENCIA', reference: order.orderNumber, createdBy: access.userId,
                    notes: 'Recepción pedido interno ← Fábrica' });
                const difference = (item.dispatchedQty ?? 0) - quantity;
                if (difference > 0) await tx.mermaRecord.create({ data: { branchId: order.fromBranchId, productId: item.productId,
                    quantity: difference, unit: item.unit, reason: 'DIFERENCIA_RECEPCION',
                    description: `Diferencia en recepción de ${order.orderNumber}`, internalOrderId: order.id, registeredBy: access.userId } });
                await tx.internalOrderItem.update({ where: { id: item.id }, data: { receivedQty: quantity } });
            }
            return tx.internalOrder.update({ where: { id: order.id }, data: { status: 'RECEIVED', receivedBy: access.userId, receivedAt: new Date() } });
        });
        return NextResponse.json({ success: true, data: result, message: 'Recepción registrada. Inventario actualizado.' });
    } catch (error) {
        if (error instanceof OperationError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        console.error('Error recibiendo pedido:', error);
        return NextResponse.json({ success: false, error: 'No se pudo recibir el pedido' }, { status: 500 });
    }
}
