import { useState, useEffect, useCallback } from 'react';
import { get, set, update } from 'idb-keyval';

export interface SyncQueueItem {
    id: string;
    type: 'SALE' | 'INVENTORY_UPDATE' | 'CASH_CLOSURE';
    payload: any;
    retryCount: number;
    createdAt: Date;
    priority: number; // 1: High (Sales), 2: Medium (Closures), 3: Low (Others)
    status: 'pending' | 'syncing' | 'failed' | 'completed';
}

const QUEUE_KEY = 'offline-sync-queue';

export function useSyncQueue() {
    const [queue, setQueue] = useState<SyncQueueItem[]>([]);

    // Cargar cola inicial
    useEffect(() => {
        get<SyncQueueItem[]>(QUEUE_KEY).then((items) => {
            if (items) {
                // Restaurar fechas desde strings JSON si es necesario
                const parsedItems = items.map(item => ({
                    ...item,
                    createdAt: new Date(item.createdAt)
                }));
                setQueue(parsedItems);
            }
        });
    }, []);

    const addToQueue = useCallback(async (item: Omit<SyncQueueItem, 'status' | 'retryCount' | 'createdAt'>) => {
        const newItem: SyncQueueItem = {
            ...item,
            id: crypto.randomUUID(),
            status: 'pending',
            retryCount: 0,
            createdAt: new Date(),
        };

        await update(QUEUE_KEY, (old: SyncQueueItem[] = []) => {
            const newQueue = [...old, newItem];
            setQueue(newQueue);
            return newQueue;
        });

        return newItem;
    }, []);

    const removeFromQueue = useCallback(async (id: string) => {
        await update(QUEUE_KEY, (old: SyncQueueItem[] = []) => {
            const newQueue = old.filter((item) => item.id !== id);
            setQueue(newQueue);
            return newQueue;
        });
    }, []);

    const updateItemStatus = useCallback(async (id: string, status: SyncQueueItem['status']) => {
        await update(QUEUE_KEY, (old: SyncQueueItem[] = []) => {
            const newQueue = old.map(item =>
                item.id === id ? { ...item, status } : item
            );
            setQueue(newQueue);
            return newQueue;
        });
    }, []);

    return { queue, addToQueue, removeFromQueue, updateItemStatus };
}
