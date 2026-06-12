import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { toBranchId } = body;

        if (!toBranchId) {
            return NextResponse.json({ success: false, error: 'toBranchId requerido' }, { status: 400 });
        }

        const result = await prisma.internalOrder.update({
            where: { id: params.id },
            data: { toBranchId },
            include: {
                toBranch: { select: { id: true, name: true, type: true } },
            },
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('Error en PATCH /internal-orders:', error);
        return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
    }
}
