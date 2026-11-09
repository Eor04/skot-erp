import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { prisma } from '../src/lib/prisma';

test('clasificación es explícita, validada y repetible', async () => {
    const url = new URL(process.env.DATABASE_URL || '');
    assert.deepEqual([url.hostname, url.port, url.pathname], ['127.0.0.1', '55432', '/skot_test']);
    const suffix = randomUUID();
    const product = await prisma.product.create({ data: { name: 'Prueba clasificación', sku: `CLASS-${suffix}`, type: 'BURGER', unit: 'unidad' } });
    const directory = mkdtempSync(join(tmpdir(), 'skot-classification-'));
    try {
        const path = join(directory, 'classification.json');
        writeFileSync(path, JSON.stringify([{ productId: product.id, mode: 'STOCK' }]));
        const run = (apply: boolean) => spawnSync(process.execPath, ['--import', 'tsx', 'scripts/data/classify-consumption.ts', path, ...(apply ? ['--apply'] : [])], { encoding: 'utf8', env: process.env });
        let result = run(false);
        assert.equal(result.status, 0, result.stderr);
        assert.equal(JSON.parse(result.stdout).applied, false);
        assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).consumptionMode, null);
        result = run(true);
        assert.equal(result.status, 0, result.stderr);
        assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).consumptionMode, 'STOCK');
        result = run(true);
        assert.equal(result.status, 0, result.stderr);
        assert.equal(JSON.parse(result.stdout).products[0].changed, false);
        writeFileSync(path, JSON.stringify([{ productId: product.id, mode: 'RECIPE', recipeId: 'missing' }]));
        assert.notEqual(run(true).status, 0);
        assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).consumptionMode, 'STOCK');
    } finally { rmSync(directory, { recursive: true, force: true }); await prisma.$disconnect(); }
});
