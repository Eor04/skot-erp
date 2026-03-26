/**
 * Script de Datos Iniciales (Seed)
 * Crea datos iniciales: Usuario Admin, sucursales de prueba, productos e inventario
 */

import { PrismaClient, UserRole, BranchType, ProductType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando carga de datos (seed)...');

    // Limpiar datos existentes (opcional - comentar en producción)
    console.log('🗑️  Limpiando datos existentes...');
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.scaleConfig.deleteMany();
    await prisma.syncQueue.deleteMany();
    await prisma.product.deleteMany();
    await prisma.userBranch.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.user.deleteMany();

    // =============================
    // 1. CREAR USUARIO ADMIN
    // =============================
    console.log('👤 Creando usuario administrador...');
    const hashedPassword = await bcrypt.hash('Admin123!', 10);

    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@skot.com',
            name: 'Administrador Principal',
            password: hashedPassword,
            role: UserRole.ADMIN,
            active: true,
        },
    });
    console.log(`✅ Usuario admin creado: ${adminUser.email}`);

    // =============================
    // 2. CREAR SUCURSALES
    // =============================
    console.log('🏪 Creando sucursales...');

    const acaiBranch = await prisma.branch.create({
        data: {
            name: 'Skot Açaí Centro',
            type: BranchType.ACAI,
            address: 'Av. Principal 123, Centro',
            phone: '+591 12345678',
            active: true,
        },
    });
    console.log(`✅ Sucursal creada: ${acaiBranch.name}`);

    const burgerBranch = await prisma.branch.create({
        data: {
            name: 'Skot Burgers Plaza',
            type: BranchType.HAMBURGUESAS,
            address: 'Plaza Shopping, Local 45',
            phone: '+591 87654321',
            active: true,
        },
    });
    console.log(`✅ Sucursal creada: ${burgerBranch.name}`);

    // Asignar admin a todas las sucursales
    await prisma.userBranch.createMany({
        data: [
            { userId: adminUser.id, branchId: acaiBranch.id },
            { userId: adminUser.id, branchId: burgerBranch.id },
        ],
    });

    // =============================
    // 3. CREAR CONFIGURACIÓN DE BALANZA (Prix 4)
    // =============================
    console.log('⚖️  Creando configuración de balanza...');

    await prisma.scaleConfig.create({
        data: {
            branchId: acaiBranch.id,
            model: 'Prix 4',
            serialNumber: 'PX4-2024-001',
            port: 'COM1',
            baudRate: 9600,
            settings: {
                unitMode: 'kg',
                precision: 3,
                timeout: 5000,
            },
            active: true,
        },
    });
    console.log('✅ Configuración de balanza creada para sucursal Açaí');

    // =============================
    // 4. CREAR PRODUCTOS
    // =============================
    console.log('📦 Creando productos...');

    // Productos de Açaí
    const acaiProducts = await prisma.product.createMany({
        data: [
            // Bases de Açaí
            {
                name: 'Açaí Pequeño (300g)',
                sku: 'ACAI-SM-300',
                type: ProductType.ACAI_BASE,
                unit: 'kg',
                description: 'Base de açaí 300 gramos',
            },
            {
                name: 'Açaí Mediano (500g)',
                sku: 'ACAI-MD-500',
                type: ProductType.ACAI_BASE,
                unit: 'kg',
                description: 'Base de açaí 500 gramos',
            },
            {
                name: 'Açaí Grande (700g)',
                sku: 'ACAI-LG-700',
                type: ProductType.ACAI_BASE,
                unit: 'kg',
                description: 'Base de açaí 700 gramos',
            },
            // Toppings
            {
                name: 'Granola',
                sku: 'TOPP-GRANOLA',
                type: ProductType.ACAI_TOPPING,
                unit: 'kg',
                description: 'Granola crocante',
            },
            {
                name: 'Banana',
                sku: 'TOPP-BANANA',
                type: ProductType.ACAI_TOPPING,
                unit: 'kg',
                description: 'Banana en rodajas',
            },
            {
                name: 'Fresa',
                sku: 'TOPP-FRESA',
                type: ProductType.ACAI_TOPPING,
                unit: 'kg',
                description: 'Fresas frescas',
            },
            {
                name: 'Miel',
                sku: 'TOPP-MIEL',
                type: ProductType.ACAI_TOPPING,
                unit: 'liter',
                description: 'Miel de abeja',
            },
            {
                name: 'Leche Condensada',
                sku: 'TOPP-LECHE-COND',
                type: ProductType.ACAI_TOPPING,
                unit: 'liter',
                description: 'Leche condensada',
            },
        ],
    });
    console.log(`✅ ${acaiProducts.count} productos de Açaí creados`);

    // Productos de Hamburguesa
    const burgerProducts = await prisma.product.createMany({
        data: [
            {
                name: 'Hamburguesa Clásica',
                sku: 'BURG-CLASSIC',
                type: ProductType.BURGER,
                unit: 'unit',
                description: 'Hamburguesa con carne, lechuga, tomate',
            },
            {
                name: 'Hamburguesa Con Queso',
                sku: 'BURG-CHEESE',
                type: ProductType.BURGER,
                unit: 'unit',
                description: 'Hamburguesa con queso cheddar',
            },
            {
                name: 'Hamburguesa Bacon',
                sku: 'BURG-BACON',
                type: ProductType.BURGER,
                unit: 'unit',
                description: 'Hamburguesa con bacon y queso',
            },
            {
                name: 'Coca Cola 500ml',
                sku: 'BEV-COLA-500',
                type: ProductType.BEVERAGE,
                unit: 'unit',
                description: 'Coca Cola personal',
            },
            {
                name: 'Agua Mineral',
                sku: 'BEV-WATER',
                type: ProductType.BEVERAGE,
                unit: 'unit',
                description: 'Agua mineral 500ml',
            },
        ],
    });
    console.log(`✅ ${burgerProducts.count} productos de Hamburguesa creados`);

    // Materia Prima
    const rawMaterials = await prisma.product.createMany({
        data: [
            {
                name: 'Pulpa de Açaí Congelada',
                sku: 'RAW-ACAI-PULP',
                type: ProductType.RAW_MATERIAL,
                unit: 'kg',
                description: 'Pulpa de açaí para producción',
            },
            {
                name: 'Carne de Res Molida',
                sku: 'RAW-BEEF-GROUND',
                type: ProductType.RAW_MATERIAL,
                unit: 'kg',
                description: 'Carne molida para hamburguesas',
            },
            {
                name: 'Pan de Hamburguesa',
                sku: 'RAW-BUN',
                type: ProductType.RAW_MATERIAL,
                unit: 'unit',
                description: 'Pan para hamburguesas',
            },
        ],
    });
    console.log(`✅ ${rawMaterials.count} materias primas creadas`);

    // =============================
    // 5. CREAR INVENTARIO
    // =============================
    console.log('📊 Creando inventario...');

    // Obtener todos los productos
    const allProducts = await prisma.product.findMany();

    // Inventario sucursal Açaí
    const acaiProductInventory = allProducts
        .filter(
            (p) =>
                p.type === ProductType.ACAI_BASE ||
                p.type === ProductType.ACAI_TOPPING ||
                p.type === ProductType.RAW_MATERIAL
        )
        .map((product) => ({
            branchId: acaiBranch.id,
            productId: product.id,
            currentStock: 50,
            minStock: 10,
            maxStock: 200,
        }));

    await prisma.inventory.createMany({
        data: acaiProductInventory,
    });
    console.log(`✅ ${acaiProductInventory.length} ítems de inventario para sucursal Açaí`);

    // Inventario sucursal Hamburguesa
    const burgerProductInventory = allProducts
        .filter(
            (p) =>
                p.type === ProductType.BURGER ||
                p.type === ProductType.BEVERAGE ||
                p.type === ProductType.RAW_MATERIAL
        )
        .map((product) => ({
            branchId: burgerBranch.id,
            productId: product.id,
            currentStock: 100,
            minStock: 20,
            maxStock: 500,
        }));

    await prisma.inventory.createMany({
        data: burgerProductInventory,
    });
    console.log(`✅ ${burgerProductInventory.length} ítems de inventario para sucursal Hamburguesa`);

    console.log('\n🎉 Carga de datos completada exitosamente!');
    console.log('\n📋 Resumen:');
    console.log(`   - Usuarios: 1 (admin@skot.com / Admin123!)`);
    console.log(`   - Sucursales: 2 (1 Açaí, 1 Hamburguesas)`);
    console.log(`   - Productos: ${allProducts.length}`);
    console.log(`   - Ítems de Inventario: ${acaiProductInventory.length + burgerProductInventory.length}`);
}

main()
    .catch((e) => {
        console.error('❌ Error en carga de datos:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
