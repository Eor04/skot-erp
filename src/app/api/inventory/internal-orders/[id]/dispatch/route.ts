import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST: Despachar pedido interno (fábrica envía el stock y descuenta inventario)
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { dispatchedBy, items } = body; // items: [{ itemId, dispatchedQty }]

        if (!dispatchedBy || !items?.length) {
            return NextResponse.json(
                { success: false, error: 'dispatchedBy e items requeridos' },
                { status: 400 }
            );
        }

        const order = await prisma.internalOrder.findUnique({
            where: { id: params.id },
            include: {
                items: { include: { product: true } },
                fromBranch: true,
                toBranch: true,
            },
        });

        if (!order) {
            return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 });
        }

        const result = await prisma.$transaction(async (tx) => {
            for (const dispatchItem of items) {
                const orderItem = order.items.find(i => i.id === dispatchItem.itemId);
                if (!orderItem) continue;

                const qty = dispatchItem.dispatchedQty;

                // Descontar stock de la fábrica (toBranch es la fábrica en un pedido desde sucursal)
                const inventory = await tx.inventory.findUnique({
                    where: {
                        branchId_productId: {
                            branchId: order.toBranchId,
                            productId: orderItem.productId,
                        },
                    },
                });

                if (inventory && inventory.currentStock >= qty) {
                    const updated = await tx.inventory.update({
                        where: {
                            branchId_productId: {
                                branchId: order.toBranchId,
                                productId: orderItem.productId,
                            },
                        },
                        data: { currentStock: { decrement: qty } },
                    });

                    // Registrar movimiento de kardex (salida de fábrica)
                    await tx.stockMovement.create({
                        data: {
                            branchId: order.toBranchId,
                            productId: orderItem.productId,
                            type: 'TRANSFERENCIA',
                            quantity: -qty,
                            previousStock: inventory.currentStock,
                            newStock: updated.currentStock,
                            reference: order.orderNumber,
                            notes: `Despacho pedido interno → ${order.fromBranch.name}`,
                            createdBy: dispatchedBy,
                        },
                    });
                }

                // Actualizar ítem con qty despachada
                await tx.internalOrderItem.update({
                    where: { id: dispatchItem.itemId },
                    data: { dispatchedQty: qty },
                });
            }

            return tx.internalOrder.update({
                where: { id: params.id },
                data: {
                    status: 'DISPATCHED',
                    dispatchedBy,
                    dispatchedAt: new Date(),
                },
            });
        });

        return NextResponse.json({ success: true, data: result, message: 'Pedido despachado correctamente' });
    } catch (error) {
        console.error('Error despachando pedido:', error);
        return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
    }
}
