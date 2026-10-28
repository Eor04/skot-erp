// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';

// GET: Obtener sugerencias de reabastecimiento
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const access = await requireBranchAccess(request, branchId);
        if (access instanceof NextResponse) return access;
        const days = parseInt(searchParams.get('days') || '7');
        const coverageDays = parseInt(searchParams.get('coverageDays') || '7');

        if (!branchId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Campo requerido: branchId',
                },
                { status: 400 }
            );
        }

        // Obtener inventario actual de la sucursal
        const inventory = await prisma.inventory.findMany({
            where: {
                branchId,
                status: 'AVAILABLE',
            },
            include: {
                product: true,
            },
        });

        // Calcular sugerencias basadas en ventas
        const suggestions = await Promise.all(
            inventory.map(async (item) => {
                // Obtener movimientos de salida (ventas) de los últimos N días
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - days);

                const salesMovements = await prisma.stockMovement.findMany({
                    where: {
                        branchId,
                        productId: item.productId,
                        type: 'SALIDA',
                        createdAt: {
                            gte: startDate,
                        },
                    },
                });

                const totalSold = salesMovements.reduce(
                    (sum, mov) => sum + Math.abs(mov.quantity),
                    0
                );
                const dailyAverage = totalSold / days;
                const projectedUsage = dailyAverage * coverageDays;

                // Calcular cantidad sugerida
                const currentStock = item.currentStock;
                const minDesired = Math.max(item.minStock, projectedUsage);
                const suggestedQty = Math.max(0, minDesired - currentStock);

                // Solo incluir si necesita reabastecimiento
                if (suggestedQty > 0) {
                    return {
                        productId: item.productId,
                        productName: item.product.name,
                        productSku: item.product.sku,
                        currentStock,
                        minStock: item.minStock,
                        dailyAverage: Math.round(dailyAverage * 100) / 100,
                        projectedUsage: Math.round(projectedUsage * 100) / 100,
                        suggestedQty: Math.ceil(suggestedQty),
                        daysOfStock: dailyAverage > 0 ? Math.floor(currentStock / dailyAverage) : null,
                        priority:
                            currentStock <= item.minStock
                                ? 'ALTA'
                                : currentStock <= minDesired * 0.5
                                    ? 'MEDIA'
                                    : 'BAJA',
                    };
                }
                return null;
            })
        );

        // Filtrar nulls y ordenar por prioridad
        const validSuggestions = suggestions.filter((s) => s !== null);
        const priorityOrder: Record<string, number> = { ALTA: 1, MEDIA: 2, BAJA: 3 };
        validSuggestions.sort(
            (a: any, b: any) => priorityOrder[a.priority] - priorityOrder[b.priority]
        );

        return NextResponse.json({
            success: true,
            data: {
                suggestions: validSuggestions,
                summary: {
                    total: validSuggestions.length,
                    highPriority: validSuggestions.filter((s: any) => s.priority === 'ALTA').length,
                    mediumPriority: validSuggestions.filter((s: any) => s.priority === 'MEDIA').length,
                    lowPriority: validSuggestions.filter((s: any) => s.priority === 'BAJA').length,
                },
                parameters: {
                    analysisWindow: `${days} días`,
                    desiredCoverage: `${coverageDays} días`,
                },
            },
        });
    } catch (error) {
        console.error('Error al generar sugerencias:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Error al generar sugerencias',
            },
            { status: 500 }
        );
    }
}
