import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { signToken } from '../src/lib/auth';
import { POST as setupProduct } from '../src/app/api/admin/product-setup/route';
import { POST as receiveGoods } from '../src/app/api/inventory/receiving/route';
import { POST as createTransfer } from '../src/app/api/inventory/transfers/route';
import { PATCH as dispatchTransfer } from '../src/app/api/inventory/transfers/[id]/approve/route';
import { PATCH as receiveTransfer } from '../src/app/api/inventory/transfers/[id]/receive/route';
import { POST as adjustStock } from '../src/app/api/inventory/adjustments/route';
import { GET as posProducts } from '../src/app/api/pos/products/route';
import { POST as openCash } from '../src/app/api/cash-close/open/route';
import { POST as closeCash } from '../src/app/api/cash-close/route';
import { POST as createSale } from '../src/app/api/pos/sale/route';

test('piloto aislado 27 de Mayo: receta, recepción, transferencia, venta, kardex y cierre', async () => {
    const url = new URL(process.env.DATABASE_URL || '');
    assert.equal(url.hostname, '127.0.0.1');
    assert.equal(url.port, '55432');
    assert.equal(url.pathname, '/skot_test');

    const suffix = randomUUID();
    const factory = await prisma.branch.create({ data: { name: `Piloto Fabrica ${suffix}`, type: 'FABRICA' } });
    const branch = await prisma.branch.create({ data: { name: `Piloto 27 de Mayo ${suffix}`, type: 'HAMBURGUESAS' } });
    const admin = await prisma.user.create({ data: { email: `admin-${suffix}@test.invalid`, name: 'Admin piloto', password: 'test', role: 'ADMIN' } });
    const cashier = await prisma.user.create({ data: { email: `caja-${suffix}@test.invalid`, name: 'Caja piloto', password: 'test', role: 'CASHIER',
        branches: { create: { branchId: branch.id } } } });
    const adminToken = await signToken({ userId: admin.id, email: admin.email, name: admin.name, role: 'ADMIN' });
    const cashierToken = await signToken({ userId: cashier.id, email: cashier.email, name: cashier.name, role: 'CASHIER' });
    const request = (path: string, token: string, method = 'GET', body?: unknown) => new NextRequest(`http://localhost${path}`, {
        method, headers: { cookie: `skot-session=${token}`, 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const body = async (response: Response) => response.json();
    const expectStatus = async (response: Response, status: number) => {
        const data = await body(response);
        assert.equal(response.status, status, JSON.stringify(data));
        return data;
    };

    const meat = await prisma.product.create({ data: { name: 'Carne Skot Junior', sku: `PILOT-M-${suffix}`, type: 'RAW_MATERIAL', unit: 'kg' } });
    const cheese = await prisma.product.create({ data: { name: 'Queso en lámina', sku: `PILOT-Q-${suffix}`, type: 'RAW_MATERIAL', unit: 'kg' } });
    const lettuce = await prisma.product.create({ data: { name: 'Lechuga', sku: `PILOT-L-${suffix}`, type: 'RAW_MATERIAL', unit: 'unidad' } });
    const tomato = await prisma.product.create({ data: { name: 'Tomate', sku: `PILOT-T-${suffix}`, type: 'RAW_MATERIAL', unit: 'kg' } });
    const bread = await prisma.product.create({ data: { name: 'Pan Skot Junior', sku: `PILOT-P-${suffix}`, type: 'RAW_MATERIAL', unit: 'unidad' } });

    const burgerSetup = await expectStatus(await setupProduct(request('/api/admin/product-setup', adminToken, 'POST', {
        name: 'Skot Junior', sku: `PILOT-JR-${suffix}`, unit: 'unidad', category: 'BURGER',
        description: 'Receta piloto: carne 100 g confirmado; queso 20 g, lechuga 0,05 unidad y tomate 30 g son aproximaciones; pan 1 unidad.',
        mode: 'RECIPE', recipe: { yield: 1, ingredients: [
            { id: meat.id, quantity: 0.1 }, { id: cheese.id, quantity: 0.02 }, { id: lettuce.id, quantity: 0.05 },
            { id: tomato.id, quantity: 0.03 }, { id: bread.id, quantity: 1 },
        ] }, branches: [{ branchId: branch.id, price: 15 }], publish: true,
    })), 201);
    const burger = burgerSetup.data;
    const cokeSetup = await expectStatus(await setupProduct(request('/api/admin/product-setup', adminToken, 'POST', {
        name: 'Coca-Cola personal', sku: `PILOT-COCA-${suffix}`, unit: 'botella', category: 'BEVERAGE',
        description: 'Botella del proveedor; se vende por unidad, sin conversión de paquete.',
        mode: 'STOCK', branches: [{ branchId: branch.id, price: 7 }], publish: true,
    })), 201);
    const coke = cokeSetup.data;

    // Reproduce de forma trazable las 10 unidades de prueba de hamburguesa y su corrección a cero.
    const testStock = await prisma.inventory.create({ data: { branchId: branch.id, productId: burger.id, currentStock: 0 } });
    void testStock;
    const seedAdjustment = await expectStatus(await adjustStock(request('/api/inventory/adjustments', adminToken, 'POST', {
        branchId: branch.id, productId: burger.id, type: 'ENTRADA', quantity: 10, reason: 'Fixture aislado: existencias de prueba previas', createdBy: admin.id,
    })), 201);
    const correction = await expectStatus(await adjustStock(request('/api/inventory/adjustments', adminToken, 'POST', {
        branchId: branch.id, productId: burger.id, type: 'AJUSTE', quantity: 0,
        reason: 'Corrección trazable de existencias de prueba; la Skot Junior se arma al vender', createdBy: admin.id,
    })), 201);

    const supply = [
        { productId: meat.id, quantity: 1 }, { productId: cheese.id, quantity: 0.2 }, { productId: lettuce.id, quantity: 0.5 },
        { productId: tomato.id, quantity: 0.3 }, { productId: bread.id, quantity: 10 }, { productId: coke.id, quantity: 10 },
    ];
    const receipt = await expectStatus(await receiveGoods(request('/api/inventory/receiving', adminToken, 'POST', {
        branchId: factory.id, supplier: 'Fixture de ensayo aislado', invoiceRef: `PILOT-${suffix}`,
        receivedBy: admin.id, notes: 'Cantidades de prueba; Coca-Cola en botellas individuales', items: supply,
    })), 201);
    const transfer = await expectStatus(await createTransfer(request('/api/inventory/transfers', adminToken, 'POST', {
        fromBranchId: factory.id, toBranchId: branch.id, requestedBy: admin.id,
        notes: 'Piloto aislado: ingredientes para 10 Skot Junior y 10 botellas individuales',
        items: supply.map(item => ({ productId: item.productId, requestedQty: item.quantity })),
    })), 201);
    await expectStatus(await dispatchTransfer(request(`/api/inventory/transfers/${transfer.data.id}/approve`, adminToken, 'PATCH'), { params: { id: transfer.data.id } }), 200);
    const receivedTransfer = await expectStatus(await receiveTransfer(request(`/api/inventory/transfers/${transfer.data.id}/receive`, cashierToken, 'PATCH'), { params: { id: transfer.data.id } }), 200);
    const duplicateReceipt = await receiveTransfer(request(`/api/inventory/transfers/${transfer.data.id}/receive`, cashierToken, 'PATCH'), { params: { id: transfer.data.id } });
    assert.equal(duplicateReceipt.status, 400);

    const before = await Promise.all(supply.map(async item => ({ productId: item.productId,
        stock: (await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: branch.id, productId: item.productId } } })).currentStock })));
    const cashierCatalog = await expectStatus(await posProducts(request(`/api/pos/products?branchId=${branch.id}&type=BURGER`, cashierToken)), 200);
    const burgerCatalog = cashierCatalog.data.find((p: any) => p.id === burger.id);
    const cokeCatalog = cashierCatalog.data.find((p: any) => p.id === coke.id);
    assert.equal(burgerCatalog.currentStock, 10);
    assert.equal(burgerCatalog.customPrice, 15);
    assert.equal(cokeCatalog.currentStock, 10);
    assert.equal(cokeCatalog.customPrice, 7);

    const opened = await expectStatus(await openCash(request('/api/cash-close/open', cashierToken, 'POST', {
        branchId: branch.id, userId: cashier.id, openingAmount: 0,
    })), 201);
    const unauthorizedOpen = await openCash(new NextRequest('http://localhost/api/cash-close/open', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ branchId: branch.id, userId: cashier.id, openingAmount: 0 }),
    }));
    assert.equal(unauthorizedOpen.status, 401);

    const now = new Date().toISOString();
    const salePayload = { branchId: branch.id, userId: cashier.id, paymentMethod: 'CASH',
        items: [
            { productId: burger.id, quantity: 1, unitPrice: 15, subtotal: 15, configVersion: burgerCatalog.configVersion,
                consumptionSnapshot: burgerCatalog.consumptionSnapshot, offlineAuthorization: burgerCatalog.offlineAuthorization },
            { productId: coke.id, quantity: 1, unitPrice: 7, subtotal: 7, configVersion: cokeCatalog.configVersion,
                consumptionSnapshot: cokeCatalog.consumptionSnapshot, offlineAuthorization: cokeCatalog.offlineAuthorization },
        ] };
    const offlineId = `pilot-${suffix}`;
    const offlinePayload = { ...salePayload, offlineId, createdAt: now };
    const sale = await expectStatus(await createSale(request('/api/pos/sale', cashierToken, 'POST', offlinePayload)), 201);
    assert.equal(sale.data.totalAmount, 22);
    const replay = await expectStatus(await createSale(request('/api/pos/sale', cashierToken, 'POST', offlinePayload)), 200);
    assert.equal(replay.replayed, true);
    const overStock = await createSale(request('/api/pos/sale', cashierToken, 'POST', { ...salePayload,
        items: [{ ...salePayload.items[0], quantity: 10, subtotal: 150 }] }));
    assert.equal(overStock.status, 400);

    const after = await Promise.all(supply.map(async item => ({ productId: item.productId,
        stock: (await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: branch.id, productId: item.productId } } })).currentStock })));
    const finalBurgerStock = (await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: branch.id, productId: burger.id } } })).currentStock;
    const saleRecord = await prisma.sale.findUniqueOrThrow({ where: { id: sale.data.id }, include: { items: true } });
    const movements = await prisma.stockMovement.findMany({ where: { branchId: branch.id,
        OR: [{ transferId: transfer.data.id }, { saleId: sale.data.id }, { id: correction.data.movement.id }, { id: seedAdjustment.data.movement.id }] },
        orderBy: { createdAt: 'asc' }, select: { id: true, productId: true, type: true, quantity: true, previousStock: true, newStock: true,
            reference: true, saleId: true, transferId: true } });
    assert.equal(saleRecord.totalAmount, 22);
    assert.ok(saleRecord.items.every(item => item.offlineSnapshot !== null));
    assert.equal(finalBurgerStock, 0);
    assert.equal(movements.filter(m => m.saleId === sale.data.id && m.type === 'SALIDA').length, 6);
    assert.deepEqual(after.map(x => Number(x.stock.toFixed(6))), [0.9, 0.18, 0.45, 0.27, 9, 9]);

    const closed = await expectStatus(await closeCash(request('/api/cash-close', cashierToken, 'POST', {
        branchId: branch.id, userId: cashier.id, sessionId: opened.data.id,
        openingAmount: 9999, actualCash: 22, notes: 'Cierre de prueba aislada; un cobro offline sincronizado una sola vez',
    })), 201);
    assert.equal(closed.data.openingAmount, 0);
    assert.equal(closed.data.totalSales, 22);
    assert.equal(closed.data.cashSales, 22);
    assert.equal(closed.data.expectedCash, 22);
    assert.equal(closed.data.actualCash, 22);
    assert.equal(closed.data.difference, 0);
    const unauthorizedClose = await closeCash(new NextRequest('http://localhost/api/cash-close', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ branchId: branch.id, userId: cashier.id, sessionId: opened.data.id, actualCash: 22 }),
    }));
    assert.equal(unauthorizedClose.status, 401);

    console.log('PILOT_EVIDENCE ' + JSON.stringify({
        environment: { database: `${url.hostname}:${url.port}${url.pathname}`, isolated: true },
        branches: { factory: { id: factory.id, name: factory.name }, branch: { id: branch.id, name: branch.name } },
        products: { burger: { id: burger.id, sku: burger.sku, recipeId: burger.saleRecipeId, price: 15 }, coke: { id: coke.id, sku: coke.sku, price: 7 } },
        stockCorrection: { initialTestStock: 10, finalStock: finalBurgerStock, movementIds: [seedAdjustment.data.movement.id, correction.data.movement.id] },
        receipt: { reference: receipt.reference, movementIds: receipt.data.map((m: any) => m.id) },
        transfer: { id: transfer.data.id, number: transfer.data.transferNumber, status: receivedTransfer.data.status },
        beforeSale: Object.fromEntries(before.map(x => [x.productId, x.stock])), afterSale: Object.fromEntries(after.map(x => [x.productId, x.stock])),
        sale: { id: sale.data.id, number: sale.data.saleNumber, total: sale.data.totalAmount, offlineId, replayed: replay.replayed,
            itemSnapshotPersisted: saleRecord.items.every(item => item.offlineSnapshot !== null) },
        kardex: movements,
        cash: { id: closed.data.id, opening: closed.data.openingAmount, expected: closed.data.expectedCash,
            counted: closed.data.actualCash, difference: closed.data.difference, status: closed.data.sessionStatus },
        checks: { transferReceiveReplayRejected: duplicateReceipt.status === 400, insufficientStockRejected: overStock.status === 400,
            cashOpenUnauthenticatedRejected: unauthorizedOpen.status === 401, cashCloseUnauthenticatedRejected: unauthorizedClose.status === 401 },
    }));
});
