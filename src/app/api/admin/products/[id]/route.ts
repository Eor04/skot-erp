import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';
import { ensureUnitCanChange } from '@/lib/product-unit';
import { OperationError, serializableTransaction } from '@/lib/transaction';

/**
 * PUT /api/admin/products/[id] — Actualizar producto
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER']);
        if (access instanceof NextResponse) return access;
        const { id } = params;
        const body = await request.json();
        const { name, description, sku, unit, category, type, active, imageUrl } = body;

        const product = await serializableTransaction(async tx => {
            const current = await tx.product.findUnique({ where: { id } });
            if (!current) throw new OperationError('Producto no encontrado', 404);
            if (unit !== undefined) {
                if (typeof unit !== 'string' || !unit.trim()) throw new OperationError('Unidad inválida');
                await ensureUnitCanChange(tx, id, current.unit, unit);
            }
            return tx.product.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(sku !== undefined && { sku }),
                ...(unit !== undefined && { unit }),
                ...(category !== undefined && { category }),
                ...(type !== undefined && { type: (type === 'PACKAGING' ? 'SUPPLY' : type) as any }),
                ...(active !== undefined && { active }),
                ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
            },
            });
        });


        return NextResponse.json({
            success: true,
            data: { ...product, isActive: product.active, price: 0, costPrice: 0 },
        });
    } catch (error: any) {
        if (error instanceof OperationError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        if (error?.code === 'P2002') {
            return NextResponse.json({ success: false, error: 'El SKU ya existe' }, { status: 409 });
        }
        if (error?.code === 'P2025') {
            return NextResponse.json({ success: false, error: 'Producto no encontrado' }, { status: 404 });
        }
        return NextResponse.json({ success: false, error: 'Error al actualizar producto' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/products/[id] — Soft delete (activar deletedAt)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER']);
        if (access instanceof NextResponse) return access;
        const { id } = params;

        await prisma.product.update({
            where: { id },
            data: { active: false, deletedAt: new Date() },
        });

        return NextResponse.json({ success: true, message: 'Producto eliminado' });
    } catch (error: any) {
        if (error?.code === 'P2025') {
            return NextResponse.json({ success: false, error: 'Producto no encontrado' }, { status: 404 });
        }
        return NextResponse.json({ success: false, error: 'Error al eliminar producto' }, { status: 500 });
    }
}
