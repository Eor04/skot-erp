import { NextRequest, NextResponse } from 'next/server';
import { requireBranchAccess } from '@/lib/branch-access';
import { serializableTransaction, OperationError } from '@/lib/transaction';

const include = {
    branch: { select: { id: true, name: true } },
    user: { select: { id: true, name: true } },
    items: { include: { product: { select: { name: true, unit: true } } } },
};

/** Los estados terminales no pueden reabrirse ni aplicar existencias otra vez. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER']);
        if (access instanceof NextResponse) return access;
        const { status, receivedDate, notes, itemsReceived } = await request.json();
        if (!['SENT', 'RECEIVED', 'CANCELLED'].includes(status)) {
            return NextResponse.json({ success: false, error: 'Estado inválido' }, { status: 400 });
        }
        if (receivedDate && !Number.isFinite(Date.parse(receivedDate))) {
            return NextResponse.json({ success: false, error: 'Fecha de recepción inválida' }, { status: 400 });
        }
        const updated = await serializableTransaction(async tx => {
            const order = await tx.purchaseOrder.findUnique({ where: { id: params.id }, include });
            if (!order) throw new OperationError('Pedido no encontrado', 404);
            if (!access.allowedBranchIds.includes(order.branchId)) throw new OperationError('Sucursal no permitida', 403);
            if (order.status === status) return order;
            if (['RECEIVED', 'CANCELLED'].includes(order.status)) throw new OperationError('No se puede modificar un pedido finalizado', 409);
            if (itemsReceived !== undefined && (!Array.isArray(itemsReceived) || status !== 'RECEIVED')) {
                throw new OperationError('Los ítems recibidos requieren el estado RECEIVED');
            }
            const quantities = new Map<string, number>();
            for (const item of itemsReceived ?? []) {
                const original = order.items.find(i => i.id === item.id);
                if (!original || quantities.has(item.id) || typeof item.receivedQty !== 'number' ||
                    !Number.isFinite(item.receivedQty) || item.receivedQty < 0 || item.receivedQty > original.quantity) {
                    throw new OperationError('Ítem o cantidad recibida inválidos');
                }
                quantities.set(item.id, item.receivedQty);
            }
            if (status === 'RECEIVED') {
                for (const item of order.items) {
                    // Cero explícito significa que no llegó ese ítem.
                    const qty = quantities.get(item.id) ?? item.quantity;
                    await tx.purchaseOrderItem.update({ where: { id: item.id }, data: { receivedQty: qty } });
                    if (qty === 0) continue;
                    const key = { branchId: order.branchId, productId: item.productId };
                    const inv = await tx.inventory.findUnique({ where: { branchId_productId: key } });
                    const after = await tx.inventory.upsert({ where: { branchId_productId: key },
                        create: { ...key, currentStock: qty, minStock: 0 },
                        update: { currentStock: { increment: qty }, lastUpdated: new Date() } });
                    await tx.stockMovement.create({ data: {
                        ...key, inventoryId: after.id, type: 'ENTRADA', quantity: qty,
                        previousStock: inv?.currentStock ?? 0, newStock: after.currentStock,
                        reference: order.id, createdBy: access.userId, notes: `Recepción pedido ${order.orderNumber}`,
                    } });
                }
            }
            return tx.purchaseOrder.update({ where: { id: order.id }, data: {
                status, ...(status === 'RECEIVED' ? { receivedDate: receivedDate ? new Date(receivedDate) : new Date() } : {}),
                ...(notes !== undefined ? { notes } : {}),
            }, include });
        });
        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        if (error instanceof OperationError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        console.error('Error al actualizar pedido:', error);
        return NextResponse.json({ success: false, error: 'Error al actualizar pedido' }, { status: 500 });
    }
}
