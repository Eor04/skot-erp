// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';

/**
 * POST /api/inventory/receiving
 * Registra la entrada de mercancía al almacén/fábrica.
 * Permite ingresar múltiples productos en una sola operación (remito/factura).
 *
 * Body: {
 *   branchId:    string,       -- sucursal destino (almacén)
 *   supplier:    string,       -- nombre del proveedor
 *   invoiceRef:  string?,      -- número de factura/remito
 *   receivedBy:  string,       -- userId de quien recibe
 *   notes:       string?,
 *   items: [{ productId, quantity, notes? }]
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { branchId, supplier, invoiceRef, receivedBy, notes, items } = body;

        if (!branchId || !supplier || !receivedBy || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Faltan campos: branchId, supplier, receivedBy, items' },
                { status: 400 }
            );
        }

        const ref = invoiceRef
            ? `REC-${invoiceRef.toUpperCase().replace(/\s+/g, '-')}`
            : `REC-${Date.now()}`;

        // Procesar cada ítem en una única transacción
        const results = await prisma.$transaction(async (tx) => {
            const movements = [];

            for (const item of items) {
                const { productId, quantity, notes: itemNotes } = item;
                const qty = parseFloat(quantity);

                if (!productId || isNaN(qty) || qty <= 0) continue;

                // Stock actual
                const inv = await tx.inventory.findUnique({
                    where: { branchId_productId: { branchId, productId } },
                });
                const previousStock = inv?.currentStock ?? 0;
                const newStock = previousStock + qty;

                // Upsert inventario
                const updatedInv = await tx.inventory.upsert({
                    where: { branchId_productId: { branchId, productId } },
                    create: { branchId, productId, currentStock: newStock, minStock: 0, lastUpdated: new Date() },
                    update: { currentStock: newStock, lastUpdated: new Date() },
                });

                // Kardex
                const mv = await tx.stockMovement.create({
                    data: {
                        branchId,
                        productId,
                        inventoryId: updatedInv.id,
                        type: 'ENTRADA',
                        quantity: qty,
                        previousStock,
                        newStock,
                        reference: ref,
                        notes: [
                            `Recepción de ${supplier}`,
                            invoiceRef ? `Ref: ${invoiceRef}` : null,
                            itemNotes || null,
                            notes || null,
                        ].filter(Boolean).join(' | '),
                        createdBy: receivedBy,
                    },
                    include: {
                        product: { select: { name: true, unit: true, sku: true } },
                    },
                });

                movements.push({ ...mv, previousStock, newStock });
            }

            return movements;
        });

        return NextResponse.json({
            success: true,
            data: results,
            message: `${results.length} producto${results.length !== 1 ? 's' : ''} ingresado${results.length !== 1 ? 's' : ''} al almacén`,
            reference: ref,
        }, { status: 201 });

    } catch (error) {
        console.error('POST /api/inventory/receiving:', error);
        return NextResponse.json({ success: false, error: 'Error al registrar la recepción' }, { status: 500 });
    }
}

/**
 * GET /api/inventory/receiving?branchId=xxx&limit=30
 * Historial de recepciones (kardex con referencia REC-)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const access = await requireBranchAccess(request, branchId);
        if (access instanceof NextResponse) return access;
        const limit = parseInt(searchParams.get('limit') || '50');

        const movements = await prisma.stockMovement.findMany({
            where: {
                type: 'ENTRADA',
                reference: { startsWith: 'REC-' },
                branchId: branchId || { in: access.allowedBranchIds },
            },
            include: {
                product: { select: { id: true, name: true, sku: true, unit: true } },
                branch:  { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        // Agrupar por referencia para mostrar como remitos
        const byRef: Record<string, typeof movements> = {};
        for (const mv of movements) {
            const key = mv.reference ?? 'SIN-REF';
            if (!byRef[key]) byRef[key] = [];
            byRef[key].push(mv);
        }

        const receipts = Object.entries(byRef).map(([ref, mvs]) => ({
            reference: ref,
            date: mvs[0].createdAt,
            branchName: mvs[0].branch.name,
            // Parse supplier from notes "Recepción de XXXX | ..."
            supplier: (mvs[0].notes?.split(' | ')[0] ?? '').replace('Recepción de ', ''),
            itemsCount: mvs.length,
            items: mvs,
        }));

        return NextResponse.json({ success: true, data: receipts });
    } catch (error) {
        console.error('GET /api/inventory/receiving:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener recepciones' }, { status: 500 });
    }
}
