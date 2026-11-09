/** Calcula consumos sin acceder a la base; el modo debe elegirse explícitamente. */
export type ConsumptionProduct = {
    id: string;
    name: string;
    unit: string;
    mode: 'STOCK' | 'RECIPE';
    recipe?: {
        productId: string;
        yield: number;
        yieldUnit: string;
        ingredients: { id: string; name: string; quantity: number; unit: string; inventoryUnit: string }[];
    } | null;
};

export type Consumption = { productId: string; name: string; quantity: number };

function sameUnit(a: string, b: string): boolean {
    return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase() && a.trim().length > 0;
}

/** Rechaza unidades distintas hasta que exista una conversión explícita. */
export function calculateConsumption(items: { product: ConsumptionProduct; quantity: number }[]): Consumption[] {
    const totals = new Map<string, Consumption>();
    const add = (productId: string, name: string, quantity: number) => {
        const existing = totals.get(productId);
        const total = (existing?.quantity ?? 0) + quantity;
        if (!Number.isFinite(total)) throw new Error('Cantidad de consumo inválida');
        totals.set(productId, { productId, name, quantity: total });
    };
    for (const { product, quantity } of items) {
        if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Cantidad de venta inválida');
        if (product.mode === 'STOCK') {
            add(product.id, product.name, quantity);
            continue;
        }
        if (product.mode !== 'RECIPE') throw new Error('Modo de consumo inválido');
        const recipe = product.recipe;
        if (!recipe || recipe.productId !== product.id || !Number.isFinite(recipe.yield) || recipe.yield <= 0 ||
            !sameUnit(recipe.yieldUnit, product.unit) || recipe.ingredients.length === 0) {
            throw new Error(`Receta de venta inválida para ${product.name}`);
        }
        for (const ingredient of recipe.ingredients) {
            if (!Number.isFinite(ingredient.quantity) || ingredient.quantity <= 0 ||
                !sameUnit(ingredient.unit, ingredient.inventoryUnit) || ingredient.id === product.id) {
                throw new Error(`Ingrediente inválido para ${product.name}: ${ingredient.name}`);
            }
            add(ingredient.id, ingredient.name, ingredient.quantity * quantity / recipe.yield);
        }
    }
    return [...totals.values()];
}

/** Capacidad disponible del producto; el cobro debe validar el carrito completo. */
export function availableQuantity(product: ConsumptionProduct, stocks: ReadonlyMap<string, number>): number {
    const requirements = calculateConsumption([{ product, quantity: 1 }]);
    return Math.max(0, Math.min(...requirements.map(requirement => {
        const stock = stocks.get(requirement.productId) ?? 0;
        return Number.isFinite(stock) ? stock / requirement.quantity : 0;
    })));
}
