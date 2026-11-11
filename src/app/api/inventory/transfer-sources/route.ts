import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';

/** Orígenes que una sucursal autorizada puede solicitar. No expone inventario. */
export async function GET(request: NextRequest) {
    const toBranchId = new URL(request.url).searchParams.get('toBranchId');
    if (!toBranchId) return NextResponse.json({ success: false, error: 'Selecciona una sucursal de destino' }, { status: 400 });
    const access = await requireBranchAccess(request, toBranchId, ['ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE']);
    if (access instanceof NextResponse) return access;
    try {
        const branches = await prisma.branch.findMany({
            where: { active: true, deletedAt: null, id: { not: toBranchId } },
            select: { id: true, name: true, type: true },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json({ success: true, data: branches });
    } catch (error) {
        console.error('Error al obtener orígenes de transferencia:', error);
        return NextResponse.json({ success: false, error: 'No se pudieron cargar los orígenes' }, { status: 500 });
    }
}
