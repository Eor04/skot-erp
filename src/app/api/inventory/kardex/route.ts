// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';

/**
 * GET /api/inventory/kardex
 * Historial de movimientos de stock (Kardex)
 * Filtros: branchId, productId, type, from, to, limit
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const access = await requireBranchAccess(request, branchId);
        if (access instanceof NextResponse) return access;
        const productId = searchParams.get('productId');
        const type = searchParams.get('type');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const limit = parseInt(searchParams.get('limit') || '200');

        const where: any = {
            branchId: branchId || { in: access.allowedBranchIds },
            ...(productId && { productId }),
            ...(type && { type }),
            ...((from || to) && {
                createdAt: {
                    ...(from && { gte: new Date(from) }),
                    ...(to && { lte: new Date(to + 'T23:59:59') }),
                },
            }),
        };

        const movements = await prisma.stockMovement.findMany({
            where,
            include: {
                product: { select: { id: true, name: true, sku: true, unit: true } },
                branch: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        // Estadísticas resumidas
        const stats = await prisma.stockMovement.groupBy({
            by: ['type'],
            where,
            _sum: { quantity: true },
            _count: { id: true },
        });

        return NextResponse.json({
            success: true,
            data: movements,
            summary: {
                total: movements.length,
                byType: stats.map(s => ({ type: s.type, count: s._count.id, totalQty: s._sum.quantity ?? 0 })),
            },
        });
    } catch (error) {
        console.error('GET /api/inventory/kardex:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener kardex' }, { status: 500 });
    }
}
