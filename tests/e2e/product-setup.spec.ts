import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();
const suffix = randomUUID().toUpperCase();
let token: string;
let branch: { id: string; name: string };
let ingredient: { id: string; name: string };

test.beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL || '');
    expect([url.hostname, url.port, url.pathname]).toEqual(['127.0.0.1', '55432', '/skot_test']);
    const user = await prisma.user.create({ data: { name: 'Administración de prueba', email: `${suffix}@test.invalid`, password: 'test', role: 'ADMIN' } });
    branch = await prisma.branch.create({ data: { name: `Sucursal ${suffix}`, type: 'HAMBURGUESAS' } });
    ingredient = await prisma.product.create({ data: { name: `Carne ${suffix}`, sku: `MEAT-${suffix}`, type: 'RAW_MATERIAL', unit: 'kg' } });
    token = await new SignJWT({ userId: user.id, email: user.email, name: user.name, role: 'ADMIN' })
        .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h')
        .sign(new TextEncoder().encode(process.env.JWT_SECRET));
});
test.afterAll(async () => { await prisma.$disconnect(); });

for (const width of [375, 1440]) test(`asistente configura producto con receta y precio a ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 850 });
    await context.addCookies([{ name: 'skot-session', value: token, domain: '127.0.0.1', path: '/' }]);
    await page.goto('http://127.0.0.1:3100/admin/products/setup');
    await expect(page.getByRole('heading', { name: 'Preparar producto para venta' })).toBeVisible();
    await page.getByLabel('Nombre *').fill(`Junior ${width} ${suffix}`);
    await page.getByLabel('SKU *').fill(`J-${width}-${suffix}`);
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByLabel('¿Qué descuenta la venta?').selectOption('RECIPE');
    await page.getByLabel('Rendimiento de la receta (unidad)').fill('10');
    await page.getByLabel('Ingrediente 1', { exact: true }).selectOption(ingredient.id);
    await page.getByLabel('Cantidad del ingrediente 1').fill('1.2');
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByLabel('Precio común (Bs.)').fill('20');
    await page.getByLabel(branch.name).check();
    await page.getByRole('button', { name: 'Guardar y habilitar' }).click();
    await expect(page.getByRole('status')).toContainText('Producto configurado');
    await expect(page.getByRole('list', { name: 'Disponibilidad por sucursal' })).toContainText('Agotado');
    const product = await prisma.product.findUniqueOrThrow({ where: { sku: `J-${width}-${suffix}` }, include: { branchProducts: true, inventory: true } });
    expect(product.consumptionMode).toBe('RECIPE');
    expect(product.branchProducts[0].customPrice).toBe(20);
    expect(product.inventory).toHaveLength(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('un borrador conserva preparación y sucursales al retomarlo', async ({ page, context }) => {
    await context.addCookies([{ name: 'skot-session', value: token, domain: '127.0.0.1', path: '/' }]);
    await page.goto('http://127.0.0.1:3100/admin/products/setup');
    await page.getByLabel('Nombre *').fill(`Borrador ${suffix}`);
    await page.getByLabel('SKU *').fill(`DRAFT-${suffix}`);
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByLabel('¿Qué descuenta la venta?').selectOption('RECIPE');
    await page.getByLabel('Rendimiento de la receta (unidad)').fill('10');
    await page.getByLabel('Ingrediente 1', { exact: true }).selectOption(ingredient.id);
    await page.getByLabel('Cantidad del ingrediente 1').fill('1.2');
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByLabel('Precio común (Bs.)').fill('23');
    await page.getByLabel(branch.name).check();
    await page.getByRole('button', { name: 'Guardar borrador' }).click();
    await expect(page.getByRole('status')).toContainText('Borrador guardado');
    const draft = await prisma.product.findUniqueOrThrow({ where: { sku: `DRAFT-${suffix}` } });
    expect(draft.active).toBe(false);
    await page.goto(`http://127.0.0.1:3100/admin/products/setup?product=${draft.id}`);
    await expect(page.getByLabel('Nombre *')).toHaveValue(`Borrador ${suffix}`);
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page.getByLabel('¿Qué descuenta la venta?')).toHaveValue('RECIPE');
    await expect(page.getByLabel('Ingrediente 1', { exact: true })).toHaveValue(ingredient.id);
    await expect(page.getByLabel('Cantidad del ingrediente 1')).toHaveValue('1.2');
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page.getByRole('checkbox', { name: branch.name, exact: true })).toBeChecked();
    await expect(page.getByLabel('Precio común (Bs.)')).toHaveValue('23');
    await page.getByRole('button', { name: 'Guardar y habilitar' }).click();
    await expect(page.getByRole('status')).toContainText('Producto configurado');
    expect((await prisma.product.findUniqueOrThrow({ where: { id: draft.id } })).setupDraft).toBeNull();
});

