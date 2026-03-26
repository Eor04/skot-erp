import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST: Completar orden de producción
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { actualYield, completedBy, productionDate } = body;

        if (!actualYield || !completedBy) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Faltan campos requeridos: actualYield, completedBy',
                },
                { status: 400 }
            );
        }

        // Obtener orden de producción
        const order = await prisma.productionOrder.findUnique({
            where: { id: params.id },
            include: {
                recipe: {
                    include: {
                        ingredients: {
                            include: {
                                ingredient: true,
                            },
                        },
                        product: true,
                    },
                },
            },
        });

        if (!order) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Orden de producción no encontrada',
                },
                { status: 404 }
            );
        }

        if (order.status === 'COMPLETED') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'La orden ya fue completada anteriormente',
                },
                { status: 400 }
            );
        }

        // Calcular materia prima a descontar
        const multiplier = actualYield / order.recipe.yield;

        // Usar transacción para garantizar consistencia
        const result = await prisma.$transaction(async (tx) => {
            // 1. Descontar materia prima del inventario
            for (const ingredient of order.recipe.ingredients) {
                const quantityToDeduct = ingredient.quantity * multiplier;

                const inventory = await tx.inventory.findUnique({
                    where: {
                        branchId_productId: {
                            branchId: order.branchId,
                            productId: ingredient.ingredientId,
                        },
                    },
                });

                if (!inventory) {
                    throw new Error(`Inventario no encontrado para ${ingredient.ingredient.name}`);
                }

                if (inventory.currentStock < quantityToDeduct) {
                    throw new Error(
                        `Stock insuficiente de ${ingredient.ingredient.name}. Disponible: ${inventory.currentStock}, Requerido: ${quantityToDeduct}`
                    );
                }

                // Actualizar inventario
                const updatedInventory = await tx.inventory.update({
                    where: {
                        branchId_productId: {
                            branchId: order.branchId,
                            productId: ingredient.ingredientId,
                        },
                    },
                    data: {
                        currentStock: {
                            decrement: quantityToDeduct,
                        },
                    },
                });

                // Registrar movimiento de salida (consumo en producción)
                await tx.stockMovement.create({
                    data: {
                        branchId: order.branchId,
                        productId: ingredient.ingredientId,
                        type: 'PRODUCCION',
                        quantity: -quantityToDeduct,
                        previousStock: inventory.currentStock,
                        newStock: updatedInventory.currentStock,
                        reference: order.orderNumber,
                        productionOrderId: order.id,
                        batchNumber: order.batchNumber,
                        notes: `Consumo en producción - ${order.recipe.name}`,
                        createdBy: completedBy,
                    },
                });
            }

            // 2. Agregar producto terminado al inventario
            const finishedProductInventory = await tx.inventory.upsert({
                where: {
                    branchId_productId: {
                        branchId: order.branchId,
                        productId: order.recipe.productId,
                    },
                },
                create: {
                    branchId: order.branchId,
                    productId: order.recipe.productId,
                    currentStock: actualYield,
                    minStock: 0,
                    status: 'AVAILABLE',
                    batchNumber: order.batchNumber,
                    productionDate: productionDate ? new Date(productionDate) : new Date(),
                    expirationDate: order.expirationDate,
                },
                update: {
                    currentStock: {
                        increment: actualYield,
                    },
                },
            });

            // Registrar movimiento de entrada (producto terminado)
            await tx.stockMovement.create({
                data: {
                    branchId: order.branchId,
                    productId: order.recipe.productId,
                    type: 'PRODUCCION',
                    quantity: actualYield,
                    previousStock: finishedProductInventory.currentStock - actualYield,
                    newStock: finishedProductInventory.currentStock,
                    reference: order.orderNumber,
                    productionOrderId: order.id,
                    batchNumber: order.batchNumber,
                    expirationDate: order.expirationDate,
                    notes: `Producto terminado - ${order.recipe.name}`,
                    createdBy: completedBy,
                },
            });

            // 3. Actualizar orden de producción
            const updatedOrder = await tx.productionOrder.update({
                where: { id: params.id },
                data: {
                    actualYield,
                    status: 'COMPLETED',
                    completedBy,
                    productionDate: productionDate ? new Date(productionDate) : new Date(),
                    completedAt: new Date(),
                },
                include: {
                    branch: true,
                    recipe: {
                        include: {
                            product: true,
                            ingredients: {
                                include: {
                                    ingredient: true,
                                },
                            },
                        },
                    },
                },
            });

            return updatedOrder;
        });

        return NextResponse.json({
            success: true,
            data: result,
            message: 'Orden de producción completada exitosamente',
        });
    } catch (error: any) {
        console.error('Error al completar orden de producción:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Error al completar orden de producción',
            },
            { status: 500 }
        );
    }
}
