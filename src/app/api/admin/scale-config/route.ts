import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/scale-config?branchId=xxx
 * POST /api/admin/scale-config  — upsert de configuración de balanza
 */

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');

        if (branchId) {
            const config = await prisma.scaleConfig.findUnique({
                where: { branchId },
                include: { branch: { select: { id: true, name: true, type: true } } },
            });
            return NextResponse.json({ success: true, data: config });
        }

        // Sin branchId → devuelve todas las configuraciones
        const configs = await prisma.scaleConfig.findMany({
            include: { branch: { select: { id: true, name: true, type: true } } },
            orderBy: { createdAt: 'asc' },
        });
        return NextResponse.json({ success: true, data: configs });
    } catch (error) {
        console.error('Error GET /api/admin/scale-config:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener configuración' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { branchId, port, baudRate, tara, modelName, serialNumber, active } = body;

        if (!branchId) {
            return NextResponse.json({ success: false, error: 'branchId es requerido' }, { status: 400 });
        }

        const result = await prisma.scaleConfig.upsert({
            where: { branchId },
            create: {
                branchId,
                modelName: modelName ?? 'Prix 4',
                serialNumber: serialNumber ?? null,
                port: port ?? 'COM1',
                baudRate: baudRate ?? 9600,
                tara: tara ?? 0.15,
                active: active ?? true,
            },
            update: {
                modelName: modelName ?? 'Prix 4',
                serialNumber: serialNumber ?? null,
                port: port ?? 'COM1',
                baudRate: baudRate ?? 9600,
                tara: tara ?? 0.15,
                active: active ?? true,
            },
            include: {
                branch: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('Error POST /api/admin/scale-config:', error);
        return NextResponse.json({ success: false, error: 'Error al guardar configuración' }, { status: 500 });
    }
}
