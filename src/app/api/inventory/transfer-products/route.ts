import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';

/** Catálogo mínimo para solicitar; stock detallado solo para quien pertenece al origen. */
export async function GET(request: NextRequest) {
    const params = new URL(request.url).searchParams;
    const fromBranchId = params.get('fromBranchId');
    const toBranchId = params.get('toBranchId');
    const intent = params.get('intent') || 'SEND';
    if (!fromBranchId || !toBranchId || fromBranchId === toBranchId || !['REQUEST', 'SEND'].includes(intent)) {
        return NextResponse.json({ success: false, error: 'Selecciona un origen y destino válidos' }, { status: 400 });
    }

    const access = intent === 'REQUEST'
        ? await requireBranchAccess(request, toBranchId, ['ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE'])
        : await requireBranchAccess(request, fromBranchId, ['ADMIN', 'MANAGER', 'WAREHOUSE']);
    if (access instanceof NextResponse) return access;

    try {
        const [source, destination] = await Promise.all([
            prisma.branch.findFirst({ where: { id: fromBranchId, active: true, deletedAt: null }, select: { id: true } }),
            prisma.branch.findFirst({ where: { id: toBranchId, active: true, deletedAt: null }, select: { id: true } }),
        ]);
        if (!source || !destination) return NextResponse.json({ success: false, error: 'Origen o destino no disponible' }, { status: 400 });

        if (intent === 'REQUEST') {
            const products = await prisma.product.findMany({
                where: { active: true, deletedAt: null },
                select: { id: true, name: true, sku: true, unit: true },
                orderBy: { name: 'asc' },
            });
            return NextResponse.json({ success: true, data: products });
        }

        const inventory = await prisma.inventory.findMany({
            where: { branchId: fromBranchId, product: { active: true, deletedAt: null } },
            select: { productId: true, currentStock: true, product: { select: { id: true, name: true, sku: true, unit: true } } },
            orderBy: { product: { name: 'asc' } },
        });
        return NextResponse.json({ success: true, data: inventory.map(row => ({ ...row.product, currentStock: row.currentStock })) });
    } catch (error) {
        console.error('Error al cargar productos de transferencia:', error);
        return NextResponse.json({ success: false, error: 'No se pudieron cargar los productos' }, { status: 500 });
    }
}
