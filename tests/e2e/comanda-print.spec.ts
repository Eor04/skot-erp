import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { renderComanda, type Comanda } from '../../src/lib/pos/print-comanda';

const order: Comanda = {
    saleNumber: 'V-20261108-0001',
    createdAt: new Date('2026-11-08T12:30:00'),
    area: 'Hamburguesas',
    customerName: 'Ana <Cocina>',
    offline: false,
    items: [
        { name: 'Combo doble', quantity: 2, details: ['2 × Hamburguesa doble', '2 × Papas', 'Sin cebolla'] },
        { name: 'Bebida', quantity: 1 },
    ],
};

for (const width of [375, 768, 1440]) {
    test(`comanda térmica legible a ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.setContent(renderComanda(order));
        await expect(page.locator('h1')).toContainText('Hamburguesas');
        await expect(page.locator('.item')).toHaveCount(2);
        await expect(page.locator('.detail')).toHaveCount(3);
        await expect(page.locator('.meta')).toContainText('Ana <Cocina>');
        const measurements = await page.evaluate(() => ({
            bodyWidth: document.body.getBoundingClientRect().width,
            viewportWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(measurements.bodyWidth).toBeLessThan(220);
        expect(measurements.scrollWidth).toBeLessThanOrEqual(measurements.viewportWidth);
    });
}

test('comanda açaí incluye peso, sabores y estado offline sin insertar HTML', async ({ page }) => {
    const html = renderComanda({
        saleNumber: 'OFF-123', createdAt: order.createdAt, area: 'Açaí', offline: true,
        items: [
            { name: 'Bowl mixto', quantity: 0.428, unit: 'kg', details: ['Açaí', '<script>alert(1)</script>'] },
            { name: 'Brownie', quantity: 1 },
        ],
    });
    await page.setContent(html);
    await expect(page.locator('.meta')).toContainText('PENDIENTE DE SINCRONIZACIÓN');
    await expect(page.locator('.item').first()).toContainText('0.428 kg');
    await expect(page.locator('script')).toHaveCount(0);
    await expect(page.locator('.detail').last()).toHaveText('<script>alert(1)</script>');
});

test('solicita imprimir la comanda y limpia el marco al terminar', async ({ page }) => {
    const source = readFileSync(join(process.cwd(), 'src/lib/pos/print-comanda.ts'), 'utf8')
        .replace(/^export /gm, '');
    const script = ts.transpileModule(`${source}\nwindow.printComandaForTest = printComanda;`, {
        compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
    }).outputText;
    await page.addScriptTag({ content: script });
    await page.evaluate((comanda) => {
        const originalAppend = document.body.appendChild.bind(document.body);
        document.body.appendChild = ((node: Node) => {
            if (node instanceof HTMLIFrameElement) {
                const originalLoad = node.onload;
                node.onload = event => {
                    const printWindow = node.contentWindow!;
                    printWindow.print = () => {
                        (window as any).printedComanda = node.srcdoc;
                        (window as any).printCount = ((window as any).printCount || 0) + 1;
                        printWindow.dispatchEvent(new Event('afterprint'));
                    };
                    if (typeof originalLoad === 'function') originalLoad.call(node, event);
                };
            }
            return originalAppend(node);
        }) as typeof document.body.appendChild;
        (window as any).printComandaForTest({ ...comanda, createdAt: new Date(comanda.createdAt) });
    }, { ...order, createdAt: order.createdAt.toISOString() });
    await expect.poll(() => page.evaluate(() => (window as any).printedComanda || '')).toContain('Combo doble');
    expect(await page.evaluate(() => (window as any).printCount)).toBe(1);
    await expect(page.locator('iframe')).toHaveCount(0);
});
