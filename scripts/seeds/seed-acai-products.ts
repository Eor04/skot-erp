import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACAI_PRODUCTS = [
  // HELADOS (ACAI_BASE) - caja
  { name: 'TRADICIONAL', category: 'HELADOS', type: 'ACAI_BASE', unit: 'caja' },
  { name: 'NIDO', category: 'HELADOS', type: 'ACAI_BASE', unit: 'caja' },
  { name: 'GRIEGO', category: 'HELADOS', type: 'ACAI_BASE', unit: 'caja' },
  { name: 'FRUTILLA (Helado)', category: 'HELADOS', type: 'ACAI_BASE', unit: 'caja' },
  { name: 'BANANA (Helado)', category: 'HELADOS', type: 'ACAI_BASE', unit: 'caja' },
  { name: 'CASADIÑO', category: 'HELADOS', type: 'ACAI_BASE', unit: 'caja' },
  { name: 'COPOAZU', category: 'HELADOS', type: 'ACAI_BASE', unit: 'caja' },

  // CEREALES (RAW_MATERIAL) - bolsa
  { name: 'GRANOLA CON FRUTO SECOS', category: 'CEREALES', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'GRANOLA NACIONAL', category: 'CEREALES', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'ZUCARITAS', category: 'CEREALES', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'AVENA', category: 'CEREALES', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'FRUTARITOS (CEREAL DE COLOR)', category: 'CEREALES', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'HOJUELA DE MAIZ', category: 'CEREALES', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'LECHE EN POLVO (750g)', category: 'CEREALES', type: 'RAW_MATERIAL', unit: 'bolsa' },

  // EMPAQUES (RAW_MATERIAL) - unidad
  { name: 'SERVILLETA', category: 'EMPAQUES', type: 'RAW_MATERIAL', unit: 'unidad' },
  { name: 'BOLSITAS DE SERVILLETAS', category: 'EMPAQUES', type: 'RAW_MATERIAL', unit: 'unidad' },
  { name: 'CUCHARILLAS', category: 'EMPAQUES', type: 'RAW_MATERIAL', unit: 'unidad' },

  // TOPPING'S (RAW_MATERIAL) - bolsa
  { name: 'CHOCO POWER MEDIANO', category: 'TOPPINGS', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'CHISPAS DE CHOCOLATE', category: 'TOPPINGS', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'CHISPAS DE COLORES', category: 'TOPPINGS', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'GOTA PINGO', category: 'TOPPINGS', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'CHUBI', category: 'TOPPINGS', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'OREO', category: 'TOPPINGS', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'MINI DONAS', category: 'TOPPINGS', type: 'RAW_MATERIAL', unit: 'bolsa' },

  // ARCOR (RAW_MATERIAL) - bolsa
  { name: 'SANDIA', category: 'ARCOR', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'FRUTILLA ACIDA', category: 'ARCOR', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'LADRILLOS', category: 'ARCOR', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'CONO DE FRUTA', category: 'ARCOR', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'DIENTE', category: 'ARCOR', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'OSITOS', category: 'ARCOR', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'MORAS', category: 'ARCOR', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'TURRON', category: 'ARCOR', type: 'RAW_MATERIAL', unit: 'bolsa' },

  // FRUTOS SECOS (RAW_MATERIAL) - bolsa
  { name: 'MANI', category: 'FRUTOS SECOS', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'MANI CONFITADO', category: 'FRUTOS SECOS', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'COCO', category: 'FRUTOS SECOS', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'COCO TOSTADORA', category: 'FRUTOS SECOS', type: 'RAW_MATERIAL', unit: 'bolsa' },
  { name: 'ALMENDRA', category: 'FRUTOS SECOS', type: 'RAW_MATERIAL', unit: 'bolsa' },

  // COBERTURA (RAW_MATERIAL) - bote
  { name: 'LECHE CONDENSADA', category: 'COBERTURA', type: 'RAW_MATERIAL', unit: 'bote' },
  { name: 'DULCE DE LECHE', category: 'COBERTURA', type: 'RAW_MATERIAL', unit: 'bote' },
  { name: 'CHOCOLATE (Cobertura)', category: 'COBERTURA', type: 'RAW_MATERIAL', unit: 'bote' },
  { name: 'FRUTILLA (Cobertura)', category: 'COBERTURA', type: 'RAW_MATERIAL', unit: 'bote' },

  // FRUTAS (RAW_MATERIAL) - kg
  { name: 'DURAZNO', category: 'FRUTAS', type: 'RAW_MATERIAL', unit: 'kg' },
  { name: 'FRUTILLA', category: 'FRUTAS', type: 'RAW_MATERIAL', unit: 'kg' },
  { name: 'KIWI', category: 'FRUTAS', type: 'RAW_MATERIAL', unit: 'kg' },
  { name: 'MANGO', category: 'FRUTAS', type: 'RAW_MATERIAL', unit: 'kg' },
  { name: 'GUINEO', category: 'FRUTAS', type: 'RAW_MATERIAL', unit: 'kg' },
  { name: 'UVA', category: 'FRUTAS', type: 'RAW_MATERIAL', unit: 'kg' },
  { name: 'CEREZA', category: 'FRUTAS', type: 'RAW_MATERIAL', unit: 'kg' },

  // MOUSSEN (RAW_MATERIAL) - envase 2L
  { name: 'FRUTO ROJO (Moussen)', category: 'MOUSSEN', type: 'RAW_MATERIAL', unit: 'envase' },
  { name: 'FRUTILLA (Moussen)', category: 'MOUSSEN', type: 'RAW_MATERIAL', unit: 'envase' },
  { name: 'MARACUYA (Moussen)', category: 'MOUSSEN', type: 'RAW_MATERIAL', unit: 'envase' },
  { name: 'LIMON (Moussen)', category: 'MOUSSEN', type: 'RAW_MATERIAL', unit: 'envase' },
  { name: 'TAPIOCA (Moussen)', category: 'MOUSSEN', type: 'RAW_MATERIAL', unit: 'envase' },
  { name: 'BROWNIES (Moussen)', category: 'MOUSSEN', type: 'RAW_MATERIAL', unit: 'envase' },

  // BEBIDAS (BEVERAGE) - unidad
  { name: 'AGUA 1/2', category: 'BEBIDAS', type: 'BEVERAGE', unit: 'unidad' },
  { name: 'SODA 1/2', category: 'BEBIDAS', type: 'BEVERAGE', unit: 'unidad' },
  { name: 'REFRESCO', category: 'BEBIDAS', type: 'BEVERAGE', unit: 'unidad' },
  { name: 'GATORADE', category: 'BEBIDAS', type: 'BEVERAGE', unit: 'unidad' },
  { name: 'POWER', category: 'BEBIDAS', type: 'BEVERAGE', unit: 'unidad' },
  { name: 'SANTE', category: 'BEBIDAS', type: 'BEVERAGE', unit: 'unidad' },
  { name: 'ALOE', category: 'BEBIDAS', type: 'BEVERAGE', unit: 'unidad' },

  // VASOS (RAW_MATERIAL) - unidad
  { name: 'VASO 12 ONZA', category: 'VASOS', type: 'RAW_MATERIAL', unit: 'unidad' },
  { name: 'VASO 16 ONZA', category: 'VASOS', type: 'RAW_MATERIAL', unit: 'unidad' },
  { name: 'VASO 500 ML', category: 'VASOS', type: 'RAW_MATERIAL', unit: 'unidad' },
  { name: 'VASO 1 KILO', category: 'VASOS', type: 'RAW_MATERIAL', unit: 'unidad' },

  // TAPAS (RAW_MATERIAL) - unidad
  { name: 'TAPA 12 onza', category: 'TAPAS', type: 'RAW_MATERIAL', unit: 'unidad' },
  { name: 'TAPA 16 onza', category: 'TAPAS', type: 'RAW_MATERIAL', unit: 'unidad' },
  { name: 'TAPA 500ml', category: 'TAPAS', type: 'RAW_MATERIAL', unit: 'unidad' },
  { name: 'TAPA 1 kilo', category: 'TAPAS', type: 'RAW_MATERIAL', unit: 'unidad' },
];

