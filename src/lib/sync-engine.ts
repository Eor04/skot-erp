import { get, set } from 'idb-keyval';
import { SyncQueueItem } from '@/hooks/use-sync-queue';

const QUEUE_KEY = 'offline-sync-queue';

export class SyncEngine {
    private isProcessing = false;

    async processQueue() {
        if (this.isProcessing) return;
        if (!navigator.onLine) return;

        this.isProcessing = true;

        try {
            const queue = (await get<SyncQueueItem[]>(QUEUE_KEY)) || [];

            // Filtrar pendientes y ordenar por prioridad y fecha
            const pendingItems = queue
                .filter(item => item.status === 'pending' || item.status === 'failed')
                .sort((a, b) => {
                    // Primero prioridad (menor número = mayor prioridad)
                    if (a.priority !== b.priority) return a.priority - b.priority;
                    // Luego FIFO (más antiguo primero)
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                });

            for (const item of pendingItems) {
                if (!navigator.onLine) break; // Detener si se pierde conexión

                try {
                    // Marcar como syncing
                    await this.updateItemStatus(item.id, 'syncing');

                    // Procesar según tipo
                    await this.processItem(item);

                    // Éxito: eliminar de la cola
                    await this.removeItem(item.id);

                } catch (error) {
                    console.error(`Error syncing item ${item.id}:`, error);
                    // Fallo: marcar como failed y aumentar retryCount
                    await this.handleItemError(item);
                }
            }
        } finally {
            this.isProcessing = false;
        }
    }

    private async processItem(item: SyncQueueItem) {
        // Aquí iría la lógica específica de cada tipo de acción
        // Podríamos usar un mapa de handlers o switch
        switch (item.type) {
            case 'SALE':
                // await api.sales.create(item.payload);
                console.log('Syncing SALE:', item.payload);
                // Simulación de delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                break;
            case 'INVENTORY_UPDATE':
                console.log('Syncing INVENTORY:', item.payload);
                break;
            case 'CASH_CLOSURE':
                console.log('Syncing CLOSURE:', item.payload);
                break;
            default:
                console.warn('Unknown sync item type:', item.type);
        }
    }

    private async updateItemStatus(id: string, status: SyncQueueItem['status']) {
        const queue = (await get<SyncQueueItem[]>(QUEUE_KEY)) || [];
        const newQueue = queue.map(item =>
            item.id === id ? { ...item, status } : item
        );
        await set(QUEUE_KEY, newQueue);
    }

    private async removeItem(id: string) {
        const queue = (await get<SyncQueueItem[]>(QUEUE_KEY)) || [];
        const newQueue = queue.filter(item => item.id !== id);
        await set(QUEUE_KEY, newQueue);
    }

    private async handleItemError(item: SyncQueueItem) {
        const queue = (await get<SyncQueueItem[]>(QUEUE_KEY)) || [];
        const newQueue = queue.map(i => {
            if (i.id === item.id) {
                return {
                    ...i,
                    status: 'failed',
                    retryCount: (i.retryCount || 0) + 1
                };
            }
            return i;
        });
        await set(QUEUE_KEY, newQueue);
    }
}

export const syncEngine = new SyncEngine();
