import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';
import { consumptionConfig, consumptionInclude } from '@/lib/consumption-config';

/** Señala pendientes comerciales sin exponer precios a quien prepara el envío. */
export async function GET(request: NextRequest) {
    const params = new URL(request.url).searchParams;
    const fromBranchId = params.get('fromBranchId');
    const toBranchId = params.get('toBranchId');
    const intent = params.get('intent') || 'SEND';
    const productIds = params.getAll('productId');
    if (!fromBranchId || !toBranchId || fromBranchId === toBranchId || !['REQUEST', 'SEND'].includes(intent) || !productIds.length || productIds.length > 100 || productIds.some(id => !id)) {
        return NextResponse.json({ success: false, error: 'Selecciona origen, destino y productos válidos' }, { status: 400 });
    }
    const access = intent === 'REQUEST'
        ? await requireBranchAccess(request, toBranchId, ['ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE'])
        : await requireBranchAccess(request, fromBranchId, ['ADMIN', 'MANAGER', 'WAREHOUSE']);
    if (access instanceof NextResponse) return access;
    try {
        const [source, destination] = await Promise.all([
            prisma.branch.findFirst({ where: { id: fromBranchId, active: true, deletedAt: null }, select: { id: true } }),
            prisma.branch.findFirst({ where: { id: toBranchId, active: true, deletedAt: null }, select: { type: true } }),
        ]);
        if (!source || !destination) return NextResponse.json({ success: false, error: 'Origen o destino no disponible' }, { status: 400 });
        if (destination.type === 'FABRICA') return NextResponse.json({ success: true, data: [] });
        const products = await prisma.product.findMany({ where: { id: { in: productIds }, active: true, deletedAt: null },
            include: { ...consumptionInclude, branchProducts: { where: { branchId: toBranchId }, take: 1 } } });
        const data = products.flatMap(product => {
            const saleType = ['BURGER', 'BURGER_EXTRA', 'BEVERAGE', 'ACAI_BASE'].includes(product.type);
            if (!saleType) return [];
            const bp = product.branchProducts[0];
            const price = product.type === 'ACAI_BASE' ? bp?.pricePerKg : bp?.customPrice;
            let reason: string | null = null;
            if (!bp?.active) reason = 'No está habilitado para venta en el destino';
            else if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) reason = 'Falta precio de venta en el destino';
            else if (!product.consumptionMode) reason = 'Falta configurar la preparación';
            else {
                try { consumptionConfig(product); }
                catch { reason = 'La preparación necesita revisión'; }
            }
            return reason ? [{ productId: product.id, productName: product.name, reason }] : [];
        });
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error al revisar destino de transferencia:', error);
        return NextResponse.json({ success: false, error: 'No se pudo revisar el destino' }, { status: 500 });
    }
}
