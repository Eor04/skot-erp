import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';
import { consumptionConfig, consumptionInclude } from '@/lib/consumption-config';

/** Prepara un pedido de stock del producto o de sus ingredientes, según su modalidad de venta. */
export async function GET(request: NextRequest) {
    const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER']);
    if (access instanceof NextResponse) return access;
    const productId = request.nextUrl.searchParams.get('productId');
    if (!productId) return NextResponse.json({ success: false, error: 'Selecciona un producto' }, { status: 400 });
    try {
        const product = await prisma.product.findFirst({ where: { id: productId, active: true, deletedAt: null }, include: consumptionInclude });
        if (!product) return NextResponse.json({ success: false, error: 'Producto no disponible' }, { status: 404 });
        if (product.consumptionMode === 'RECIPE') {
            const config = consumptionConfig(product);
            if (!config?.recipe) return NextResponse.json({ success: false, error: 'Configura una receta de venta válida antes de abastecer' }, { status: 409 });
            return NextResponse.json({ success: true, data: {
                mode: 'RECIPE', productName: product.name,
                items: config.recipe.ingredients.map(ingredient => ({ productId: ingredient.id, requestedQty: ingredient.quantity / config.recipe!.yield, unit: ingredient.unit })),
            } });
        }
        return NextResponse.json({ success: true, data: { mode: product.consumptionMode || 'UNCLASSIFIED', productName: product.name,
            items: [{ productId: product.id, requestedQty: 1, unit: product.unit }] } });
    } catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'No se pudo preparar el pedido' }, { status: 400 });
    }
}
