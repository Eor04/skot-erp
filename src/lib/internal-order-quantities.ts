import { OperationError } from './transaction';

/** Exige una cantidad para cada línea del documento y evita IDs repetidos o ajenos. */
export function validateOrderQuantities<T extends { id: string }>(
    lines: T[], input: unknown, field: string, maximum: (line: T) => number, requirePositive: boolean,
): Map<string, number> {
    if (!Array.isArray(input) || input.length !== lines.length || !lines.length) throw new OperationError('Se requieren cantidades para todos los productos');
    const values = new Map<string, number>();
    const byId = new Map(lines.map(line => [line.id, line]));
    for (const item of input) {
        const line = item && byId.get(item.itemId);
        const quantity = item?.[field];
        if (!line || values.has(item.itemId) || !Number.isFinite(quantity) || quantity < 0 || quantity > maximum(line)) {
            throw new OperationError('Revisa los productos y las cantidades del pedido');
        }
        values.set(item.itemId, quantity);
    }
    if (requirePositive && !Array.from(values.values()).some(value => value > 0)) throw new OperationError('Debe haber al menos una cantidad mayor que cero');
    return values;
}
