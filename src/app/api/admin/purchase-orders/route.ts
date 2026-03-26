import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/purchase-orders
 * Lista pedidos a proveedores con filtros opcionales.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50');

        const orders = await prisma.purchaseOrder.findMany({
            where: {
                ...(branchId && { branchId }),
                ...(status && { status: status as any }),
                deletedAt: null,
            },
            include: {
                branch: { select: { id: true, name: true } },
                user: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true, unit: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return NextResponse.json({ success: true, data: orders });
    } catch (error) {
        console.error('GET /api/admin/purchase-orders:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener pedidos' }, { status: 500 });
    }
}

/**
 * POST /api/admin/purchase-orders
 * Crear nuevo pedido a proveedor.
 * Body: { branchId, userId, supplier, expectedDate?, notes?, items: [{ productId, quantity, unitCost }] }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { branchId, userId, supplier, expectedDate, notes, items } = body;

        if (!branchId || !userId || !supplier || !items?.length) {
            return NextResponse.json(
                { success: false, error: 'Faltan campos: branchId, userId, supplier, items' },
                { status: 400 }
            );
        }

        // Calcular total
        const totalAmount = items.reduce((s: number, i: any) => s + (i.quantity * i.unitCost), 0);

        // Generar número de orden
        const count = await prisma.purchaseOrder.count();
        const orderNumber = `PO-${String(count + 1).padStart(5, '0')}`;

        const order = await prisma.purchaseOrder.create({
            data: {
                orderNumber,
                branchId,
                userId,
                supplier,
                totalAmount,
                expectedDate: expectedDate ? new Date(expectedDate) : null,
                notes: notes || null,
                status: 'PENDING',
                items: {
                    create: items.map((i: any) => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        unitCost: i.unitCost,
                        subtotal: i.quantity * i.unitCost,
                    })),
                },
            },
            include: {
                branch: { select: { id: true, name: true } },
                user: { select: { id: true, name: true } },
                items: { include: { product: { select: { name: true, unit: true } } } },
            },
        });

        return NextResponse.json({ success: true, data: order }, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/admin/purchase-orders:', error);
        // Si el modelo no existe aún en el schema
        if (error.code === 'P2021' || error.message?.includes('does not exist')) {
            return NextResponse.json({
                success: false,
                error: 'El modelo PurchaseOrder no está en el schema. Ejecutá: npx prisma db push',
            }, { status: 500 });
        }
        return NextResponse.json({ success: false, error: error.message || 'Error al crear pedido' }, { status: 500 });
    }
}
