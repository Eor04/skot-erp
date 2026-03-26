import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/require-role';

export async function GET() {
    try {
        const users = await prisma.user.findMany({
            where: { deletedAt: null },
            select: {
                id: true, name: true, email: true, role: true,
                active: true, createdAt: true,
                branches: { include: { branch: { select: { id: true, name: true, type: true } } } },
            },
            orderBy: { name: 'asc' },
        });
        const data = users.map(u => ({ ...u, isActive: u.active }));
        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Error al obtener usuarios' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // Solo ADMIN puede crear usuarios
        const auth = await requireAdmin(request);
        if (auth instanceof NextResponse) return auth;

        const body = await request.json();
        const { name, email, role, password, branchId } = body;

        if (!name || !email || !role) {
            return NextResponse.json(
                { success: false, error: 'Campos requeridos: name, email, role' },
                { status: 400 }
            );
        }

        let hashedPassword = '';
        try {
            const bcrypt = await import('bcryptjs');
            hashedPassword = await bcrypt.hash(password || 'Skot2025!', 10);
        } catch {
            hashedPassword = Buffer.from(password || 'Skot2025!').toString('base64');
        }

        const user = await prisma.user.create({
            data: {
                name, email, role,
                password: hashedPassword,
                active: true,
                // Crear UserBranch si viene branchId
                ...(branchId
                    ? {
                        branches: {
                            create: [{ branchId }],
                        },
                    }
                    : {}),
            },
            select: {
                id: true, name: true, email: true, role: true, active: true, createdAt: true,
                branches: { include: { branch: { select: { id: true, name: true, type: true } } } },
            },
        });

        return NextResponse.json({ success: true, data: { ...user, isActive: user.active } }, { status: 201 });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ success: false, error: 'El email ya está registrado' }, { status: 409 });
        }
        return NextResponse.json({ success: false, error: 'Error al crear usuario' }, { status: 500 });
    }
}
