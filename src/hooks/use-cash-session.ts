'use client';

import { useState, useCallback, useEffect } from 'react';

export interface CashSession {
    id: string;
    openingAmount: number;
    openedAt: string;
    openedBy: string | null;
}

export type CashStatus = 'loading' | 'open' | 'closed' | 'error';

export function useCashSession(branchId: string, userId: string) {
    const [status,  setStatus]  = useState<CashStatus>('loading');
    const [session, setSession] = useState<CashSession | null>(null);
    const [opening, setOpening] = useState(false);
    const [error,   setError]   = useState<string | null>(null);

    const checkStatus = useCallback(async () => {
        if (!branchId) return;
        setStatus('loading');
        try {
            const res  = await fetch(`/api/cash-close/open?branchId=${branchId}`);
            const data = await res.json();
            if (data.success) {
                setStatus(data.isOpen ? 'open' : 'closed');
                setSession(data.session ?? null);
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        }
    }, [branchId]);

    // Abrir caja con monto inicial
    const openCash = useCallback(async (openingAmount: number) => {
        if (!branchId || !userId) return false;
        setOpening(true);
        setError(null);
        try {
            const res  = await fetch('/api/cash-close/open', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ branchId, userId, openingAmount }),
            });
            const data = await res.json();
            if (data.success) {
                setSession(data.data);
                setStatus('open');
                return true;
            } else {
                setError(data.error || 'Error al abrir caja');
                return false;
            }
        } catch {
            setError('Error de conexión al abrir caja');
            return false;
        } finally {
            setOpening(false);
        }
    }, [branchId, userId]);

    // Verificar al montar y cada vez que cambie branchId
    useEffect(() => { checkStatus(); }, [checkStatus]);

    return { status, session, opening, error, openCash, refetch: checkStatus };
}
