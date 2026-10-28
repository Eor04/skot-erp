// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOrManager } from '@/lib/require-role';

export async function GET() {
    try {
        const products = await prisma.product.findMany({
            orderBy: { name: 'asc' },
        });
        const data = products.map(p => ({ ...p, isActive: p.active, price: 0, costPrice: 0 }));
        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Error al obtener productos' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // Solo ADMIN y MANAGER pueden crear productos
        const auth = await requireAdminOrManager(request);
        if (auth instanceof NextResponse) return auth;

        const body = await request.json();
        const { name, description, sku, unit, category, type, imageUrl } = body;

        if (!name || !sku || !unit) {
            return NextResponse.json(
                { success: false, error: 'Campos requeridos: name, sku, unit' },
                { status: 400 }
            );
        }

        // Mapear categoría a enum ProductType
        const typeMap: Record<string, string> = {
            ACAI_BASE: 'ACAI_BASE',
            ACAI_TOPPING: 'ACAI_TOPPING',
            BURGER: 'BURGER',
            BEVERAGE: 'BEVERAGE',
            RAW_MATERIAL: 'RAW_MATERIAL',
            PACKAGING: 'RAW_MATERIAL', // fallback
        };
        const productType = typeMap[type || category] || 'RAW_MATERIAL';

        const product = await prisma.product.create({
            data: { name, description, sku, unit, type: productType as any, category: category || null, active: true, imageUrl: imageUrl || null },

        });

        return NextResponse.json({ success: true, data: { ...product, isActive: product.active, price: 0, costPrice: 0 } }, { status: 201 });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ success: false, error: 'El SKU ya existe' }, { status: 409 });
        }
        return NextResponse.json({ success: false, error: 'Error al crear producto' }, { status: 500 });
    }
}
