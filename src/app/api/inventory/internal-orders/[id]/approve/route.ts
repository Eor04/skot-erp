import { NextRequest, NextResponse } from 'next/server';
import { requireBranchAccess } from '@/lib/branch-access';
import { OperationError, serializableTransaction } from '@/lib/transaction';
import { validateOrderQuantities } from '@/lib/internal-order-quantities';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER', 'WAREHOUSE']);
        if (access instanceof NextResponse) return access;
        const { status = 'APPROVED', items } = await request.json();
        if (!['APPROVED', 'CANCELLED'].includes(status)) throw new OperationError('Acción inválida');
        const result = await serializableTransaction(async tx => {
            const order = await tx.internalOrder.findUnique({ where: { id: params.id }, include: { items: true } });
            if (!order) throw new OperationError('Pedido no encontrado', 404);
            if (!access.allowedBranchIds.includes(order.toBranchId)) throw new OperationError('Fábrica no permitida', 403);
            if (order.status !== 'PENDING') throw new OperationError(`No se puede procesar un pedido en estado ${order.status}`, 409);
            if (status === 'APPROVED') {
                const values = validateOrderQuantities(order.items,
                    items ?? order.items.map(i => ({ itemId: i.id, approvedQty: i.requestedQty })),
                    'approvedQty', line => line.requestedQty, true);
                for (const item of order.items) await tx.internalOrderItem.update({ where: { id: item.id }, data: { approvedQty: values.get(item.id)! } });
            }
            return tx.internalOrder.update({ where: { id: order.id }, data: { status, approvedBy: access.userId, approvedAt: new Date() },
                include: { items: { include: { product: { select: { name: true, unit: true } } } },
                    fromBranch: { select: { name: true } }, toBranch: { select: { name: true } } } });
        });
        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        if (error instanceof OperationError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        console.error('Error al aprobar pedido interno:', error);
        return NextResponse.json({ success: false, error: 'No se pudo procesar el pedido' }, { status: 500 });
    }
}
