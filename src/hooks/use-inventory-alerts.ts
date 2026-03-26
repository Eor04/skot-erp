'use client';

import { useState } from 'react';

interface UseInventoryAlertsReturn {
    alerts: {
        lowStock: any[];
        expiringSoon: any[];
        summary: any;
    } | null;
    loading: boolean;
    error: string | null;
    refreshAlerts: () => Promise<void>;
}

export function useInventoryAlerts(branchId?: string): UseInventoryAlertsReturn {
    const [alerts, setAlerts] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshAlerts = async () => {
        try {
            setLoading(true);
            setError(null);

            const query = branchId ? `?branchId=${branchId}` : '';
            const response = await fetch(`/api/inventory/alerts${query}`);
            const result = await response.json();

            if (result.success) {
                setAlerts(result.data);
            } else {
                setError(result.error || 'Error al cargar alertas');
            }
        } catch (err: any) {
            setError(err.message || 'Error al cargar alertas');
            console.error('Error en useInventoryAlerts:', err);
        } finally {
            setLoading(false);
        }
    };

    return { alerts, loading, error, refreshAlerts };
}
