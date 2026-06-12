import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Middleware principal de Skot ERP
 * Protege rutas de página y API según autenticación y rol del usuario.
 *
 * IMPORTANTE: Este middleware corre en el Edge Runtime de Next.js.
 * No puede usar Prisma ni importar desde archivos que lo usen.
 * Solo lee el JWT de la cookie y verifica la firma.
 */

const SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'skot-erp-secret-2025-change-in-production'
);
const COOKIE_NAME = 'skot-session';

type Role = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'WAREHOUSE';

interface SessionPayload {
    userId: string;
    email: string;
    name: string;
    role: Role;
}

// ─── Rutas públicas (no requieren autenticación) ───
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];

// ─── Reglas de acceso por rol para PÁGINAS ───
// Si la ruta empieza con el prefix, solo los roles listados pueden acceder.
// Si no está listada aquí, cualquier usuario autenticado puede acceder.
const PAGE_RULES: { prefix: string; roles: Role[] }[] = [
    { prefix: '/admin/alerts', roles: ['ADMIN', 'MANAGER', 'WAREHOUSE'] },
    { prefix: '/admin', roles: ['ADMIN', 'MANAGER'] },
    { prefix: '/factory', roles: ['ADMIN', 'MANAGER', 'WAREHOUSE'] },
];

// ─── Reglas de acceso por rol para APIs ───
const API_RULES: { prefix: string; roles: Role[] }[] = [
    { prefix: '/api/admin/users', roles: ['ADMIN'] },
    { prefix: '/api/admin/branches', roles: ['ADMIN', 'MANAGER', 'WAREHOUSE'] },
    { prefix: '/api/admin/products', roles: ['ADMIN', 'MANAGER'] },
    { prefix: '/api/admin/sales', roles: ['ADMIN', 'MANAGER'] },
    { prefix: '/api/admin', roles: ['ADMIN', 'MANAGER'] },
    { prefix: '/api/factory', roles: ['ADMIN', 'MANAGER', 'WAREHOUSE'] },
];

// ─── Verificar JWT ───
async function verifySession(req: NextRequest): Promise<SessionPayload | null> {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, SECRET);
        return payload as unknown as SessionPayload;
    } catch {
        return null;
    }
}

// ─── Middleware ───
export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // 1. Rutas públicas → dejar pasar
    if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
        return NextResponse.next();
    }

    // 2. Archivos estáticos y Next.js internals → dejar pasar
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // 3. Verificar sesión
    const session = await verifySession(req);

    if (!session) {
        // API routes → 401
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { success: false, error: 'No autenticado' },
                { status: 401 }
            );
        }
        // Páginas → redirigir a login
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 4. Si está en /login y ya tiene sesión → redirigir al dashboard
    if (pathname === '/login') {
        return NextResponse.redirect(new URL('/', req.url));
    }

    // 5. Verificar permisos por rol
    const role = session.role;

    // 5a. Reglas para APIs
    if (pathname.startsWith('/api/')) {
        for (const rule of API_RULES) {
            if (pathname.startsWith(rule.prefix)) {
                if (!rule.roles.includes(role)) {
                    return NextResponse.json(
                        { success: false, error: 'Permisos insuficientes' },
                        { status: 403 }
                    );
                }
                break; // Primera regla que haga match es suficiente
            }
        }
        return NextResponse.next();
    }

    // 5b. Reglas para páginas
    for (const rule of PAGE_RULES) {
        if (pathname.startsWith(rule.prefix)) {
            if (!rule.roles.includes(role)) {
                // Redirigir a dashboard con mensaje
                return NextResponse.redirect(new URL('/?forbidden=1', req.url));
            }
            break;
        }
    }

    return NextResponse.next();
}

// ─── Matcher: en qué rutas corre este middleware ───
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
