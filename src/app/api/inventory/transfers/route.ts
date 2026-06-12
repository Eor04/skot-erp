import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Listar transferencias
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fromBranchId = searchParams.get('fromBranchId');
        const toBranchId = searchParams.get('toBranchId');
        const branchId = searchParams.get('branchId');
        const status = searchParams.get('status');

        const transfers = await prisma.stockTransfer.findMany({
            where: {
                ...(fromBranchId && { fromBranchId }),
                ...(toBranchId && { toBranchId }),
                ...(branchId && {
                    OR: [
                        { fromBranchId: branchId },
                        { toBranchId: branchId },
                    ],
                }),
                ...(status && { status: status as any }),
            },
            include: {
                fromBranch: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                    },
                },
                toBranch: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                    },
                },
                items: {
                    include: {
                        product: true,
                    },
                },
            },
            orderBy: {
                requestedDate: 'desc',
            },
        });

        return NextResponse.json({
            success: true,
            data: transfers,
        });
    } catch (error) {
        console.error('Error al obtener transferencias:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Error al obtener transferencias',
            },
            { status: 500 }
        );
    }
}

// POST: Crear nueva transferencia
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { fromBranchId, toBranchId, items, notes, requestedBy } = body;

        if (!fromBranchId || !toBranchId || !items || items.length === 0 || !requestedBy) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Faltan campos requeridos: fromBranchId, toBranchId, items, requestedBy',
                },
                { status: 400 }
            );
        }

        if (fromBranchId === toBranchId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'La sucursal de origen y destino no pueden ser la misma',
                },
                { status: 400 }
            );
        }

        // Validar disponibilidad de stock
        for (const item of items) {
            const inventory = await prisma.inventory.findUnique({
                where: {
                    branchId_productId: {
                        branchId: fromBranchId,
                        productId: item.productId,
                    },
                },
                include: {
                    product: true,
                },
            });

            if (!inventory || inventory.currentStock < item.requestedQty) {
                return NextResponse.json(
                    {
                        success: false,
                        error: `Stock insuficiente de ${inventory?.product.name || 'producto'}. Disponible: ${inventory?.currentStock || 0}, Solicitado: ${item.requestedQty}`,
                    },
                    { status: 400 }
                );
            }
        }

        // Generar número de transferencia
        const now = new Date();
        const year = now.getFullYear();
        const lastTransfer = await prisma.stockTransfer.findFirst({
            where: {
                transferNumber: {
                    startsWith: `TRF-${year}-`,
                },
            },
            orderBy: {
                requestedDate: 'desc',
            },
        });

        const lastNumber = lastTransfer
            ? parseInt(lastTransfer.transferNumber.split('-')[2])
            : 0;
        const transferNumber = `TRF-${year}-${String(lastNumber + 1).padStart(4, '0')}`;

        // Crear transferencia
        const transfer = await prisma.stockTransfer.create({
            data: {
                transferNumber,
                fromBranchId,
                toBranchId,
                requestedBy,
                notes,
                status: 'PENDING',
                items: {
                    create: items.map((item: any) => ({
                        productId: item.productId,
                        requestedQty: item.requestedQty,
                        batchNumber: item.batchNumber,
                        expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
                    })),
                },
            },
            include: {
                fromBranch: true,
                toBranch: true,
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        return NextResponse.json(
            {
                success: true,
                data: transfer,
                message: 'Transferencia creada exitosamente',
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error al crear transferencia:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Error al crear transferencia',
            },
            { status: 500 }
        );
    }
}
