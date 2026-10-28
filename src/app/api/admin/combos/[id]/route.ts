// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET    /api/admin/combos/[id]  — obtener uno
 * PUT    /api/admin/combos/[id]  — actualizar (reemplaza items completos)
 * DELETE /api/admin/combos/[id]  — soft delete (active: false)
 */

export async function GET(
    _: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const combo = await prisma.combo.findUnique({
            where: { id: params.id },
            include: {
                items: {
                    include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
                },
            },
        });
        if (!combo) return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 });
        return NextResponse.json({ success: true, data: combo });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { name, description, price, active, imageUrl, items } = await request.json();

        // Actualizar combo y reemplazar items en transacción
        const combo = await prisma.$transaction(async (tx) => {
            // Borrar items anteriores y crear nuevos
            if (items !== undefined) {
                await tx.comboItem.deleteMany({ where: { comboId: params.id } });
            }
            return tx.combo.update({
                where: { id: params.id },
                data: {
                    ...(name !== undefined && { name }),
                    ...(description !== undefined && { description: description || null }),
                    ...(price !== undefined && { price: parseFloat(price) }),
                    ...(active !== undefined && { active }),
                    ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
                    ...(items !== undefined && {
                        items: {
                            create: items.map((item: { productId: string; quantity: number }) => ({
                                productId: item.productId,
                                quantity: item.quantity ?? 1,
                            })),
                        },
                    }),
                },
                include: {
                    items: {
                        include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
                    },
                },
            });
        });

        return NextResponse.json({ success: true, data: combo });
    } catch (error: any) {
        console.error('PUT /api/admin/combos/[id]:', error);
        return NextResponse.json({ success: false, error: 'Error al actualizar' }, { status: 500 });
    }
}

export async function DELETE(
    _: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.combo.update({
            where: { id: params.id },
            data: { active: false },
        });
        return NextResponse.json({ success: true, message: 'Combo desactivado' });
    } catch (error) {
        console.error('DELETE /api/admin/combos/[id]:', error);
        return NextResponse.json({ success: false, error: 'Error al desactivar' }, { status: 500 });
    }
}
