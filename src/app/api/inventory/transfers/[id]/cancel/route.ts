import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/inventory/transfers/[id]/cancel
 * Cancela una transferencia pendiente → status CANCELLED
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { reason } = await request.json().catch(() => ({}));

        const transfer = await prisma.stockTransfer.findUnique({ where: { id: params.id } });

        if (!transfer) {
            return NextResponse.json({ success: false, error: 'Transferencia no encontrada' }, { status: 404 });
        }
        if (transfer.status === 'RECEIVED') {
            return NextResponse.json({ success: false, error: 'No se puede cancelar una transferencia ya recibida' }, { status: 400 });
        }

        const updated = await prisma.stockTransfer.update({
            where: { id: params.id },
            data: {
                status: 'CANCELLED',
                notes: reason
                    ? `${transfer.notes ? transfer.notes + ' | ' : ''}Cancelada: ${reason}`
                    : transfer.notes,
            },
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error('Error PATCH /api/inventory/transfers/[id]/cancel:', error);
        return NextResponse.json({ success: false, error: 'Error al cancelar transferencia' }, { status: 500 });
    }
}
