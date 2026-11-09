// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';
import { calculateConsumption } from '@/lib/inventory-consumption';

// GET: Listar todas las recetas
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');
        const active = searchParams.get('active');

        const recipes = await prisma.recipe.findMany({
            where: {
                ...(productId && { productId }),
                ...(active !== null && { active: active === 'true' }),
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
                ingredients: {
                    include: {
                        ingredient: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                                unit: true,
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
            data: recipes,
        });
    } catch (error) {
        console.error('Error al obtener recetas:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Error al obtener recetas',
            },
            { status: 500 }
        );
    }
}

// POST: Crear nueva receta
export async function POST(request: NextRequest) {
    try {
        const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER', 'WAREHOUSE']);
        if (access instanceof NextResponse) return access;
        const body = await request.json();
        const {
            name,
            description,
            productId,
            yield: recipeYield,
            yieldUnit,
            merma,
            notes,
            ingredients,
        } = body;

        // Validaciones
        if (!name || !productId || !Number.isFinite(recipeYield) || recipeYield <= 0 || !yieldUnit || !Array.isArray(ingredients) || ingredients.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Faltan campos requeridos: name, productId, yield, yieldUnit, ingredients',
                },
                { status: 400 }
            );
        }

        const product = await prisma.product.findUnique({ where: { id: productId } });
        const ingredientIds: string[] = ingredients.map((i: any) => i.ingredientId);
        if (ingredientIds.some(id => typeof id !== 'string' || !id)) return NextResponse.json({ success: false, error: 'Ingredientes inválidos' }, { status: 400 });
        const available = await prisma.product.findMany({ where: { id: { in: ingredientIds }, active: true, deletedAt: null } });
        if (!product || !product.active || product.deletedAt || available.length !== new Set(ingredientIds).size || new Set(ingredientIds).size !== ingredientIds.length) {
            return NextResponse.json({ success: false, error: 'Producto o ingredientes inválidos' }, { status: 400 });
        }
        const ingredientMap = new Map(available.map(i => [i.id, i]));
        try {
            calculateConsumption([{ quantity: 1, product: { id: product.id, name: product.name, unit: product.unit,
                mode: 'RECIPE', recipe: { productId, yield: recipeYield, yieldUnit,
                    ingredients: ingredients.map((i: any) => ({ id: i.ingredientId, name: ingredientMap.get(i.ingredientId)!.name,
                        quantity: i.quantity, unit: i.unit, inventoryUnit: ingredientMap.get(i.ingredientId)!.unit })) } } }]);
        } catch (error) {
            return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Receta inválida' }, { status: 400 });
        }

        // Crear receta con ingredientes
        const recipe = await prisma.recipe.create({
            data: {
                name,
                description,
                productId,
                yield: recipeYield,
                yieldUnit,
                merma: merma || 0,
                notes,
                ingredients: {
                    create: ingredients.map((ing: any) => ({
                        ingredientId: ing.ingredientId,
                        quantity: ing.quantity,
                        unit: ing.unit,
                    })),
                },
            },
            include: {
                product: true,
                ingredients: {
                    include: {
                        ingredient: true,
                    },
                },
            },
        });

        return NextResponse.json(
            {
                success: true,
                data: recipe,
                message: 'Receta creada exitosamente',
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error al crear receta:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Error al crear receta',
            },
            { status: 500 }
        );
    }
}
