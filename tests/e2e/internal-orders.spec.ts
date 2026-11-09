import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';

test('fábrica despacha y sucursal registra una recepción parcial', async ({ browser }) => {
    const db = new URL(process.env.DATABASE_URL || '');
    expect([db.hostname, db.port, db.pathname]).toEqual(['127.0.0.1', '55432', '/skot_test']);
    const prisma = new PrismaClient();
    const suffix = randomUUID();
    const branch = await prisma.branch.create({ data: { name: `Sucursal ${suffix}`, type: 'HAMBURGUESAS' } });
    const factory = await prisma.branch.create({ data: { name: `Fábrica ${suffix}`, type: 'FABRICA' } });
    const cashier = await prisma.user.create({ data: { name: 'Caja', email: `order-c-${suffix}@test.invalid`, password: 'test', role: 'CASHIER', branches: { create: { branchId: branch.id } } } });
    const warehouse = await prisma.user.create({ data: { name: 'Fábrica', email: `order-w-${suffix}@test.invalid`, password: 'test', role: 'WAREHOUSE', branches: { create: { branchId: factory.id } } } });
    const product = await prisma.product.create({ data: { name: `Carne ${suffix}`, sku: `ORDER-${suffix}`, type: 'RAW_MATERIAL', unit: 'kg',
        inventory: { create: { branchId: factory.id, currentStock: 10 } } } });
    const order = await prisma.internalOrder.create({ data: { orderNumber: `BROWSER-${suffix}`, fromBranchId: branch.id, toBranchId: factory.id,
        requestedBy: 'Caja', items: { create: { productId: product.id, requestedQty: 4, unit: 'kg' } } } });
    const sign = async (user: typeof cashier) => new SignJWT({ userId: user.id, email: user.email, name: user.name, role: user.role })
        .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h')
        .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    const warehouseContext = await browser.newContext({ viewport: { width: 1440, height: 850 } });
    const branchContext = await browser.newContext({ viewport: { width: 375, height: 850 } });
    try {
        await warehouseContext.addCookies([{ name: 'skot-session', value: await sign(warehouse), domain: '127.0.0.1', path: '/' }]);
        const warehousePage = await warehouseContext.newPage();
        await warehousePage.goto('http://127.0.0.1:3100/inventory/internal-orders');
        const card = warehousePage.getByText(order.orderNumber).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
        await card.getByRole('button', { name: 'Aprobar' }).click();
        await card.getByRole('button', { name: 'Despachar' }).click();
        await expect(card).toContainText('Despachado');
        await branchContext.addCookies([{ name: 'skot-session', value: await sign(cashier), domain: '127.0.0.1', path: '/' }]);
        const branchPage = await branchContext.newPage();
        await branchPage.goto('http://127.0.0.1:3100/inventory/internal-orders');
        const branchCard = branchPage.getByText(order.orderNumber).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
        await branchPage.getByText(order.orderNumber).click();
        await branchCard.getByLabel(`Cantidad recibida de ${product.name}`).fill('3');
        const receiptResponse = branchPage.waitForResponse(r => r.url().endsWith(`/internal-orders/${order.id}/receive`) && r.request().method() === 'POST');
        await branchCard.getByRole('button', { name: 'Confirmar recepción' }).click();
        expect((await receiptResponse).status()).toBe(200);
        await expect(branchCard).toContainText('Recibido');
        expect((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: branch.id, productId: product.id } } })).currentStock).toBe(3);
        expect((await prisma.mermaRecord.findFirstOrThrow({ where: { internalOrderId: order.id } })).quantity).toBe(1);
        expect(await branchPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    } finally { await warehouseContext.close(); await branchContext.close(); await prisma.$disconnect(); }
});

