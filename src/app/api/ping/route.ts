import { NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/prisma';

/**
 * GET /api/ping
 * Endpoint público para despertar la DB de Neon.
 * Abrilo en el navegador antes de empezar a trabajar.
 * Usa withRetry — puede tardar hasta ~40s si la DB estaba dormida.
 */
export async function GET() {
    const start = Date.now();
    try {
        await withRetry(() => prisma.$queryRaw`SELECT 1`, { retries: 5, baseDelayMs: 2000 });
        const ms = Date.now() - start;
        return NextResponse.json({
            ok: true,
            message: '✅ Base de datos activa',
            responseMs: ms,
            tip: ms > 5000
                ? '⚠️ La DB estaba durmiendo y acaba de despertar. Ya podés usar la app normalmente.'
                : '🚀 Conexión rápida — la DB ya estaba activa.',
        });
    } catch (e: any) {
        const ms = Date.now() - start;
        return NextResponse.json({
            ok: false,
            message: '❌ La DB no respondió todavía. Esperá 15 segundos y recargá esta página.',
            responseMs: ms,
            error: e.message?.split('\n')[0],
        }, { status: 503 });
    }
}
