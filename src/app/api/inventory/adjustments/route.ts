import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/inventory/adjustments
 * Ajuste directo de stock (entrada, salida o corrección).
 * Body: { branchId, productId, type, quantity, reason, createdBy }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { branchId, productId, type, quantity, reason, createdBy } = body;

        if (!branchId || !productId || !type || !quantity || !createdBy) {
            return NextResponse.json(
                { success: false, error: 'Faltan campos requeridos: branchId, productId, type, quantity, createdBy' },
                { status: 400 }
            );
        }

        if (!['ENTRADA', 'SALIDA', 'AJUSTE'].includes(type)) {
            return NextResponse.json(
                { success: false, error: 'Tipo debe ser ENTRADA, SALIDA o AJUSTE' },
                { status: 400 }
            );
        }

        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty === 0) {
            return NextResponse.json(
                { success: false, error: 'La cantidad debe ser un número distinto de cero' },
                { status: 400 }
            );
        }

        // Buscar inventario actual
        const inventory = await prisma.inventory.findUnique({
            where: { branchId_productId: { branchId, productId } },
        });

        const previousStock = inventory?.currentStock ?? 0;
        let newStock: number;

        if (type === 'AJUSTE') {
            // Corrección: qty es el stock nuevo absoluto
            newStock = qty;
        } else if (type === 'ENTRADA') {
            newStock = previousStock + Math.abs(qty);
        } else {
            // SALIDA
            newStock = previousStock - Math.abs(qty);
            if (newStock < 0) {
                return NextResponse.json(
                    { success: false, error: `Stock insuficiente. Actual: ${previousStock}, solicitado: ${Math.abs(qty)}` },
                    { status: 400 }
                );
            }
        }

        const movementQty = type === 'AJUSTE' ? newStock - previousStock : (type === 'ENTRADA' ? Math.abs(qty) : -Math.abs(qty));

        // Transacción atómica: actualizar inventario + crear movimiento kardex
        const result = await prisma.$transaction(async (tx) => {
            // Upsert del inventario
            const inv = await tx.inventory.upsert({
                where: { branchId_productId: { branchId, productId } },
                create: {
                    branchId,
                    productId,
                    currentStock: newStock,
                    minStock: 0,
                    lastUpdated: new Date(),
                },
                update: {
                    currentStock: newStock,
                    lastUpdated: new Date(),
                },
            });

            // Kardex
            const movement = await tx.stockMovement.create({
                data: {
                    branchId,
                    productId,
                    inventoryId: inv.id,
                    type: type as any,
                    quantity: movementQty,
                    previousStock,
                    newStock,
                    reference: `ADJ-${Date.now()}`,
                    notes: reason || 'Ajuste manual de stock',
                    createdBy,
                },
                include: {
                    product: { select: { name: true, unit: true } },
                    branch: { select: { name: true } },
                },
            });

            return { inventory: inv, movement };
        });

        return NextResponse.json({
            success: true,
            data: result,
            message: `Stock ajustado: ${previousStock} → ${newStock}`,
        }, { status: 201 });
    } catch (error) {
        console.error('POST /api/inventory/adjustments:', error);
        return NextResponse.json({ success: false, error: 'Error al ajustar el stock' }, { status: 500 });
    }
}

/**
 * GET /api/inventory/adjustments
 * Lista los últimos ajustes manuales (tipo AJUSTE).
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const limit = parseInt(searchParams.get('limit') || '50');

        const movements = await prisma.stockMovement.findMany({
            where: {
                type: { in: ['ENTRADA', 'SALIDA', 'AJUSTE'] },
                reference: { startsWith: 'ADJ-' },
                ...(branchId && { branchId }),
            },
            include: {
                product: { select: { id: true, name: true, sku: true, unit: true } },
                branch: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return NextResponse.json({ success: true, data: movements });
    } catch (error) {
        console.error('GET /api/inventory/adjustments:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener ajustes' }, { status: 500 });
    }
}
