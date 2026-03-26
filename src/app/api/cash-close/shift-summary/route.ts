import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/cash-close/shift-summary
 * Resumen de ventas del turno actual (desde openedAt hasta ahora).
 * Query params: branchId (requerido), from (ISO date, opcional; default = inicio del día)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const fromStr = searchParams.get('from');

        if (!branchId) {
            return NextResponse.json({ success: false, error: 'branchId es requerido' }, { status: 400 });
        }

        // Fecha de inicio del turno (o inicio del día si no se especifica)
        const startDate = fromStr ? new Date(fromStr) : (() => {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            return d;
        })();

        const sales = await prisma.sale.findMany({
            where: {
                branchId,
                deletedAt: null,
                createdAt: { gte: startDate },
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
            },
            orderBy: { createdAt: 'desc' },
        });

        // Calcular totales
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((s, v) => s + v.totalAmount, 0);
        const cashTotal = sales.reduce((s, v) => s + (v.cashAmount ?? (v.paymentMethod === 'CASH' ? v.totalAmount : 0)), 0);
        const cardTotal = sales.reduce((s, v) => s + (v.cardAmount ?? (v.paymentMethod === 'CARD' ? v.totalAmount : 0)), 0);
        const transferTotal = sales.reduce((s, v) => s + (v.transferAmount ?? (v.paymentMethod === 'TRANSFER' ? v.totalAmount : 0)), 0);
        const totalItems = totalSales; // 1 ticket = 1 transacción
        const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

        // Por método de pago (count)
        const byMethod = sales.reduce((acc, s) => {
            const m = s.paymentMethod || 'OTRO';
            acc[m] = (acc[m] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return NextResponse.json({
            success: true,
            data: {
                from: startDate.toISOString(),
                totalSales,
                totalRevenue,
                cashTotal,
                cardTotal,
                transferTotal,
                totalItems,
                avgTicket,
                byMethod,
                recentSales: sales.slice(0, 8).map(s => ({
                    saleNumber: s.saleNumber,
                    totalAmount: s.totalAmount,
                    paymentMethod: s.paymentMethod,
                    createdAt: s.createdAt,
                })),
            },
        });
    } catch (error) {
        console.error('GET /api/cash-close/shift-summary:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener resumen del turno' }, { status: 500 });
    }
}
