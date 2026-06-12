import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const products = await prisma.product.findMany({
            where: { active: true, deletedAt: null },
            select: { id: true, name: true, sku: true, unit: true, type: true },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json({ success: true, data: products });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Error al obtener productos' }, { status: 500 });
    }
}
