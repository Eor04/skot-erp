import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const p = await prisma.product.findMany({ where: { type: 'ACAI_BASE' } });
    console.log(JSON.stringify(p.map(x=>x.sku), null, 2));
}
main().finally(() => prisma.$disconnect());
