// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Obtener receta por ID
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const recipe = await prisma.recipe.findUnique({
            where: { id: params.id },
            include: {
                product: true,
                ingredients: {
                    include: {
                        ingredient: true,
                    },
                },
                productionOrders: {
                    take: 10,
                    orderBy: {
                        createdAt: 'desc',
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

        return NextResponse.json({
            success: true,
            data: recipe,
        });
    } catch (error) {
        console.error('Error al obtener receta:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Error al obtener receta',
            },
            { status: 500 }
        );
    }
}

// PUT: Actualizar receta
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const {
            name,
            description,
            yield: recipeYield,
            yieldUnit,
            merma,
            notes,
            active,
            ingredients,
        } = body;

        // Si se proporcionan ingredientes, actualizarlos
        const updateData: any = {
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(recipeYield && { yield: recipeYield }),
            ...(yieldUnit && { yieldUnit }),
            ...(merma !== undefined && { merma }),
            ...(notes !== undefined && { notes }),
            ...(active !== undefined && { active }),
        };

        // Actualizar receta
        if (ingredients) {
            // Eliminar ingredientes existentes y crear nuevos
            await prisma.recipeIngredient.deleteMany({
                where: { recipeId: params.id },
            });

            updateData.ingredients = {
                create: ingredients.map((ing: any) => ({
                    ingredientId: ing.ingredientId,
                    quantity: ing.quantity,
                    unit: ing.unit,
                })),
            };
        }

        const recipe = await prisma.recipe.update({
            where: { id: params.id },
            data: updateData,
            include: {
                product: true,
                ingredients: {
                    include: {
                        ingredient: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: recipe,
            message: 'Receta actualizada exitosamente',
        });
    } catch (error) {
        console.error('Error al actualizar receta:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Error al actualizar receta',
            },
            { status: 500 }
        );
    }
}

// DELETE: Desactivar receta
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const recipe = await prisma.recipe.update({
            where: { id: params.id },
            data: { active: false },
        });

        return NextResponse.json({
            success: true,
            data: recipe,
            message: 'Receta desactivada exitosamente',
        });
    } catch (error) {
        console.error('Error al desactivar receta:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Error al desactivar receta',
            },
            { status: 500 }
        );
    }
}
