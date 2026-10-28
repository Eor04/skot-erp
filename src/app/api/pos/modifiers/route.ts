// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/pos/modifiers?category=BURGER
 * Devuelve modificadores activos, opcionalmente filtrados por categoría
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');

        const modifiers = await prisma.productModifier.findMany({
            where: {
                active: true,
                ...(category ? { category } : {}),
            },
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });

        return NextResponse.json({ success: true, data: modifiers });
    } catch (error) {
        console.error('Error GET /api/pos/modifiers:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener modificadores' },
            { status: 500 }
        );
    }
}
