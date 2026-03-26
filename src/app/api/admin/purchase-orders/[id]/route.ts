import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOrManager } from '@/lib/require-role';

/**
 * PATCH /api/admin/purchase-orders/[id]
 * Actualiza el estado de un pedido (SENT, RECEIVED, CANCELLED)
 * Body: { status, receivedDate?, notes? }
 *
 * Si status === 'RECEIVED': actualiza items.receivedQty y puede ajustar stock.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Solo ADMIN y MANAGER pueden actualizar pedidos
        const authCheck = await requireAdminOrManager(request);
        if (authCheck instanceof NextResponse) return authCheck;

        const body = await request.json();
        const { status, receivedDate, notes, itemsReceived } = body;
        // itemsReceived: [{ id: purchaseOrderItemId, receivedQty: number }]

        if (!status) {
            return NextResponse.json(
                { success: false, error: 'status es requerido' },
                { status: 400 }
            );
        }

        const existing = await prisma.purchaseOrder.findUnique({
            where: { id: params.id },
            include: { items: true },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 });
        }

        // Actualizar el pedido
        const updated = await prisma.$transaction(async (tx) => {
            // Actualizar items recibidos si se proporcionan
            if (itemsReceived?.length) {
                for (const ir of itemsReceived) {
                    await tx.purchaseOrderItem.update({
                        where: { id: ir.id },
                        data: { receivedQty: ir.receivedQty },
                    });
                }
            }

            // Si el pedido es RECEIVED, actualizar stock de los items
            if (status === 'RECEIVED') {
                const items = itemsReceived?.length
                    ? existing.items.map(i => ({
                        ...i,
                        receivedQty: itemsReceived.find((ir: any) => ir.id === i.id)?.receivedQty ?? i.receivedQty,
                    }))
                    : existing.items;

                for (const item of items) {
                    const qty = (item as any).receivedQty || item.quantity;
                    if (qty <= 0) continue;

                    // Buscar inventario existente en la sucursal
                    const inv = await tx.inventory.findFirst({
                        where: { branchId: existing.branchId, productId: item.productId },
                    });

                    if (inv) {
                        // Actualizar stock existente
                        await tx.inventory.update({
                            where: { id: inv.id },
                            data: { currentStock: { increment: qty }, lastUpdated: new Date() },
                        });
                    } else {
                        // Crear nueva entrada de inventario
                        await tx.inventory.create({
                            data: {
                                branchId: existing.branchId,
                                productId: item.productId,
                                currentStock: qty,
                                minStock: 0,
                                lastUpdated: new Date(),
                            },
                        });
                    }

                    // Registrar movimiento en kardex
                    const prevStock = inv?.currentStock ?? 0;
                    await tx.stockMovement.create({
                        data: {
                            branchId:      existing.branchId,
                            productId:     item.productId,
                            type:          'IN',
                            quantity:      qty,
                            previousStock: prevStock,
                            newStock:      prevStock + qty,
                            notes:         `Recepción pedido ${existing.orderNumber}`,
                            reference:     existing.id,
                            createdBy:     existing.userId,
                        },
                    });
                }
            }

            // Actualizar el pedido
            return tx.purchaseOrder.update({
                where: { id: params.id },
                data: {
                    status: status as any,
                    ...(receivedDate ? { receivedDate: new Date(receivedDate) } : {}),
                    ...(notes !== undefined ? { notes } : {}),
                },
                include: {
                    branch: { select: { id: true, name: true } },
                    user: { select: { id: true, name: true } },
                    items: { include: { product: { select: { name: true, unit: true } } } },
                },
            });
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
        console.error('PATCH /api/admin/purchase-orders/[id]:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Error al actualizar pedido' },
            { status: 500 }
        );
    }
}
