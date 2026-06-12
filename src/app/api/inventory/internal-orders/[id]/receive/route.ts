import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST: Recibir pedido interno (sucursal registra la recepción con posibles diferencias)
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { receivedBy, items } = body; // items: [{ itemId, receivedQty }]

        if (!receivedBy || !items?.length) {
            return NextResponse.json(
                { success: false, error: 'receivedBy e items requeridos' },
                { status: 400 }
            );
        }

        const order = await prisma.internalOrder.findUnique({
            where: { id: params.id },
            include: { items: { include: { product: true } }, fromBranch: true },
        });

        if (!order) {
            return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 });
        }

        const result = await prisma.$transaction(async (tx) => {
            for (const receiveItem of items) {
                const orderItem = order.items.find(i => i.id === receiveItem.itemId);
                if (!orderItem) continue;

                const qty = receiveItem.receivedQty;

                // Agregar stock a la sucursal receptora
                const existing = await tx.inventory.findUnique({
                    where: {
                        branchId_productId: {
                            branchId: order.fromBranchId,
                            productId: orderItem.productId,
                        },
                    },
                });

                if (existing) {
                    const updated = await tx.inventory.update({
                        where: {
                            branchId_productId: {
                                branchId: order.fromBranchId,
                                productId: orderItem.productId,
                            },
                        },
                        data: { currentStock: { increment: qty } },
                    });

                    await tx.stockMovement.create({
                        data: {
                            branchId: order.fromBranchId,
                            productId: orderItem.productId,
                            type: 'TRANSFERENCIA',
                            quantity: qty,
                            previousStock: existing.currentStock,
                            newStock: updated.currentStock,
                            reference: order.orderNumber,
                            notes: `Recepción pedido interno ← Fábrica`,
                            createdBy: receivedBy,
                        },
                    });
                } else {
                    // Crear registro de inventario si no existe
                    await tx.inventory.create({
                        data: {
                            branchId: order.fromBranchId,
                            productId: orderItem.productId,
                            currentStock: qty,
                            minStock: 0,
                        },
                    });

                    await tx.stockMovement.create({
                        data: {
                            branchId: order.fromBranchId,
                            productId: orderItem.productId,
                            type: 'TRANSFERENCIA',
                            quantity: qty,
                            previousStock: 0,
                            newStock: qty,
                            reference: order.orderNumber,
                            notes: `Recepción pedido interno ← Fábrica (Inicial)`,
                            createdBy: receivedBy,
                        },
                    });
                }

                // Si hay diferencia respecto a lo despachado → crear merma en fábrica
                const diff = (orderItem.dispatchedQty || 0) - qty;
                if (diff > 0) {
                    await tx.mermaRecord.create({
                        data: {
                            branchId: order.fromBranchId,
                            productId: orderItem.productId,
                            quantity: diff,
                            unit: orderItem.unit,
                            reason: 'DIFERENCIA_RECEPCION',
                            description: `Diferencia en recepción de ${order.orderNumber}`,
                            internalOrderId: order.id,
                            registeredBy: receivedBy,
                        },
                    });
                }

                await tx.internalOrderItem.update({
                    where: { id: receiveItem.itemId },
                    data: { receivedQty: qty },
                });
            }

            return tx.internalOrder.update({
                where: { id: params.id },
                data: {
                    status: 'RECEIVED',
                    receivedBy,
                    receivedAt: new Date(),
                },
            });
        });

        return NextResponse.json({
            success: true,
            data: result,
            message: 'Recepción registrada. Inventario actualizado.',
        });
    } catch (error) {
        console.error('Error recibiendo pedido:', error);
        return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
    }
}
