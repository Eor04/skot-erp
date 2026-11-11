import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';

/** Sucursales que pueden recibir un envío desde un origen autorizado. */
export async function GET(request: NextRequest) {
    const source = new URL(request.url).searchParams.get('fromBranchId');
    if (!source) return NextResponse.json({ success: false, error: 'Falta origen' }, { status: 400 });
    const access = await requireBranchAccess(request, source, ['ADMIN', 'MANAGER', 'WAREHOUSE']);
    if (access instanceof NextResponse) return access;
    const branches = await prisma.branch.findMany({ where: { active: true, deletedAt: null, id: { not: source } },
        select: { id: true, name: true, type: true }, orderBy: { name: 'asc' } });
    return NextResponse.json({ success: true, data: branches });
}
