// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';

/**
 * GET /api/cash-close/open?branchId=xxx
 * Verifica si hay una caja abierta para la sucursal.
 * Usado por los POS para bloquear ventas si no hay sesión activa.
 */
export async function GET(request: NextRequest) {
    try {
        const branchId = new URL(request.url).searchParams.get('branchId');
        const access = await requireBranchAccess(request, branchId);
        if (access instanceof NextResponse) return access;
        if (!branchId) {
            return NextResponse.json({ success: false, error: 'branchId requerido' }, { status: 400 });
        }
        const session = await prisma.cashRegisterClose.findFirst({
            where: { branchId, sessionStatus: 'OPEN' },
            select: { id: true, openingAmount: true, openedAt: true, openedBy: true },
        });
        return NextResponse.json({
            success: true,
            isOpen: !!session,
            session: session ?? null,
        });
    } catch (error) {
        console.error('GET /api/cash-close/open:', error);
        return NextResponse.json({ success: false, error: 'Error verificando caja' }, { status: 500 });
    }
}

/**
 * POST /api/cash-close/open
 * Abre una sesión de caja — crea un registro con sessionStatus = 'OPEN' y openedAt = now()
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { branchId, userId, openingAmount, openedBy } = body;

        if (!branchId || !userId) {
            return NextResponse.json(
                { success: false, error: 'branchId y userId son requeridos' },
                { status: 400 }
            );
        }

        const session = await prisma.$transaction(async (tx) => {
            // Verificar que no haya ya una caja abierta para esa sucursal (bloqueo transaccional)
            const existing = await tx.cashRegisterClose.findFirst({
                where: { branchId, sessionStatus: 'OPEN' },
            });
            if (existing) {
                throw new Error('Ya hay una caja abierta para esta sucursal');
            }

            return tx.cashRegisterClose.create({
                data: {
                    branchId,
                    userId,
                    openingAmount: parseFloat(openingAmount) || 0,
                    openedAt: new Date(),
                    openedBy: openedBy || null,
                    sessionStatus: 'OPEN',
                    // Campos requeridos que se completarán al cerrar
                    expectedCash: 0,
                    actualCash: 0,
                    difference: 0,
                    totalSales: 0,
                    cashSales: 0,
                    cardSales: 0,
                    transferSales: 0,
                },
                select: { id: true, openingAmount: true, openedAt: true, openedBy: true },
            });
        }, { isolationLevel: 'Serializable' });

        return NextResponse.json({ success: true, data: session }, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/cash-close/open:', error);
        return NextResponse.json({ success: false, error: error.message || 'Error al abrir caja' }, { status: 400 });
    }
}
