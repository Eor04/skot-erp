// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';

// GET: Obtener historial de movimientos (Kardex)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const access = await requireBranchAccess(request, branchId);
        if (access instanceof NextResponse) return access;
        const productId = searchParams.get('productId');
        const type = searchParams.get('type');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const movements = await prisma.stockMovement.findMany({
            where: {
                branchId: branchId || { in: access.allowedBranchIds },
                ...(productId && { productId }),
                ...(type && { type }),
                ...(startDate && { createdAt: { gte: new Date(startDate) } }),
                ...(endDate && { createdAt: { lte: new Date(endDate) } }),
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        unit: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Calcular totales
        const totals = movements.reduce(
            (acc, mov) => {
                if (mov.quantity > 0) {
                    acc.totalEntradas += mov.quantity;
                } else {
                    acc.totalSalidas += Math.abs(mov.quantity);
                }
                return acc;
            },
            { totalEntradas: 0, totalSalidas: 0 }
        );

        return NextResponse.json({
            success: true,
            data: {
                movements,
                totals: {
                    ...totals,
                    saldoFinal: totals.totalEntradas - totals.totalSalidas,
                },
            },
        });
    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Error al obtener movimientos',
            },
            { status: 500 }
        );
    }
}

// POST: Registrar ajuste manual de inventario
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { branchId, productId, quantity, notes, createdBy, type } = body;

        if (!branchId || !productId || !quantity || !createdBy) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Faltan campos requeridos: branchId, productId, quantity, createdBy',
                },
                { status: 400 }
            );
        }

        const result = await prisma.$transaction(async (tx) => {
            // Obtener inventario actual
            const inventory = await tx.inventory.findUnique({
                where: {
                    branchId_productId: {
                        branchId,
                        productId,
                    },
                },
            });

            if (!inventory) {
                throw new Error('Inventario no encontrado');
            }

            const previousStock = inventory.currentStock;
            const newStock = previousStock + quantity;

            // Actualizar inventario
            const updatedInventory = await tx.inventory.update({
                where: {
                    branchId_productId: {
                        branchId,
                        productId,
                    },
                },
                data: {
                    currentStock: newStock,
                },
            });

            // Registrar movimiento
            const movement = await tx.stockMovement.create({
                data: {
                    branchId,
                    productId,
                    type: type || (quantity > 0 ? 'AJUSTE' : 'MERMA'),
                    quantity,
                    previousStock,
                    newStock,
                    notes,
                    createdBy,
                },
                include: {
                    product: true,
                    branch: true,
                },
            });

            return { movement, inventory: updatedInventory };
        });

        return NextResponse.json(
            {
                success: true,
                data: result,
                message: 'Ajuste registrado exitosamente',
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error al registrar ajuste:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Error al registrar ajuste',
            },
            { status: 500 }
        );
    }
}
