// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';
import { consumptionConfig, consumptionInclude } from '@/lib/consumption-config';

/**
 * GET /api/admin/branch-products?branchId=xxx
 * Devuelve todos los productos con su precio asociado a esa sucursal (si existe).
 *
 * POST /api/admin/branch-products
 * Crear o actualizar el precio de un producto en una sucursal (upsert).
 */

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');

        if (!branchId) {
            return NextResponse.json(
                { success: false, error: 'branchId es requerido' },
                { status: 400 }
            );
        }
        const access = await requireBranchAccess(request, branchId, ['ADMIN', 'MANAGER']);
        if (access instanceof NextResponse) return access;

        // Traer TODOS los productos activos con su branchProduct (si existe para esta sucursal)
        const products = await prisma.product.findMany({
            where: { active: true, deletedAt: null },
            include: {
                branchProducts: {
                    where: { branchId },
                    take: 1,
                },
            },
            orderBy: [{ type: 'asc' }, { name: 'asc' }],
        });

        const data = products.map((p) => {
            const bp = p.branchProducts[0] ?? null;
            return {
                productId: p.id,
                productName: p.name,
                sku: p.sku,
                type: p.type,
                unit: p.unit,
                // Datos de BranchProduct (null si no está asignado a esta sucursal)
                branchProductId: bp?.id ?? null,
                customPrice: bp?.customPrice ?? null,
                pricePerKg: bp?.pricePerKg ?? null,
                active: bp?.active ?? false,
                assigned: bp !== null,
            };
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error GET /api/admin/branch-products:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener datos' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { branchId, productId, customPrice, pricePerKg, active } = body;

        if (!branchId || !productId) {
            return NextResponse.json(
                { success: false, error: 'branchId y productId son requeridos' },
                { status: 400 }
            );
        }

        const access = await requireBranchAccess(request, branchId, ['ADMIN', 'MANAGER']);
        if (access instanceof NextResponse) return access;
        if ([customPrice, pricePerKg].some(value => value !== null && value !== undefined &&
            (typeof value !== 'number' || !Number.isFinite(value) || value < 0))) {
            return NextResponse.json({ success: false, error: 'Precio inválido' }, { status: 400 });
        }
        const product = await prisma.product.findUnique({ where: { id: productId }, include: consumptionInclude });
        if (!product || !product.active || product.deletedAt) return NextResponse.json({ success: false, error: 'Producto no disponible' }, { status: 400 });
        if (active !== false) {
            const price = product.type === 'ACAI_BASE' ? pricePerKg : customPrice;
            if (['BURGER', 'BURGER_EXTRA', 'BEVERAGE', 'ACAI_BASE'].includes(product.type) && !(typeof price === 'number' && price > 0)) {
                return NextResponse.json({ success: false, error: 'Define un precio mayor que cero antes de activar el producto' }, { status: 400 });
            }
            if (product.consumptionMode) {
                try { consumptionConfig(product); }
                catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Preparación inválida' }, { status: 400 }); }
            }
        }

        // Upsert: crear si no existe, actualizar si ya existe
        const result = await prisma.branchProduct.upsert({
            where: {
                branchId_productId: { branchId, productId },
            },
            create: {
                branchId,
                productId,
                customPrice: customPrice ?? null,
                pricePerKg: pricePerKg ?? null,
                active: active ?? true,
            },
            update: {
                customPrice: customPrice ?? null,
                pricePerKg: pricePerKg ?? null,
                active: active ?? true,
            },
            include: {
                product: { select: { name: true, sku: true, type: true } },
            },
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('Error POST /api/admin/branch-products:', error);
        return NextResponse.json({ success: false, error: 'Error al guardar' }, { status: 500 });
    }
}
