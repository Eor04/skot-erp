// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET  /api/admin/combos  — listar todos los combos con sus items
 * POST /api/admin/combos  — crear nuevo combo con items
 */

export async function GET() {
    try {
        const combos = await prisma.combo.findMany({
            include: {
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true, type: true, unit: true } },
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json({ success: true, data: combos });
    } catch (error) {
        console.error('GET /api/admin/combos:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener combos' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { name, description, price, active, imageUrl, items } = await request.json();

        if (!name || price === undefined) {
            return NextResponse.json({ success: false, error: 'name y price son requeridos' }, { status: 400 });
        }

        const combo = await prisma.combo.create({
            data: {
                name,
                description: description || null,
                price: parseFloat(price),
                active: active ?? true,
                imageUrl: imageUrl || null,
                items: {
                    create: (items || []).map((item: { productId: string; quantity: number }) => ({
                        productId: item.productId,
                        quantity: item.quantity ?? 1,
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true, unit: true } },
                    },
                },
            },
        });

        return NextResponse.json({ success: true, data: combo }, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/admin/combos:', error);
        return NextResponse.json({ success: false, error: 'Error al crear combo' }, { status: 500 });
    }
}
