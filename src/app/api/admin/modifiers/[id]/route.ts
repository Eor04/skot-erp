import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * PUT    /api/admin/modifiers/[id]   — editar
 * DELETE /api/admin/modifiers/[id]   — eliminar (soft → active: false)
 */

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const { name, description, price, category, active } = await request.json();
        const modifier = await prisma.productModifier.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description: description || null }),
                ...(price !== undefined && { price: parseFloat(price) }),
                ...(category !== undefined && { category: category || null }),
                ...(active !== undefined && { active }),
            },
        });
        return NextResponse.json({ success: true, data: modifier });
    } catch (error) {
        console.error('PUT /api/admin/modifiers/[id]:', error);
        return NextResponse.json({ success: false, error: 'Error al actualizar' }, { status: 500 });
    }
}

export async function DELETE(
    _: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.productModifier.update({
            where: { id: params.id },
            data: { active: false },
        });
        return NextResponse.json({ success: true, message: 'Modificador desactivado' });
    } catch (error) {
        console.error('DELETE /api/admin/modifiers/[id]:', error);
        return NextResponse.json({ success: false, error: 'Error al eliminar' }, { status: 500 });
    }
}
