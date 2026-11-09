// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';

// GET: Listar pedidos internos
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const access = await requireBranchAccess(request, branchId);
        if (access instanceof NextResponse) return access;
        const status = searchParams.get('status');

        const where: any = { AND: [{ OR: [{ fromBranchId: { in: access.allowedBranchIds } }, { toBranchId: { in: access.allowedBranchIds } }] }] };
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

        const toBranchIds = [...new Set(orders.map((o: any) => o.toBranchId))];
        const productIds = [...new Set(orders.flatMap((o: any) => o.items.map((i: any) => i.product.id)))];

        const inventories = await prisma.inventory.findMany({
            where: { branchId: { in: toBranchIds }, productId: { in: productIds } },
        });

        const data = orders.map((order: any) => ({
            ...order,
            items: order.items.map((item: any) => {
                const inv = inventories.find(i => i.branchId === order.toBranchId && i.productId === item.product.id);
                return {
                    ...item,
                    currentFactoryStock: inv?.currentStock || 0,
                };
            }),
        }));

        return NextResponse.json({ success: true, data });
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

        if (!fromBranchId || !toBranchId || typeof requestedBy !== 'string' || !requestedBy.trim() || !Array.isArray(items) || !items.length) {
            return NextResponse.json(
                { success: false, error: 'Faltan campos: fromBranchId, toBranchId, requestedBy, items' },
                { status: 400 }
            );
        }

        const access = await requireBranchAccess(request, fromBranchId);
        if (access instanceof NextResponse) return access;
        if (items.some((item: any) => !item || typeof item.productId !== 'string' || !item.productId ||
            !Number.isFinite(item.requestedQty) || item.requestedQty <= 0) ||
            new Set(items.map((item: any) => item.productId)).size !== items.length) {
            return NextResponse.json({ success: false, error: 'Revisa los productos y cantidades del pedido' }, { status: 400 });
        }
        const products = await prisma.product.findMany({ where: { id: { in: items.map((item: any) => item.productId) }, active: true, deletedAt: null }, select: { id: true, unit: true } });
        if (products.length !== items.length) return NextResponse.json({ success: false, error: 'Hay productos no disponibles' }, { status: 400 });
        const units = new Map(products.map(product => [product.id, product.unit]));
        const source = await prisma.branch.findFirst({
            where: { id: fromBranchId, type: { not: 'FABRICA' }, active: true, deletedAt: null },
            select: { id: true },
        });
        if (!source) {
            return NextResponse.json({ success: false, error: 'Seleccioná una sucursal solicitante activa' }, { status: 400 });
        }
        if (fromBranchId === toBranchId) {
            return NextResponse.json({ success: false, error: 'La sucursal solicitante y la fábrica deben ser diferentes' }, { status: 400 });
        }
        const factory = await prisma.branch.findFirst({
            where: { id: toBranchId, type: 'FABRICA', active: true, deletedAt: null },
            select: { id: true },
        });
        if (!factory) {
            return NextResponse.json({ success: false, error: 'Seleccioná una fábrica activa' }, { status: 400 });
        }

        // Generar número de pedido secuencial
        const year = new Date().getFullYear();
        let order: any = null;
        for (let attempt = 0; attempt < 5; attempt++) {
            const last = await prisma.internalOrder.findFirst({ where: { orderNumber: { startsWith: `PI-${year}-` } },
                orderBy: { orderNumber: 'desc' }, select: { orderNumber: true } });
            const next = last ? Number(last.orderNumber.split('-').pop()) + 1 : 1;
            if (!Number.isSafeInteger(next) || next <= 0) throw new Error('Numeración de pedidos inválida');
            const orderNumber = `PI-${year}-${String(next).padStart(4, '0')}`;
            try {
                order = await prisma.internalOrder.create({
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
                        unit: units.get(item.productId)!,
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
                break;
            } catch (error: any) {
                if (error?.code === 'P2002' && attempt < 4) continue;
                throw error;
            }
        }

        return NextResponse.json({ success: true, data: order }, { status: 201 });
    } catch (error) {
        console.error('Error creando pedido interno:', error);
        return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
    }
}
