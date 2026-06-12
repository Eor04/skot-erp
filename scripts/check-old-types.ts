import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const p = await prisma.product.findMany({ where: { name: { in: ['Açaí Pequeño (300g)', 'Açaí Mediano (500g)', 'Açaí Grande (700g)', 'Coca Cola 500ml', 'Agua Mineral', 'Sprite 500ml'] } } });
    console.log(JSON.stringify(p.map(x=>x.type), null, 2));
}
main().finally(() => prisma.$disconnect());
