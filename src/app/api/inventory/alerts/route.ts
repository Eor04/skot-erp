import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Obtener alertas de stock activas
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');

        // Obtener todo el inventario disponible y filtrar por stock bajo
        const allInventory = await prisma.inventory.findMany({
            where: {
                ...(branchId && { branchId }),
                status: 'AVAILABLE',
            },
            include: {
                product: true,
                branch: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Filtrar los que tienen stock bajo (currentStock <= minStock)
        const lowStockItems = allInventory.filter(
            (item) => item.minStock !== null && item.currentStock <= item.minStock
        );

        // Calcular días restantes aproximados (basado en ventas promedio últimos 7 días)
        const alertsWithPrediction = await Promise.all(
            lowStockItems.map(async (item) => {
                // Obtener movimientos de salida de los últimos 7 días
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const recentMovements = await prisma.stockMovement.findMany({
                    where: {
                        branchId: item.branchId,
                        productId: item.productId,
                        type: 'SALIDA',
                        createdAt: {
                            gte: sevenDaysAgo,
                        },
                    },
                });

                const totalSold = recentMovements.reduce((sum, mov) => sum + Math.abs(mov.quantity), 0);
                const dailyAverage = totalSold / 7;
                const daysRemaining = dailyAverage > 0 ? Math.floor(item.currentStock / dailyAverage) : null;

                return {
                    ...item,
                    dailyAverage,
                    daysRemaining,
                    severity:
                        item.currentStock <= 0
                            ? 'CRITICO'
                            : daysRemaining && daysRemaining <= 2
                                ? 'ALTO'
                                : 'MEDIO',
                };
            })
        );

        // Productos próximos a vencer (30 días)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringItems = await prisma.inventory.findMany({
            where: {
                ...(branchId && { branchId }),
                expirationDate: {
                    lte: thirtyDaysFromNow,
                    gte: new Date(),
                },
            },
            include: {
                product: true,
                branch: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                lowStock: alertsWithPrediction,
                expiringSoon: expiringItems,
                summary: {
                    totalLowStock: lowStockItems.length,
                    totalExpiring: expiringItems.length,
                    critical: alertsWithPrediction.filter((a) => a.severity === 'CRITICO').length,
                },
            },
        });
    } catch (error) {
        console.error('Error al obtener alertas:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Error al obtener alertas',
            },
            { status: 500 }
        );
    }
}

// POST: Configurar nueva alerta personalizada
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { branchId, productId, alertType, threshold, emailEnabled } = body;

        if (!branchId || !productId || !alertType) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Faltan campos requeridos: branchId, productId, alertType',
                },
                { status: 400 }
            );
        }

        const alert = await prisma.stockAlert.create({
            data: {
                branchId,
                productId,
                alertType,
                threshold,
                emailEnabled: emailEnabled !== undefined ? emailEnabled : true,
            },
            include: {
                product: true,
                branch: true,
            },
        });

        return NextResponse.json(
            {
                success: true,
                data: alert,
                message: 'Alerta configurada exitosamente',
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error al crear alerta:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Error al crear alerta',
            },
            { status: 500 }
        );
    }
}
