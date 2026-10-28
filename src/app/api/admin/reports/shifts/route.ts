// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/reports/shifts?from=&to=&branchId=
 * Retorna detalle de cada sesión/turno de caja del período
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId') || undefined;
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to + 'T23:59:59') : new Date();

        const sessions = await prisma.cashRegisterClose.findMany({
            where: {
                createdAt: { gte: fromDate, lte: toDate },
                ...(branchId && { branchId }),
            },
            include: {
                user: { select: { id: true, name: true } },
                branch: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const data = sessions.map((s) => {
            const durationHours =
                s.openedAt && s.closedAt
                    ? Math.round(((s.closedAt.getTime() - s.openedAt.getTime()) / 3_600_000) * 10) / 10
                    : null;

            return {
                sessionId: s.id,
                cashierName: s.user.name,
                branchName: s.branch.name,
                openedAt: s.openedAt?.toISOString() ?? null,
                closedAt: s.closedAt?.toISOString() ?? null,
                durationHours,
                sessionStatus: s.sessionStatus,
                openingCash: s.openingAmount,
                actualCash: s.actualCash,
                expectedCash: s.expectedCash,
                difference: s.difference,
                totalSales: s.totalSales,
                cashSales: s.cashSales,
                cardSales: s.cardSales,
                transferSales: s.transferSales,
                notes: s.notes ?? '',
            };
        });

        const summary = {
            totalSessions: data.length,
            totalRevenue: data.reduce((s, d) => s + d.totalSales, 0),
            avgDurationHours:
                data.filter(d => d.durationHours !== null).length > 0
                    ? Math.round(
                          (data.reduce((s, d) => s + (d.durationHours ?? 0), 0) /
                              data.filter(d => d.durationHours !== null).length) *
                              10
                      ) / 10
                    : 0,
            sessionsWithDifference: data.filter(d => Math.abs(d.difference) > 0).length,
        };

        return NextResponse.json({ success: true, data, summary });
    } catch (error) {
        console.error('Error GET /api/admin/reports/shifts:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener reporte' }, { status: 500 });
    }
}
