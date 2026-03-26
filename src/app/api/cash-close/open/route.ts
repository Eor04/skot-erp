import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

        // Verificar que no haya ya una caja abierta para esa sucursal
        const existing = await prisma.cashRegisterClose.findFirst({
            where: { branchId, sessionStatus: 'OPEN' },
        });
        if (existing) {
            return NextResponse.json(
                { success: false, error: 'Ya hay una caja abierta para esta sucursal' },
                { status: 409 }
            );
        }

        const session = await prisma.cashRegisterClose.create({
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
            include: {
                branch: { select: { name: true } },
                user: { select: { name: true } },
            },
        });

        return NextResponse.json({ success: true, data: session }, { status: 201 });
    } catch (error) {
        console.error('POST /api/cash-close/open:', error);
        return NextResponse.json({ success: false, error: 'Error al abrir caja' }, { status: 500 });
    }
}
