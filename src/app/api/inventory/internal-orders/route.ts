import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Listar pedidos internos
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const status = searchParams.get('status');

        const where: any = {};
        if (branchId) where.OR = [{ fromBranchId: branchId }, { toBranchId: branchId }];
        if (status) where.status = status;

        const orders = await prisma.internalOrder.findMany({
            where,
            include: {
                fromBranch: { select: { id: true, name: true, type: true } },
                toBranch: { select: { id: true, name: true, type: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true, unit: true } },
                    },
                },
                _count: { select: { items: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ success: true, data: orders });
    } catch (error) {
        console.error('Error listando pedidos internos:', error);
        return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
    }
}

// POST: Crear nuevo pedido interno
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { fromBranchId, toBranchId, requestedBy, items, notes } = body;

        if (!fromBranchId || !toBranchId || !requestedBy || !items?.length) {
            return NextResponse.json(
                { success: false, error: 'Faltan campos: fromBranchId, toBranchId, requestedBy, items' },
                { status: 400 }
            );
        }

        // Generar número de pedido secuencial
        const year = new Date().getFullYear();
        const count = await prisma.internalOrder.count({
            where: { orderNumber: { startsWith: `PI-${year}-` } },
        });
        const orderNumber = `PI-${year}-${String(count + 1).padStart(4, '0')}`;

        const order = await prisma.internalOrder.create({
            data: {
                orderNumber,
                fromBranchId,
                toBranchId,
                requestedBy,
                notes,
                items: {
                    create: items.map((item: any) => ({
                        productId: item.productId,
                        requestedQty: item.requestedQty,
                        unit: item.unit || 'unit',
                        notes: item.notes,
                    })),
                },
            },
            include: {
                fromBranch: { select: { id: true, name: true } },
                toBranch: { select: { id: true, name: true } },
                items: { include: { product: { select: { name: true, sku: true } } } },
            },
        });

        return NextResponse.json({ success: true, data: order }, { status: 201 });
    } catch (error) {
        console.error('Error creando pedido interno:', error);
        return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
    }
}
