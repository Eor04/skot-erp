import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';
import { OperationError } from '@/lib/transaction';
import { calculateConsumption } from '@/lib/inventory-consumption';

// POST: Completar orden de producción
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { actualYield, completedBy: operatorName, productionDate } = body;

        if (!Number.isFinite(actualYield) || actualYield <= 0 || typeof operatorName !== 'string' || !operatorName.trim()) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Faltan campos requeridos: actualYield, completedBy',
                },
                { status: 400 }
            );
        }
        if (productionDate && !Number.isFinite(Date.parse(productionDate))) throw new OperationError('Fecha de producción inválida');

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

        const access = await requireBranchAccess(request, order.branchId, ['ADMIN', 'MANAGER', 'WAREHOUSE']);
        if (access instanceof NextResponse) return access;
        const completedBy = access.userId;

        if (order.status === 'COMPLETED') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'La orden ya fue completada anteriormente',
                },
                { status: 400 }
            );
        }

        // Usar transacción para garantizar consistencia
        const result = await prisma.$transaction(async (tx) => {
            // Reservar la orden dentro de la transacción evita completar dos veces.
            const claim = await tx.productionOrder.updateMany({ where: { id: params.id, status: { in: ['DRAFT', 'SCHEDULED', 'IN_PROGRESS'] } },
                data: { status: 'COMPLETED' } });
            if (claim.count !== 1) throw new OperationError('La orden ya fue completada o no se puede completar', 409);
            const order = await tx.productionOrder.findUniqueOrThrow({ where: { id: params.id }, include: {
                recipe: { include: { product: true, ingredients: { include: { ingredient: true } } } },
            } });
            if (!order.recipe.product.active || order.recipe.product.deletedAt || order.recipe.ingredients.some(i => !i.ingredient.active || i.ingredient.deletedAt)) {
                throw new OperationError('La receta contiene productos inactivos');
            }
            try {
                calculateConsumption([{ quantity: actualYield, product: { id: order.recipe.product.id, name: order.recipe.product.name,
                    unit: order.recipe.product.unit, mode: 'RECIPE', recipe: { productId: order.recipe.productId,
                        yield: order.recipe.yield, yieldUnit: order.recipe.yieldUnit,
                        ingredients: order.recipe.ingredients.map(i => ({ id: i.ingredientId, name: i.ingredient.name,
                            quantity: i.quantity, unit: i.unit, inventoryUnit: i.ingredient.unit })) } } }]);
            } catch (error) { throw new OperationError(error instanceof Error ? error.message : 'Receta inválida'); }
            const multiplier = actualYield / order.recipe.yield;
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
                    throw new OperationError(`Inventario no encontrado para ${ingredient.ingredient.name}`);
                }

                if (inventory.currentStock < quantityToDeduct) {
                    throw new OperationError(
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
                        notes: `Consumo en producción - ${order.recipe.name} | Operador: ${operatorName.trim()}`,
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
        }, { timeout: 30000, isolationLevel: 'Serializable' });

        return NextResponse.json({
            success: true,
            data: result,
            message: 'Orden de producción completada exitosamente',
        });
    } catch (error: any) {
        if (error instanceof OperationError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        if (error?.code === 'P2034') return NextResponse.json({ success: false, error: 'La producción cambió durante la operación; actualiza la página y revisa el estado' }, { status: 409 });
        console.error('Error al completar orden de producción:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.code === 'P2028'
                    ? 'La operación tardó demasiado y se canceló. Inténtalo nuevamente.'
                    : error.message || 'Error al completar orden de producción',
            },
            { status: 500 }
        );
    }
}
