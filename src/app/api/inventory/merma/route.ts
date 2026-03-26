import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Historial de mermas
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const limit = parseInt(searchParams.get('limit') || '50');

        const mermas = await prisma.mermaRecord.findMany({
            where: branchId ? { branchId } : {},
            include: {
                branch: { select: { id: true, name: true } },
                product: { select: { id: true, name: true, sku: true, unit: true } },
                internalOrder: { select: { orderNumber: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return NextResponse.json({ success: true, data: mermas });
    } catch (error) {
        console.error('Error listando mermas:', error);
        return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
    }
}

// POST: Registrar merma manual (reduce stock y crea registro)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { branchId, productId, quantity, reason, description, registeredBy } = body;

        if (!branchId || !productId || !quantity || !reason || !registeredBy) {
            return NextResponse.json(
                { success: false, error: 'Faltan campos: branchId, productId, quantity, reason, registeredBy' },
                { status: 400 }
            );
        }

        const result = await prisma.$transaction(async (tx) => {
            // Verificar stock actual
            const inventory = await tx.inventory.findUnique({
                where: { branchId_productId: { branchId, productId } },
            });

            if (!inventory) throw new Error('Producto no encontrado en inventario de esta sucursal');
            if (inventory.currentStock < quantity) {
                throw new Error(`Stock insuficiente. Disponible: ${inventory.currentStock}`);
            }

            // Actualizar stock
            const updated = await tx.inventory.update({
                where: { branchId_productId: { branchId, productId } },
                data: { currentStock: { decrement: quantity } },
            });

            // Registrar en kardex
            await tx.stockMovement.create({
                data: {
                    branchId,
                    productId,
                    type: 'MERMA',
                    quantity: -quantity,
                    previousStock: inventory.currentStock,
                    newStock: updated.currentStock,
                    notes: `Merma: ${reason}${description ? ` — ${description}` : ''}`,
                    createdBy: registeredBy,
                },
            });

            // Registrar en tabla de mermas
            const merma = await tx.mermaRecord.create({
                data: {
                    branchId,
                    productId,
                    quantity,
                    unit: inventory ? 'unit' : 'unit',
                    reason,
                    description,
                    registeredBy,
                },
                include: {
                    branch: { select: { name: true } },
                    product: { select: { name: true, sku: true } },
                },
            });

            return merma;
        });

        return NextResponse.json({
            success: true,
            data: result,
            message: `Merma de ${quantity} unidades registrada y stock actualizado`,
        }, { status: 201 });
    } catch (error: any) {
        console.error('Error registrando merma:', error);
        return NextResponse.json({ success: false, error: error.message || 'Error interno' }, { status: 500 });
    }
}
