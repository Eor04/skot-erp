import { NextRequest, NextResponse } from 'next/server';
import { requireBranchAccess } from '@/lib/branch-access';
import { OperationError, serializableTransaction } from '@/lib/transaction';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { toBranchId } = body;

        if (!toBranchId) {
            return NextResponse.json({ success: false, error: 'toBranchId requerido' }, { status: 400 });
        }

        const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER']);
        if (access instanceof NextResponse) return access;
        const result = await serializableTransaction(async tx => {
            const order = await tx.internalOrder.findUnique({ where: { id: params.id }, select: { fromBranchId: true, status: true } });
            if (!order) throw new OperationError('Pedido no encontrado', 404);
            if (!access.allowedBranchIds.includes(order.fromBranchId)) throw new OperationError('No tienes permisos para este pedido', 403);
            if (order.status !== 'PENDING') throw new OperationError('Solo se puede reasignar un pedido pendiente', 409);
            const factory = await tx.branch.findFirst({ where: { id: toBranchId, type: 'FABRICA', active: true, deletedAt: null }, select: { id: true } });
            if (!factory) throw new OperationError('Seleccioná una fábrica activa');
            return tx.internalOrder.update({ where: { id: params.id }, data: { toBranchId },
                include: { toBranch: { select: { id: true, name: true, type: true } } } });
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        if (error instanceof OperationError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        console.error('Error en PATCH /internal-orders:', error);
        return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
    }
}
