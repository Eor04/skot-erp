import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { signToken } from '../src/lib/auth';
import { GET as catalog } from '../src/app/api/pos/products/route';
import { GET as combosCatalog } from '../src/app/api/pos/combos/route';
import { GET as modifiersCatalog } from '../src/app/api/pos/modifiers/route';
import { POST as sale } from '../src/app/api/pos/sale/route';
import { PUT as configure } from '../src/app/api/admin/products/[id]/consumption/route';
import { POST as setup } from '../src/app/api/admin/product-setup/route';
import { POST as completeProduction } from '../src/app/api/factory/production/[id]/complete/route';
import { POST as branchPrice } from '../src/app/api/admin/branch-products/route';
import { POST as createTransfer } from '../src/app/api/inventory/transfers/route';
import { PATCH as dispatchTransfer } from '../src/app/api/inventory/transfers/[id]/approve/route';
import { PATCH as receiveTransfer } from '../src/app/api/inventory/transfers/[id]/receive/route';
import { GET as transferReadiness } from '../src/app/api/inventory/transfer-readiness/route';
import { PUT as editRecipe } from '../src/app/api/factory/recipes/[id]/route';
import { PUT as editProduct } from '../src/app/api/admin/products/[id]/route';

test('producto preparado y producto terminado consumen el inventario correcto', async () => {
    const url = new URL(process.env.DATABASE_URL || '');
    assert.equal(url.hostname, '127.0.0.1');
    assert.equal(url.port, '55432');
    assert.equal(url.pathname, '/skot_test');
    const suffix = randomUUID();
    const branch = await prisma.branch.create({ data: { name: `Prueba ${suffix}`, type: 'HAMBURGUESAS' } });
    const user = await prisma.user.create({ data: { email: `${suffix}@test.invalid`, name: 'Prueba', password: 'test', role: 'ADMIN' } });
    const token = await signToken({ userId: user.id, email: user.email, name: user.name, role: 'ADMIN' });
    const request = (path: string, method = 'GET', body?: unknown) => new NextRequest(`http://localhost${path}`, {
        method, headers: { cookie: `skot-session=${token}`, 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const burger = await prisma.product.create({ data: { name: 'Junior', sku: `B-${suffix}`, type: 'BURGER', unit: 'unidad' } });
    const meat = await prisma.product.create({ data: { name: 'Carne', sku: `M-${suffix}`, type: 'RAW_MATERIAL', unit: 'kg' } });
    const recipe = await prisma.recipe.create({ data: { productId: burger.id, name: 'Junior', yield: 10, yieldUnit: 'unidad',
        ingredients: { create: { ingredientId: meat.id, quantity: 1.2, unit: 'kg' } } } });
    await prisma.branchProduct.create({ data: { productId: burger.id, branchId: branch.id, customPrice: 20 } });
    await prisma.inventory.create({ data: { productId: meat.id, branchId: branch.id, currentStock: 1.2 } });
    await prisma.inventory.create({ data: { productId: burger.id, branchId: branch.id, currentStock: 3 } });
    let response: Response = await configure(request(`/api/admin/products/${burger.id}/consumption`, 'PUT', { mode: 'RECIPE', recipeId: recipe.id }), { params: { id: burger.id } });
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    response = await catalog(request(`/api/pos/products?branchId=${branch.id}&type=BURGER`));
    let data = await response.json();
    assert.equal(data.data[0].currentStock, 10);
    const version = data.data[0].configVersion;
    assert.equal(data.data[0].consumptionSnapshot.recipe.ingredients[0].quantity, 1.2);
    const body = { branchId: branch.id, userId: user.id, paymentMethod: 'CASH', items: [{ productId: burger.id, quantity: 2, unitPrice: 20, subtotal: 40,
        configVersion: version, consumptionSnapshot: data.data[0].consumptionSnapshot, offlineAuthorization: data.data[0].offlineAuthorization }] };
    response = await sale(request('/api/pos/sale', 'POST', { ...body, items: [{ ...body.items[0], unitPrice: 0, subtotal: 0 }] }));
    assert.equal(response.status, 400);
    response = await sale(request('/api/pos/sale', 'POST', body));
    assert.equal(response.status, 201, JSON.stringify(await response.json()));
    let inventory = await prisma.inventory.findMany({ where: { branchId: branch.id } });
    assert.ok(Math.abs(inventory.find(x => x.productId === meat.id)!.currentStock - 0.96) < 1e-10);
    assert.equal(inventory.find(x => x.productId === burger.id)!.currentStock, 3);
    response = await configure(request(`/api/admin/products/${burger.id}/consumption`, 'PUT', { mode: 'STOCK' }), { params: { id: burger.id } });
    assert.equal(response.status, 200);
    await prisma.branchProduct.update({ where: { branchId_productId: { branchId: branch.id, productId: burger.id } }, data: { customPrice: 25 } });
    response = await sale(request('/api/pos/sale', 'POST', { ...body, createdAt: new Date().toISOString(), offlineId: `offline-${suffix}` }));
    assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
    const offlineSale = await prisma.sale.findUniqueOrThrow({ where: { branchId_offlineId: { branchId: branch.id, offlineId: `offline-${suffix}` } }, include: { items: true } });
    assert.equal(offlineSale.items[0].unitPrice, 20);
    assert.equal((offlineSale.items[0].offlineSnapshot as any).product.consumptionSnapshot.mode, 'RECIPE');
    assert.ok(Math.abs((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: branch.id, productId: meat.id } } })).currentStock - 0.72) < 1e-10);
    response = await sale(request('/api/pos/sale', 'POST', { ...body, items: [{ ...body.items[0], unitPrice: 25, subtotal: 50 }] }));
    assert.equal(response.status, 201, JSON.stringify(await response.json()));
    inventory = await prisma.inventory.findMany({ where: { branchId: branch.id } });
    assert.equal(inventory.find(x => x.productId === burger.id)!.currentStock, 1);
    assert.ok(Math.abs(inventory.find(x => x.productId === meat.id)!.currentStock - 0.72) < 1e-10);
    const single = { ...body, items: [{ ...body.items[0], quantity: 1, unitPrice: 25, subtotal: 25 }] };
    const simultaneous = await Promise.all([sale(request('/api/pos/sale', 'POST', single)), sale(request('/api/pos/sale', 'POST', single))]);
    assert.deepEqual(simultaneous.map(r => r.status).sort(), [201, 400]);
    assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: branch.id, productId: burger.id } } })).currentStock, 0);
    const branch2 = await prisma.branch.create({ data: { name: `Sucursal ${suffix}`, type: 'HAMBURGUESAS' } });
    const setupBody = { name: 'Nueva Junior', sku: `NEW-${suffix}`, unit: 'unidad', category: 'BURGER',
        mode: 'RECIPE', recipe: { yield: 10, ingredients: [{ id: meat.id, quantity: 1.2 }] },
        branches: [{ branchId: branch.id, price: 20 }, { branchId: branch2.id, price: 25 }], publish: true };
    response = await setup(request('/api/admin/product-setup', 'POST', { ...setupBody, branches: [{ branchId: branch.id, price: 0 }] }));
    assert.equal(response.status, 400);
    assert.equal(await prisma.product.count({ where: { sku: setupBody.sku } }), 0);
    response = await setup(request('/api/admin/product-setup', 'POST', setupBody));
    assert.equal(response.status, 201, JSON.stringify(await response.json()));
    const configured = await prisma.product.findUniqueOrThrow({ where: { sku: setupBody.sku }, include: { branchProducts: true, inventory: true } });
    assert.equal(configured.consumptionMode, 'RECIPE');
    assert.equal(configured.branchProducts.length, 2);
    assert.equal(configured.inventory.length, 0);
    response = await editRecipe(request(`/api/factory/recipes/${configured.saleRecipeId}`, 'PUT', {
        ingredients: [{ ingredientId: meat.id, quantity: 1, unit: 'g' }],
    }), { params: { id: configured.saleRecipeId! } });
    assert.equal(response.status, 400);
    assert.equal((await prisma.recipeIngredient.findFirstOrThrow({ where: { recipeId: configured.saleRecipeId! } })).unit, 'kg');
    response = await editProduct(request(`/api/admin/products/${meat.id}`, 'PUT', { unit: 'g' }), { params: { id: meat.id } });
    assert.equal(response.status, 400);
    response = await setup(request('/api/admin/product-setup', 'POST', { ...setupBody, id: configured.id, recipe: undefined,
        recipeId: configured.saleRecipeId, branches: [{ branchId: branch.id, price: 21 }] }));
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    assert.equal((await prisma.branchProduct.findUniqueOrThrow({ where: { branchId_productId: { branchId: branch2.id, productId: configured.id } } })).active, false);
    const factory = await prisma.branch.create({ data: { name: `Fábrica ${suffix}`, type: 'FABRICA' } });
    response = await transferReadiness(request(`/api/inventory/transfer-readiness?fromBranchId=${factory.id}&toBranchId=${branch2.id}&productId=${configured.id}&productId=${meat.id}`));
    assert.equal(response.status, 200);
    const readiness = (await response.json()).data;
    assert.equal(readiness.length, 1);
    assert.equal(readiness[0].productId, configured.id);
    assert.match(readiness[0].reason, /habilitado/);
    await prisma.inventory.create({ data: { productId: meat.id, branchId: factory.id, currentStock: 10 } });
    const order = await prisma.productionOrder.create({ data: { orderNumber: `TEST-${suffix}`, batchNumber: `LOT-${suffix}`,
        branchId: factory.id, recipeId: recipe.id, plannedYield: 10, createdBy: user.id, status: 'SCHEDULED' } });
    const completion = () => completeProduction(request(`/api/factory/production/${order.id}/complete`, 'POST', { actualYield: 10, completedBy: 'Operador' }), { params: { id: order.id } });
    const completed = await Promise.all([completion(), completion()]);
    assert.equal(completed.filter(r => r.status === 200).length, 1);
    assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: factory.id, productId: burger.id } } })).currentStock, 10);
    assert.ok(Math.abs((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: factory.id, productId: meat.id } } })).currentStock - 8.8) < 1e-10);
    assert.equal(await prisma.stockMovement.count({ where: { productionOrderId: order.id } }), 2);
    const drink = await prisma.product.create({ data: { name: 'Bebida', sku: `DRINK-${suffix}`, type: 'BEVERAGE', unit: 'unidad', consumptionMode: 'STOCK' } });
    await prisma.branchProduct.create({ data: { productId: drink.id, branchId: branch.id, customPrice: 5 } });
    await prisma.inventory.create({ data: { productId: drink.id, branchId: branch.id, currentStock: 10 } });
    await prisma.inventory.update({ where: { branchId_productId: { branchId: branch.id, productId: burger.id } }, data: { currentStock: 2 } });
    const combo = await prisma.combo.create({ data: { name: `Combo ${suffix}`, price: 25, items: { create: [
        { productId: burger.id, quantity: 1 }, { productId: drink.id, quantity: 1 },
    ] } } });
    response = await combosCatalog(request(`/api/pos/combos?branchId=${branch.id}`));
    const comboData = (await response.json()).data.find((c: any) => c.id === combo.id);
    const comboItems = [burger.id, drink.id].map(productId => {
        const comboProduct = comboData.items.find((i: any) => i.product.id === productId).product;
        return { productId, quantity: 1, unitPrice: 12.5, subtotal: 12.5, comboId: combo.id, comboGroup: '0',
            configVersion: comboProduct.configVersion, consumptionSnapshot: comboProduct.consumptionSnapshot,
            offlineAuthorization: comboProduct.offlineAuthorization, comboAuthorization: comboData.offlineAuthorization };
    });
    response = await sale(request('/api/pos/sale', 'POST', { ...body, items: comboItems }));
    assert.equal(response.status, 201, JSON.stringify(await response.json()));
    response = await sale(request('/api/pos/sale', 'POST', { ...body, items: comboItems.map(i => ({ ...i, subtotal: 1 })) }));
    assert.equal(response.status, 400);
    await prisma.combo.update({ where: { id: combo.id }, data: { price: 30 } });
    response = await sale(request('/api/pos/sale', 'POST', { ...body, createdAt: new Date().toISOString(), offlineId: `combo-offline-${suffix}`, items: comboItems }));
    assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
    assert.equal((await response.json()).data.totalAmount, 25);
    const bases = await Promise.all([40, 60].map(async (price, index) => {
        const product = await prisma.product.create({ data: { name: `Açaí ${index}`, sku: `ACAI-${index}-${suffix}`, type: 'ACAI_BASE', unit: 'kg', consumptionMode: 'STOCK' } });
        await prisma.branchProduct.create({ data: { productId: product.id, branchId: branch.id, pricePerKg: price } });
        await prisma.inventory.create({ data: { productId: product.id, branchId: branch.id, currentStock: 1 } });
        return product;
    }));
    const mixed = bases.map(p => ({ productId: p.id, quantity: 0.25, unitPrice: 50, subtotal: 12.5 }));
    response = await sale(request('/api/pos/sale', 'POST', { ...body, items: mixed }));
    assert.equal(response.status, 201, JSON.stringify(await response.json()));
    for (const base of bases) assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: branch.id, productId: base.id } } })).currentStock, 0.75);
    response = await catalog(request(`/api/pos/products?branchId=${branch.id}&type=ACAI`));
    const acaiSnapshots = (await response.json()).data;
    const offlineMixed = mixed.map(item => {
        const snapshot = acaiSnapshots.find((p: any) => p.id === item.productId);
        return { ...item, configVersion: snapshot.configVersion, consumptionSnapshot: snapshot.consumptionSnapshot,
            offlineAuthorization: snapshot.offlineAuthorization };
    });
    response = await sale(request('/api/pos/sale', 'POST', { ...body, createdAt: new Date().toISOString(), offlineId: `acai-offline-${suffix}`, items: offlineMixed }));
    assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
    for (const base of bases) assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: branch.id, productId: base.id } } })).currentStock, 0.5);
    response = await sale(request('/api/pos/sale', 'POST', { ...body, items: [{ ...single.items[0], unitPrice: 1, subtotal: 1 }] }));
    assert.equal(response.status, 400);
    response = await catalog(request(`/api/pos/products?branchId=${branch.id}&type=BURGER`));
    data = await response.json();
    const stockVersion = data.data.find((p: any) => p.id === burger.id).configVersion;
    const currentBurger = data.data.find((p: any) => p.id === burger.id);
    await prisma.inventory.update({ where: { branchId_productId: { branchId: branch.id, productId: burger.id } }, data: { currentStock: 1 } });
    const offlineBody = { ...single, createdAt: new Date().toISOString(), offlineId: `stock-${suffix}`,
        items: [{ ...single.items[0], configVersion: stockVersion, consumptionSnapshot: currentBurger.consumptionSnapshot,
            offlineAuthorization: currentBurger.offlineAuthorization }] };
    response = await sale(request('/api/pos/sale', 'POST', offlineBody));
    assert.equal(response.status, 201, JSON.stringify(await response.json()));
    response = await sale(request('/api/pos/sale', 'POST', offlineBody));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).replayed, true);
    response = await sale(request('/api/pos/sale', 'POST', { ...offlineBody, offlineId: `another-${suffix}` }));
    assert.equal(response.status, 409);
    const modifier = await prisma.productModifier.create({ data: { name: `Extra ${suffix}`, price: 2, category: 'BURGER' } });
    response = await modifiersCatalog(request(`/api/pos/modifiers?branchId=${branch.id}&category=BURGER`));
    const modifierAuth = (await response.json()).data.find((m: any) => m.id === modifier.id).offlineAuthorization;
    response = await catalog(request(`/api/pos/products?branchId=${branch.id}&type=BURGER`));
    const drinkSnapshot = (await response.json()).data.find((p: any) => p.id === drink.id);
    const extraOfflineBody = { ...body, createdAt: new Date().toISOString(), offlineId: `extra-offline-${suffix}`,
        items: [{ productId: drink.id, quantity: 1, unitPrice: 5, subtotal: 7, configVersion: drinkSnapshot.configVersion,
            consumptionSnapshot: drinkSnapshot.consumptionSnapshot, offlineAuthorization: drinkSnapshot.offlineAuthorization,
            modifiers: [{ modifierId: modifier.id, quantity: 1, price: 2, offlineAuthorization: modifierAuth }] }], extrasTotal: 2,
        extraModifiers: [{ modifierId: modifier.id, quantity: 1, price: 2, offlineAuthorization: modifierAuth }] };
    await prisma.productModifier.update({ where: { id: modifier.id }, data: { price: 3 } });
    response = await sale(request('/api/pos/sale', 'POST', extraOfflineBody));
    const extraSale = await response.json();
    assert.equal(response.status, 201, JSON.stringify(extraSale));
    assert.equal(extraSale.data.totalAmount, 9);
    response = await sale(request('/api/pos/sale', 'POST', { ...body, items: [{ productId: drink.id, quantity: 1, unitPrice: 5, subtotal: 5 }], extrasTotal: 2 }));
    assert.equal(response.status, 400);
    const cashier = await prisma.user.create({ data: { email: `cashier-${suffix}@test.invalid`, name: 'Caja', password: 'test', role: 'CASHIER', branches: { create: { branchId: branch.id } } } });
    const cashierToken = await signToken({ userId: cashier.id, email: cashier.email, name: cashier.name, role: 'CASHIER' });
    const forbidden = new NextRequest('http://localhost/api/admin/branch-products', { method: 'POST',
        headers: { cookie: `skot-session=${cashierToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ branchId: branch.id, productId: drink.id, customPrice: 1, active: true }) });
    assert.equal((await branchPrice(forbidden)).status, 403);
    const manager = await prisma.user.create({ data: { email: `manager-${suffix}@test.invalid`, name: 'Encargado', password: 'test', role: 'MANAGER', branches: { create: { branchId: branch.id } } } });
    const managerToken = await signToken({ userId: manager.id, email: manager.email, name: manager.name, role: 'MANAGER' });
    const wrongBranch = new NextRequest('http://localhost/api/admin/branch-products', { method: 'POST',
        headers: { cookie: `skot-session=${managerToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ branchId: branch2.id, productId: drink.id, customPrice: 5, active: true }) });
    assert.equal((await branchPrice(wrongBranch)).status, 403);
    const complimentary = await prisma.product.create({ data: { name: `Cortesía ${suffix}`, sku: `COMP-${suffix}`, type: 'BEVERAGE', unit: 'unidad', consumptionMode: 'STOCK' } });
    await prisma.branchProduct.create({ data: { branchId: branch.id, productId: complimentary.id, customPrice: 10 } });
    await prisma.inventory.create({ data: { branchId: branch.id, productId: complimentary.id, currentStock: 1 } });
    const cashierCourtesy = await sale(new NextRequest('http://localhost/api/pos/sale', { method: 'POST',
        headers: { cookie: `skot-session=${cashierToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, userId: cashier.id, items: [{ productId: complimentary.id, quantity: 1, unitPrice: 10, subtotal: 10 }],
            discount: { type: 'PERCENTAGE', value: 16 } }) }));
    assert.equal(cashierCourtesy.status, 403);
    response = await sale(request('/api/pos/sale', 'POST', { ...body,
        items: [{ productId: complimentary.id, quantity: 1, unitPrice: 10, subtotal: 10 }],
        discount: { type: 'PERCENTAGE', value: 100, authorizedBy: 'untrusted-client-value' } }));
    assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
    const courtesySale = await response.json();
    assert.equal(courtesySale.data.totalAmount, 0);
    assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: branch.id, productId: complimentary.id } } })).currentStock, 0);
    response = await createTransfer(request('/api/inventory/transfers', 'POST', { fromBranchId: factory.id, toBranchId: branch.id,
        requestedBy: user.id, items: [{ productId: burger.id, requestedQty: 4 }] }));
    assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
    const transferId = (await response.json()).data.id;
    assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: factory.id, productId: burger.id } } })).currentStock, 10);
    response = await dispatchTransfer(request(`/api/inventory/transfers/${transferId}/approve`, 'PATCH'), { params: { id: transferId } });
    assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
    response = await receiveTransfer(request(`/api/inventory/transfers/${transferId}/receive`, 'PATCH'), { params: { id: transferId } });
    assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
    response = await receiveTransfer(request(`/api/inventory/transfers/${transferId}/receive`, 'PATCH'), { params: { id: transferId } });
    assert.equal(response.status, 400);
    assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: factory.id, productId: burger.id } } })).currentStock, 6);
    assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: branch.id, productId: burger.id } } })).currentStock, 4);
    const secondBurger = await prisma.product.create({ data: { name: 'Segunda hamburguesa', sku: `SECOND-${suffix}`, type: 'BURGER', unit: 'unidad',
        branchProducts: { create: { branchId: branch.id, customPrice: 10 } } } });
    const secondRecipe = await prisma.recipe.create({ data: { productId: secondBurger.id, name: 'Segunda receta', yield: 10, yieldUnit: 'unidad',
        ingredients: { create: { ingredientId: meat.id, quantity: 1.2, unit: 'kg' } } } });
    await prisma.product.update({ where: { id: secondBurger.id }, data: { consumptionMode: 'RECIPE', saleRecipeId: secondRecipe.id } });
    await prisma.inventory.update({ where: { branchId_productId: { branchId: branch.id, productId: meat.id } }, data: { currentStock: 0.2 } });
    response = await sale(request('/api/pos/sale', 'POST', { ...body, items: [
        { productId: configured.id, quantity: 1, unitPrice: 21, subtotal: 21 },
        { productId: secondBurger.id, quantity: 1, unitPrice: 10, subtotal: 10 },
    ] }));
    assert.equal(response.status, 400);
    assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: branch.id, productId: meat.id } } })).currentStock, 0.2);
    const unclassified = await prisma.product.create({ data: { name: 'Sin clasificar', sku: `LEGACY-${suffix}`, type: 'BURGER', unit: 'unidad',
        branchProducts: { create: { branchId: branch.id, customPrice: 10 } }, inventory: { create: { branchId: branch.id, currentStock: 3 } } } });
    const previousStrict = process.env.REQUIRE_CLASSIFIED_CONSUMPTION;
    try {
        process.env.REQUIRE_CLASSIFIED_CONSUMPTION = 'true';
        response = await catalog(request(`/api/pos/products?branchId=${branch.id}&type=BURGER`));
        const pending = (await response.json()).data.find((p: any) => p.id === unclassified.id);
        assert.equal(pending.currentStock, 0);
        assert.match(pending.consumptionError, /configurar/);
        response = await sale(request('/api/pos/sale', 'POST', { ...body, items: [{ productId: unclassified.id, quantity: 1, unitPrice: 10, subtotal: 10 }] }));
        assert.equal(response.status, 409);
    } finally {
        if (previousStrict === undefined) delete process.env.REQUIRE_CLASSIFIED_CONSUMPTION;
        else process.env.REQUIRE_CLASSIFIED_CONSUMPTION = previousStrict;
    }
    await prisma.$disconnect();
});
