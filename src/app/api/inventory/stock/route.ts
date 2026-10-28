// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';

/**
 * GET /api/inventory/stock?branchId=xxx&search=yyy&type=RAW_MATERIAL&limit=200
 * Devuelve el stock actual. branchId es opcional.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId') || '';
        const access = await requireBranchAccess(request, branchId);
        if (access instanceof NextResponse) return access;
        const search = searchParams.get('search') || '';
        const type = searchParams.get('type') || '';
        const limit = parseInt(searchParams.get('limit') || '100');

        const inventory = await prisma.inventory.findMany({
            where: {
                branchId: branchId || { in: access.allowedBranchIds },
                product: {
                    active: true,
                    deletedAt: null,
                    ...(type ? { type: type as any } : {}),
                    ...(search ? {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { sku: { contains: search, mode: 'insensitive' } },
                        ],
                    } : {}),
                },
            },
            include: {
                product: {
                    select: { id: true, name: true, sku: true, type: true, unit: true, category: true },
                },
                branch: {
                    select: { id: true, name: true },
                },
            },
            orderBy: [{ product: { type: 'asc' } }, { product: { name: 'asc' } }],
            take: limit,
        });

        const data = inventory.map((inv) => ({
            id: inv.id,
            productId: inv.productId,
            product: inv.product,
            branch: inv.branch,
            currentStock: inv.currentStock,
            minStock: inv.minStock,
            maxStock: inv.maxStock,
            lastUpdated: inv.lastUpdated,
            status: inv.status,
            isLow: inv.currentStock > 0 && inv.currentStock < inv.minStock,
            isCritical: inv.currentStock <= 0,
        }));

        const summary = {
            total: data.length,
            low: data.filter(d => d.isLow).length,
            critical: data.filter(d => d.isCritical).length,
            ok: data.filter(d => !d.isLow && !d.isCritical).length,
        };

        return NextResponse.json({ success: true, data, summary });
    } catch (error) {
        console.error('Error GET /api/inventory/stock:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener inventario' },
            { status: 500 }
        );
    }
}
