// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';
import { consumptionConfig, consumptionInclude } from '@/lib/consumption-config';
import { OperationError, serializableTransaction } from '@/lib/transaction';

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
        const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER', 'WAREHOUSE']);
        if (access instanceof NextResponse) return access;
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

        if (ingredients && (!Array.isArray(ingredients) || ingredients.length === 0 || ingredients.some((ing: any) =>
            !ing.ingredientId || !Number.isFinite(ing.quantity) || ing.quantity <= 0 || !ing.unit))) {
            return NextResponse.json({ success: false, error: 'Ingredientes inválidos' }, { status: 400 });
        }
        if (recipeYield !== undefined && (!Number.isFinite(recipeYield) || recipeYield <= 0)) {
            return NextResponse.json({ success: false, error: 'Rendimiento inválido' }, { status: 400 });
        }
        const recipe = await serializableTransaction(async tx => {
            if (ingredients) {
                await tx.recipeIngredient.deleteMany({ where: { recipeId: params.id } });
                updateData.ingredients = { create: ingredients.map((ing: any) => ({
                    ingredientId: ing.ingredientId, quantity: ing.quantity, unit: ing.unit,
                })) };
            }
            const updated = await tx.recipe.update({
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
            const linked = await tx.product.findMany({ where: { saleRecipeId: params.id }, include: consumptionInclude });
            for (const product of linked) {
                try { consumptionConfig(product); }
                catch (error) { throw new OperationError(error instanceof Error ? error.message : 'La receta de venta quedaría inválida'); }
            }
            return updated;
        });

        return NextResponse.json({
            success: true,
            data: recipe,
            message: 'Receta actualizada exitosamente',
        });
    } catch (error) {
        if (error instanceof OperationError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
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
        const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER', 'WAREHOUSE']);
        if (access instanceof NextResponse) return access;
        const recipe = await serializableTransaction(async tx => {
            if (await tx.product.count({ where: { saleRecipeId: params.id, consumptionMode: 'RECIPE' } })) {
                throw new OperationError('La receta está configurada para venta; selecciona otra preparación antes de desactivarla');
            }
            return tx.recipe.update({ where: { id: params.id }, data: { active: false } });
        });

        return NextResponse.json({
            success: true,
            data: recipe,
            message: 'Receta desactivada exitosamente',
        });
    } catch (error) {
        if (error instanceof OperationError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
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
