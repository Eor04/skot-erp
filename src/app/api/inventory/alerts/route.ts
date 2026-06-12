import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/prisma';

// GET: Obtener alertas de stock activas
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');

        // 1. Obtener todo el inventario disponible con sus productos
        const allInventory = await withRetry(() => prisma.inventory.findMany({
            where: {
                ...(branchId && { branchId }),
                status: 'AVAILABLE',
            },
            include: {
                product: { select: { id: true, name: true, sku: true, unit: true } },
                branch: { select: { id: true, name: true } },
            },
        }));

        // 2. Filtrar items con stock bajo
        const lowStockItems = allInventory.filter(
            (item) => item.minStock !== null && item.currentStock <= item.minStock
        );

        // 3. Obtener movimientos de SALIDA de todos los productos de stock bajo
        //    en una SOLA query (evita el N+1 del código anterior)
        let movementsMap: Map<string, number> = new Map();
        if (lowStockItems.length > 0) {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const movements = await withRetry(() => prisma.stockMovement.findMany({
                where: {
                    productId: { in: lowStockItems.map(i => i.productId) },
                    ...(branchId && { branchId }),
                    type: 'SALIDA',
                    createdAt: { gte: sevenDaysAgo },
                },
                select: { productId: true, quantity: true, branchId: true },
            }));

            // Agrupar por productId+branchId
            for (const mov of movements) {
                const key = `${mov.branchId}_${mov.productId}`;
                movementsMap.set(key, (movementsMap.get(key) ?? 0) + Math.abs(mov.quantity));
            }
        }

        const alertsWithPrediction = lowStockItems.map((item) => {
            const key = `${item.branchId}_${item.productId}`;
            const totalSold = movementsMap.get(key) ?? 0;
            const dailyAverage = totalSold / 7;
            const daysRemaining = dailyAverage > 0 ? Math.floor(item.currentStock / dailyAverage) : null;

            return {
                ...item,
                dailyAverage,
                daysRemaining,
                severity:
                    item.currentStock <= 0
                        ? 'CRITICO'
                        : daysRemaining !== null && daysRemaining <= 2
                            ? 'ALTO'
                            : 'MEDIO',
            };
        });

        // 4. Productos próximos a vencer (30 días) — query ligera
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringItems = await prisma.inventory.findMany({
            where: {
                ...(branchId && { branchId }),
                expirationDate: { lte: thirtyDaysFromNow, gte: new Date() },
            },
            include: {
                product: { select: { id: true, name: true, sku: true, unit: true } },
                branch: { select: { id: true, name: true } },
            },
        });

        // 5. Pedidos internos pendientes
        const pendingOrders = await prisma.internalOrder.findMany({
            where: {
                status: 'PENDING',
                ...(branchId && { toBranchId: branchId }),
            },
            include: {
                fromBranch: { select: { name: true } },
                toBranch: { select: { name: true } },
            },
        });

        // 6. Transferencias pendientes entre sucursales
        const pendingTransfers = await prisma.stockTransfer.findMany({
            where: {
                status: 'PENDING',
                ...(branchId && { fromBranchId: branchId }),
            },
            include: {
                fromBranch: { select: { name: true } },
                toBranch: { select: { name: true } },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                lowStock: alertsWithPrediction,
                expiringSoon: expiringItems,
                pendingOrders: pendingOrders,
                pendingTransfers: pendingTransfers,
                summary: {
                    totalLowStock: lowStockItems.length,
                    totalExpiring: expiringItems.length,
                    critical: alertsWithPrediction.filter((a) => a.severity === 'CRITICO').length,
                    totalPendingOrders: pendingOrders.length,
                    totalPendingTransfers: pendingTransfers.length,
                },
            },
        });
    } catch (error) {
        console.error('Error al obtener alertas:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener alertas' },
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
                { success: false, error: 'Faltan campos requeridos: branchId, productId, alertType' },
                { status: 400 }
            );
        }

        const alert = await prisma.stockAlert.create({
            data: { branchId, productId, alertType, threshold, emailEnabled: emailEnabled ?? true },
            include: { product: true, branch: true },
        });

        return NextResponse.json(
            { success: true, data: alert, message: 'Alerta configurada exitosamente' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error al crear alerta:', error);
        return NextResponse.json(
            { success: false, error: 'Error al crear alerta' },
            { status: 500 }
        );
    }
}
