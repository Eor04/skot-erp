import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signOfflineAuthorization, verifyOfflineAuthorization } from '../src/lib/offline-sale-authorization';

test('autorización offline firma precio y la limita a usuario, sucursal y vencimiento', () => {
    const previousSecret = process.env.OFFLINE_SALE_SECRET;
    process.env.OFFLINE_SALE_SECRET = 'offline-test-secret-with-at-least-32-characters';
    const originalNow = Date.now;
    let now = 1_800_000_000_000;
    Date.now = () => now;
    try {
        const token = signOfflineAuthorization({ kind: 'product', branchId: 'branch-1', userId: 'cashier-1',
            productId: 'burger-1', price: 20, configVersion: 'v1', consumptionSnapshot: { id: 'burger-1', mode: 'STOCK' } });
        assert.ok(token);
        assert.equal(verifyOfflineAuthorization(token, { kind: 'product', branchId: 'branch-1', userId: 'cashier-1' })?.price, 20);
        assert.equal(verifyOfflineAuthorization(token, { kind: 'product', branchId: 'branch-2', userId: 'cashier-1' }), null);
        assert.equal(verifyOfflineAuthorization(token, { kind: 'product', branchId: 'branch-1', userId: 'cashier-2' }), null);
        const [payload, signature] = token!.split('.');
        assert.equal(verifyOfflineAuthorization(`${payload}.${signature.slice(0, -2)}aa`, { kind: 'product', branchId: 'branch-1', userId: 'cashier-1' }), null);
        now += 31 * 24 * 60 * 60 * 1000;
        assert.equal(verifyOfflineAuthorization(token, { kind: 'product', branchId: 'branch-1', userId: 'cashier-1' }), null);
    } finally {
        Date.now = originalNow;
        if (previousSecret === undefined) delete process.env.OFFLINE_SALE_SECRET;
        else process.env.OFFLINE_SALE_SECRET = previousSecret;
    }
});
