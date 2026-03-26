import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/expenses
 * Historial de gastos con filtros: branchId, from, to, category, limit
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const category = searchParams.get('category');
        const limit = parseInt(searchParams.get('limit') || '100');

        const where: any = {
            ...(branchId && { branchId }),
            ...(category && { category }),
            ...(from || to) && {
                expenseDate: {
                    ...(from && { gte: new Date(from) }),
                    ...(to && { lte: new Date(to + 'T23:59:59') }),
                },
            },
        };

        const [expenses, total] = await Promise.all([
            prisma.expense.findMany({
                where,
                include: { branch: { select: { id: true, name: true } } },
                orderBy: { expenseDate: 'desc' },
                take: limit,
            }),
            prisma.expense.aggregate({
                where,
                _sum: { amount: true },
                _count: { id: true },
            }),
        ]);

        // Totales por categoría
        const byCategory = await prisma.expense.groupBy({
            by: ['category'],
            where,
            _sum: { amount: true },
            _count: { id: true },
        });

        // Totales por método de pago
        const byPayment = await prisma.expense.groupBy({
            by: ['paymentMethod'],
            where,
            _sum: { amount: true },
        });

        return NextResponse.json({
            success: true,
            data: expenses,
            summary: {
                totalAmount: total._sum.amount ?? 0,
                totalRecords: total._count.id,
                byCategory: byCategory.map(c => ({ category: c.category, total: c._sum.amount ?? 0, count: c._count.id })),
                byPayment: byPayment.map(p => ({ method: p.paymentMethod, total: p._sum.amount ?? 0 })),
            },
        });
    } catch (error) {
        console.error('GET /api/admin/expenses:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener gastos' }, { status: 500 });
    }
}
