'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Image from 'next/image';
import { AlertCircle, Loader2, UnlockKeyhole } from 'lucide-react';
import { useCashSession } from '@/hooks/use-cash-session';
import { Button } from '@/components/ui/button';

interface CashGateProps {
    branchId: string;
    userId: string;
    theme?: 'burger' | 'acai';
    children: ReactNode;
}

export default function CashGate({ branchId, userId, theme = 'burger', children }: CashGateProps) {
    const { status, opening, error, openCash } = useCashSession(branchId, userId);
    const [amount, setAmount] = useState('');
    const handleOpen = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        await openCash(parseFloat(amount) || 0);
    };

    if (status === 'loading') return <div data-brand={theme} className="skot-experience grid min-h-dvh place-items-center" role="status"><div className="text-center"><Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-brand" aria-hidden="true" /><p>Verificando estado de caja…</p></div></div>;

    if (status === 'closed' || status === 'error') return <main data-brand={theme} className="skot-experience grid min-h-dvh place-items-center px-4 py-8">
        <section className="w-full max-w-md overflow-hidden rounded-xl border border-line-subtle bg-surface" aria-labelledby="cash-gate-title">
            <div className="border-b border-line-subtle p-6 text-center">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-xl bg-canvas">
                    <Image src={theme === 'burger' ? '/logo-burger.png' : '/logo-acai.png'} alt="" width={60} height={60} className="max-h-14 object-contain" />
                </div>
                <h1 id="cash-gate-title" className="text-2xl font-semibold">Abrir caja</h1>
                <p className="mt-2 text-sm text-muted">Abrí la caja antes de comenzar a vender.</p>
            </div>
            <form onSubmit={handleOpen} className="space-y-5 p-6">
                {status === 'error' && <p role="alert" className="flex items-start gap-2 rounded-lg bg-[var(--status-error-bg)] p-3 text-sm text-danger"><AlertCircle size={18} className="shrink-0" /> Error de conexión al verificar la caja.</p>}
                <div><label htmlFor="opening-amount" className="mb-2 block font-semibold">Monto de apertura (Bs.)</label><input id="opening-amount" type="number" step="0.01" min="0" value={amount} onChange={event => setAmount(event.target.value)} className="min-h-12 w-full rounded-lg border border-line bg-surface px-4 text-lg font-semibold tabular-nums text-ink" /><p className="mt-1 text-sm text-muted">Dejá en 0 si la caja comienza vacía.</p></div>
                {error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-[var(--status-error-bg)] p-3 text-sm text-danger"><AlertCircle size={18} className="shrink-0" />{error}</p>}
                <Button type="submit" size="touch" disabled={opening} className="w-full">{opening ? <><Loader2 size={19} className="animate-spin" /> Abriendo caja…</> : <><UnlockKeyhole size={19} /> Abrir caja y comenzar</>}</Button>
                <p className="text-center text-xs text-muted">La apertura queda registrada en el historial de caja.</p>
            </form>
        </section>
    </main>;

    return <>{children}</>;
}