async function main() {
    console.log('Seeding Acai Products...');
    
    // Find ACAI POS branches and FABRICA branch
    const branches = await prisma.branch.findMany({
        where: { type: { in: ['ACAI', 'FABRICA'] } }
    });

    for (const prod of ACAI_PRODUCTS) {
        // Find or create product
        const sku = `ACAI-${prod.name.replace(/ /g, '-').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase()}`;
        let product = await prisma.product.findFirst({ where: { name: prod.name } });
        
        if (!product) {
            product = await prisma.product.create({
                data: {
                    name: prod.name,
                    sku: sku,
                    type: prod.type as any,
                    unit: prod.unit,
                    category: prod.category,
                    imageUrl: null,
                    active: true,
                }
            });
            console.log(`Created product: ${product.name}`);
        } else {
            console.log(`Product already exists: ${product.name}`);
        }

        // Add to branches
        for (const branch of branches) {
            const bpExists = await prisma.branchProduct.findUnique({
                where: { branchId_productId: { branchId: branch.id, productId: product.id } }
            });

            if (!bpExists) {
                await prisma.branchProduct.create({
                    data: {
                        branchId: branch.id,
                        productId: product.id,
                        // Set standard prices based on type
                        customPrice: prod.type === 'BEVERAGE' ? 5 : 0,
                        pricePerKg: prod.type === 'ACAI_BASE' ? 80 : 0,
                        active: true
                    }
                });
                console.log(`Associated ${product.name} to ${branch.name}`);
            }
        }
    }

    console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
