import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/cash-closes/[id]
 * Devuelve el detalle completo de un cierre: gastos y ventas del turno.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await prisma.cashRegisterClose.findUnique({
            where: { id: params.id },
            include: {
                branch: { select: { id: true, name: true } },
                user:   { select: { id: true, name: true } },
            },
        });

        if (!session) {
            return NextResponse.json({ success: false, error: 'Sesión no encontrada' }, { status: 404 });
        }

        // Rango del turno
        const from = session.openedAt ?? session.createdAt;
        const to   = session.closedAt ?? new Date();

        // Ventas del turno
        const sales = await prisma.sale.findMany({
            where: {
                branchId:  session.branchId,
                deletedAt: null,
                createdAt: { gte: from, lte: to },
            },
            select: {
                id: true,
                saleNumber: true,
                totalAmount: true,
                paymentMethod: true,
                cashAmount: true,
                cardAmount: true,
                transferAmount: true,
                createdAt: true,
                items: {
                    select: {
                        quantity: true,
                        unitPrice: true,
                        product: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        // Gastos del turno
        const expenses = await prisma.expense.findMany({
            where: {
                branchId:    session.branchId,
                expenseDate: { gte: from, lte: to },
            },
            select: {
                id: true,
                description: true,
                amount: true,
                category: true,
                paymentMethod: true,
                supplier: true,
                expenseDate: true,
            },
            orderBy: { expenseDate: 'asc' },
        });

        return NextResponse.json({
            success: true,
            data: {
                session,
                sales,
                expenses,
                totals: {
                    salesCount:    sales.length,
                    totalExpenses: expenses.reduce((s, e) => s + e.amount, 0),
                    cashExpenses:  expenses.filter(e => e.paymentMethod === 'CASH').reduce((s, e) => s + e.amount, 0),
                },
            },
        });
    } catch (error) {
        console.error('Error GET /api/admin/cash-closes/[id]:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener detalle' }, { status: 500 });
    }
}
