import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { signToken } from '../src/lib/auth';
import { POST as create } from '../src/app/api/inventory/internal-orders/route';
import { POST as approve } from '../src/app/api/inventory/internal-orders/[id]/approve/route';
import { POST as dispatch } from '../src/app/api/inventory/internal-orders/[id]/dispatch/route';
import { POST as receive } from '../src/app/api/inventory/internal-orders/[id]/receive/route';
import { POST as receiveStock } from '../src/app/api/inventory/receiving/route';

test('pedido interno mueve existencias una sola vez y registra diferencias', async () => {
    const url = new URL(process.env.DATABASE_URL || '');
    assert.deepEqual([url.hostname, url.port, url.pathname], ['127.0.0.1', '55432', '/skot_test']);
    const suffix = randomUUID();
    const branch = await prisma.branch.create({ data: { name: `Sucursal ${suffix}`, type: 'HAMBURGUESAS' } });
    const factory = await prisma.branch.create({ data: { name: `Fábrica ${suffix}`, type: 'FABRICA' } });
    const cashier = await prisma.user.create({ data: { name: 'Caja', email: `io-c-${suffix}@test.invalid`, password: 'test', role: 'CASHIER', branches: { create: { branchId: branch.id } } } });
    const warehouse = await prisma.user.create({ data: { name: 'Fábrica', email: `io-w-${suffix}@test.invalid`, password: 'test', role: 'WAREHOUSE', branches: { create: { branchId: factory.id } } } });
    const token = async (u: typeof cashier) => signToken({ userId: u.id, name: u.name, email: u.email, role: u.role as 'CASHIER' | 'WAREHOUSE' });
    const cashierToken = await token(cashier), warehouseToken = await token(warehouse);
    const request = (path: string, body: unknown, auth: string) => new NextRequest(`http://localhost${path}`, { method: 'POST',
        headers: { cookie: `skot-session=${auth}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const product = await prisma.product.create({ data: { name: 'Carne', sku: `IO-${suffix}`, type: 'RAW_MATERIAL', unit: 'kg',
        inventory: { create: { branchId: factory.id, currentStock: 10 } } } });
    let response: Response = await create(request('/api/inventory/internal-orders', { fromBranchId: branch.id, toBranchId: factory.id,
        requestedBy: 'Caja', items: [{ productId: product.id, requestedQty: 4, unit: 'unit' }] }, cashierToken));
    assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
    const order = (await response.json()).data;
    assert.equal(order.items[0].unit, 'kg');
    const itemId = order.items[0].id, params = { params: { id: order.id } };
    response = await approve(request('/approve', { items: [{ itemId, approvedQty: 4 }] }, cashierToken), params);
    assert.equal(response.status, 403);
    response = await approve(request('/approve', { items: [{ itemId: 'otro', approvedQty: 4 }] }, warehouseToken), params);
    assert.equal(response.status, 400);
    response = await approve(request('/approve', { items: [{ itemId, approvedQty: 4 }] }, warehouseToken), params);
    assert.equal(response.status, 200);
    const send = () => dispatch(request('/dispatch', { items: [{ itemId, dispatchedQty: 4 }] }, warehouseToken), params);
    const sends = await Promise.all([send(), send()]);
    assert.deepEqual(sends.map(r => r.status).sort(), [200, 409]);
    const take = () => receive(request('/receive', { items: [{ itemId, receivedQty: 3 }] }, cashierToken), params);
    const receipts = await Promise.all([take(), take()]);
    assert.deepEqual(receipts.map(r => r.status).sort(), [200, 409]);
    assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: factory.id, productId: product.id } } })).currentStock, 6);
    assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: branch.id, productId: product.id } } })).currentStock, 3);
    assert.equal((await prisma.mermaRecord.findFirstOrThrow({ where: { internalOrderId: order.id } })).quantity, 1);
    assert.equal(await prisma.stockMovement.count({ where: { reference: order.orderNumber } }), 2);
    const receiptBody = { branchId: factory.id, supplier: 'Proveedor de prueba', receivedBy: warehouse.id,
        items: [{ productId: product.id, quantity: 1 }] };
    const incoming = await Promise.all([receiveStock(request('/receiving', receiptBody, warehouseToken)), receiveStock(request('/receiving', receiptBody, warehouseToken))]);
    assert.deepEqual(incoming.map(r => r.status), [201, 201]);
    assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: factory.id, productId: product.id } } })).currentStock, 8);
    response = await receiveStock(request('/receiving', { ...receiptBody, receivedBy: cashier.id }, cashierToken));
    assert.equal(response.status, 403);
    await prisma.$disconnect();
});
