import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({
        where: {
            type: { in: ['ACAI_BASE', 'ACAI_TOPPING', 'BEVERAGE'] }
        }
    });

    for (const p of products) {
        await prisma.inventory.updateMany({
            where: { productId: p.id },
            data: { currentStock: 5 }
        });
    }

    console.log(`Updated ${products.length} acai products to have 5 stock.`);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
