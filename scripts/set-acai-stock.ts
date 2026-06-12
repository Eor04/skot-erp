import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const branches = await prisma.branch.findMany();
    if (branches.length === 0) {
        console.error("No branches found");
        return;
    }

    const products = await prisma.product.findMany({
        where: {
            type: { in: ['ACAI_BASE', 'ACAI_TOPPING', 'BEVERAGE'] }
        }
    });

    console.log(`Found ${products.length} acai products and ${branches.length} branches.`);

    for (const branch of branches) {
        let branchProductCount = 0;
        let inventoryCount = 0;

        for (const p of products) {
            // Ensure BranchProduct
            const bp = await prisma.branchProduct.upsert({
                where: {
                    branchId_productId: {
                        branchId: branch.id,
                        productId: p.id
                    }
                },
                update: {
                    active: true
                },
                create: {
                    branchId: branch.id,
                    productId: p.id,
                    active: true,
                    customPrice: p.category === 'HELADOS' ? 10 : (p.category === 'EXTRAS Y AGUAS' ? 5 : 15),
                    pricePerKg: p.category === 'HELADOS' ? 100 : 0
                }
            });
            branchProductCount++;

            // Ensure Inventory
            const inv = await prisma.inventory.upsert({
                where: {
                    branchId_productId: {
                        branchId: branch.id,
                        productId: p.id
                    }
                },
                update: {
                    currentStock: 5
                },
                create: {
                    branchId: branch.id,
                    productId: p.id,
                    currentStock: 5,
                    minStock: 1
                }
            });
            inventoryCount++;
        }
        console.log(`Branch ${branch.name}: Upserted ${branchProductCount} BranchProducts and ${inventoryCount} Inventories with 5 stock.`);
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(() => {
    prisma.$disconnect();
});
