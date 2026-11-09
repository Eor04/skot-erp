/** Informe de solo lectura; redirigir la salida a un archivo privado si contiene datos reales. */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
async function main() {
    const columns = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint AS count FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'products' AND column_name IN ('consumptionMode', 'saleRecipeId')`;
    const hasConsumption = Number(columns[0].count) === 2;
    const products: any[] = await prisma.product.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' }, select: {
        id: true, sku: true, name: true, type: true, unit: true, active: true,
        ...(hasConsumption ? { consumptionMode: true, saleRecipeId: true } : {}),
        recipes: { include: { ingredients: { include: { ingredient: { select: { name: true, unit: true } } } } } },
        inventory: { include: { branch: { select: { name: true, type: true } } } },
        branchProducts: { include: { branch: { select: { name: true, type: true } } } },
        comboItems: { select: { comboId: true } },
    } as any }) as any[];
    const report = products.map(p => ({ id: p.id, sku: p.sku, name: p.name, type: p.type, unit: p.unit,
        active: p.active, mode: p.consumptionMode ?? null, saleRecipeId: p.saleRecipeId ?? null,
        pendingClassification: !p.consumptionMode,
        recipes: p.recipes.map((r: any) => ({ id: r.id, name: r.name, active: r.active, yield: r.yield, yieldUnit: r.yieldUnit,
            ingredients: r.ingredients.map((i: any) => ({ id: i.ingredientId, name: i.ingredient.name, quantity: i.quantity,
                unit: i.unit, inventoryUnit: i.ingredient.unit, unitMismatch: i.unit.trim().toLowerCase() !== i.ingredient.unit.trim().toLowerCase() })) })),
        stocks: p.inventory.map((i: any) => ({ branchId: i.branchId, branch: i.branch.name, branchType: i.branch.type, quantity: i.currentStock })),
        branches: p.branchProducts.map((b: any) => ({ branchId: b.branchId, branch: b.branch.name, active: b.active,
            customPrice: b.customPrice, pricePerKg: b.pricePerKg,
            missingPrice: b.active && (p.type === 'ACAI_BASE' ? !(b.pricePerKg && b.pricePerKg > 0) :
                ['BURGER', 'BURGER_EXTRA', 'BEVERAGE'].includes(p.type) && !(b.customPrice && b.customPrice > 0)) })),
        comboCount: p.comboItems.length,
    }));
    process.stdout.write(JSON.stringify({ generatedAt: new Date().toISOString(), migrationApplied: hasConsumption,
        note: 'Las ventas offline pendientes están en cada caja y deben revisarse allí.', products: report }, null, 2) + '\n');
}
main().catch(error => { console.error('No se pudo generar el informe:', error.message); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
