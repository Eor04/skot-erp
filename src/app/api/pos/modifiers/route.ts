// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';
import { signOfflineAuthorization } from '@/lib/offline-sale-authorization';

/**
 * GET /api/pos/modifiers?category=BURGER
 * Devuelve modificadores activos, opcionalmente filtrados por categoría
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const branchId = searchParams.get('branchId');
        if (!branchId) return NextResponse.json({ success: false, error: 'branchId es requerido' }, { status: 400 });
        const access = await requireBranchAccess(request, branchId);
        if (access instanceof NextResponse) return access;

        const modifiers = await prisma.productModifier.findMany({
            where: {
                active: true,
                ...(category ? { category } : {}),
            },
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });

        const data = modifiers.map(modifier => ({ ...modifier,
            offlineAuthorization: signOfflineAuthorization({ kind: 'modifier', branchId, userId: access.userId,
                modifierId: modifier.id, price: modifier.price }),
        }));
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error GET /api/pos/modifiers:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener modificadores' },
            { status: 500 }
        );
    }
}
