import { Prisma } from '@prisma/client';
import { OperationError } from './transaction';

/** Cambiar la unidad no debe reinterpretar saldos ni cantidades de recetas. */
export async function ensureUnitCanChange(tx: Prisma.TransactionClient, productId: string, oldUnit: string, newUnit: string) {
    if (oldUnit.trim().toLowerCase() === newUnit.trim().toLowerCase()) return;
    const [stock, uses, recipes] = await Promise.all([
        tx.inventory.count({ where: { productId, currentStock: { not: 0 } } }),
        tx.recipeIngredient.count({ where: { ingredientId: productId } }),
        tx.recipe.count({ where: { productId } }),
    ]);
    if (stock || uses || recipes) throw new OperationError('No se puede cambiar la unidad mientras el producto tenga stock o esté en recetas. Revisa su inventario y recetas.');
}
