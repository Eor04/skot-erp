const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching users and products from database...');

    const users = await prisma.user.findMany();
    const products = await prisma.product.findMany();

    const formatString = (str) => {
        if (str === null || str === undefined) return 'null';
        // escape quotes and newlines
        return `"${str.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
    };

    let seedContent = `import { PrismaClient, UserRole, ProductType } from '@prisma/client';\n`;
    seedContent += `import * as bcrypt from 'bcryptjs';\n\n`;
    seedContent += `const prisma = new PrismaClient();\n\n`;
    seedContent += `async function main() {\n`;
    seedContent += `    console.log('Seeding users and products...');\n\n`;

    // Users
    if (users.length > 0) {
        seedContent += `    const users = [\n`;
        users.forEach(u => {
            seedContent += `        {\n`;
            seedContent += `            email: ${formatString(u.email)},\n`;
            seedContent += `            name: ${formatString(u.name)},\n`;
            seedContent += `            password: ${formatString(u.password)},\n`;
            seedContent += `            role: UserRole.${u.role},\n`;
            seedContent += `            active: ${u.active},\n`;
            seedContent += `        },\n`;
        });
        seedContent += `    ];\n\n`;

        seedContent += `    console.log('Upserting Users...');\n`;
        seedContent += `    for (const user of users) {\n`;
        seedContent += `        await prisma.user.upsert({\n`;
        seedContent += `            where: { email: user.email },\n`;
        seedContent += `            update: user,\n`;
        seedContent += `            create: user,\n`;
        seedContent += `        });\n`;
        seedContent += `    }\n\n`;
    }

    // Products
    if (products.length > 0) {
        seedContent += `    const products = [\n`;
        products.forEach(p => {
            seedContent += `        {\n`;
            seedContent += `            name: ${formatString(p.name)},\n`;
            seedContent += `            description: ${formatString(p.description)},\n`;
            seedContent += `            sku: ${formatString(p.sku)},\n`;
            seedContent += `            type: ProductType.${p.type},\n`;
            seedContent += `            unit: ${formatString(p.unit)},\n`;
            seedContent += `            imageUrl: ${formatString(p.imageUrl)},\n`;
            seedContent += `            category: ${formatString(p.category)},\n`;
            seedContent += `            active: ${p.active},\n`;
            seedContent += `        },\n`;
        });
        seedContent += `    ];\n\n`;

        seedContent += `    console.log('Upserting Products...');\n`;
        seedContent += `    for (const product of products) {\n`;
        seedContent += `        await prisma.product.upsert({\n`;
        seedContent += `            where: { sku: product.sku },\n`;
        seedContent += `            update: product,\n`;
        seedContent += `            create: product,\n`;
        seedContent += `        });\n`;
        seedContent += `    }\n\n`;
    }

    seedContent += `    console.log('Seed completed successfully.');\n`;
    seedContent += `}\n\n`;
    seedContent += `main()\n`;
    seedContent += `  .then(async () => {\n`;
    seedContent += `    await prisma.$disconnect();\n`;
    seedContent += `  })\n`;
    seedContent += `  .catch(async (e) => {\n`;
    seedContent += `    console.error(e);\n`;
    seedContent += `    await prisma.$disconnect();\n`;
    seedContent += `    process.exit(1);\n`;
    seedContent += `  });\n`;

    fs.writeFileSync('prisma/seed_prueba.ts', seedContent, 'utf8');
    console.log('Generated prisma/seed_prueba.ts successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