test('el catálogo abre un pedido a fábrica con el producto elegido', async ({ page, context }) => {
    await context.addCookies([{ name: 'skot-session', value: token, domain: '127.0.0.1', path: '/' }]);
    await page.goto('http://127.0.0.1:3100/admin/products');
    await page.getByRole('link', { name: `Abastecer ${ingredient.name}` }).click();
    await expect(page.getByRole('heading', { name: 'Nuevo Pedido Interno' })).toBeVisible();
    await expect(page.getByPlaceholder('Buscar y seleccionar producto...')).toHaveValue(new RegExp(ingredient.name));
});

test('abastecer un producto preparado precarga sus ingredientes por rendimiento', async ({ page, context }) => {
    const burger = await prisma.product.create({ data: { name: `Burger abastecimiento ${suffix}`, sku: `RESTOCK-${suffix}`, type: 'BURGER', unit: 'unidad',
        branchProducts: { create: { branchId: branch.id, customPrice: 20 } } } });
    const recipe = await prisma.recipe.create({ data: { productId: burger.id, name: 'Receta de prueba', yield: 10, yieldUnit: 'unidad',
        ingredients: { create: { ingredientId: ingredient.id, quantity: 1.2, unit: 'kg' } } } });
    await prisma.product.update({ where: { id: burger.id }, data: { consumptionMode: 'RECIPE', saleRecipeId: recipe.id } });
    await context.addCookies([{ name: 'skot-session', value: token, domain: '127.0.0.1', path: '/' }]);
    await page.goto('http://127.0.0.1:3100/admin/products');
    await page.getByRole('link', { name: `Abastecer ${burger.name}` }).click();
    await expect(page.getByRole('heading', { name: 'Nuevo Pedido Interno' })).toBeVisible();
    await expect(page.getByRole('note')).toContainText('ingredientes para 1 unidad');
    await expect(page.getByPlaceholder('Buscar y seleccionar producto...')).toHaveValue(new RegExp(ingredient.name));
    await expect(page.locator('input[type="number"]').last()).toHaveValue('0.12');
});

