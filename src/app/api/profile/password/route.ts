import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'skot-erp-secret-2025-change-in-production'
);

/**
 * PUT /api/profile/password
 * Cambia la contraseña del usuario autenticado.
 * Body: { currentPassword, newPassword }
 */
export async function PUT(request: NextRequest) {
    try {
        // Verificar token
        const token = request.cookies.get('skot-session')?.value;
        if (!token) return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });

        const { payload } = await jwtVerify(token, SECRET);
        const userId = (payload as any).userId as string;

        const { currentPassword, newPassword } = await request.json();
        if (!currentPassword || !newPassword) {
            return NextResponse.json({ success: false, error: 'Campos requeridos: currentPassword, newPassword' }, { status: 400 });
        }
        if (newPassword.length < 6) {
            return NextResponse.json({ success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });

        // Verificar contraseña actual
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) return NextResponse.json({ success: false, error: 'La contraseña actual no es correcta' }, { status: 400 });

        // Hashear y actualizar
        const hashed = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

        return NextResponse.json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (error: any) {
        console.error('PUT /api/profile/password:', error);
        return NextResponse.json({ success: false, error: 'Error al cambiar contraseña' }, { status: 500 });
    }
}

/**
 * GET /api/profile/password
 * Obtiene los datos del perfil del usuario autenticado (sin contraseña).
 */
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('skot-session')?.value;
        if (!token) return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });

        const { payload } = await jwtVerify(token, SECRET);
        const userId = (payload as any).userId as string;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, name: true, email: true, role: true, active: true,
                createdAt: true,
                branches: {
                    include: { branch: { select: { id: true, name: true, type: true } } },
                },
            },
        });
        if (!user) return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });

        return NextResponse.json({ success: true, data: user });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Error al obtener perfil' }, { status: 500 });
    }
}
