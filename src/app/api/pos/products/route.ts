// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';
import { consumptionConfig, consumptionInclude, consumptionVersion } from '@/lib/consumption-config';
import { availableQuantity } from '@/lib/inventory-consumption';
import type { ConsumptionProduct } from '@/lib/inventory-consumption';
import { signOfflineAuthorization } from '@/lib/offline-sale-authorization';

/**
 * GET /api/pos/products?branchId=xxx&type=BURGER|ACAI
 * Devuelve productos activos con precio por sucursal (BranchProduct)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const type = searchParams.get('type'); // BURGER, ACAI_BASE, ACAI_TOPPING, BEVERAGE

        if (!branchId) {
            return NextResponse.json(
                { success: false, error: 'branchId es requerido' },
                { status: 400 }
            );
        }

        const access = await requireBranchAccess(request, branchId);
        if (access instanceof NextResponse) return access;

        // Construir filtro de tipos
        const typeFilter: string[] = [];
        if (type === 'BURGER') {
            typeFilter.push('BURGER', 'BURGER_EXTRA', 'BEVERAGE');
        } else if (type === 'ACAI') {
            typeFilter.push('ACAI_BASE', 'ACAI_TOPPING', 'BEVERAGE');
        } else if (type) {
            typeFilter.push(type);
        }

        const products = await prisma.product.findMany({
            where: {
                active: true,
                deletedAt: null,
                branchProducts: { some: { branchId, active: true } },
                ...(typeFilter.length > 0 ? { type: { in: typeFilter as any } } : {}),
            },
            include: {
                ...consumptionInclude,
                branchProducts: {
                    where: { branchId, active: true },
                    take: 1,
                },
                inventory: {
                    where: { branchId },
                    take: 1,
                },
            },
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });

        const ingredientIds = [...new Set(products.flatMap(p => p.saleRecipe?.ingredients.map(i => i.ingredientId) ?? []))];
        const ingredientInventory = await prisma.inventory.findMany({
            where: { branchId, productId: { in: ingredientIds } },
            select: { productId: true, currentStock: true },
        });
        const ingredientStocks = new Map(ingredientInventory.map(i => [i.productId, i.currentStock]));

        // El catálogo y la venta comparten las mismas cantidades de receta.
        const data = products.map((p) => {
            const bp = p.branchProducts[0];
            const customPrice = bp?.customPrice ?? 0;
            const pricePerKg = bp?.pricePerKg ?? 0;
            let currentStock = p.inventory[0]?.currentStock ?? 0;
            let consumptionError: string | null = null;
            let configVersion: string | null = null;
            let consumptionSnapshot: ConsumptionProduct | null = null;
            let offlineAuthorization: string | null = null;
            if (!p.consumptionMode && process.env.REQUIRE_CLASSIFIED_CONSUMPTION === 'true') {
                currentStock = 0;
                consumptionError = 'Falta configurar la preparación del producto';
            }
            if (p.consumptionMode) {
                try {
                    const config = consumptionConfig(p)!;
                    configVersion = consumptionVersion(config);
                    consumptionSnapshot = config;
                    if (config.mode === 'RECIPE') currentStock = availableQuantity(config, ingredientStocks);
                } catch (error) {
                    currentStock = 0;
                    consumptionError = error instanceof Error ? error.message : 'Configuración de consumo inválida';
                }
            }
            if ((p.type === 'BURGER' || p.type === 'BEVERAGE' || p.type === 'BURGER_EXTRA') && customPrice <= 0 ||
                p.type === 'ACAI_BASE' && pricePerKg <= 0) {
                currentStock = 0;
                consumptionError = 'Falta definir un precio de venta';
            }
            if (configVersion && (p.type === 'ACAI_BASE' ? pricePerKg : customPrice) > 0) {
                try { offlineAuthorization = signOfflineAuthorization({ kind: 'product', branchId, userId: access.userId,
                    productId: p.id, productType: p.type, unit: p.unit, priceKind: p.type === 'ACAI_BASE' ? 'PER_KG' : 'UNIT',
                    price: p.type === 'ACAI_BASE' ? pricePerKg : customPrice, configVersion, consumptionSnapshot }); }
                catch (error) { console.error('No se pudo firmar la autorización offline:', error); }
            }
            return {
                id: p.id,
                name: p.name,
                description: p.description,
                sku: p.sku,
                type: p.type,
                unit: p.unit,
                imageUrl: p.imageUrl,
                category: p.category,
                // `price` es el alias que usan use-acai-sale y use-burger-sale
                price: customPrice,
                customPrice,
                pricePerKg,
                currentStock,
                consumptionError,
                configVersion,
                consumptionSnapshot,
                offlineAuthorization,
            };
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error GET /api/pos/products:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener productos' },
            { status: 500 }
        );
    }
}
