import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, SessionPayload } from './auth';
import { getUserContext } from './auth-middleware';

/** Autorización de servidor basada en el usuario y sus asignaciones actuales. */
export async function requireBranchAccess(
    request: NextRequest,
    branchId?: string | null,
    roles?: SessionPayload['role'][]
) {
    const session = await getSessionFromRequest(request);
    if (!session) {
        return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }
    const context = await getUserContext(session.userId);
    if (!context) {
        return NextResponse.json({ success: false, error: 'Usuario no disponible' }, { status: 401 });
    }
    if ((roles && !roles.includes(context.role)) ||
        (branchId && !context.allowedBranchIds.includes(branchId))) {
        return NextResponse.json({ success: false, error: 'No tienes permisos para esta operación o sucursal' }, { status: 403 });
    }
    return { ...session, role: context.role, allowedBranchIds: context.allowedBranchIds };
}
