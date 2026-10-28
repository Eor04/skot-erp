// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';

/**
 * GET /api/expenses?branchId=xxx&limit=50&startDate=&endDate=
 * POST /api/expenses — Registrar nuevo gasto
 */

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const access = await requireBranchAccess(request, branchId);
        if (access instanceof NextResponse) return access;
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const category = searchParams.get('category');
        const limit = parseInt(searchParams.get('limit') || '50');

        if (!branchId) {
            return NextResponse.json({ success: false, error: 'branchId es requerido' }, { status: 400 });
        }

        const where: any = {
            branchId,
            ...(category && { category }),
            ...(startDate || endDate
                ? {
                    expenseDate: {
                        // Si startDate contiene 'T' es un datetime completo; si no, es solo fecha (desde medianoche)
                        ...(startDate && { gte: new Date(startDate) }),
                        // Si endDate contiene 'T' úsalo tal cual; si es solo fecha, añadir fin de día
                        ...(endDate && { lte: endDate.includes('T') ? new Date(endDate) : new Date(endDate + 'T23:59:59') }),
                    },
                }
                : {}),
        };

        const [expenses, totalAmount] = await Promise.all([
            prisma.expense.findMany({
                where,
                orderBy: { expenseDate: 'desc' },
                take: limit,
                include: { branch: { select: { name: true } } },
            }),
            prisma.expense.aggregate({
                where,
                _sum: { amount: true },
                _count: { id: true },
            }),
        ]);

        return NextResponse.json({
            success: true,
            data: expenses,
            summary: {
                total: totalAmount._count.id,
                sumAmount: totalAmount._sum.amount ?? 0,
            },
        });
    } catch (error) {
        console.error('GET /api/expenses:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener gastos' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { branchId, category, description, amount, supplier, paymentMethod, notes, registeredBy } = body;

        if (!branchId || !description || !amount || !registeredBy) {
            return NextResponse.json(
                { success: false, error: 'Campos requeridos: branchId, description, amount, registeredBy' },
                { status: 400 }
            );
        }
        if (amount <= 0) {
            return NextResponse.json({ success: false, error: 'El monto debe ser mayor a 0' }, { status: 400 });
        }

        const expense = await prisma.expense.create({
            data: {
                branchId,
                category: category || 'PROVEEDOR',
                description,
                amount: parseFloat(amount),
                supplier: supplier || null,
                paymentMethod: paymentMethod || 'CASH',
                notes: notes || null,
                registeredBy,
            },
            include: { branch: { select: { name: true } } },
        });

        return NextResponse.json({ success: true, data: expense }, { status: 201 });
    } catch (error) {
        console.error('POST /api/expenses:', error);
        return NextResponse.json({ success: false, error: 'Error al registrar gasto' }, { status: 500 });
    }
}
