// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Listar órdenes de producción
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const status = searchParams.get('status');
        const recipeId = searchParams.get('recipeId');

        const productionOrders = await prisma.productionOrder.findMany({
            where: {
                ...(branchId && { branchId }),
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
        if (!branchId || !recipeId || !plannedYield || !createdBy) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Faltan campos requeridos: branchId, recipeId, plannedYield, createdBy',
                },
                { status: 400 }
            );
        }

        // Obtener receta con ingredientes
        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            include: {
                ingredients: {
                    include: {
                        ingredient: true,
                    },
                },
            },
        });

        if (!recipe) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Receta no encontrada',
                },
                { status: 404 }
            );
        }

        // Calcular materia prima necesaria basada en la cantidad planeada
        const multiplier = plannedYield / recipe.yield;
        const requiredIngredients = recipe.ingredients.map((ing) => ({
            ingredientId: ing.ingredientId,
            ingredientName: ing.ingredient.name,
            required: ing.quantity * multiplier,
            unit: ing.unit,
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
                notes,
                createdBy,
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
