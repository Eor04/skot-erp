// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        if (!name || !productId || !recipeYield || !yieldUnit || !ingredients || ingredients.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Faltan campos requeridos: name, productId, yield, yieldUnit, ingredients',
                },
                { status: 400 }
            );
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
