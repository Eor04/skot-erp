// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/factory/summary
 * Resumen de KPIs del módulo de fábrica para el dashboard.
 */
export async function GET() {
    try {
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const [
            activeOrders,
            pendingOrders,
            scheduledOrders,
            activeRecipes,
            todayOrders,
            recentOrders,
        ] = await Promise.all([
            // Órdenes activas (IN_PROGRESS)
            prisma.productionOrder.count({
                where: { status: 'IN_PROGRESS' },
            }),
            // Órdenes pendientes (DRAFT + SCHEDULED)
            prisma.productionOrder.count({
                where: { status: { in: ['DRAFT', 'SCHEDULED'] } },
            }),
            // Órdenes completadas hoy
            prisma.productionOrder.count({
                where: {
                    status: 'COMPLETED',
                    completedAt: { gte: startOfToday },
                },
            }),
            // Recetas activas
            prisma.recipe.count({ where: { active: true } }),
            // Producción total de hoy (suma de actualYield)
            prisma.productionOrder.aggregate({
                where: {
                    status: 'COMPLETED',
                    completedAt: { gte: startOfToday },
                },
                _sum: { actualYield: true },
            }),
            // Órdenes recientes (últimas 5)
            prisma.productionOrder.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: {
                    recipe: { select: { name: true } },
                    branch: { select: { name: true } },
                },
            }),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                activeOrders,
                pendingOrders,
                scheduledOrders,
                completedToday: scheduledOrders,
                activeRecipes,
                productionToday: todayOrders._sum.actualYield ?? 0,
                recentOrders: recentOrders.map(o => ({
                    id: o.id,
                    orderNumber: o.orderNumber,
                    recipeName: o.recipe.name,
                    branchName: o.branch.name,
                    status: o.status,
                    plannedYield: o.plannedYield,
                    actualYield: o.actualYield,
                    createdAt: o.createdAt,
                })),
            },
        });
    } catch (error) {
        console.error('GET /api/factory/summary:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener resumen' }, { status: 500 });
    }
}
