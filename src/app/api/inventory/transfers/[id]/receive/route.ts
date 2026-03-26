import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/inventory/transfers/[id]/receive
 * Marca la transferencia como RECEIVED y acredita el stock en la sucursal destino.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json().catch(() => ({}));
        const receivedBy: string | undefined = body?.receivedBy;

        const transfer = await prisma.stockTransfer.findUnique({
            where: { id },
            include: { items: { include: { product: true } } },
        });

        if (!transfer) {
            return NextResponse.json({ success: false, error: 'Transferencia no encontrada' }, { status: 404 });
        }
        if (transfer.status !== 'IN_TRANSIT') {
            return NextResponse.json({ success: false, error: `No se puede recibir una transferencia en estado "${transfer.status}"` }, { status: 400 });
        }

        // Transacción: marcar como recibida y actualizar el inventario de la sucursal destino
        const updated = await prisma.$transaction(async (tx) => {
            // Acreditar stock en la sucursal destino para cada ítem
            for (const item of transfer.items) {
                const existing = await tx.inventory.findUnique({
                    where: { branchId_productId: { branchId: transfer.toBranchId, productId: item.productId } },
                });

                if (existing) {
                    await tx.inventory.update({
                        where: { branchId_productId: { branchId: transfer.toBranchId, productId: item.productId } },
                        data: { currentStock: { increment: item.requestedQty } },
                    });
                } else {
                    await tx.inventory.create({
                        data: {
                            branchId: transfer.toBranchId,
                            productId: item.productId,
                            currentStock: item.requestedQty,
                            minStock: 0,
                        },
                    });
                }

                // Registrar movimiento en el kardex
                await tx.stockMovement.create({
                    data: {
                        branchId: transfer.toBranchId,
                        productId: item.productId,
                        type: 'TRANSFER_IN',
                        quantity: item.requestedQty,
                        previousStock: existing?.currentStock ?? 0,
                        newStock: (existing?.currentStock ?? 0) + item.requestedQty,
                        notes: `Transferencia ${transfer.transferNumber} recibida`,
                        createdBy: receivedBy ?? 'sistema',
                    },
                });
            }

            // Marcar la transferencia como recibida
            return tx.stockTransfer.update({
                where: { id },
                data: {
                    status: 'RECEIVED',
                    receivedDate: new Date(),
                },
                include: {
                    fromBranch: { select: { name: true } },
                    toBranch: { select: { name: true } },
                    items: { include: { product: { select: { name: true } } } },
                },
            });
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
        console.error('Error PATCH /transfers/[id]/receive:', error);
        return NextResponse.json({ success: false, error: error.message || 'Error al recibir transferencia' }, { status: 500 });
    }
}
