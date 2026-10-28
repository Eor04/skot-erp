// Ejecutar desde la raíz: node --env-file=.env scripts/functional/prepare.cjs
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');
const { writeFileSync, existsSync } = require('node:fs');
const assert = require('node:assert/strict');
const prisma = new PrismaClient();
const file = '.local/test-db/functional-fixtures.json';
(async () => {
    const url = new URL(process.env.DATABASE_URL);
    assert.equal(url.hostname, '127.0.0.1');
    assert.equal(url.port, '55432');
    assert.equal(url.pathname, '/skot_erp_test');
    assert(!existsSync(file), 'Ya existen fixtures; conservarlos para las pruebas, no sobrescribirlos.');
    const password = randomBytes(18).toString('base64url');
    const hash = await bcrypt.hash(password, 10);
    const f = await prisma.$transaction(async tx => {
        const branches = {};
        for (const [key, type] of Object.entries({burger:'HAMBURGUESAS', acai:'ACAI', factory:'FABRICA', other:'HAMBURGUESAS'})) {
            branches[key] = await tx.branch.create({data:{name:`PRUEBA ${key}`,type}});
        }
        const users = {};
        for (const [key, role, assigned, active] of [
            ['admin','ADMIN',['burger','acai','factory','other'],true],
            ['manager','MANAGER',['burger','acai','factory'],true],
            ['cashier','CASHIER',['burger'],true],
            ['acai','CASHIER',['acai'],true],
            ['warehouse','WAREHOUSE',['factory'],true],
            ['inactive','CASHIER',['burger'],false],
        ]) {
            const u=await tx.user.create({data:{email:`qa.${key}@skot.test`,name:`PRUEBA ${key}`,password:hash,role,active,
                branches:{create:assigned.map(b=>({branchId:branches[b].id}))}}});
            users[key]={id:u.id,email:u.email,name:u.name,role,password};
        }
        const products={};
        for (const [key,type,unit] of [['burger','BURGER','unit'],['acai','ACAI_BASE','kg'],['drink','BEVERAGE','unit'],['raw','RAW_MATERIAL','kg'],['prepared','RAW_MATERIAL','kg']]) {
            products[key]=await tx.product.create({data:{name:`PRUEBA ${key}`,sku:`QA-${key.toUpperCase()}`,type,unit,category:'PRUEBAS'}});
        }
        for(const [branchKey,keys] of Object.entries({burger:['burger','drink','raw'],acai:['acai','drink'],factory:['raw','prepared'],other:['burger','drink']})) {
            for(const key of keys) {
                const branchId=branches[branchKey].id, productId=products[key].id;
                await tx.branchProduct.create({data:{branchId,productId,customPrice:key==='burger'?20:key==='drink'?5:10,pricePerKg:key==='acai'?60:0}});
                await tx.inventory.create({data:{branchId,productId,currentStock:100,minStock:5}});
            }
        }
        const recipe=await tx.recipe.create({data:{name:'PRUEBA receta',productId:products.prepared.id,yield:2,yieldUnit:'kg',ingredients:{create:{ingredientId:products.raw.id,quantity:3,unit:'kg'}}}});
        return {createdAt:new Date().toISOString(),baseURL:'http://127.0.0.1:3100',branches,users,products,recipe};
    });
    writeFileSync(file,JSON.stringify(f,null,2)+'\n',{mode:0o600,flag:'wx'});
    console.log('Fixtures creados: 4 sucursales, 6 usuarios, 5 productos, inventarios y 1 receta.');
    console.log('Credenciales guardadas en .local/test-db/functional-fixtures.json (excluido de Git).');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
