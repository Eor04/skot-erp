// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET  /api/admin/modifiers          — listar todos
 * POST /api/admin/modifiers          — crear nuevo
 */

export async function GET() {
    try {
        const modifiers = await prisma.productModifier.findMany({
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });
        return NextResponse.json({ success: true, data: modifiers });
    } catch (error) {
        console.error('GET /api/admin/modifiers:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener modificadores' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { name, description, price, category, active } = await request.json();
        if (!name || price === undefined) {
            return NextResponse.json({ success: false, error: 'name y price son requeridos' }, { status: 400 });
        }
        const modifier = await prisma.productModifier.create({
            data: { name, description: description || null, price: parseFloat(price), category: category || null, active: active ?? true },
        });
        return NextResponse.json({ success: true, data: modifier }, { status: 201 });
    } catch (error) {
        console.error('POST /api/admin/modifiers:', error);
        return NextResponse.json({ success: false, error: 'Error al crear modificador' }, { status: 500 });
    }
}
