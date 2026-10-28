// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBranchAccess } from '@/lib/branch-access';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const access = await requireBranchAccess(request);
        if (access instanceof NextResponse) return access;
        const branches = await prisma.branch.findMany({
            where: { active: true, deletedAt: null, id: { in: access.allowedBranchIds } },
            select: { id: true, name: true, type: true },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json({ success: true, data: branches });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Error al obtener sucursales' }, { status: 500 });
    }
}
