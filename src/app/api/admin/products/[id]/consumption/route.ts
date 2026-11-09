import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';
import { consumptionConfig, consumptionInclude } from '@/lib/consumption-config';
import { OperationError, serializableTransaction } from '@/lib/transaction';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER']);
    if (access instanceof NextResponse) return access;
    try {
        const { mode, recipeId } = await request.json();
        if (!['STOCK', 'RECIPE'].includes(mode) || (mode === 'RECIPE' && typeof recipeId !== 'string')) {
            throw new OperationError('Selecciona un modo de consumo y una receta válida');
        }
        const result = await serializableTransaction(async tx => {
            const current = await tx.product.findUnique({ where: { id: params.id } });
            if (!current || current.deletedAt) throw new OperationError('Producto no encontrado', 404);
            const product = await tx.product.update({ where: { id: params.id },
                data: { consumptionMode: mode, saleRecipeId: mode === 'RECIPE' ? recipeId : null },
                include: consumptionInclude });
            try { consumptionConfig(product); }
            catch (error) { throw new OperationError(error instanceof Error ? error.message : 'Configuración inválida'); }
            return product;
        });
        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        if (error instanceof OperationError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        if (error?.code === 'P2003') return NextResponse.json({ success: false, error: 'Receta no encontrada' }, { status: 400 });
        console.error('Error al configurar consumo:', error);
        return NextResponse.json({ success: false, error: 'No se pudo configurar el consumo' }, { status: 500 });
    }
}
