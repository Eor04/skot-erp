/**
 * Hook: useStockAlerts
 * Hace polling cada 60 segundos para detectar alertas de stock críticas/bajas.
 * Se puede usar en cualquier layout o componente global.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface AlertSummary {
    critical: number;       // Sin stock (=0)
    low: number;            // Por debajo de stock mínimo
    expiringSoon: number;   // Por vencer en 30d
    total: number;
}

const POLL_INTERVAL_MS = 60_000; // 1 minuto

export function useStockAlerts(enabled = true): {
    alerts: AlertSummary | null;
    loading: boolean;
    refresh: () => void;
} {
    const [alerts, setAlerts] = useState<AlertSummary | null>(null);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!enabled) return;
        setLoading(true);
        try {
            const res = await fetch('/api/inventory/alerts');
            const d = await res.json();
            if (d.success) {
                const s = d.data?.summary ?? {};
                setAlerts({
                    critical: s.critical ?? 0,
                    low: s.totalLowStock ?? 0,
                    expiringSoon: s.totalExpiring ?? 0,
                    total: (s.critical ?? 0) + (s.totalLowStock ?? 0),
                });
            }
        } catch { /* silencioso */ }
        finally { setLoading(false); }
    }, [enabled]);

    // Carga inicial
    useEffect(() => { refresh(); }, [refresh]);

    // Polling
    useEffect(() => {
        if (!enabled) return;
        const id = setInterval(refresh, POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, [enabled, refresh]);

    return { alerts, loading, refresh };
}
