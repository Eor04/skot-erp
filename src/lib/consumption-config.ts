import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { calculateConsumption, ConsumptionProduct } from './inventory-consumption';

export const consumptionInclude = Prisma.validator<Prisma.ProductInclude>()({
    saleRecipe: { include: { ingredients: { include: { ingredient: true }, orderBy: { id: 'asc' } } } },
});
export type ProductWithConsumption = Prisma.ProductGetPayload<{ include: typeof consumptionInclude }>;

export function consumptionConfig(product: ProductWithConsumption): ConsumptionProduct | null {
    if (!product.consumptionMode) return null;
    const recipe = product.saleRecipe;
    if (product.consumptionMode === 'RECIPE' && recipe?.ingredients.some(i => !i.ingredient.active || i.ingredient.deletedAt)) {
        throw new Error(`La receta de ${product.name} contiene ingredientes inactivos`);
    }
    const result: ConsumptionProduct = {
        id: product.id, name: product.name, unit: product.unit, mode: product.consumptionMode,
        recipe: recipe?.active ? {
            productId: recipe.productId, yield: recipe.yield, yieldUnit: recipe.yieldUnit,
            ingredients: recipe.ingredients.map(i => ({ id: i.ingredientId, name: i.ingredient.name,
                quantity: i.quantity, unit: i.unit, inventoryUnit: i.ingredient.unit })),
        } : null,
    };
    calculateConsumption([{ product: result, quantity: 1 }]);
    return result;
}

/** Huella de la configuración empleada al guardar una venta sin conexión. */
export function consumptionVersion(config: ConsumptionProduct): string {
    return createHash('sha256').update(JSON.stringify({
        id: config.id, unit: config.unit, mode: config.mode,
        recipe: config.mode === 'RECIPE' ? config.recipe : null,
    })).digest('hex');
}
