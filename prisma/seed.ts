/**
 * SKOT ERP - Script de Datos de Prueba (Seed Completo)
 * Cubre todos los módulos: Auth, Sucursales, Productos, Inventario,
 * Ventas, Caja, Fábrica/Recetas, Transferencias, Merma, Pedidos Internos,
 * Pedidos a Proveedores, Gastos, Combos, Alertas de Stock
 */

import {
  PrismaClient,
  UserRole,
  BranchType,
  ProductType,
  PaymentMethod,
  SalesChannel,
  ProductionOrderStatus,
  TransferStatus,
  InternalOrderStatus,
  MermaReason,
  ExpenseCategory,
  PurchaseOrderStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed completo de Skot ERP...\n');

  // ==========================================
  // LIMPIEZA TOTAL (orden inverso de deps)
  // ==========================================
  console.log('🗑️  Limpiando base de datos...');
  await prisma.saleItemModifier.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.cashRegisterClose.deleteMany();
  await prisma.mermaRecord.deleteMany();
  await prisma.internalOrderItem.deleteMany();
  await prisma.internalOrder.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stockTransferItem.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.productionOrder.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.stockAlert.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.comboItem.deleteMany();
  await prisma.combo.deleteMany();
  await prisma.branchProduct.deleteMany();
  await prisma.productModifier.deleteMany();
  await prisma.syncQueue.deleteMany();
  await prisma.scaleConfig.deleteMany();
  await prisma.userBranch.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Limpieza completada\n');

  // ==========================================
  // 1. USUARIOS
  // ==========================================
  console.log('👤 Creando usuarios...');
  const pass = async (p: string) => bcrypt.hash(p, 10);

  const [admin, manager, cashier1, cashier2, warehouse] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@skot.com',
        name: 'Administrador Principal',
        password: await pass('Admin123!'),
        role: UserRole.ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        email: 'gerente@skot.com',
        name: 'María García (Gerente)',
        password: await pass('Manager123!'),
        role: UserRole.MANAGER,
      },
    }),
    prisma.user.create({
      data: {
        email: 'cajero1@skot.com',
        name: 'Juan López (Cajero Açaí)',
        password: await pass('Cajero123!'),
        role: UserRole.CASHIER,
      },
    }),
    prisma.user.create({
      data: {
        email: 'cajero2@skot.com',
        name: 'Ana Martínez (Cajera Burger)',
        password: await pass('Cajero123!'),
        role: UserRole.CASHIER,
      },
    }),
    prisma.user.create({
      data: {
        email: 'almacen@skot.com',
        name: 'Carlos Ruiz (Almacén)',
        password: await pass('Almacen123!'),
        role: UserRole.WAREHOUSE,
      },
    }),
  ]);
  console.log(`✅ 5 usuarios creados`);

  // ==========================================
  // 2. SUCURSALES
  // ==========================================
  console.log('🏪 Creando sucursales...');
  const [fabrica, acaiBranch, burgerBranch] = await Promise.all([
    prisma.branch.create({
      data: {
        name: 'Fábrica Central',
        type: BranchType.FABRICA,
        address: 'Zona Industrial, Calle Producción 1',
        phone: '+591 70000001',
        active: true,
      },
    }),
    prisma.branch.create({
      data: {
        name: 'Skot Açaí Centro',
        type: BranchType.ACAI,
        address: 'Av. Principal 123, Centro',
        phone: '+591 70000002',
        active: true,
      },
    }),
    prisma.branch.create({
      data: {
        name: 'Skot Burgers Plaza',
        type: BranchType.HAMBURGUESAS,
        address: 'Plaza Shopping, Local 45',
        phone: '+591 70000003',
        active: true,
      },
    }),
  ]);
  console.log(`✅ 3 sucursales creadas (Fábrica, Açaí, Burgers)`);

  // ==========================================
  // 3. ASIGNAR USUARIOS A SUCURSALES
  // ==========================================
  await prisma.userBranch.createMany({
    data: [
      // Admin ve todo
      { userId: admin.id, branchId: fabrica.id },
      { userId: admin.id, branchId: acaiBranch.id },
      { userId: admin.id, branchId: burgerBranch.id },
      // Gerente ve todo
      { userId: manager.id, branchId: fabrica.id },
      { userId: manager.id, branchId: acaiBranch.id },
      { userId: manager.id, branchId: burgerBranch.id },
      // Cajero 1 → Açaí
      { userId: cashier1.id, branchId: acaiBranch.id },
      // Cajero 2 → Burgers
      { userId: cashier2.id, branchId: burgerBranch.id },
      // Almacén → Fábrica
      { userId: warehouse.id, branchId: fabrica.id },
    ],
  });
  console.log(`✅ Asignaciones de usuarios/sucursales creadas`);

  // ==========================================
  // 4. CONFIGURACIÓN DE BALANZA
  // ==========================================
  await prisma.scaleConfig.create({
    data: {
      branchId: acaiBranch.id,
      modelName: 'Prix 4',
      serialNumber: 'PX4-2024-001',
      port: 'COM1',
      baudRate: 9600,
      tara: 0.15,
      active: true,
    },
  });
  console.log(`✅ Configuración de balanza creada para Açaí`);

  // ==========================================
  // 5. PRODUCTOS
  // ==========================================
  console.log('📦 Creando productos...');

  // --- Açaí Bases ---
  const acaiSm = await prisma.product.create({ data: { name: 'Açaí Pequeño (300g)', sku: 'ACAI-SM-300', type: ProductType.ACAI_BASE, unit: 'kg', category: 'Açaí', description: 'Base de açaí 300g' } });
  const acaiMd = await prisma.product.create({ data: { name: 'Açaí Mediano (500g)', sku: 'ACAI-MD-500', type: ProductType.ACAI_BASE, unit: 'kg', category: 'Açaí', description: 'Base de açaí 500g' } });
  const acaiLg = await prisma.product.create({ data: { name: 'Açaí Grande (700g)', sku: 'ACAI-LG-700', type: ProductType.ACAI_BASE, unit: 'kg', category: 'Açaí', description: 'Base de açaí 700g' } });

  // --- Toppings ---
  const granola = await prisma.product.create({ data: { name: 'Granola', sku: 'TOPP-GRANOLA', type: ProductType.ACAI_TOPPING, unit: 'kg', category: 'Toppings' } });
  const banana = await prisma.product.create({ data: { name: 'Banana', sku: 'TOPP-BANANA', type: ProductType.ACAI_TOPPING, unit: 'kg', category: 'Toppings' } });
  const fresa = await prisma.product.create({ data: { name: 'Fresa', sku: 'TOPP-FRESA', type: ProductType.ACAI_TOPPING, unit: 'kg', category: 'Toppings' } });
  const miel = await prisma.product.create({ data: { name: 'Miel', sku: 'TOPP-MIEL', type: ProductType.ACAI_TOPPING, unit: 'liter', category: 'Toppings' } });
  const lecheCond = await prisma.product.create({ data: { name: 'Leche Condensada', sku: 'TOPP-LECHE-COND', type: ProductType.ACAI_TOPPING, unit: 'liter', category: 'Toppings' } });

  // --- Burgers ---
  const burgClasic = await prisma.product.create({ data: { name: 'Hamburguesa Clásica', sku: 'BURG-CLASSIC', type: ProductType.BURGER, unit: 'unit', category: 'Hamburguesas', description: 'Con carne, lechuga y tomate' } });
  const burgCheese = await prisma.product.create({ data: { name: 'Hamburguesa Con Queso', sku: 'BURG-CHEESE', type: ProductType.BURGER, unit: 'unit', category: 'Hamburguesas' } });
  const burgBacon = await prisma.product.create({ data: { name: 'Hamburguesa Bacon', sku: 'BURG-BACON', type: ProductType.BURGER, unit: 'unit', category: 'Hamburguesas' } });
  const burgDouble = await prisma.product.create({ data: { name: 'Doble Burger', sku: 'BURG-DOUBLE', type: ProductType.BURGER, unit: 'unit', category: 'Hamburguesas' } });

  // --- Extras / BURGER_EXTRA ---
  const papas = await prisma.product.create({ data: { name: 'Papas Fritas', sku: 'EXT-PAPAS', type: ProductType.BURGER_EXTRA, unit: 'unit', category: 'Extras' } });
  const choripan = await prisma.product.create({ data: { name: 'Choripán', sku: 'EXT-CHORIPAN', type: ProductType.BURGER_EXTRA, unit: 'unit', category: 'Extras' } });

  // --- Bebidas ---
  const cola500 = await prisma.product.create({ data: { name: 'Coca Cola 500ml', sku: 'BEV-COLA-500', type: ProductType.BEVERAGE, unit: 'unit', category: 'Bebidas' } });
  const agua = await prisma.product.create({ data: { name: 'Agua Mineral', sku: 'BEV-WATER', type: ProductType.BEVERAGE, unit: 'unit', category: 'Bebidas' } });
  const sprite = await prisma.product.create({ data: { name: 'Sprite 500ml', sku: 'BEV-SPRITE-500', type: ProductType.BEVERAGE, unit: 'unit', category: 'Bebidas' } });

  // --- Materias Primas ---
  const rawAcai = await prisma.product.create({ data: { name: 'Pulpa de Açaí Congelada', sku: 'RAW-ACAI-PULP', type: ProductType.RAW_MATERIAL, unit: 'kg', category: 'Materia Prima' } });
  const rawBeef = await prisma.product.create({ data: { name: 'Carne de Res Molida', sku: 'RAW-BEEF-GROUND', type: ProductType.RAW_MATERIAL, unit: 'kg', category: 'Materia Prima' } });
  const rawBun = await prisma.product.create({ data: { name: 'Pan de Hamburguesa', sku: 'RAW-BUN', type: ProductType.RAW_MATERIAL, unit: 'unit', category: 'Materia Prima' } });
  const rawCheese = await prisma.product.create({ data: { name: 'Queso Cheddar (kg)', sku: 'RAW-CHEESE', type: ProductType.RAW_MATERIAL, unit: 'kg', category: 'Materia Prima' } });
  const rawBacon = await prisma.product.create({ data: { name: 'Bacon (kg)', sku: 'RAW-BACON', type: ProductType.RAW_MATERIAL, unit: 'kg', category: 'Materia Prima' } });
  const rawGranola = await prisma.product.create({ data: { name: 'Granola a Granel', sku: 'RAW-GRANOLA-BULK', type: ProductType.RAW_MATERIAL, unit: 'kg', category: 'Materia Prima' } });

  console.log(`✅ Productos creados (bases, toppings, burgers, extras, bebidas, materias primas)`);

  // ==========================================
  // 6. MODIFICADORES DE PRODUCTOS
  // ==========================================
  console.log('🔧 Creando modificadores...');
  const [modSinCebolla, modExtraQueso, modPicante, modSinGluten, modExtraCarne] = await prisma.$transaction([
    prisma.productModifier.create({ data: { name: 'Sin Cebolla', price: 0, category: 'BURGER' } }),
    prisma.productModifier.create({ data: { name: 'Extra Queso', price: 5, category: 'BURGER' } }),
    prisma.productModifier.create({ data: { name: 'Picante', price: 0, category: 'BURGER' } }),
    prisma.productModifier.create({ data: { name: 'Sin Gluten', price: 3, category: 'BURGER' } }),
    prisma.productModifier.create({ data: { name: 'Extra Carne', price: 10, category: 'BURGER' } }),
  ]);
  console.log(`✅ 5 modificadores creados`);

  // ==========================================
  // 7. PRECIOS POR SUCURSAL (BranchProduct)
  // ==========================================
  console.log('💰 Configurando precios por sucursal...');
  await prisma.branchProduct.createMany({
    data: [
      // Açaí branch - precios
      { branchId: acaiBranch.id, productId: acaiSm.id, customPrice: 25, pricePerKg: 83 },
      { branchId: acaiBranch.id, productId: acaiMd.id, customPrice: 35, pricePerKg: 70 },
      { branchId: acaiBranch.id, productId: acaiLg.id, customPrice: 45, pricePerKg: 64 },
      { branchId: acaiBranch.id, productId: granola.id, customPrice: 8, pricePerKg: 8 },
      { branchId: acaiBranch.id, productId: banana.id, customPrice: 3, pricePerKg: 3 },
      { branchId: acaiBranch.id, productId: fresa.id, customPrice: 5, pricePerKg: 5 },
      { branchId: acaiBranch.id, productId: miel.id, customPrice: 4, pricePerKg: 4 },
      { branchId: acaiBranch.id, productId: lecheCond.id, customPrice: 3, pricePerKg: 3 },
      { branchId: acaiBranch.id, productId: cola500.id, customPrice: 12 },
      { branchId: acaiBranch.id, productId: agua.id, customPrice: 8 },
      { branchId: acaiBranch.id, productId: sprite.id, customPrice: 12 },
      // Burger branch - precios
      { branchId: burgerBranch.id, productId: burgClasic.id, customPrice: 45 },
      { branchId: burgerBranch.id, productId: burgCheese.id, customPrice: 55 },
      { branchId: burgerBranch.id, productId: burgBacon.id, customPrice: 65 },
      { branchId: burgerBranch.id, productId: burgDouble.id, customPrice: 75 },
      { branchId: burgerBranch.id, productId: papas.id, customPrice: 20 },
      { branchId: burgerBranch.id, productId: choripan.id, customPrice: 30 },
      { branchId: burgerBranch.id, productId: cola500.id, customPrice: 12 },
      { branchId: burgerBranch.id, productId: agua.id, customPrice: 8 },
      { branchId: burgerBranch.id, productId: sprite.id, customPrice: 12 },
    ],
  });
  console.log(`✅ Precios configurados por sucursal`);

  // ==========================================
  // 8. INVENTARIO
  // ==========================================
  console.log('📊 Creando inventario...');

  // Fábrica: tiene materias primas
  await prisma.inventory.createMany({
    data: [
      { branchId: fabrica.id, productId: rawAcai.id, currentStock: 200, minStock: 50, maxStock: 500, cost: 15 },
      { branchId: fabrica.id, productId: rawBeef.id, currentStock: 80, minStock: 20, maxStock: 200, cost: 35 },
      { branchId: fabrica.id, productId: rawBun.id, currentStock: 500, minStock: 100, maxStock: 1000, cost: 3 },
      { branchId: fabrica.id, productId: rawCheese.id, currentStock: 30, minStock: 10, maxStock: 100, cost: 50 },
      { branchId: fabrica.id, productId: rawBacon.id, currentStock: 20, minStock: 5, maxStock: 80, cost: 60 },
      { branchId: fabrica.id, productId: rawGranola.id, currentStock: 100, minStock: 30, maxStock: 300, cost: 12 },
      // Fábrica también tiene producto terminado de açaí
      { branchId: fabrica.id, productId: acaiSm.id, currentStock: 50, minStock: 20, maxStock: 200, cost: 18 },
      { branchId: fabrica.id, productId: acaiMd.id, currentStock: 40, minStock: 15, maxStock: 150, cost: 25 },
      { branchId: fabrica.id, productId: acaiLg.id, currentStock: 30, minStock: 10, maxStock: 100, cost: 30 },
    ],
  });

  // Açaí: tiene bases, toppings y bebidas
  await prisma.inventory.createMany({
    data: [
      { branchId: acaiBranch.id, productId: acaiSm.id, currentStock: 30, minStock: 10, maxStock: 100 },
      { branchId: acaiBranch.id, productId: acaiMd.id, currentStock: 25, minStock: 8, maxStock: 80 },
      { branchId: acaiBranch.id, productId: acaiLg.id, currentStock: 20, minStock: 5, maxStock: 60 },
      { branchId: acaiBranch.id, productId: granola.id, currentStock: 15, minStock: 5, maxStock: 50 },
      { branchId: acaiBranch.id, productId: banana.id, currentStock: 8, minStock: 3, maxStock: 30 },   // stock bajo → alerta
      { branchId: acaiBranch.id, productId: fresa.id, currentStock: 10, minStock: 5, maxStock: 40 },
      { branchId: acaiBranch.id, productId: miel.id, currentStock: 5, minStock: 3, maxStock: 20 },
      { branchId: acaiBranch.id, productId: lecheCond.id, currentStock: 6, minStock: 3, maxStock: 20 },
      { branchId: acaiBranch.id, productId: cola500.id, currentStock: 48, minStock: 12, maxStock: 120 },
      { branchId: acaiBranch.id, productId: agua.id, currentStock: 24, minStock: 12, maxStock: 60 },
      { branchId: acaiBranch.id, productId: sprite.id, currentStock: 24, minStock: 12, maxStock: 60 },
    ],
  });

  // Burgers: tiene burgers, extras y bebidas
  await prisma.inventory.createMany({
    data: [
      { branchId: burgerBranch.id, productId: burgClasic.id, currentStock: 50, minStock: 15, maxStock: 200 },
      { branchId: burgerBranch.id, productId: burgCheese.id, currentStock: 40, minStock: 10, maxStock: 150 },
      { branchId: burgerBranch.id, productId: burgBacon.id, currentStock: 30, minStock: 10, maxStock: 120 },
      { branchId: burgerBranch.id, productId: burgDouble.id, currentStock: 20, minStock: 8, maxStock: 80 },
      { branchId: burgerBranch.id, productId: papas.id, currentStock: 5, minStock: 10, maxStock: 100 },  // bajo mínimo → alerta
      { branchId: burgerBranch.id, productId: choripan.id, currentStock: 25, minStock: 8, maxStock: 80 },
      { branchId: burgerBranch.id, productId: cola500.id, currentStock: 60, minStock: 20, maxStock: 200 },
      { branchId: burgerBranch.id, productId: agua.id, currentStock: 30, minStock: 12, maxStock: 100 },
      { branchId: burgerBranch.id, productId: sprite.id, currentStock: 30, minStock: 12, maxStock: 100 },
    ],
  });
  console.log(`✅ Inventario creado para las 3 sucursales`);

  // ==========================================
  // 9. ALERTAS DE STOCK
  // ==========================================
  console.log('🔔 Creando alertas de stock...');
  await prisma.stockAlert.createMany({
    data: [
      { branchId: acaiBranch.id, productId: banana.id, alertType: 'LOW_STOCK', threshold: 5, isActive: true },
      { branchId: acaiBranch.id, productId: miel.id, alertType: 'LOW_STOCK', threshold: 3, isActive: true },
      { branchId: burgerBranch.id, productId: papas.id, alertType: 'LOW_STOCK', threshold: 10, isActive: true, lastTriggered: new Date() },
      { branchId: burgerBranch.id, productId: burgBacon.id, alertType: 'LOW_STOCK', threshold: 10, isActive: true },
      { branchId: fabrica.id, productId: rawAcai.id, alertType: 'LOW_STOCK', threshold: 50, isActive: true },
    ],
  });
  console.log(`✅ 5 alertas de stock configuradas`);

  // ==========================================
  // 10. RECETAS (Módulo Fábrica)
  // ==========================================
  console.log('📋 Creando recetas...');

  const recipeAcaiBase = await prisma.recipe.create({
    data: {
      name: 'Receta Açaí Base',
      description: 'Preparación estándar de base de açaí a partir de pulpa',
      productId: acaiSm.id,
      yield: 10,
      yieldUnit: 'kg',
      merma: 5,
      notes: 'Descongelar pulpa 2h antes. Mezclar a velocidad media.',
      ingredients: {
        create: [
          { ingredientId: rawAcai.id, quantity: 10.5, unit: 'kg' },
          { ingredientId: rawGranola.id, quantity: 0.5, unit: 'kg' },
        ],
      },
    },
  });

  const recipeHambClasica = await prisma.recipe.create({
    data: {
      name: 'Receta Hamburguesa Clásica',
      description: 'Hamburguesa estándar con carne y aderezos',
      productId: burgClasic.id,
      yield: 20,
      yieldUnit: 'units',
      merma: 2,
      ingredients: {
        create: [
          { ingredientId: rawBeef.id, quantity: 3, unit: 'kg' },
          { ingredientId: rawBun.id, quantity: 20, unit: 'unit' },
        ],
      },
    },
  });

  const recipeHambCheese = await prisma.recipe.create({
    data: {
      name: 'Receta Hamburguesa Con Queso',
      productId: burgCheese.id,
      yield: 20,
      yieldUnit: 'units',
      merma: 2,
      ingredients: {
        create: [
          { ingredientId: rawBeef.id, quantity: 3, unit: 'kg' },
          { ingredientId: rawBun.id, quantity: 20, unit: 'unit' },
          { ingredientId: rawCheese.id, quantity: 1, unit: 'kg' },
        ],
      },
    },
  });
  console.log(`✅ 3 recetas creadas`);

  // ==========================================
  // 11. ÓRDENES DE PRODUCCIÓN
  // ==========================================
  console.log('🏭 Creando órdenes de producción...');

  await prisma.productionOrder.createMany({
    data: [
      {
        orderNumber: 'POD-2024-0001',
        branchId: fabrica.id,
        recipeId: recipeAcaiBase.id,
        batchNumber: 'LOTE-ACAI-001',
        plannedYield: 10,
        actualYield: 9.7,
        status: ProductionOrderStatus.COMPLETED,
        scheduledDate: new Date('2024-03-01T08:00:00Z'),
        productionDate: new Date('2024-03-01T10:00:00Z'),
        expirationDate: new Date('2024-03-08T00:00:00Z'),
        notes: 'Primera producción del mes. Rendimiento normal.',
        createdBy: admin.id,
        completedBy: warehouse.id,
        completedAt: new Date('2024-03-01T12:00:00Z'),
      },
      {
        orderNumber: 'POD-2024-0002',
        branchId: fabrica.id,
        recipeId: recipeHambClasica.id,
        batchNumber: 'LOTE-BURG-001',
        plannedYield: 20,
        status: ProductionOrderStatus.IN_PROGRESS,
        scheduledDate: new Date(),
        createdBy: manager.id,
      },
      {
        orderNumber: 'POD-2024-0003',
        branchId: fabrica.id,
        recipeId: recipeAcaiBase.id,
        batchNumber: 'LOTE-ACAI-002',
        plannedYield: 15,
        status: ProductionOrderStatus.SCHEDULED,
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // en 2 días
        createdBy: admin.id,
      },
    ],
  });
  console.log(`✅ 3 órdenes de producción (COMPLETED, IN_PROGRESS, SCHEDULED)`);

  // ==========================================
  // 12. TRANSFERENCIAS DE STOCK (Fábrica → Sucursales)
  // ==========================================
  console.log('🚛 Creando transferencias de stock...');

  const transfer1 = await prisma.stockTransfer.create({
    data: {
      transferNumber: 'TRF-2024-0001',
      fromBranchId: fabrica.id,
      toBranchId: acaiBranch.id,
      status: TransferStatus.RECEIVED,
      requestedBy: manager.id,
      approvedBy: admin.id,
      receivedBy: cashier1.id,
      requestedDate: new Date('2024-03-01T09:00:00Z'),
      approvedDate: new Date('2024-03-01T09:30:00Z'),
      receivedDate: new Date('2024-03-01T14:00:00Z'),
      notes: 'Reposición semanal de açaí',
      items: {
        create: [
          { productId: acaiSm.id, requestedQty: 15, approvedQty: 15, receivedQty: 15, batchNumber: 'LOTE-ACAI-001' },
          { productId: acaiMd.id, requestedQty: 12, approvedQty: 12, receivedQty: 12, batchNumber: 'LOTE-ACAI-001' },
          { productId: acaiLg.id, requestedQty: 10, approvedQty: 10, receivedQty: 10, batchNumber: 'LOTE-ACAI-001' },
        ],
      },
    },
  });

  const transfer2 = await prisma.stockTransfer.create({
    data: {
      transferNumber: 'TRF-2024-0002',
      fromBranchId: fabrica.id,
      toBranchId: burgerBranch.id,
      status: TransferStatus.IN_TRANSIT,
      requestedBy: manager.id,
      approvedBy: admin.id,
      requestedDate: new Date(),
      approvedDate: new Date(),
      notes: 'Reposición de burgers lote semana actual',
      items: {
        create: [
          { productId: burgClasic.id, requestedQty: 30, approvedQty: 30 },
          { productId: burgCheese.id, requestedQty: 20, approvedQty: 20 },
        ],
      },
    },
  });
  console.log(`✅ 2 transferencias (RECEIVED y IN_TRANSIT)`);

  // ==========================================
  // 13. PEDIDOS INTERNOS
  // ==========================================
  console.log('📝 Creando pedidos internos...');

  const internalOrder1 = await prisma.internalOrder.create({
    data: {
      orderNumber: 'PI-2024-0001',
      fromBranchId: acaiBranch.id,
      toBranchId: fabrica.id,
      status: InternalOrderStatus.RECEIVED,
      requestedBy: cashier1.name,
      approvedBy: manager.name,
      dispatchedBy: warehouse.name,
      receivedBy: cashier1.name,
      requestedAt: new Date('2024-02-28T10:00:00Z'),
      approvedAt: new Date('2024-02-28T11:00:00Z'),
      dispatchedAt: new Date('2024-02-28T13:00:00Z'),
      receivedAt: new Date('2024-02-28T16:00:00Z'),
      notes: 'Pedido urgente de bases de açaí',
      items: {
        create: [
          { productId: acaiSm.id, requestedQty: 10, approvedQty: 10, dispatchedQty: 10, receivedQty: 9, unit: 'kg' },
          { productId: acaiMd.id, requestedQty: 8, approvedQty: 8, dispatchedQty: 8, receivedQty: 8, unit: 'kg' },
        ],
      },
    },
  });

  await prisma.internalOrder.create({
    data: {
      orderNumber: 'PI-2024-0002',
      fromBranchId: burgerBranch.id,
      toBranchId: fabrica.id,
      status: InternalOrderStatus.APPROVED,
      requestedBy: cashier2.name,
      approvedBy: manager.name,
      requestedAt: new Date(),
      approvedAt: new Date(),
      notes: 'Necesitamos papas y extras con urgencia',
      items: {
        create: [
          { productId: papas.id, requestedQty: 20, approvedQty: 20, unit: 'unit' },
          { productId: burgClasic.id, requestedQty: 30, approvedQty: 25, unit: 'unit' },
        ],
      },
    },
  });

  await prisma.internalOrder.create({
    data: {
      orderNumber: 'PI-2024-0003',
      fromBranchId: acaiBranch.id,
      toBranchId: fabrica.id,
      status: InternalOrderStatus.PENDING,
      requestedBy: cashier1.name,
      requestedAt: new Date(),
      notes: 'Reposición de miel y granola',
      items: {
        create: [
          { productId: miel.id, requestedQty: 5, unit: 'liter' },
          { productId: granola.id, requestedQty: 8, unit: 'kg' },
        ],
      },
    },
  });
  console.log(`✅ 3 pedidos internos (RECEIVED, APPROVED, PENDING)`);

  // ==========================================
  // 14. MERMA
  // ==========================================
  console.log('📉 Creando registros de merma...');

  await prisma.mermaRecord.createMany({
    data: [
      {
        branchId: acaiBranch.id,
        productId: banana.id,
        quantity: 1.5,
        unit: 'kg',
        reason: MermaReason.VENCIMIENTO,
        description: 'Bananas maduras no aptas para servir',
        registeredBy: cashier1.name,
        createdAt: new Date('2024-02-29T18:00:00Z'),
      },
      {
        branchId: acaiBranch.id,
        productId: acaiSm.id,
        quantity: 1,
        unit: 'kg',
        reason: MermaReason.DIFERENCIA_RECEPCION,
        description: 'Diferencia detectada al recibir PI-2024-0001',
        internalOrderId: internalOrder1.id,
        registeredBy: cashier1.name,
        createdAt: new Date('2024-02-28T17:00:00Z'),
      },
      {
        branchId: fabrica.id,
        productId: rawAcai.id,
        quantity: 2,
        unit: 'kg',
        reason: MermaReason.PROCESO_PRODUCCION,
        description: 'Merma normal durante producción LOTE-ACAI-001',
        registeredBy: warehouse.name,
        createdAt: new Date('2024-03-01T12:30:00Z'),
      },
      {
        branchId: burgerBranch.id,
        productId: burgCheese.id,
        quantity: 2,
        unit: 'unit',
        reason: MermaReason.DANO_FISICO,
        description: 'Hamburguesas caídas al suelo por accidente',
        registeredBy: cashier2.name,
      },
    ],
  });
  console.log(`✅ 4 registros de merma creados`);

  // ==========================================
  // 15. VENTAS
  // ==========================================
  console.log('💸 Creando historial de ventas...');

  // --- Ventas en Açaí ---
  const saleAcai1 = await prisma.sale.create({
    data: {
      branchId: acaiBranch.id,
      userId: cashier1.id,
      saleNumber: 'ACAI-2024-00001',
      totalAmount: 66,
      paymentMethod: PaymentMethod.CASH,
      salesChannel: SalesChannel.DIRECT,
      createdAt: new Date('2024-03-01T11:00:00Z'),
      items: {
        create: [
          { productId: acaiMd.id, quantity: 1, unitPrice: 35, subtotal: 35 },
          { productId: acaiSm.id, quantity: 1, unitPrice: 25, subtotal: 25 },
          { productId: cola500.id, quantity: 1, unitPrice: 12, subtotal: 12 },
        ],
      },
    },
  });

  const saleAcai2 = await prisma.sale.create({
    data: {
      branchId: acaiBranch.id,
      userId: cashier1.id,
      saleNumber: 'ACAI-2024-00002',
      totalAmount: 90,
      paymentMethod: PaymentMethod.CARD,
      salesChannel: SalesChannel.PEDIDOS_YA,
      externalOrderId: 'PY-98765',
      createdAt: new Date('2024-03-02T13:00:00Z'),
      items: {
        create: [
          { productId: acaiLg.id, quantity: 2, unitPrice: 45, subtotal: 90 },
        ],
      },
    },
  });

  const saleAcai3 = await prisma.sale.create({
    data: {
      branchId: acaiBranch.id,
      userId: cashier1.id,
      saleNumber: 'ACAI-2024-00003',
      totalAmount: 82,
      paymentMethod: PaymentMethod.MIXED,
      cashAmount: 50,
      cardAmount: 32,
      salesChannel: SalesChannel.DIRECT,
      createdAt: new Date(),
      items: {
        create: [
          { productId: acaiLg.id, quantity: 1, unitPrice: 45, subtotal: 45 },
          { productId: acaiSm.id, quantity: 1, unitPrice: 25, subtotal: 25 },
          { productId: agua.id, quantity: 1, unitPrice: 8, subtotal: 8 },
          { productId: sprite.id, quantity: 1, unitPrice: 12, subtotal: 12 },
        ],
      },
    },
  });

  // --- Ventas en Burgers ---
  const saleBurg1 = await prisma.sale.create({
    data: {
      branchId: burgerBranch.id,
      userId: cashier2.id,
      saleNumber: 'BURG-2024-00001',
      totalAmount: 77,
      paymentMethod: PaymentMethod.CASH,
      salesChannel: SalesChannel.DIRECT,
      createdAt: new Date('2024-03-01T12:30:00Z'),
      items: {
        create: [
          {
            productId: burgCheese.id,
            quantity: 1,
            unitPrice: 55,
            subtotal: 55,
            modifiers: {
              create: [
                { modifierId: modExtraQueso.id, quantity: 1, price: 5 },
                { modifierId: modSinCebolla.id, quantity: 1, price: 0 },
              ],
            },
          },
          { productId: papas.id, quantity: 1, unitPrice: 20, subtotal: 20 },
          { productId: cola500.id, quantity: 2, unitPrice: 12, subtotal: 24 },
        ],
      },
    },
  });

  const saleBurg2 = await prisma.sale.create({
    data: {
      branchId: burgerBranch.id,
      userId: cashier2.id,
      saleNumber: 'BURG-2024-00002',
      totalAmount: 155,
      paymentMethod: PaymentMethod.TRANSFER,
      salesChannel: SalesChannel.UBER_EATS,
      externalOrderId: 'UE-44321',
      createdAt: new Date('2024-03-02T19:00:00Z'),
      items: {
        create: [
          { productId: burgDouble.id, quantity: 2, unitPrice: 75, subtotal: 150 },
          { productId: agua.id, quantity: 1, unitPrice: 8, subtotal: 8 },
        ],
      },
    },
  });

  // Venta con descuento
  const saleBurg3 = await prisma.sale.create({
    data: {
      branchId: burgerBranch.id,
      userId: cashier2.id,
      saleNumber: 'BURG-2024-00003',
      totalAmount: 85.5,
      paymentMethod: PaymentMethod.CARD,
      salesChannel: SalesChannel.DIRECT,
      createdAt: new Date(),
      items: {
        create: [
          { productId: burgBacon.id, quantity: 1, unitPrice: 65, subtotal: 65, discount: 9.5 },
          { productId: papas.id, quantity: 1, unitPrice: 20, subtotal: 20 },
          { productId: cola500.id, quantity: 1, unitPrice: 12, subtotal: 12 },
        ],
      },
      discounts: {
        create: [
          {
            type: 'PERCENTAGE',
            value: 10,
            authorizedBy: manager.id,
            authorizationNote: 'Descuento fidelización cliente frecuente',
          },
        ],
      },
    },
  });
  console.log(`✅ 6 ventas creadas (cash, card, transfer, mixed, pedidos ya, uber eats, con modificadores y descuento)`);

  // ==========================================
  // 16. CIERRE DE CAJA
  // ==========================================
  console.log('🏦 Creando cierres de caja...');

  await prisma.cashRegisterClose.createMany({
    data: [
      {
        branchId: acaiBranch.id,
        userId: cashier1.id,
        openingAmount: 200,
        expectedCash: 450,
        actualCash: 448,
        difference: -2,
        totalSales: 238,
        cashSales: 66,
        cardSales: 90,
        transferSales: 0,
        notes: 'Diferencia mínima, probable error de cambio',
        openedAt: new Date('2024-03-01T08:00:00Z'),
        closedAt: new Date('2024-03-01T22:00:00Z'),
        openedBy: cashier1.name,
        sessionStatus: 'CLOSED',
        createdAt: new Date('2024-03-01T22:00:00Z'),
      },
      {
        branchId: burgerBranch.id,
        userId: cashier2.id,
        openingAmount: 300,
        expectedCash: 377,
        actualCash: 377,
        difference: 0,
        totalSales: 317.5,
        cashSales: 77,
        cardSales: 85.5,
        transferSales: 155,
        notes: 'Cierre perfecto',
        openedAt: new Date('2024-03-02T09:00:00Z'),
        closedAt: new Date('2024-03-02T23:00:00Z'),
        openedBy: cashier2.name,
        sessionStatus: 'CLOSED',
        createdAt: new Date('2024-03-02T23:00:00Z'),
      },
    ],
  });
  console.log(`✅ 2 cierres de caja creados`);

  // ==========================================
  // 17. COMBOS
  // ==========================================
  console.log('🍔🍧 Creando combos...');

  await prisma.combo.create({
    data: {
      name: 'Combo Burger + Açaí',
      description: 'Hamburguesa clásica + açaí pequeño + bebida',
      price: 79,
      items: {
        create: [
          { productId: burgClasic.id, quantity: 1 },
          { productId: acaiSm.id, quantity: 1 },
          { productId: cola500.id, quantity: 1 },
        ],
      },
    },
  });

  await prisma.combo.create({
    data: {
      name: 'Combo Pareja',
      description: '2 burgers con queso + 2 açaí medianos',
      price: 169,
      items: {
        create: [
          { productId: burgCheese.id, quantity: 2 },
          { productId: acaiMd.id, quantity: 2 },
        ],
      },
    },
  });
  console.log(`✅ 2 combos creados`);

  // ==========================================
  // 18. GASTOS
  // ==========================================
  console.log('💼 Creando gastos...');

  await prisma.expense.createMany({
    data: [
      {
        branchId: acaiBranch.id,
        category: ExpenseCategory.PROVEEDOR,
        description: 'Compra pulpa de açaí - Proveedor Amazónico',
        amount: 1500,
        supplier: 'Amazónico SRL',
        paymentMethod: PaymentMethod.TRANSFER,
        registeredBy: manager.id,
        expenseDate: new Date('2024-03-01T10:00:00Z'),
      },
      {
        branchId: acaiBranch.id,
        category: ExpenseCategory.SERVICIOS,
        description: 'Factura de luz - Marzo',
        amount: 350,
        paymentMethod: PaymentMethod.CASH,
        registeredBy: manager.id,
        expenseDate: new Date('2024-03-05T09:00:00Z'),
      },
      {
        branchId: burgerBranch.id,
        category: ExpenseCategory.PROVEEDOR,
        description: 'Compra carne y materiales burger',
        amount: 2200,
        supplier: 'Frigorífico Norte',
        paymentMethod: PaymentMethod.CARD,
        registeredBy: manager.id,
        expenseDate: new Date('2024-03-01T08:00:00Z'),
      },
      {
        branchId: burgerBranch.id,
        category: ExpenseCategory.MANTENIMIENTO,
        description: 'Reparación freidora',
        amount: 450,
        paymentMethod: PaymentMethod.CASH,
        registeredBy: cashier2.id,
        notes: 'Falla eléctrica en la freidora',
        expenseDate: new Date('2024-03-03T14:00:00Z'),
      },
      {
        branchId: fabrica.id,
        category: ExpenseCategory.SUELDOS,
        description: 'Salario mensual personal fábrica',
        amount: 8000,
        paymentMethod: PaymentMethod.TRANSFER,
        registeredBy: admin.id,
        expenseDate: new Date('2024-03-31T00:00:00Z'),
      },
    ],
  });
  console.log(`✅ 5 gastos creados`);

  // ==========================================
  // 19. PEDIDOS A PROVEEDORES
  // ==========================================
  console.log('📦 Creando pedidos a proveedores...');

  const po1 = await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2024-0001',
      branchId: fabrica.id,
      userId: admin.id,
      supplier: 'Amazónico SRL',
      status: PurchaseOrderStatus.RECEIVED,
      totalAmount: 4500,
      expectedDate: new Date('2024-03-05T00:00:00Z'),
      receivedDate: new Date('2024-03-05T10:00:00Z'),
      notes: 'Pedido mensual de pulpa de açaí',
      items: {
        create: [
          { productId: rawAcai.id, quantity: 300, receivedQty: 300, unitCost: 15, subtotal: 4500 },
        ],
      },
    },
  });

  const po2 = await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2024-0002',
      branchId: fabrica.id,
      userId: manager.id,
      supplier: 'Frigorífico Norte',
      status: PurchaseOrderStatus.SENT,
      totalAmount: 5600,
      expectedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      notes: 'Pedido semanal de carne y derivados',
      items: {
        create: [
          { productId: rawBeef.id, quantity: 100, receivedQty: 0, unitCost: 35, subtotal: 3500 },
          { productId: rawBacon.id, quantity: 20, receivedQty: 0, unitCost: 60, subtotal: 1200 },
          { productId: rawCheese.id, quantity: 18, receivedQty: 0, unitCost: 50, subtotal: 900 },
        ],
      },
    },
  });
  console.log(`✅ 2 pedidos a proveedores (RECEIVED y SENT)`);

  // ==========================================
  // 20. MOVIMIENTOS DE STOCK (Kardex muestra)
  // ==========================================
  console.log('📒 Creando movimientos de stock (Kardex)...');

  const invAcaiSm = await prisma.inventory.findUnique({
    where: { branchId_productId: { branchId: acaiBranch.id, productId: acaiSm.id } },
  });

  if (invAcaiSm) {
    await prisma.stockMovement.createMany({
      data: [
        {
          branchId: acaiBranch.id,
          productId: acaiSm.id,
          type: 'ENTRADA',
          quantity: 15,
          previousStock: 15,
          newStock: 30,
          cost: 18,
          reference: 'TRF-2024-0001',
          batchNumber: 'LOTE-ACAI-001',
          notes: 'Recepción transferencia desde fábrica',
          createdBy: cashier1.id,
          inventoryId: invAcaiSm.id,
          transferId: transfer1.id,
          createdAt: new Date('2024-03-01T14:00:00Z'),
        },
        {
          branchId: acaiBranch.id,
          productId: acaiSm.id,
          type: 'SALIDA',
          quantity: -1,
          previousStock: 30,
          newStock: 29,
          reference: 'ACAI-2024-00001',
          notes: 'Venta directa',
          createdBy: cashier1.id,
          inventoryId: invAcaiSm.id,
          createdAt: new Date('2024-03-01T11:00:00Z'),
        },
        {
          branchId: acaiBranch.id,
          productId: acaiSm.id,
          type: 'MERMA',
          quantity: -1,
          previousStock: 29,
          newStock: 28,
          notes: 'Merma por diferencia en recepción PI-2024-0001',
          createdBy: cashier1.id,
          inventoryId: invAcaiSm.id,
          createdAt: new Date('2024-02-28T17:00:00Z'),
        },
      ],
    });
  }
  console.log(`✅ Movimientos de stock (Kardex) creados`);

  // ==========================================
  // RESUMEN FINAL
  // ==========================================
  console.log('\n🎉 ¡Seed completo ejecutado exitosamente!\n');
  console.log('═══════════════════════════════════════════════');
  console.log('📋 CREDENCIALES DE ACCESO:');
  console.log('═══════════════════════════════════════════════');
  console.log('  🔴 ADMIN    → admin@skot.com      / Admin123!');
  console.log('  🟠 GERENTE  → gerente@skot.com    / Manager123!');
  console.log('  🟡 CAJERO1  → cajero1@skot.com    / Cajero123!  (Sucursal Açaí)');
  console.log('  🟡 CAJERO2  → cajero2@skot.com    / Cajero123!  (Sucursal Burgers)');
  console.log('  🟢 ALMACÉN  → almacen@skot.com    / Almacen123! (Fábrica)');
  console.log('═══════════════════════════════════════════════');
  console.log('\n📊 DATOS CREADOS:');
  console.log('  ✅ 5 Usuarios (Admin, Gerente, 2 Cajeros, Almacén)');
  console.log('  ✅ 3 Sucursales (Fábrica, Açaí Centro, Burgers Plaza)');
  console.log('  ✅ 22 Productos (bases açaí, toppings, burgers, extras, bebidas, materias primas)');
  console.log('  ✅ 5 Modificadores de burger');
  console.log('  ✅ Precios por sucursal configurados');
  console.log('  ✅ Inventario en las 3 sucursales (con stocks bajos para probar alertas)');
  console.log('  ✅ 5 Alertas de stock');
  console.log('  ✅ 3 Recetas (fábrica)');
  console.log('  ✅ 3 Órdenes de producción (completada, en progreso, programada)');
  console.log('  ✅ 2 Transferencias de stock (recibida, en tránsito)');
  console.log('  ✅ 3 Pedidos internos (recibido, aprobado, pendiente)');
  console.log('  ✅ 4 Registros de merma');
  console.log('  ✅ 6 Ventas (cash, card, transfer, mixed, PedidosYa, UberEats, con modificadores y descuento)');
  console.log('  ✅ 2 Cierres de caja');
  console.log('  ✅ 2 Combos (cross-tipo)');
  console.log('  ✅ 5 Gastos');
  console.log('  ✅ 2 Pedidos a proveedores (recibido, enviado)');
  console.log('  ✅ Movimientos de stock / Kardex');
  console.log('═══════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
