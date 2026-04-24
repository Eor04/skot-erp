import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/prisma';
import { signToken, setSessionCookie } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ success: false, error: 'Email y contraseña requeridos' }, { status: 400 });
        }

        // withRetry maneja el cold start de Neon en el primer login del día
        const user = await withRetry(() =>
            prisma.user.findUnique({
                where: { email: email.toLowerCase().trim(), active: true },
                select: { id: true, email: true, name: true, role: true, password: true, active: true },
            })
        );

        if (!user) {
            return NextResponse.json({ success: false, error: 'Credenciales incorrectas' }, { status: 401 });
        }

        // Verificar contraseña
        let valid = false;
        try {
            valid = await bcrypt.compare(password, user.password);
        } catch {
            // Fallback para passwords en base64 (modo sin bcrypt)
            valid = user.password === Buffer.from(password).toString('base64') ||
                user.password === password;
        }

        if (!valid) {
            return NextResponse.json({ success: false, error: 'Credenciales incorrectas' }, { status: 401 });
        }

        const token = await signToken({
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role as any,
        });

        const response = NextResponse.json({
            success: true,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });

        const cookie = setSessionCookie(token);
        response.cookies.set(cookie);

        return response;
    } catch (error: any) {
        const isColdStart = error?.message?.includes("Can't reach database") ||
            error?.message?.includes('connection pool');
        if (isColdStart) {
            return NextResponse.json({
                success: false,
                error: 'La base de datos está iniciando. Esperá 15 segundos e intentá de nuevo.',
            }, { status: 503 });
        }
        console.error('Login error:', error?.message?.split('\n')[0]);
        return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
    }
}
