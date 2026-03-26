import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/inventory/transfers/[id]/approve
 * Aprueba una transferencia pendiente → cambia status a IN_TRANSIT
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { approvedBy } = await request.json().catch(() => ({}));

        const transfer = await prisma.stockTransfer.findUnique({
            where: { id: params.id },
            include: { items: true },
        });

        if (!transfer) {
            return NextResponse.json({ success: false, error: 'Transferencia no encontrada' }, { status: 404 });
        }
        if (transfer.status !== 'PENDING') {
            return NextResponse.json({ success: false, error: `No se puede aprobar una transferencia en estado ${transfer.status}` }, { status: 400 });
        }

        const updated = await prisma.stockTransfer.update({
            where: { id: params.id },
            data: {
                status: 'IN_TRANSIT',
                approvedDate: new Date(),
                approvedBy: approvedBy || null,
            },
            include: {
                fromBranch: { select: { id: true, name: true } },
                toBranch: { select: { id: true, name: true } },
                items: { include: { product: { select: { id: true, name: true } } } },
            },
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error('Error PATCH /api/inventory/transfers/[id]/approve:', error);
        return NextResponse.json({ success: false, error: 'Error al aprobar transferencia' }, { status: 500 });
    }
}
