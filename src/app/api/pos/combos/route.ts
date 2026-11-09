// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';
import { consumptionConfig, consumptionInclude, consumptionVersion } from '@/lib/consumption-config';
import { signOfflineAuthorization } from '@/lib/offline-sale-authorization';

/**
 * GET /api/pos/combos
 * Obtiene los combos activos para mostrar en el POS.
 */
export async function GET(request: NextRequest) {
    try {
        const branchId = new URL(request.url).searchParams.get('branchId');
        if (!branchId) return NextResponse.json({ success: false, error: 'branchId es requerido' }, { status: 400 });
        const access = await requireBranchAccess(request, branchId);
        if (access instanceof NextResponse) return access;
        const combos = await prisma.combo.findMany({
            where: { active: true },
            include: {
                items: {
                    include: {
                        product: { include: consumptionInclude },
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
        const data = combos.map(combo => ({ ...combo, offlineAuthorization: signOfflineAuthorization({ kind: 'combo', branchId, userId: access.userId,
            comboId: combo.id, price: combo.price, items: combo.items.map(item => ({ productId: item.productId, quantity: item.quantity })) }), items: combo.items.map(item => {
            let configVersion: string | null = null;
            let consumptionSnapshot = null;
            try { const config = consumptionConfig(item.product); if (config) { configVersion = consumptionVersion(config); consumptionSnapshot = config; } }
            catch { /* El cobro informará la configuración inválida. */ }
            const { id, name, sku, unit } = item.product;
            const offlineAuthorization = configVersion ? signOfflineAuthorization({ kind: 'product', branchId, userId: access.userId,
                productId: id, productType: item.product.type, unit, priceKind: 'COMBO_COMPONENT', price: null, configVersion, consumptionSnapshot }) : null;
            return { ...item, product: { id, name, sku, unit, configVersion, consumptionSnapshot, offlineAuthorization } };
        }) }));
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('GET /api/pos/combos:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener combos' }, { status: 500 });
    }
}
