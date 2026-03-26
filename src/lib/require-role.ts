import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, SessionPayload } from '@/lib/auth';

/**
 * requireRole — Helper para rutas API.
 * Verifica que exista sesión y que el rol esté en la lista de roles permitidos.
 *
 * @returns session si es válida, o NextResponse 401/403 si no.
 *
 * Uso:
 *   const result = await requireRole(request, ['ADMIN', 'MANAGER']);
 *   if (result instanceof NextResponse) return result;  // error response
 *   const session = result;  // sesión validada
 */
export async function requireRole(
    request: NextRequest,
    allowedRoles: SessionPayload['role'][]
): Promise<SessionPayload | NextResponse> {
    const session = await getSessionFromRequest(request);

    if (!session) {
        return NextResponse.json(
            { success: false, error: 'No autenticado' },
            { status: 401 }
        );
    }

    if (!allowedRoles.includes(session.role)) {
        return NextResponse.json(
            { success: false, error: 'No tienes permisos para realizar esta acción' },
            { status: 403 }
        );
    }

    return session;
}

/** Alias rápido: solo ADMIN */
export const requireAdmin = (req: NextRequest) => requireRole(req, ['ADMIN']);

/** Alias rápido: ADMIN o MANAGER */
export const requireAdminOrManager = (req: NextRequest) => requireRole(req, ['ADMIN', 'MANAGER']);
