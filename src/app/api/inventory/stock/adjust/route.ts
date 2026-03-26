import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/inventory/stock/adjust
 * Ajusta el stock de un ítem de inventario y registra el movimiento en el kardex
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { inventoryId, newStock, newMinStock, reason, userId } = body;

        if (!inventoryId || newStock === undefined) {
            return NextResponse.json(
                { success: false, error: 'inventoryId y newStock son requeridos' },
                { status: 400 }
            );
        }

        // Obtener el inventario actual
        const inventory = await prisma.inventory.findUnique({
            where: { id: inventoryId },
            include: { product: { select: { name: true } } },
        });

        if (!inventory) {
            return NextResponse.json({ success: false, error: 'Ítem de inventario no encontrado' }, { status: 404 });
        }

        const previousStock = inventory.currentStock;
        const difference = newStock - previousStock;

        // Actualizar inventario y crear movimiento en una transacción
        const [updatedInventory] = await prisma.$transaction([
            prisma.inventory.update({
                where: { id: inventoryId },
                data: {
                    currentStock: newStock,
                    minStock: newMinStock !== undefined ? newMinStock : inventory.minStock,
                    updatedAt: new Date(),
                },
            }),
            // Solo registrar movimiento si hay diferencia real en el stock
            ...(difference !== 0
                ? [prisma.stockMovement.create({
                    data: {
                        branchId: inventory.branchId,
                        productId: inventory.productId,
                        type: reason === 'MERMA' ? 'MERMA' : reason === 'ENTRADA' ? 'ENTRADA' : 'AJUSTE',
                        quantity: difference,
                        previousStock,
                        newStock,
                        notes: `Ajuste manual: ${reason || 'AJUSTE'}`,
                        createdBy: userId || 'system',
                        inventoryId,
                    },
                })]
                : []),
        ]);

        return NextResponse.json({ success: true, data: updatedInventory });
    } catch (error) {
        console.error('POST /api/inventory/stock/adjust:', error);
        return NextResponse.json({ success: false, error: 'Error al ajustar stock' }, { status: 500 });
    }
}
