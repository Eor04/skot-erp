import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

        // Construir filtro de tipos
        const typeFilter: string[] = [];
        if (type === 'BURGER') {
            typeFilter.push('BURGER', 'BEVERAGE');
        } else if (type === 'ACAI') {
            typeFilter.push('ACAI_BASE', 'ACAI_TOPPING', 'BEVERAGE');
        } else if (type) {
            typeFilter.push(type);
        }

        const products = await prisma.product.findMany({
            where: {
                active: true,
                deletedAt: null,
                ...(typeFilter.length > 0 ? { type: { in: typeFilter as any } } : {}),
            },
            include: {
                branchProducts: {
                    where: { branchId, active: true },
                    take: 1,
                },
            },
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });

        // Mapear con precio de sucursal
        const data = products.map((p) => {
            const bp = p.branchProducts[0];
            const customPrice = bp?.customPrice ?? 0;
            const pricePerKg = bp?.pricePerKg ?? 0;
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
