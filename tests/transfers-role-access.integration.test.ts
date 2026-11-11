import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { signToken } from '../src/lib/auth';
import { GET as sources } from '../src/app/api/inventory/transfer-sources/route';
import { GET as products } from '../src/app/api/inventory/transfer-products/route';
import { GET as readiness } from '../src/app/api/inventory/transfer-readiness/route';
import { GET as listTransfers, POST as createTransfer } from '../src/app/api/inventory/transfers/route';
import { PATCH as dispatch } from '../src/app/api/inventory/transfers/[id]/approve/route';
import { PATCH as receive } from '../src/app/api/inventory/transfers/[id]/receive/route';

test('caja pide por destino, fábrica despacha por origen y destino recibe una vez', async () => {
    const url = new URL(process.env.DATABASE_URL || '');
    assert.deepEqual([url.hostname, url.port, url.pathname], ['127.0.0.1', '55432', '/skot_test']);
    const suffix = randomUUID();
    const branch = await prisma.branch.create({ data: { name: `Destino ${suffix}`, type: 'HAMBURGUESAS' } });
    const factory = await prisma.branch.create({ data: { name: `Fábrica ${suffix}`, type: 'FABRICA' } });
    const branch2 = await prisma.branch.create({ data: { name: `Destino adicional ${suffix}`, type: 'HAMBURGUESAS' } });
    const cashier = await prisma.user.create({ data: { name: 'Caja', email: `tr-c-${suffix}@test.invalid`, password: 'test', role: 'CASHIER', branches: { create: [{ branchId: branch.id }, { branchId: branch2.id }] } } });
    const manager = await prisma.user.create({ data: { name: 'Encargado', email: `tr-m-${suffix}@test.invalid`, password: 'test', role: 'MANAGER', branches: { create: { branchId: branch.id } } } });
    const warehouse = await prisma.user.create({ data: { name: 'Fábrica', email: `tr-w-${suffix}@test.invalid`, password: 'test', role: 'WAREHOUSE', branches: { create: { branchId: factory.id } } } });
    const admin = await prisma.user.create({ data: { name: 'Admin', email: `tr-a-${suffix}@test.invalid`, password: 'test', role: 'ADMIN' } });
    const token = async (user: typeof cashier) => signToken({ userId: user.id, email: user.email, name: user.name, role: user.role as 'CASHIER' | 'MANAGER' | 'WAREHOUSE' | 'ADMIN' });
    const [cashToken, managerToken, warehouseToken, adminToken] = await Promise.all([token(cashier), token(manager), token(warehouse), token(admin)]);
    const request = (path: string, auth: string, method = 'GET', body?: unknown) => new NextRequest(`http://localhost${path}`, {
        method, headers: { cookie: `skot-session=${auth}`, 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const product = await prisma.product.create({ data: { name: `Carne ${suffix}`, sku: `TR-${suffix}`, type: 'RAW_MATERIAL', unit: 'kg' } });

    let response: Response = await sources(request(`/api/inventory/transfer-sources?toBranchId=${branch.id}`, cashToken));
    assert.equal(response.status, 200);
    assert.ok((await response.json()).data.some((row: any) => row.id === factory.id));
    response = await sources(request(`/api/inventory/transfer-sources?toBranchId=${branch.id}`, managerToken));
    assert.equal(response.status, 200);
    response = await sources(request(`/api/inventory/transfer-sources?toBranchId=${branch.id}`, warehouseToken));
    assert.equal(response.status, 403);

    response = await products(request(`/api/inventory/transfer-products?intent=REQUEST&fromBranchId=${factory.id}&toBranchId=${branch.id}`, cashToken));
    assert.equal(response.status, 200);
    const catalog = (await response.json()).data;
    assert.ok(catalog.some((row: any) => row.id === product.id));
    assert.equal(Object.hasOwn(catalog.find((row: any) => row.id === product.id), 'currentStock'), false);
    response = await products(request(`/api/inventory/transfer-products?intent=SEND&fromBranchId=${factory.id}&toBranchId=${branch.id}`, cashToken));
    assert.equal(response.status, 403);

    const createRequest = (auth: string, toBranchId = branch.id) => createTransfer(request('/api/inventory/transfers', auth, 'POST', {
        intent: 'REQUEST', fromBranchId: factory.id, toBranchId, requestedBy: cashier.id,
        items: [{ productId: product.id, requestedQty: 3 }], notes: `Solicitud ficticia ${suffix}`,
    }));
    response = await createRequest(cashToken);
    assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
    const transfer = (await response.json()).data;
    assert.equal(transfer.status, 'PENDING');
    assert.equal(await prisma.stockMovement.count({ where: { transferId: transfer.id } }), 0);

    response = await createRequest(managerToken);
    assert.equal(response.status, 403); // requestedBy must match the authenticated user.
    response = await createTransfer(request('/api/inventory/transfers', managerToken, 'POST', {
        intent: 'REQUEST', fromBranchId: factory.id, toBranchId: branch.id, requestedBy: manager.id,
        items: [{ productId: product.id, requestedQty: 1 }],
    }));
    assert.equal(response.status, 201);
    response = await createTransfer(request('/api/inventory/transfers', cashToken, 'POST', {
        intent: 'REQUEST', fromBranchId: factory.id, toBranchId: branch2.id, requestedBy: cashier.id,
        items: [{ productId: product.id, requestedQty: 1 }],
    }));
    assert.equal(response.status, 201); // assigned to both destinations; no first-branch restriction.

    response = await listTransfers(request('/api/inventory/transfers', cashToken));
    assert.equal(response.status, 200);
    assert.ok((await response.json()).data.some((row: any) => row.id === transfer.id));

    response = await dispatch(request(`/api/inventory/transfers/${transfer.id}/approve`, warehouseToken, 'PATCH'), { params: { id: transfer.id } });
    assert.equal(response.status, 400); // Request is visible, but factory stock is insufficient.
    await prisma.inventory.create({ data: { branchId: factory.id, productId: product.id, currentStock: 3 } });
    response = await dispatch(request(`/api/inventory/transfers/${transfer.id}/approve`, warehouseToken, 'PATCH'), { params: { id: transfer.id } });
    assert.equal(response.status, 200);
    response = await dispatch(request(`/api/inventory/transfers/${transfer.id}/approve`, cashToken, 'PATCH'), { params: { id: transfer.id } });
    assert.equal(response.status, 403);

    response = await receive(request(`/api/inventory/transfers/${transfer.id}/receive`, cashToken, 'PATCH'), { params: { id: transfer.id } });
    assert.equal(response.status, 200);
    response = await receive(request(`/api/inventory/transfers/${transfer.id}/receive`, cashToken, 'PATCH'), { params: { id: transfer.id } });
    assert.equal(response.status, 400);
    assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: factory.id, productId: product.id } } })).currentStock, 0);
    assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: branch.id, productId: product.id } } })).currentStock, 3);
    assert.equal(await prisma.stockMovement.count({ where: { transferId: transfer.id } }), 2);

    response = await readiness(request(`/api/inventory/transfer-readiness?intent=REQUEST&fromBranchId=${factory.id}&toBranchId=${branch.id}&productId=${product.id}`, cashToken));
    assert.equal(response.status, 200);
    response = await readiness(request(`/api/inventory/transfer-readiness?intent=SEND&fromBranchId=${factory.id}&toBranchId=${branch.id}&productId=${product.id}`, cashToken));
    assert.equal(response.status, 403);
    response = await createTransfer(request('/api/inventory/transfers', adminToken, 'POST', {
        fromBranchId: factory.id, toBranchId: branch.id, requestedBy: admin.id, // legacy defaults to SEND
        items: [{ productId: product.id, requestedQty: 1 }],
    }));
    assert.equal(response.status, 400); // Legacy SEND still checks source stock.
});
