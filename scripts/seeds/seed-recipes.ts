import { prisma } from '../../src/lib/prisma';

async function main() {
    await prisma.$transaction(async (tx) => {
        const hClasica = await tx.product.findFirst({ where: { name: 'Hamburguesa Clásica' } });
        if (!hClasica) {
            throw new Error('No se encontró el producto Hamburguesa Clásica');
        }

        const ingredientNames = ['PAN HAM', 'C/CLASICA', 'QUESO'];
        const ingredients = await Promise.all(ingredientNames.map(async (name) => {
            const ingredient = await tx.product.findFirst({ where: { name } });
            if (!ingredient) {
                throw new Error(`No se encontró el ingrediente ${name}`);
            }
            return ingredient;
        }));

        // Validar todos los productos antes de crear o reemplazar la receta.
        let recipe = await tx.recipe.findFirst({ where: { productId: hClasica.id } });
        if (!recipe) {
            recipe = await tx.recipe.create({
                data: {
                    name: hClasica.name,
                    productId: hClasica.id,
                    yield: 1,
                    yieldUnit: hClasica.unit,
                },
            });
        }

        // El reemplazo es atómico: un fallo conserva los ingredientes anteriores.
        await tx.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });
        await tx.recipeIngredient.createMany({
            data: ingredients.map(ingredient => ({
                recipeId: recipe.id,
                ingredientId: ingredient.id,
                quantity: 1,
                unit: 'unit',
            })),
        });
    });
    console.log('Recipe created successfully');
}

main()
    .catch(error => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
