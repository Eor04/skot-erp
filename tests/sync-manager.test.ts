import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getOfflineQueue, saveToOfflineQueue, syncOfflineQueue } from '../src/lib/sync-manager';

test('recupera ventas interrumpidas y evita dos sincronizaciones simultáneas en la pestaña', async () => {
    const store = new Map<string, string>();
    const originalWindow = globalThis.window;
    const originalStorage = globalThis.localStorage;
    const originalFetch = globalThis.fetch;
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent() {} } });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
    } });
    try {
        const sale = saveToOfflineQueue({ createdAt: new Date().toISOString(), payload: { items: [] }, type: 'BURGER', displayTotal: 1, displayItems: [] });
        const second = saveToOfflineQueue({ createdAt: new Date().toISOString(), payload: { items: [] }, type: 'BURGER', displayTotal: 1, displayItems: [] });
        assert.notEqual(sale.offlineId, second.offlineId);
        store.set('skot_offline_sales_queue', JSON.stringify([{ ...sale, status: 'syncing' }]));
        let requests = 0;
        globalThis.fetch = async () => { requests++; await new Promise(resolve => setTimeout(resolve, 10)); return new Response(JSON.stringify({ success: true })); };
        const [first, concurrent] = await Promise.all([syncOfflineQueue(), syncOfflineQueue()]);
        assert.equal(requests, 1);
        assert.equal(first.synced, 1);
        assert.equal(concurrent.synced, 1);
        assert.deepEqual(getOfflineQueue(), []);
        store.set('skot_offline_sales_queue', JSON.stringify([{ ...sale, status: 'syncing' }]));
        globalThis.fetch = async () => new Response(JSON.stringify({ success: false, error: 'Requiere conciliación' }), { status: 409 });
        assert.equal((await syncOfflineQueue()).errors, 1);
        assert.equal(getOfflineQueue()[0].status, 'failed');
        assert.equal(getOfflineQueue()[0].errorMessage, 'Requiere conciliación');
    } finally {
        Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
        Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalStorage });
        globalThis.fetch = originalFetch;
    }
});