test('la caja vende una hamburguesa preparada con ingredientes de la sucursal', async ({ page, context }) => {
    const cashier = await prisma.user.create({ data: { name: 'Cajero', email: `cashier-${suffix}@test.invalid`, password: 'test', role: 'CASHIER',
        branches: { create: { branchId: branch.id } } } });
    const cashierToken = await new SignJWT({ userId: cashier.id, email: cashier.email, name: cashier.name, role: 'CASHIER' })
        .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h')
        .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    await prisma.inventory.create({ data: { branchId: branch.id, productId: ingredient.id, currentStock: 1.2 } });
    const burger = await prisma.product.create({ data: { name: `POS Junior ${suffix}`, sku: `POS-${suffix}`, type: 'BURGER', unit: 'unidad',
        branchProducts: { create: { branchId: branch.id, customPrice: 20 } } } });
    const recipe = await prisma.recipe.create({ data: { productId: burger.id, name: 'Receta POS', yield: 10, yieldUnit: 'unidad',
        ingredients: { create: { ingredientId: ingredient.id, quantity: 1.2, unit: 'kg' } } } });
    await prisma.product.update({ where: { id: burger.id }, data: { consumptionMode: 'RECIPE', saleRecipeId: recipe.id } });
    const drink = await prisma.product.create({ data: { name: `Bebida ${suffix}`, sku: `DRINK-${suffix}`, type: 'BEVERAGE', unit: 'unidad', consumptionMode: 'STOCK',
        branchProducts: { create: { branchId: branch.id, customPrice: 5 } }, inventory: { create: { branchId: branch.id, currentStock: 3 } } } });
    await prisma.combo.create({ data: { name: `Combo ${suffix}`, price: 25, items: { create: [{ productId: burger.id, quantity: 1 }, { productId: drink.id, quantity: 1 }] } } });
    await prisma.productModifier.create({ data: { name: `Extra ${suffix}`, price: 2, category: 'BURGER' } });
    await prisma.cashRegisterClose.create({ data: { branchId: branch.id, userId: cashier.id, openingAmount: 0, expectedCash: 0,
        actualCash: 0, difference: 0, totalSales: 0, cashSales: 0, cardSales: 0, transferSales: 0, sessionStatus: 'OPEN' } });
    await context.addCookies([{ name: 'skot-session', value: cashierToken, domain: '127.0.0.1', path: '/' }]);
    await page.setViewportSize({ width: 1440, height: 850 });
    await page.goto('http://127.0.0.1:3100/burgers');
    const add = page.getByRole('button', { name: `Agregar POS Junior ${suffix} al pedido` });
    await expect(add).toBeEnabled();
    await add.click();
    await page.getByRole('button', { name: 'Cobrar', exact: true }).click();
    const saleResponse = page.waitForResponse(r => r.url().endsWith('/api/pos/sale') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Confirmar Pago' }).click();
    expect((await saleResponse).status()).toBe(201);
    await expect.poll(async () => (await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: branch.id, productId: ingredient.id } } })).currentStock).toBeCloseTo(1.08);
    expect(await prisma.inventory.findUnique({ where: { branchId_productId: { branchId: branch.id, productId: burger.id } } })).toBeNull();
    await page.getByRole('button', { name: /Combos/ }).click();
    await page.getByRole('button', { name: new RegExp(`Combo ${suffix}`) }).click();
    await page.getByRole('button', { name: /Extras/ }).first().click();
    await page.getByRole('button', { name: new RegExp(`Extra ${suffix}`) }).click();
    await page.getByRole('button', { name: 'Cobrar', exact: true }).click();
    const comboResponse = page.waitForResponse(r => r.url().endsWith('/api/pos/sale') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Confirmar Pago' }).click();
    expect((await comboResponse).status()).toBe(201);
    await expect.poll(async () => (await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: branch.id, productId: drink.id } } })).currentStock).toBe(2);
    await prisma.inventory.update({ where: { branchId_productId: { branchId: branch.id, productId: ingredient.id } }, data: { currentStock: 0.18 } });
    await page.reload();
    await add.click();
    await add.click();
    const cart = page.getByRole('complementary', { name: 'Resumen del pedido' });
    await expect(cart.getByLabel('Cantidad 1')).toBeVisible();
    await expect(cart.getByLabel('Cantidad 2')).toHaveCount(0);
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Cobrar', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar Pago' }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('skot_offline_sales_queue') || '[]').length)).toBe(1);
    const queued = await page.evaluate(() => JSON.parse(localStorage.getItem('skot_offline_sales_queue') || '[]')[0]);
    expect(queued.payload.items[0].consumptionSnapshot.recipe.ingredients[0].quantity).toBe(1.2);
    expect(queued.payload.items[0].offlineAuthorization).toBeTruthy();
    await prisma.recipeIngredient.updateMany({ where: { recipeId: recipe.id, ingredientId: ingredient.id }, data: { quantity: 1 } });
    await prisma.branchProduct.update({ where: { branchId_productId: { branchId: branch.id, productId: burger.id } }, data: { customPrice: 25 } });
    await context.setOffline(false);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('skot_offline_sales_queue') || '[]').length), { timeout: 15000 }).toBe(0);
    const syncedSale = await prisma.sale.findFirstOrThrow({ where: { branchId: branch.id, userId: cashier.id }, orderBy: { createdAt: 'desc' }, include: { items: true } });
    expect(syncedSale.totalAmount).toBe(20);
    expect(syncedSale.items[0].unitPrice).toBe(20);
    expect(((syncedSale.items[0] as any).offlineSnapshot).product.consumptionSnapshot.recipe.ingredients[0].quantity).toBe(1.2);
    expect((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: branch.id, productId: ingredient.id } } })).currentStock).toBe(0.06);
});
