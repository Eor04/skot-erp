// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';
import { calculateConsumption, type Consumption } from '@/lib/inventory-consumption';

// GET: Listar órdenes de producción
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const access = await requireBranchAccess(request, branchId, ['ADMIN', 'MANAGER', 'WAREHOUSE']);
        if (access instanceof NextResponse) return access;
        const status = searchParams.get('status');
        const recipeId = searchParams.get('recipeId');

        const productionOrders = await prisma.productionOrder.findMany({
            where: {
                branchId: branchId || { in: access.allowedBranchIds },
                ...(status && { status: status as any }),
                ...(recipeId && { recipeId }),
            },
            include: {
                branch: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                    },
                },
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
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json({
            success: true,
            data: productionOrders,
        });
    } catch (error) {
        console.error('Error al obtener órdenes de producción:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Error al obtener órdenes de producción',
            },
            { status: 500 }
        );
    }
}

// POST: Crear nueva orden de producción
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            branchId,
            recipeId,
            plannedYield,
            scheduledDate,
            expirationDate,
            notes,
            createdBy,
        } = body;

        // Validaciones
        if (!branchId || !recipeId || !Number.isFinite(plannedYield) || plannedYield <= 0 || typeof createdBy !== 'string' || !createdBy.trim()) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Faltan campos requeridos: branchId, recipeId, plannedYield, createdBy',
                },
                { status: 400 }
            );
        }
        const access = await requireBranchAccess(request, branchId, ['ADMIN', 'MANAGER', 'WAREHOUSE']);
        if (access instanceof NextResponse) return access;
        const branch = await prisma.branch.findFirst({ where: { id: branchId, type: 'FABRICA', active: true, deletedAt: null } });
        if (!branch) return NextResponse.json({ success: false, error: 'Selecciona una fábrica activa' }, { status: 400 });

        // Obtener receta con ingredientes
        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            include: {
                product: true,
                ingredients: {
                    include: {
                        ingredient: true,
                    },
                },
            },
        });

        if (!recipe || !recipe.active) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Receta no encontrada',
                },
                { status: 404 }
            );
        }
        if (!recipe.product.active || recipe.product.deletedAt || recipe.ingredients.some(i => !i.ingredient.active || i.ingredient.deletedAt)) {
            return NextResponse.json({ success: false, error: 'La receta contiene productos inactivos' }, { status: 400 });
        }

        let consumption: Consumption[];
        try {
            consumption = calculateConsumption([{ quantity: plannedYield, product: { id: recipe.product.id, name: recipe.product.name,
                unit: recipe.product.unit, mode: 'RECIPE', recipe: { productId: recipe.productId, yield: recipe.yield,
                    yieldUnit: recipe.yieldUnit, ingredients: recipe.ingredients.map(i => ({ id: i.ingredientId,
                        name: i.ingredient.name, quantity: i.quantity, unit: i.unit, inventoryUnit: i.ingredient.unit })) } } }]);
        } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Receta inválida' }, { status: 400 }); }

        // Calcular materia prima necesaria basada en la cantidad planeada
        const requiredIngredients = consumption.map((ing) => ({
            ingredientId: ing.productId,
            ingredientName: ing.name,
            required: ing.quantity,
            unit: recipe.ingredients.find(i => i.ingredientId === ing.productId)!.unit,
        }));

        // Validar disponibilidad de inventario
        const availabilityChecks = await Promise.all(
            requiredIngredients.map(async (req) => {
                const inventory = await prisma.inventory.findUnique({
                    where: {
                        branchId_productId: {
                            branchId,
                            productId: req.ingredientId,
                        },
                    },
                });

                return {
                    ...req,
                    available: inventory?.currentStock || 0,
                    sufficient: (inventory?.currentStock || 0) >= req.required,
                };
            })
        );

        const insufficientIngredients = availabilityChecks.filter((check) => !check.sufficient);

        if (insufficientIngredients.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Materia prima insuficiente',
                    details: insufficientIngredients.map((ing) => ({
                        ingredient: ing.ingredientName,
                        required: ing.required,
                        available: ing.available,
                        missing: ing.required - ing.available,
                        unit: ing.unit,
                    })),
                },
                { status: 400 }
            );
        }

        // Generar número de orden y lote
        const now = new Date();
        const year = now.getFullYear();
        const lastOrder = await prisma.productionOrder.findFirst({
            where: {
                orderNumber: {
                    startsWith: `POD-${year}-`,
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const lastNumber = lastOrder
            ? parseInt(lastOrder.orderNumber.split('-')[2])
            : 0;
        const orderNumber = `POD-${year}-${String(lastNumber + 1).padStart(4, '0')}`;
        const batchNumber = `LOTE-${year}-${String(lastNumber + 1).padStart(4, '0')}`;

        // Crear orden de producción
        const productionOrder = await prisma.productionOrder.create({
            data: {
                orderNumber,
                branchId,
                recipeId,
                batchNumber,
                plannedYield,
                scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
                expirationDate: expirationDate ? new Date(expirationDate) : null,
                notes: [notes, `Operador: ${createdBy.trim()}`].filter(Boolean).join(' | '),
                createdBy: access.userId,
                status: 'SCHEDULED',
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

        return NextResponse.json(
            {
                success: true,
                data: productionOrder,
                message: 'Orden de producción creada exitosamente',
                requiredIngredients: availabilityChecks,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error al crear orden de producción:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Error al crear orden de producción',
            },
            { status: 500 }
        );
    }
}
