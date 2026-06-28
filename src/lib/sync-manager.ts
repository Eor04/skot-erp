// Manejo de la cola de ventas offline

export interface OfflineSale {
    offlineId: string;
    createdAt: string; // ISO String
    payload: any; // El body de /api/pos/sale
    type: 'BURGER' | 'ACAI';
    status: 'pending' | 'syncing' | 'failed';
    errorMessage?: string;
    displayTotal: number;
    displayItems: string[];
}

const STORAGE_KEY = 'skot_offline_sales_queue';

export function getOfflineQueue(): OfflineSale[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function saveToOfflineQueue(sale: Omit<OfflineSale, 'status' | 'offlineId'>): OfflineSale {
    const queue = getOfflineQueue();
    const newSale: OfflineSale = {
        ...sale,
        offlineId: `OFF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        status: 'pending',
    };
    
    // Al payload le inyectamos la fecha original para que el backend la respete
    newSale.payload.createdAt = newSale.createdAt;
    newSale.payload.offlineId = newSale.offlineId;

    queue.push(newSale);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    
    // Despachamos un evento para que los componentes puedan actualizarse
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('skot-offline-queue-updated'));
    }
    
    return newSale;
}

export function removeOfflineSale(offlineId: string) {
    const queue = getOfflineQueue();
    const newQueue = queue.filter(s => s.offlineId !== offlineId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newQueue));
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('skot-offline-queue-updated'));
    }
}

export async function syncOfflineQueue(): Promise<{ total: number; synced: number; errors: number }> {
    const queue = getOfflineQueue();
    const pending = queue.filter(s => s.status === 'pending' || s.status === 'failed');
    
    if (pending.length === 0) return { total: 0, synced: 0, errors: 0 };
    
    let synced = 0;
    let errors = 0;
    
    // Marcamos todos como syncing visualmente
    const syncingQueue = queue.map(s => pending.find(p => p.offlineId === s.offlineId) ? { ...s, status: 'syncing' as const } : s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(syncingQueue));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('skot-offline-queue-updated'));

    for (const sale of pending) {
        try {
            const res = await fetch('/api/pos/sale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sale.payload),
            });
            const data = await res.json();
            
            if (data.success) {
                // Sincronización exitosa, la removemos de la cola
                removeOfflineSale(sale.offlineId);
                synced++;
            } else {
                // Error lógico (ej. stock negativo y no lo permite, error de validación)
                // Lo devolvemos a failed para revisión manual o reintento si el backend cambió
                updateOfflineSaleStatus(sale.offlineId, 'failed', data.error || 'Error al procesar la venta offline');
                errors++;
            }
        } catch (error: any) {
            // Error de red, sigue offline
            updateOfflineSaleStatus(sale.offlineId, 'failed', 'Fallo de red al intentar sincronizar');
            errors++;
        }
    }
    
    return { total: pending.length, synced, errors };
}

function updateOfflineSaleStatus(offlineId: string, status: 'pending' | 'syncing' | 'failed', errorMessage?: string) {
    const queue = getOfflineQueue();
    const updated = queue.map(s => {
        if (s.offlineId === offlineId) {
            return { ...s, status, errorMessage };
        }
        return s;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('skot-offline-queue-updated'));
}
