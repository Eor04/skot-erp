import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting specific cleanup...');

    const acaiBranch = await prisma.branch.findFirst({ where: { type: 'ACAI' } });
    if (!acaiBranch) {
        console.log('No ACAI branch found');
        return;
    }

    // 1. Soft delete old Açaí sizes
    const oldSizes = ['ACAI-SM-300', 'ACAI-MD-500', 'ACAI-LG-700'];
    for (const sku of oldSizes) {
        const p = await prisma.product.findUnique({ where: { sku } });
        if (p) {
            console.log(`Soft deleting ${p.name}`);
            await prisma.inventory.deleteMany({ where: { productId: p.id } });
            await prisma.branchProduct.deleteMany({ where: { productId: p.id } });
            await prisma.product.update({ where: { id: p.id }, data: { active: false, deletedAt: new Date() } });
        }
    }

    // 2. Remove old beverages from ACAI branch only!
    const oldBeverages = ['BEV-COLA-500', 'BEV-WATER', 'BEV-SPRITE-500'];
    for (const sku of oldBeverages) {
        const p = await prisma.product.findUnique({ where: { sku } });
        if (p) {
            console.log(`Unlinking ${p.name} from ACAI branch`);
            await prisma.inventory.deleteMany({ where: { productId: p.id, branchId: acaiBranch.id } });
            await prisma.branchProduct.deleteMany({ where: { productId: p.id, branchId: acaiBranch.id } });
        }
    }

    console.log('Cleanup finished!');
}

main().finally(() => prisma.$disconnect());
