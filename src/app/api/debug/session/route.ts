// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/debug/session
 * Endpoint temporal de diagnóstico — muestra la sesión completa del usuario.
 * Eliminar después del diagnóstico.
 */
export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    let dbUser = null;
    let userBranches: any[] = [];
    let dbError = null;

    try {
        dbUser = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { id: true, name: true, email: true, role: true, active: true },
        });

        userBranches = await prisma.userBranch.findMany({
            where: { userId: session.userId },
            include: {
                branch: { select: { id: true, name: true, type: true, active: true } },
            },
        });
    } catch (e: any) {
        dbError = e.message;
    }

    return NextResponse.json({
        session,
        dbUser,
        userBranches,
        dbError,
        branchIds: userBranches.map(ub => ub.branch.id),
        branchTypes: [...new Set(userBranches.map(ub => ub.branch.type))],
    });
}
