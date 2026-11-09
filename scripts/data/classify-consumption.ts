/** Clasificación revisada por el negocio; por defecto solo simula. */
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { consumptionConfig, consumptionInclude } from '../../src/lib/consumption-config';

type Row = { productId: string; mode: 'STOCK' | 'RECIPE'; recipeId?: string | null };
const prisma = new PrismaClient();
async function main() {
    const file = process.argv[2];
    const apply = process.argv.includes('--apply');
    if (!file || file.startsWith('--')) throw new Error('Uso: tsx scripts/data/classify-consumption.ts archivo.json [--apply]');
    const rows: Row[] = JSON.parse(await readFile(file, 'utf8'));
    if (!Array.isArray(rows) || !rows.length || new Set(rows.map(r => r.productId)).size !== rows.length ||
        rows.some(r => !r.productId || !['STOCK', 'RECIPE'].includes(r.mode) || (r.mode === 'RECIPE' && !r.recipeId))) {
        throw new Error('La lista debe tener productos únicos, modo y receta para RECIPE');
    }
    const report = await prisma.$transaction(async tx => {
        const changes = [];
        for (const row of rows) {
            const product = await tx.product.findUnique({ where: { id: row.productId }, include: consumptionInclude });
            if (!product || product.deletedAt) throw new Error(`Producto no disponible: ${row.productId}`);
            const recipe = row.mode === 'RECIPE' ? await tx.recipe.findUnique({ where: { id: row.recipeId! },
                include: { ingredients: { include: { ingredient: true }, orderBy: { id: 'asc' } } } }) : null;
            const saleRecipeId = row.mode === 'RECIPE' ? row.recipeId! : null;
            consumptionConfig({ ...product, consumptionMode: row.mode, saleRecipeId, saleRecipe: recipe });
            const changed = product.consumptionMode !== row.mode || product.saleRecipeId !== saleRecipeId;
            if (apply && changed) await tx.product.update({ where: { id: row.productId }, data: { consumptionMode: row.mode, saleRecipeId } });
            changes.push({ productId: product.id, sku: product.sku, name: product.name,
                previousMode: product.consumptionMode, previousRecipeId: product.saleRecipeId,
                mode: row.mode, recipeId: saleRecipeId, changed });
        }
        return changes;
    }, { isolationLevel: 'Serializable', timeout: 30000 });
    process.stdout.write(JSON.stringify({ applied: apply, products: report }, null, 2) + '\n');
}
main().catch(error => { console.error('Clasificación cancelada:', error.message); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
