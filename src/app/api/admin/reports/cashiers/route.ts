// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/reports/cashiers?from=&to=&branchId=
 * Retorna métricas de ventas agrupadas por cajero en el período
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId') || undefined;
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to + 'T23:59:59') : new Date();

        // Traer ventas del período con datos del usuario
        const sales = await prisma.sale.findMany({
            where: {
                deletedAt: null,
                createdAt: { gte: fromDate, lte: toDate },
                ...(branchId && { branchId }),
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                branch: { select: { id: true, name: true } },
            },
        });

        // Traer sesiones de caja (turnos) del período
        const cashSessions = await prisma.cashRegisterClose.findMany({
            where: {
                createdAt: { gte: fromDate, lte: toDate },
                ...(branchId && { branchId }),
            },
            include: {
                user: { select: { id: true, name: true } },
            },
        });

        // Agrupar ventas por cajero
        const byUser = new Map<string, {
            userId: string;
            userName: string;
            totalSales: number;
            totalRevenue: number;
            cashAmount: number;
            cardAmount: number;
            transferAmount: number;
            sessionsCount: number;
            totalHours: number;
        }>();

        for (const sale of sales) {
            const uid = sale.user.id;
            if (!byUser.has(uid)) {
                byUser.set(uid, {
                    userId: uid,
                    userName: sale.user.name,
                    totalSales: 0,
                    totalRevenue: 0,
                    cashAmount: 0,
                    cardAmount: 0,
                    transferAmount: 0,
                    sessionsCount: 0,
                    totalHours: 0,
                });
            }
            const row = byUser.get(uid)!;
            row.totalSales += 1;
            row.totalRevenue += sale.totalAmount;
            row.cashAmount += sale.cashAmount ?? (sale.paymentMethod === 'CASH' ? sale.totalAmount : 0);
            row.cardAmount += sale.cardAmount ?? (sale.paymentMethod === 'CARD' ? sale.totalAmount : 0);
            row.transferAmount += sale.transferAmount ?? (sale.paymentMethod === 'TRANSFER' ? sale.totalAmount : 0);
        }

        // Agregar datos de sesiones de caja
        for (const session of cashSessions) {
            const uid = session.userId;
            if (!byUser.has(uid)) continue;
            const row = byUser.get(uid)!;
            row.sessionsCount += 1;
            if (session.openedAt && session.closedAt) {
                const hours = (session.closedAt.getTime() - session.openedAt.getTime()) / 3_600_000;
                row.totalHours += hours;
            }
        }

        const data = Array.from(byUser.values())
            .map(r => ({
                ...r,
                avgTicket: r.totalSales > 0 ? r.totalRevenue / r.totalSales : 0,
                totalHours: Math.round(r.totalHours * 10) / 10,
                totalRevenue: Math.round(r.totalRevenue * 100) / 100,
            }))
            .sort((a, b) => b.totalRevenue - a.totalRevenue);

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error GET /api/admin/reports/cashiers:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener reporte' }, { status: 500 });
    }
}
