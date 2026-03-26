import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/admin/branches/[id] — Actualizar sucursal
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();
        const { name, type, address, phone, active, requireCashClose, settings } = body;

        const typeMap: Record<string, string> = {
            ACAI: 'ACAI', BURGER: 'HAMBURGUESAS', HAMBURGUESAS: 'HAMBURGUESAS',
            FACTORY: 'FABRICA', FABRICA: 'FABRICA',
        };

        const branch = await prisma.branch.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(type !== undefined && { type: (typeMap[type] || type) as any }),
                ...(address !== undefined && { address }),
                ...(phone !== undefined && { phone }),
                ...(active !== undefined && { active }),
                ...(requireCashClose !== undefined && { requireCashClose }),
                ...(settings !== undefined && { settings }),
            },
        });

        return NextResponse.json({ success: true, data: { ...branch, isActive: branch.active } });
    } catch (error: any) {
        if (error?.code === 'P2025') {
            return NextResponse.json({ success: false, error: 'Sucursal no encontrada' }, { status: 404 });
        }
        return NextResponse.json({ success: false, error: 'Error al actualizar sucursal' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/branches/[id] — Soft delete
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        await prisma.branch.update({
            where: { id },
            data: { active: false, deletedAt: new Date() },
        });

        return NextResponse.json({ success: true, message: 'Sucursal eliminada' });
    } catch (error: any) {
        if (error?.code === 'P2025') {
            return NextResponse.json({ success: false, error: 'Sucursal no encontrada' }, { status: 404 });
        }
        return NextResponse.json({ success: false, error: 'Error al eliminar sucursal' }, { status: 500 });
    }
}
