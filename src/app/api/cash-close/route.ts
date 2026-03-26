import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/cash-close — Registrar cierre de caja (cierra sesión activa o crea nuevo registro)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { branchId: bodyBranchId, userId, openingAmount, actualCash, notes, sessionId } = body;

        // Si viene sessionId, usar ese; si no, buscar la sesión activa de la sucursal
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

        // Obtener las ventas del día de la sucursal
        const today = new Date();
        const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today); endOfDay.setHours(23, 59, 59, 999);

        // Si hay sesión abierta, contar ventas desde que se abrió
        const salesFrom = activeSession?.openedAt ?? startOfDay;

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

        const opening = parseFloat(openingAmount) || activeSession?.openingAmount || 0;
        const actual = parseFloat(actualCash) || 0;
        const expectedCash = opening + cashSales;
        const difference = actual - expectedCash;
        const closedAt = new Date();

        let cashClose;
        if (activeSession) {
            // Actualizar la sesión abierta
            cashClose = await prisma.cashRegisterClose.update({
                where: { id: activeSession.id },
                data: {
                    userId,
                    openingAmount: opening,
                    expectedCash,
                    actualCash: actual,
                    difference,
                    totalSales,
                    cashSales,
                    cardSales,
                    transferSales,
                    notes: notes || null,
                    closedAt,
                    sessionStatus: 'CLOSED',
                },
                include: {
                    branch: { select: { name: true } },
                    user: { select: { name: true } },
                },
            });
        } else {
            // No había sesión abierta: crear nuevo registro
            cashClose = await prisma.cashRegisterClose.create({
                data: {
                    branchId, userId,
                    openingAmount: opening,
                    expectedCash,
                    actualCash: actual,
                    difference,
                    totalSales, cashSales, cardSales, transferSales,
                    notes: notes || null,
                    closedAt,
                    sessionStatus: 'CLOSED',
                },
                include: {
                    branch: { select: { name: true } },
                    user: { select: { name: true } },
                },
            });
        }

        return NextResponse.json({ success: true, data: cashClose }, { status: 201 });
    } catch (error) {
        console.error('Error POST /api/cash-close:', error);
        return NextResponse.json({ success: false, error: 'Error al registrar cierre de caja' }, { status: 500 });
    }
}


/**
 * GET /api/cash-close?branchId=xxx — Obtener cierres de caja
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const limit = parseInt(searchParams.get('limit') || '30');

        const cashCloses = await prisma.cashRegisterClose.findMany({
            where: branchId ? { branchId } : {},
            include: {
                branch: { select: { name: true } },
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
