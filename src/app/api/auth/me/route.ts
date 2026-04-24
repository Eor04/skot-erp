import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma, withRetry } from '@/lib/prisma';

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    let branchIds: string[] = [];
    let branchTypes: string[] = [];

    try {
        if (session.role === 'ADMIN') {
            const branches = await withRetry(() =>
                prisma.branch.findMany({
                    where: { active: true },
                    select: { id: true, type: true },
                })
            );
            branchIds = branches.map((b) => b.id);
            branchTypes = [...new Set(branches.map((b) => b.type))];
        } else {
            const userBranches = await withRetry(() =>
                prisma.userBranch.findMany({
                    where: { userId: session.userId },
                    include: { branch: { select: { id: true, type: true, active: true } } },
                })
            );
            const active = userBranches.filter((ub) => ub.branch.active);
            branchIds = active.map((ub) => ub.branch.id);
            branchTypes = [...new Set(active.map((ub) => ub.branch.type))];
        }
    } catch (e) {
        // Si falla incluso con reintentos, devolvemos sesión sin branchIds
        // (el frontend reintentará con el siguiente request)
        console.error('[auth/me] No se pudo cargar branchIds:', (e as Error).message?.split('\n')[0]);
    }

    return NextResponse.json({
        success: true,
        user: { ...session, branchIds, branchTypes },
    });
}
