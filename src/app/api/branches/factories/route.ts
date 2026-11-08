export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBranchAccess } from '@/lib/branch-access';
import { prisma } from '@/lib/prisma';

// Las fábricas son destinos disponibles para cualquier sucursal autenticada.
export async function GET(request: NextRequest) {
    try {
        const access = await requireBranchAccess(request);
        if (access instanceof NextResponse) return access;

        const factories = await prisma.branch.findMany({
            where: { type: 'FABRICA', active: true, deletedAt: null },
            select: { id: true, name: true, type: true },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json({ success: true, data: factories });
    } catch (error) {
        console.error('Error al obtener fábricas:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener fábricas' }, { status: 500 });
    }
}
