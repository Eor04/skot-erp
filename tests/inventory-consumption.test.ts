import assert from 'node:assert/strict';
import { test } from 'node:test';
import { availableQuantity, calculateConsumption, type ConsumptionProduct } from '../src/lib/inventory-consumption';

const burger: ConsumptionProduct = {
    id: 'burger', name: 'Junior', unit: 'unit', mode: 'RECIPE',
    recipe: { productId: 'burger', yield: 10, yieldUnit: 'unit', ingredients: [
        { id: 'meat', name: 'Carne', quantity: 1.2, unit: 'kg', inventoryUnit: 'kg' },
        { id: 'bread', name: 'Pan', quantity: 10, unit: 'unit', inventoryUnit: 'unit' },
    ] },
};

test('normaliza el rendimiento y suma ingredientes compartidos', () => {
    const result = calculateConsumption([
        { product: burger, quantity: 2 },
        { product: { id: 'bread', name: 'Pan', unit: 'unit', mode: 'STOCK' }, quantity: 1 },
    ]);
    assert.ok(Math.abs(result.find(x => x.productId === 'meat')!.quantity - 0.24) < 1e-10);
    assert.equal(result.find(x => x.productId === 'bread')!.quantity, 3);
});

test('un producto terminado consume su stock aunque tenga receta', () => {
    assert.deepEqual(calculateConsumption([{ product: { ...burger, mode: 'STOCK' }, quantity: 2 }]),
        [{ productId: 'burger', name: 'Junior', quantity: 2 }]);
});

test('la disponibilidad depende del ingrediente limitante', () => {
    assert.equal(availableQuantity(burger, new Map([['meat', 1.2], ['bread', 3]])), 3);
    assert.equal(availableQuantity(burger, new Map()), 0);
});

test('rechaza cantidades, recetas y unidades inconsistentes', () => {
    assert.throws(() => calculateConsumption([{ product: burger, quantity: 0 }]));
    assert.throws(() => calculateConsumption([{ product: { ...burger, recipe: null }, quantity: 1 }]));
    assert.throws(() => calculateConsumption([{ product: { ...burger, recipe: { ...burger.recipe!, yield: 0 } }, quantity: 1 }]));
    assert.throws(() => calculateConsumption([{ product: { ...burger, recipe: { ...burger.recipe!, ingredients: [
        { id: 'meat', name: 'Carne', quantity: 1, unit: 'g', inventoryUnit: 'kg' },
    ] } }, quantity: 1 }]));
});
