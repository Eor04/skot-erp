import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/cash-close — Registrar cierre de caja
 * Calcula automáticamente los gastos del turno para descontarlos del efectivo esperado.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { branchId: bodyBranchId, userId, openingAmount, actualCash, notes, sessionId } = body;

        // Resolver sesión activa
        let activeSession: any = null;
        let branchId = bodyBranchId;

        if (sessionId) {
            activeSession = await prisma.cashRegisterClose.findUnique({ where: { id: sessionId } });
            if (activeSession) branchId = activeSession.branchId;
        } else if (branchId) {
            activeSession = await prisma.cashRegisterClose.findFirst({
                where: { branchId, sessionStatus: 'OPEN' },
            });
        }

        if (!branchId || !userId) {
            return NextResponse.json(
                { success: false, error: 'branchId y userId son requeridos' },
                { status: 400 }
            );
        }

        // Rango del turno: desde apertura de sesión (o inicio del día si no hay sesión)
        const today = new Date();
        const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today); endOfDay.setHours(23, 59, 59, 999);
        const salesFrom = activeSession?.openedAt ?? startOfDay;

        // ── 1. Ventas del turno ──────────────────────────────────────────────────
        const sales = await prisma.sale.findMany({
            where: { branchId, deletedAt: null, createdAt: { gte: salesFrom, lte: endOfDay } },
            select: { totalAmount: true, paymentMethod: true, cashAmount: true, cardAmount: true, transferAmount: true },
        });

        let totalSales = 0, cashSales = 0, cardSales = 0, transferSales = 0;
        for (const sale of sales) {
            totalSales += sale.totalAmount;
            if (sale.paymentMethod === 'CASH') cashSales += sale.totalAmount;
            else if (sale.paymentMethod === 'CARD') cardSales += sale.totalAmount;
            else if (sale.paymentMethod === 'TRANSFER') transferSales += sale.totalAmount;
            else if (sale.paymentMethod === 'MIXED') {
                cashSales += sale.cashAmount || 0;
                cardSales += sale.cardAmount || 0;
                transferSales += sale.transferAmount || 0;
            }
        }

        // ── 2. Gastos del turno ──────────────────────────────────────────────────
        // Separamos gastos pagados en EFECTIVO (afectan el conteo físico)
        // de los pagados con tarjeta/transferencia (no afectan el efectivo en caja)
        const expenseWhere = {
            branchId,
            expenseDate: { gte: salesFrom, lte: endOfDay },
        };

        const [allExpAgg, cashExpAgg] = await Promise.all([
            prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
            prisma.expense.aggregate({
                where: { ...expenseWhere, paymentMethod: 'CASH' },
                _sum: { amount: true },
            }),
        ]);
        const totalExpenses = allExpAgg._sum.amount ?? 0;
        const cashExpenses  = cashExpAgg._sum.amount ?? 0;

        // ── 3. Cálculos del cierre ───────────────────────────────────────────────
        const opening = parseFloat(openingAmount) || activeSession?.openingAmount || 0;
        const actual  = parseFloat(actualCash) || 0;

        // Efectivo esperado = fondo apertura + ventas cobradas en efectivo - gastos pagados en efectivo
        const expectedCash = opening + cashSales - cashExpenses;
        const difference   = actual - expectedCash;

        // Ingreso neto total (independiente del método de pago)
        const netCash  = totalSales - totalExpenses;
        const closedAt = new Date();

        const commonData = {
            user: { connect: { id: userId } },
            openingAmount: opening,
            expectedCash,
            actualCash: actual,
            difference,
            totalSales,
            cashSales,
            cardSales,
            transferSales,
            totalExpenses,
            netCash,
            notes: notes || null,
            closedAt,
            sessionStatus: 'CLOSED',
        };

        const include = {
            branch: { select: { name: true, type: true } },
            user: { select: { name: true } },
        };

        let cashClose;
        if (activeSession) {
            cashClose = await prisma.cashRegisterClose.update({
                where: { id: activeSession.id },
                data: commonData,
                include,
            });
        } else {
            cashClose = await prisma.cashRegisterClose.create({
                data: {
                    branch: { connect: { id: branchId } },
                    ...commonData,
                },
                include,
            });
        }

        // Devolver también el detalle de gastos para mostrarlo en el reporte
        const expensesDetail = await prisma.expense.findMany({
            where: {
                branchId,
                expenseDate: { gte: salesFrom, lte: endOfDay },
            },
            select: { id: true, description: true, amount: true, category: true, paymentMethod: true },
            orderBy: { expenseDate: 'asc' },
        });

        return NextResponse.json({ success: true, data: cashClose, expenses: expensesDetail }, { status: 201 });
    } catch (error) {
        console.error('Error POST /api/cash-close:', error);
        return NextResponse.json({ success: false, error: 'Error al registrar cierre de caja' }, { status: 500 });
    }
}

/**
 * GET /api/cash-close?branchId=xxx&limit=30 — Obtener cierres de caja
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const limit = parseInt(searchParams.get('limit') || '30');

        const cashCloses = await prisma.cashRegisterClose.findMany({
            where: branchId ? { branchId } : {},
            include: {
                branch: { select: { name: true, type: true } },
                user: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return NextResponse.json({ success: true, data: cashCloses });
    } catch (error) {
        console.error('Error GET /api/cash-close:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener cierres de caja' },
            { status: 500 }
        );
    }
}
