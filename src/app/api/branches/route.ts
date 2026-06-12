import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const branches = await prisma.branch.findMany({
            where: { active: true },
            select: { id: true, name: true, type: true },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json({ success: true, data: branches });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Error al obtener sucursales' }, { status: 500 });
    }
}
