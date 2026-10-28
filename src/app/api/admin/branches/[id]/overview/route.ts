// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** GET /api/admin/branches/[id]/overview — Resumen completo de una sucursal */
export async function GET(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [branch, allInventory, lastCashCloses, expensesMonth] = await Promise.all([
            prisma.branch.findUnique({
                where: { id },
                select: { id: true, name: true, type: true, address: true, phone: true, active: true },
            }),
            prisma.inventory.findMany({
                where: { branchId: id },
                include: { product: { select: { name: true, unit: true } } },
                orderBy: { currentStock: 'asc' },
            }),
            prisma.cashRegisterClose.findMany({
                where: { branchId: id },
                orderBy: { createdAt: 'desc' },
                take: 8,
                include: { user: { select: { name: true } } },
            }),
            prisma.expense.aggregate({
                where: { branchId: id, expenseDate: { gte: last30 } },
                _sum: { amount: true },
                _count: { id: true },
            }),
        ]);

        if (!branch) {
            return NextResponse.json({ success: false, error: 'Sucursal no encontrada' }, { status: 404 });
        }

        // Ventas: usar los campos reales del schema (totalAmount, saleNumber)
        const [todaySales, monthSales] = await Promise.all([
            prisma.sale.findMany({
                where: { branchId: id, createdAt: { gte: startOfDay } },
                select: { totalAmount: true, paymentMethod: true },
            }),
            prisma.sale.findMany({
                where: { branchId: id, createdAt: { gte: last30 } },
                select: { totalAmount: true },
            }),
        ]);

        const todayTotal = todaySales.reduce((s, v) => s + (v.totalAmount ?? 0), 0);
        const monthTotal = monthSales.reduce((s, v) => s + (v.totalAmount ?? 0), 0);

        const criticalItems = allInventory.filter(i => i.currentStock <= i.minStock);
        const criticalCount = allInventory.filter(i => i.currentStock <= 0).length;
        const lowCount = allInventory.filter(i => i.currentStock > 0 && i.currentStock <= i.minStock).length;

        return NextResponse.json({
            success: true,
            data: {
                branch,
                sales: {
                    today: { amount: todayTotal, count: todaySales.length },
                    month: { amount: monthTotal, count: monthSales.length },
                },
                stock: {
                    criticalCount,
                    lowCount,
                    totalItems: allInventory.length,
                    criticalItems: criticalItems.slice(0, 8).map(i => ({
                        name: i.product.name,
                        unit: i.product.unit,
                        current: i.currentStock,
                        min: i.minStock,
                    })),
                },
                cashCloses: lastCashCloses.map(c => ({
                    id: c.id,
                    createdAt: c.createdAt,
                    openedAt: (c as any).openedAt ?? null,
                    closedAt: (c as any).closedAt ?? c.createdAt,
                    sessionStatus: (c as any).sessionStatus ?? 'CLOSED',
                    user: c.user.name,
                    openedBy: (c as any).openedBy ?? c.user.name,
                    totalSales: c.totalSales,
                    actualCash: c.actualCash,
                    difference: c.difference,
                    notes: c.notes,
                })),
                expenses: {
                    month: { amount: expensesMonth._sum.amount ?? 0, count: expensesMonth._count.id },
                },
            },
        });
    } catch (error) {
        console.error('overview error:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener datos' }, { status: 500 });
    }
}
