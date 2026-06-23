import { prisma } from './src/lib/prisma';

async function main() {
    const hClasica = await prisma.product.findFirst({ where: { name: 'Hamburguesa Clásica' } });
    if (!hClasica) return;
    
    let recipe = await prisma.recipe.findFirst({ where: { productId: hClasica.id } });
    if (!recipe) {
        recipe = await prisma.recipe.create({ data: { productId: hClasica.id, yield: 1 } });
    }
    
    // Delete existing ingredients to replace them
    await prisma.recipeIngredient.deleteMany({
        where: { recipeId: recipe.id }
    });
    
    const pan = await prisma.product.findFirst({ where: { name: 'PAN HAM' } });
    const carne = await prisma.product.findFirst({ where: { name: 'C/CLASICA' } });
    const queso = await prisma.product.findFirst({ where: { name: 'QUESO' } });
    
    await prisma.recipeIngredient.createMany({
        data: [
            { recipeId: recipe.id, ingredientId: pan.id, quantity: 1, unit: 'unit' },
            { recipeId: recipe.id, ingredientId: carne.id, quantity: 1, unit: 'unit' },
            { recipeId: recipe.id, ingredientId: queso.id, quantity: 1, unit: 'unit' }
        ]
    });
    console.log('Recipe created successfully');
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
