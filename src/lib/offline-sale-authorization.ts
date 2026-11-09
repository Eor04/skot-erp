import { createHmac, timingSafeEqual } from 'node:crypto';

const AUTH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type OfflineAuthorization = {
    v: 1;
    kind: 'product' | 'modifier' | 'combo';
    branchId: string;
    userId: string;
    issuedAt: number;
    expiresAt: number;
    [key: string]: unknown;
};

function secret() {
    const value = process.env.OFFLINE_SALE_SECRET || process.env.JWT_SECRET;
    return value && value.length >= 32 ? value : null;
}

function signature(encoded: string, key: string) {
    return createHmac('sha256', key).update(encoded).digest();
}

export function signOfflineAuthorization<T extends Omit<OfflineAuthorization, 'v' | 'issuedAt' | 'expiresAt'>>(claims: T): string | null {
    const key = secret();
    if (!key) return null;
    const now = Date.now();
    const payload = { ...claims, v: 1 as const, issuedAt: now, expiresAt: now + AUTH_TTL_MS } as unknown as OfflineAuthorization;
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${encoded}.${signature(encoded, key).toString('base64url')}`;
}

export function verifyOfflineAuthorization(token: unknown, expected: {
    kind: OfflineAuthorization['kind']; branchId: string; userId: string;
}): OfflineAuthorization | null {
    if (typeof token !== 'string' || token.length > 100_000) return null;
    const key = secret();
    if (!key) return null;
    const [encoded, supplied, extra] = token.split('.');
    if (!encoded || !supplied || extra !== undefined) return null;
    try {
        const actual = Buffer.from(supplied, 'base64url');
        const wanted = signature(encoded, key);
        if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return null;
        const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as OfflineAuthorization;
        const now = Date.now();
        if (payload.v !== 1 || payload.kind !== expected.kind || payload.branchId !== expected.branchId ||
            payload.userId !== expected.userId || !Number.isFinite(payload.issuedAt) || !Number.isFinite(payload.expiresAt) ||
            payload.issuedAt > now + 60_000 || payload.expiresAt <= now || payload.expiresAt - payload.issuedAt > AUTH_TTL_MS) return null;
        return payload;
    } catch { return null; }
}

export function offlineAuthorizationExpiry(token: unknown): number | null {
    if (typeof token !== 'string') return null;
    try { return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8')).expiresAt ?? null; }
    catch { return null; }
}
