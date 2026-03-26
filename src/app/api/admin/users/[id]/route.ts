import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/admin/users/[id] — Actualizar usuario y su sucursal asignada
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();
        const { name, email, role, active, password, branchId } = body;

        const updateData: any = {
            ...(name !== undefined && { name }),
            ...(email !== undefined && { email }),
            ...(role !== undefined && { role }),
            ...(active !== undefined && { active }),
        };

        if (password) {
            try {
                const bcrypt = await import('bcryptjs');
                updateData.password = await bcrypt.hash(password, 10);
            } catch {
                updateData.password = Buffer.from(password).toString('base64');
            }
        }

        // Actualizar usuario y re-asignar sucursal en una transacción
        const user = await prisma.$transaction(async (tx) => {
            const updated = await tx.user.update({
                where: { id },
                data: updateData,
                select: {
                    id: true, name: true, email: true, role: true,
                    active: true, createdAt: true,
                    branches: { include: { branch: { select: { id: true, name: true, type: true } } } },
                },
            });

            // Si se envió branchId (incluso vacío): reemplazar la asignación de sucursal
            if (branchId !== undefined) {
                // Eliminar asignaciones previas
                await tx.userBranch.deleteMany({ where: { userId: id } });
                // Crear nueva si hay branchId
                if (branchId) {
                    await tx.userBranch.create({ data: { userId: id, branchId } });
                }
            }

            // Volver a leer con las sucursales actualizadas
            return tx.user.findUnique({
                where: { id },
                select: {
                    id: true, name: true, email: true, role: true,
                    active: true, createdAt: true,
                    branches: { include: { branch: { select: { id: true, name: true, type: true } } } },
                },
            });
        });

        return NextResponse.json({ success: true, data: { ...user, isActive: user?.active } });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ success: false, error: 'El email ya está registrado' }, { status: 409 });
        }
        if (error?.code === 'P2025') {
            return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
        }
        return NextResponse.json({ success: false, error: 'Error al actualizar usuario' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/users/[id] — Soft delete
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        await prisma.user.update({
            where: { id },
            data: { active: false, deletedAt: new Date() },
        });
        return NextResponse.json({ success: true, message: 'Usuario eliminado' });
    } catch (error: any) {
        if (error?.code === 'P2025') {
            return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
        }
        return NextResponse.json({ success: false, error: 'Error al eliminar usuario' }, { status: 500 });
    }
}
