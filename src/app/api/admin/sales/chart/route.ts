// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/sales/chart
 * Datos de ventas agrupados por día para gráficos.
 * Query params: days (default 30), branchId (opcional)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '30');
        const branchId = searchParams.get('branchId');

        const today = new Date();
        const dayMap = new Map<string, { date: string; ventas: number; ingresos: number; burger: number; acai: number }>();
        
        // Generar los últimos 'days' días en zona horaria UTC-4 (Bolivia)
        for (let d = days - 1; d >= 0; d--) {
            const date = new Date(today.getTime() - d * 24 * 3600 * 1000 - 4 * 3600 * 1000);
            const key = date.toISOString().split('T')[0];
            dayMap.set(key, { date: key, ventas: 0, ingresos: 0, burger: 0, acai: 0 });
        }
        
        const firstKey = Array.from(dayMap.keys())[0];
        const startDate = new Date(`${firstKey}T00:00:00-04:00`);

        const where: any = {
            createdAt: { gte: startDate },
            deletedAt: null,
            ...(branchId && { branchId }),
        };

        // Ventas del período
        const sales = await prisma.sale.findMany({
            where,
            select: {
                totalAmount: true,
                paymentMethod: true,
                salesChannel: true,
                createdAt: true,
                branchId: true,
                branch: { select: { type: true } }
            },
            orderBy: { createdAt: 'asc' },
        });

        for (const sale of sales) {
            // Extraer la fecha local (UTC-4) de createdAt para que coincida con el gráfico
            const localDate = new Date(sale.createdAt.getTime() - 4 * 3600 * 1000);
            const key = localDate.toISOString().split('T')[0];
            
            const day = dayMap.get(key);
            if (day) {
                day.ventas++;
                day.ingresos += sale.totalAmount;
                const bType = sale.branch?.type || '';
                if (bType.includes('BURGUER') || bType.includes('BURGER')) day.burger += sale.totalAmount;
                else if (bType.includes('ACAI')) day.acai += sale.totalAmount;
            }
        }

        // Totales generales del período
        const totalRevenue = sales.reduce((s, x) => s + x.totalAmount, 0);
        const totalSales = sales.length;
        const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

        // Por canal
        const byChannel = sales.reduce((acc, s) => {
            const ch = s.salesChannel || 'OTRO';
            acc[ch] = (acc[ch] || 0) + s.totalAmount;
            return acc;
        }, {} as Record<string, number>);

        // Por método de pago
        const byPayment = sales.reduce((acc, s) => {
            const m = s.paymentMethod || 'OTRO';
            acc[m] = (acc[m] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return NextResponse.json({
            success: true,
            data: Array.from(dayMap.values()),
            summary: {
                totalRevenue,
                totalSales,
                avgTicket,
                byChannel: Object.entries(byChannel).map(([k, v]) => ({ channel: k, total: v })),
                byPayment: Object.entries(byPayment).map(([k, v]) => ({ method: k, count: v })),
            },
        });
    } catch (error) {
        console.error('GET /api/admin/sales/chart:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener datos de ventas' }, { status: 500 });
    }
}
