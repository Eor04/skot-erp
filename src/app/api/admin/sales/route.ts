import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/sales — Historial de ventas con filtros
 * Query params: branchId, from, to, userId, paymentMethod, limit, offset
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const userId = searchParams.get('userId');
        const paymentMethod = searchParams.get('paymentMethod');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const where: any = { deletedAt: null };

        if (branchId) where.branchId = branchId;
        if (userId) where.userId = userId;
        if (paymentMethod) where.paymentMethod = paymentMethod;
        if (from || to) {
            where.createdAt = {};
            // Append local time strings to prevent UTC shift
            if (from) where.createdAt.gte = new Date(`${from}T00:00:00.000`);
            if (to) {
                where.createdAt.lte = new Date(`${to}T23:59:59.999`);
            }
        }

        const [sales, total] = await Promise.all([
            prisma.sale.findMany({
                where,
                include: {
                    branch: { select: { name: true, type: true } },
                    user: { select: { name: true } },
                    items: {
                        include: {
                            product: { select: { name: true, type: true } },
                            modifiers: { include: { modifier: { select: { name: true } } } },
                        },
                    },
                    discounts: true,
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.sale.count({ where }),
        ]);

        // Resumen de totales
        const totals = await prisma.sale.aggregate({
            where,
            _sum: { totalAmount: true, cashAmount: true, cardAmount: true, transferAmount: true },
            _count: true,
        });

        return NextResponse.json({
            success: true,
            data: sales,
            pagination: { total, limit, offset, hasMore: offset + limit < total },
            summary: {
                totalSales: totals._count,
                totalAmount: totals._sum.totalAmount || 0,
                cashTotal: totals._sum.cashAmount || 0,
                cardTotal: totals._sum.cardAmount || 0,
                transferTotal: totals._sum.transferAmount || 0,
            },
        });
    } catch (error) {
        console.error('Error GET /api/admin/sales:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener ventas' },
            { status: 500 }
        );
    }
}
