import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
        const data = branches.map(b => ({ ...b, isActive: b.active }));
        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Error al obtener sucursales' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, type, address, phone } = body;

        if (!name || !type) {
            return NextResponse.json(
                { success: false, error: 'Campos requeridos: name, type' },
                { status: 400 }
            );
        }

        // Mapear los tipos de la UI al enum real del schema
        const typeMap: Record<string, string> = {
            ACAI: 'ACAI',
            BURGER: 'HAMBURGUESAS',
            HAMBURGUESAS: 'HAMBURGUESAS',
            FACTORY: 'FABRICA',
            FABRICA: 'FABRICA',
            WAREHOUSE: 'ACAI', // fallback
        };

        const branch = await prisma.branch.create({
            data: { name, type: (typeMap[type] || type) as any, address, phone, active: true },
        });

        return NextResponse.json({ success: true, data: { ...branch, isActive: branch.active } }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Error al crear sucursal' }, { status: 500 });
    }
}
