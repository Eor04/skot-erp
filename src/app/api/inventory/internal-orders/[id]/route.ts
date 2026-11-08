import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';

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
        const order = await prisma.internalOrder.findUnique({ where: { id: params.id }, select: { fromBranchId: true, status: true } });
        if (!order) return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 });
        if (!access.allowedBranchIds.includes(order.fromBranchId)) {
            return NextResponse.json({ success: false, error: 'No tienes permisos para este pedido' }, { status: 403 });
        }
        if (order.status !== 'PENDING') {
            return NextResponse.json({ success: false, error: 'Solo se puede reasignar un pedido pendiente' }, { status: 400 });
        }
        const factory = await prisma.branch.findFirst({
            where: { id: toBranchId, type: 'FABRICA', active: true, deletedAt: null },
            select: { id: true },
        });
        if (!factory) return NextResponse.json({ success: false, error: 'Seleccioná una fábrica activa' }, { status: 400 });

        const result = await prisma.internalOrder.update({
            where: { id: params.id },
            data: { toBranchId },
            include: {
                toBranch: { select: { id: true, name: true, type: true } },
            },
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('Error en PATCH /internal-orders:', error);
        return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
    }
}
