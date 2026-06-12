import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting safe cleanup...');

    const productsToDisable: string[] = [];

    // 1. Find all ACAI_TOPPING products
    const toppings = await prisma.product.findMany({ where: { type: 'ACAI_TOPPING' } });
    productsToDisable.push(...toppings.map(t => t.id));

    // 2. Find ACAI_BASE products that don't start with ACAI- (if any)
    const oldBases = await prisma.product.findMany({ 
        where: { 
            type: 'ACAI_BASE',
            sku: { not: { startsWith: 'ACAI-' } }
        } 
    });
    productsToDisable.push(...oldBases.map(b => b.id));

    // 3. Find specific old raw materials related to Acai
    const oldRawSkus = ['RAW-ACAI-PULP', 'RAW-GRANOLA-BULK'];
    for (const sku of oldRawSkus) {
        const p = await prisma.product.findUnique({ where: { sku } });
        if (p) productsToDisable.push(p.id);
    }

    console.log(`Found ${productsToDisable.length} old Açaí products to clean up.`);

    for (const id of productsToDisable) {
        const p = await prisma.product.findUnique({ where: { id } });
        console.log(`Soft deleting: ${p?.name} (${p?.sku})`);
        
        // Delete from Inventory
        await prisma.inventory.deleteMany({ where: { productId: id } });
        
        // Delete from BranchProduct
        await prisma.branchProduct.deleteMany({ where: { productId: id } });

        // Set Product to inactive and deletedAt
        await prisma.product.update({ 
            where: { id }, 
            data: { active: false, deletedAt: new Date() } 
        });
    }

    console.log('Cleanup finished!');
}

main().finally(() => prisma.$disconnect());
