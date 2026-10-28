// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/cash-closes?branchId=&from=&to=&limit=
 * Devuelve historial de cierres de caja con filtros, para el panel admin.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const limit = parseInt(searchParams.get('limit') || '50');

        const where: any = {};
        if (branchId) where.branchId = branchId;
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(`${from}T00:00:00-04:00`);
            if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999-04:00`);
        }

        const closes = await prisma.cashRegisterClose.findMany({
            where,
            include: {
                branch: { select: { id: true, name: true, type: true } },
                user:   { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        // Totales del período filtrado
        const closed = closes.filter(c => c.sessionStatus === 'CLOSED');
        const totalSales    = closed.reduce((s, c) => s + (c.totalSales ?? 0), 0);
        const totalCash     = closed.reduce((s, c) => s + (c.cashSales ?? 0), 0);
        const totalCard     = closed.reduce((s, c) => s + (c.cardSales ?? 0), 0);
        const totalTransfer = closed.reduce((s, c) => s + (c.transferSales ?? 0), 0);
        const totalExpenses = closed.reduce((s, c) => s + ((c as any).totalExpenses ?? 0), 0);
        const totalNet      = closed.reduce((s, c) => s + ((c as any).netCash ?? (c.totalSales ?? 0)), 0);

        return NextResponse.json({
            success: true,
            data: closes,
            summary: {
                totalSessions:  closes.length,
                closedSessions: closed.length,
                openSessions:   closes.length - closed.length,
                totalSales,
                totalCash,
                totalCard,
                totalTransfer,
                totalExpenses,
                totalNet,
            },
        });
    } catch (error) {
        console.error('Error GET /api/admin/cash-closes:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener cierres' }, { status: 500 });
    }
}
