import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST: Aprobar o cancelar un pedido interno
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { approvedBy, items, status } = body;
        // status puede ser 'APPROVED' (default) o 'CANCELLED'
        const newStatus = status === 'CANCELLED' ? 'CANCELLED' : 'APPROVED';

        if (!approvedBy) {
            return NextResponse.json({ success: false, error: 'approvedBy requerido' }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Actualizar cantidades aprobadas en cada ítem si se proveen
            if (items?.length && newStatus === 'APPROVED') {
                await Promise.all(
                    items.map((item: { itemId: string; approvedQty: number }) =>
                        tx.internalOrderItem.update({
                            where: { id: item.itemId },
                            data: { approvedQty: item.approvedQty },
                        })
                    )
                );
            }

            return tx.internalOrder.update({
                where: { id: params.id },
                data: {
                    status: newStatus as any,
                    approvedBy,
                    approvedAt: new Date(),
                },
                include: {
                    items: { include: { product: { select: { name: true, unit: true } } } },
                    fromBranch: { select: { name: true } },
                    toBranch: { select: { name: true } },
                },
            });
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('Error en /approve:', error);
        return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
    }
}

