import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/pos/combos
 * Obtiene los combos activos para mostrar en el POS.
 */
export async function GET() {
    try {
        const combos = await prisma.combo.findMany({
            where: { active: true },
            include: {
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true, unit: true } },
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json({ success: true, data: combos });
    } catch (error) {
        console.error('GET /api/pos/combos:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener combos' }, { status: 500 });
    }
}
