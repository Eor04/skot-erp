import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const branch = await prisma.branch.findFirst({ where: { type: 'ACAI' } });
    if (!branch) { console.log('No ACAI branch'); return; }
    const bps = await prisma.branchProduct.findMany({ where: { branchId: branch.id }, include: { product: true } });
    console.log(bps.map(bp => bp.product.name).join(', '));
}
main().finally(() => prisma.$disconnect());
