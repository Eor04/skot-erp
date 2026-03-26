import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'skot-erp-secret-2025-change-in-production'
);

const COOKIE_NAME = 'skot-session';
const EXPIRY = '8h'; // Turno máximo

export interface SessionPayload {
    userId: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'WAREHOUSE';
}

export async function signToken(payload: SessionPayload): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(EXPIRY)
        .sign(SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, SECRET);
        return payload as unknown as SessionPayload;
    } catch {
        return null;
    }
}

export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
}

export function setSessionCookie(token: string) {
    return {
        name: COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 8 * 60 * 60, // 8 horas en segundos
        path: '/',
    };
}

export function clearSessionCookie() {
    return {
        name: COOKIE_NAME,
        value: '',
        maxAge: 0,
        path: '/',
    };
}