test('producción terminada prepara y despacha una transferencia', async ({ browser }) => {
    const db = new URL(process.env.DATABASE_URL || '');
    expect([db.hostname, db.port, db.pathname]).toEqual(['127.0.0.1', '55432', '/skot_test']);
    const prisma = new PrismaClient();
    const suffix = randomUUID();
    const branch = await prisma.branch.create({ data: { name: `Destino ${suffix}`, type: 'HAMBURGUESAS' } });
    const factory = await prisma.branch.create({ data: { name: `Fábrica ${suffix}`, type: 'FABRICA' } });
    const worker = await prisma.user.create({ data: { name: 'Fábrica', email: `transfer-${suffix}@test.invalid`, password: 'test', role: 'WAREHOUSE', branches: { create: { branchId: factory.id } } } });
    const cashier = await prisma.user.create({ data: { name: 'Caja', email: `transfer-c-${suffix}@test.invalid`, password: 'test', role: 'CASHIER', branches: { create: { branchId: branch.id } } } });
    const product = await prisma.product.create({ data: { name: `Preparación ${suffix}`, sku: `PROD-${suffix}`, type: 'BURGER_EXTRA', unit: 'unidad',
        inventory: { create: { branchId: factory.id, currentStock: 10 } } } });
    const recipe = await prisma.recipe.create({ data: { productId: product.id, name: 'Receta', yield: 1, yieldUnit: 'unidad' } });
    const order = await prisma.productionOrder.create({ data: { orderNumber: `BROWSER-${suffix}`, batchNumber: `LOTE-${suffix}`,
        branchId: factory.id, recipeId: recipe.id, plannedYield: 10, actualYield: 10, createdBy: worker.id, status: 'COMPLETED' } });
    const token = await new SignJWT({ userId: worker.id, email: worker.email, name: worker.name, role: worker.role })
        .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h')
        .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    const context = await browser.newContext({ viewport: { width: 1440, height: 850 } });
    const destinationContext = await browser.newContext({ viewport: { width: 375, height: 850 } });
    try {
        await context.addCookies([{ name: 'skot-session', value: token, domain: '127.0.0.1', path: '/' }]);
        const page = await context.newPage();
        await page.goto('http://127.0.0.1:3100/factory/production');
        const card = page.getByText(order.orderNumber).locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
        await card.getByRole('link', { name: 'Preparar envío' }).click();
        await expect(page.getByRole('heading', { name: 'Preparar envío' })).toBeVisible();
        await page.getByLabel('Mi sucursal que recibe').selectOption(branch.id);
        await expect(page.getByRole('button', { name: `Quitar ${product.name} de la solicitud` })).toBeVisible();
        await expect(page.getByText('No está habilitado para venta en el destino.')).toBeVisible();
        const creation = page.waitForResponse(r => r.url().endsWith('/api/inventory/transfers') && r.request().method() === 'POST');
        await page.getByRole('button', { name: 'Crear transferencia' }).click();
        const created = await creation;
        expect(created.status()).toBe(201);
        const transfer = (await created.json()).data;
        expect((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: factory.id, productId: product.id } } })).currentStock).toBe(10);
        await page.getByRole('link', { name: 'Ver transferencias y despachos' }).click();
        const transferCard = page.getByText(transfer.transferNumber).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
        const sending = page.waitForResponse(r => r.url().endsWith(`/transfers/${transfer.id}/approve`) && r.request().method() === 'PATCH');
        await transferCard.getByRole('button', { name: 'Despachar' }).click();
        expect((await sending).status()).toBe(200);
        expect((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: factory.id, productId: product.id } } })).currentStock).toBe(0);
        const cashierToken = await new SignJWT({ userId: cashier.id, email: cashier.email, name: cashier.name, role: cashier.role })
            .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h')
            .sign(new TextEncoder().encode(process.env.JWT_SECRET));
        await destinationContext.addCookies([{ name: 'skot-session', value: cashierToken, domain: '127.0.0.1', path: '/' }]);
        const destinationPage = await destinationContext.newPage();
        await destinationPage.goto('http://127.0.0.1:3100/inventory/transfers');
        const destinationCard = destinationPage.getByText(transfer.transferNumber).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
        const received = destinationPage.waitForResponse(r => r.url().endsWith(`/transfers/${transfer.id}/receive`) && r.request().method() === 'PATCH');
        await destinationCard.getByRole('button', { name: 'Confirmar recepción' }).click();
        expect((await received).status()).toBe(200);
        expect((await prisma.inventory.findUniqueOrThrow({ where: { branchId_productId: { branchId: branch.id, productId: product.id } } })).currentStock).toBe(10);
    } finally { await context.close(); await destinationContext.close(); await prisma.$disconnect(); }
});
