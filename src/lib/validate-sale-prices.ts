import { Prisma } from '@prisma/client';
import { OperationError } from './transaction';
import { verifyOfflineAuthorization } from './offline-sale-authorization';

const close = (a: number, b: number) => Math.abs(a - b) < 0.005;
const cents = (n: number) => Math.round(n * 100) / 100;

/** Valida precios vigentes online y autorizaciones firmadas al vender sin conexión. */
export async function validateSalePrices(tx: Prisma.TransactionClient, branchId: string, userId: string, items: any[],
    extrasTotal: unknown, extraModifiers: any, offline: boolean, saleAt?: Date) {
    const fail = (message: string): never => { throw new OperationError(`${message}${offline ? '. La venta offline requiere conciliación' : ''}`, offline ? 409 : 400); };
    if (items.some(item => item.modifiers !== undefined && !Array.isArray(item.modifiers))) fail('Modificadores inválidos');
    const productAuth = new Map<any, any>();
    if (offline) for (const item of items) {
        const auth = verifyOfflineAuthorization(item.offlineAuthorization, { kind: 'product', branchId, userId });
        if (!auth || auth.productId !== item.productId || typeof auth.configVersion !== 'string' ||
            item.configVersion !== auth.configVersion || !auth.consumptionSnapshot ||
            (auth.consumptionSnapshot as any).id !== item.productId || (saleAt && auth.issuedAt > saleAt.getTime() + 60_000)) fail('Falta una autorización de producto válida');
        productAuth.set(item, auth);
    }
    const products = await tx.product.findMany({ where: { id: { in: [...new Set(items.map(i => i.productId as string))] } },
        include: { branchProducts: { where: { branchId, ...(offline ? {} : { active: true }) } } } });
    const productMap = new Map(products.map(p => [p.id, p]));
    const comboIds = [...new Set(items.filter(i => i.comboId).map(i => i.comboId as string))];
    const combos = await tx.combo.findMany({ where: { id: { in: comboIds }, ...(offline ? {} : { active: true }) }, include: { items: true } });
    const comboMap = new Map(combos.map(c => [c.id, c]));
    const modifiersInput = items.flatMap(i => Array.isArray(i.modifiers) ? i.modifiers : []);
    if (extraModifiers !== undefined && !Array.isArray(extraModifiers)) fail('Extras inválidos');
    const allModifiers = [...modifiersInput, ...(extraModifiers || [])];
    if (allModifiers.some(m => !m || typeof m.modifierId !== 'string' || !Number.isFinite(m.quantity) || m.quantity <= 0 ||
        !Number.isFinite(m.price) || m.price < 0)) fail('Modificadores inválidos');
    const modifiers = await tx.productModifier.findMany({ where: { id: { in: [...new Set(allModifiers.map(m => m.modifierId as string))] }, ...(offline ? {} : { active: true }) } });
    const modifierMap = new Map(modifiers.map(m => [m.id, m]));
    for (const m of allModifiers) {
        const current = modifierMap.get(m.modifierId);
        if (!current) fail('Extra no disponible');
        if (offline) {
            const auth = verifyOfflineAuthorization(m.offlineAuthorization, { kind: 'modifier', branchId, userId });
            if (!auth || auth.modifierId !== m.modifierId || !close(m.price, auth.price as number) ||
                (saleAt && auth.issuedAt > saleAt.getTime() + 60_000)) fail('Autorización de precio de extra inválida');
        } else if (!close(current!.price, m.price)) fail('El precio de un extra cambió');
    }
    const extras = extraModifiers || [];
    const extrasValue = extrasTotal === undefined ? 0 : extrasTotal;
    if (typeof extrasValue !== 'number' || !Number.isFinite(extrasValue) || extrasValue < 0 ||
        !close(extras.reduce((sum: number, m: any) => sum + m.quantity * m.price, 0), extrasValue)) fail('El total de extras no coincide');

    const groups = new Map<string, any[]>();
    const bases: any[] = [];
    for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product || (!offline && (!product.active || product.deletedAt))) fail('Producto no disponible');
        if (product!.type === 'SUPPLY') fail('Los suministros no están habilitados para venta');
        const auth = productAuth.get(item);
        const productType = offline ? auth!.productType : product!.type;
        if (item.comboId || item.comboGroup !== undefined) {
            if (typeof item.comboId !== 'string' || typeof item.comboGroup !== 'string' || !item.comboGroup || item.modifiers?.length) fail('Combo inválido');
            const group = groups.get(item.comboGroup) || [];
            group.push(item); groups.set(item.comboGroup, group);
            continue;
        }
        const bp = product!.branchProducts[0];
        if (!offline && !bp) fail(`${product!.name} no está habilitado en la sucursal`);
        if (productType === 'ACAI_BASE') { bases.push(item); continue; }
        const price = offline ? auth!.price : bp?.customPrice;
        if (!['BURGER', 'BURGER_EXTRA', 'BEVERAGE'].includes(productType) || typeof price !== 'number' || price <= 0 ||
            !close(item.unitPrice, price)) fail(`Precio o configuración inválida para ${product!.name}`);
        const mods = (item.modifiers || []).reduce((sum: number, m: any) => sum + m.price * m.quantity, 0);
        if (!close(item.subtotal, cents((price + mods) * item.quantity))) fail(`Subtotal inválido para ${product!.name}`);
    }
    for (const group of Array.from(groups.values())) {
        let comboPrice: number;
        let expected: Map<string, number>;
        if (offline) {
            const token = group[0].comboAuthorization;
            const auth = verifyOfflineAuthorization(token, { kind: 'combo', branchId, userId });
            if (!auth || auth.comboId !== group[0].comboId || group.some(i => i.comboAuthorization !== token) ||
                !Array.isArray(auth.items) || !Number.isFinite(auth.price) || (saleAt && auth.issuedAt > saleAt.getTime() + 60_000)) fail('Autorización de combo inválida');
            comboPrice = auth!.price as number;
            expected = new Map();
            for (const part of auth!.items as any[]) {
                if (!part || typeof part.productId !== 'string' || !Number.isFinite(part.quantity) || part.quantity <= 0) fail('Composición de combo inválida');
                expected.set(part.productId, (expected.get(part.productId) || 0) + part.quantity);
            }
        } else {
            const combo = comboMap.get(group[0].comboId);
            if (!combo || !Number.isFinite(combo.price) || combo.price <= 0 || !combo.items.length) fail('Combo no disponible');
            comboPrice = combo!.price;
            expected = new Map();
            for (const part of combo!.items) expected.set(part.productId, (expected.get(part.productId) || 0) + part.quantity);
        }
        if (!expected.size || group.some(i => i.comboId !== group[0].comboId)) fail('Composición del combo inválida');
        const actual = new Map<string, number>();
        for (const item of group) actual.set(item.productId, (actual.get(item.productId) || 0) + item.quantity);
        if (actual.size !== expected.size) fail('Composición del combo inválida');
        let factor: number | undefined;
        for (const [id, qty] of Array.from(expected.entries())) {
            if (!Number.isFinite(qty) || qty <= 0 || !actual.has(id)) fail('Composición del combo inválida');
            const value = actual.get(id)! / qty;
            if (factor !== undefined && Math.abs(factor - value) > 1e-8) fail('Cantidades del combo inválidas');
            factor = value;
        }
        if (!factor || !close(group.reduce((sum, i) => sum + i.subtotal, 0), cents(comboPrice * factor))) fail('Precio del combo inválido');
    }
    if (bases.length) {
        const prices = bases.map(item => offline ? productAuth.get(item)?.price : productMap.get(item.productId)!.branchProducts[0]?.pricePerKg);
        if (prices.some(price => typeof price !== 'number' || price <= 0)) fail('Falta el precio por kilogramo de un sabor');
        const average = cents((prices as number[]).reduce((sum, p) => sum + p, 0) / prices.length);
        if (bases.some(item => !close(item.unitPrice, average) || item.modifiers?.length) ||
            bases.some(item => Math.abs(item.quantity - bases[0].quantity) > 1e-8) ||
            !close(bases.reduce((sum, item) => sum + item.subtotal, 0), cents(bases.reduce((sum, item) => sum + item.quantity, 0) * average))) {
            fail('Precio o peso del bowl inválido');
        }
    }
}
