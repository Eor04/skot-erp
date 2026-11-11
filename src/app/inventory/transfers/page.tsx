'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeftRight, ArrowLeft, Plus, Clock, CheckCircle,
    Loader, X, AlertCircle, CheckCircle2, ThumbsUp, ThumbsDown, Send
} from 'lucide-react';
import { useSession } from '@/lib/session-context';

type Transfer = {
    id: string;
    transferNumber: string;
    fromBranch: { id: string; name: string; type: string };
    toBranch: { id: string; name: string; type: string };
    items: { product: { name: string }; requestedQty: number }[];
    status: string;
    requestedDate: string;
    notes?: string;
};

const STATUS_CFG: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
    PENDING: { label: 'Pendiente', color: 'bg-[var(--status-warning-bg)] text-warning', Icon: Clock },
    IN_TRANSIT: { label: 'En Tránsito', color: 'bg-[var(--status-info-bg)] text-info', Icon: Loader },
    RECEIVED: { label: 'Recibida', color: 'bg-[var(--status-success-bg)] text-success', Icon: CheckCircle },
    CANCELLED: { label: 'Cancelada', color: 'bg-[var(--status-error-bg)] text-danger', Icon: X },
};

export default function TransfersPage() {
    const { user, loading: sessionLoading } = useSession();
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        if (!sessionLoading) {
            fetchTransfers();
        }
    }, [statusFilter, sessionLoading]);

    async function fetchTransfers() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.set('status', statusFilter);
            const res = await fetch(`/api/inventory/transfers?${params}`);
            const d = await res.json();
            if (d.success) setTransfers(d.data);
            else showToast('error', d.error || 'Error al cargar transferencias');
        } catch {
            showToast('error', 'Error al cargar transferencias');
        } finally {
            setLoading(false);
        }
    }

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }

    // Aprobar → cambiar status a IN_TRANSIT
    // Rechazar → cambiar status a CANCELLED
    async function handleAction(transferId: string, action: 'approve' | 'cancel' | 'receive') {
        setActionLoading(transferId + action);
        try {
            const endpoint = action === 'receive'
                ? `/api/inventory/transfers/${transferId}/receive`
                : `/api/inventory/transfers/${transferId}/${action === 'approve' ? 'approve' : 'cancel'}`;
            const res = await fetch(endpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approvedBy: user?.userId, receivedBy: user?.userId }),
            });
            const data = await res.json();
            if (data.success) {
                const msgs: Record<string, string> = {
                    approve: 'Transferencia aprobada — en tránsito',
                    cancel: 'Transferencia cancelada',
                    receive: 'Recepción confirmada — stock actualizado',
                };
                showToast('success', msgs[action]);
                fetchTransfers();
            } else {
                showToast('error', data.error || 'Error al procesar');
            }
        } catch {
            showToast('error', 'Error de conexión');
        } finally {
            setActionLoading(null);
        }
    }

    const pending = transfers.filter(t => t.status === 'PENDING');

    return (
        <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-brand' : 'bg-danger'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="mx-auto max-w-5xl">
                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                    <div>
                        <Link href="/inventory" className="text-sm text-muted hover:text-ink flex items-center gap-1 mb-2"><ArrowLeft className="h-4 w-4" /> Volver a inventario</Link>
                        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink flex items-center gap-3">
                            <ArrowLeftRight className="h-8 w-8 text-info" /> Transferencias
                        </h1>
                    </div>
                    <Link
                        href="/inventory/transfers/request"
                        className="flex items-center gap-2 bg-brand hover:brightness-90 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition"
                    >
                        <Send className="h-4 w-4" /> Solicitar transferencia
                    </Link>
                </div>

                {/* Alertas de pendientes para admin */}
                {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && pending.length > 0 && (
                    <div className="bg-[var(--status-warning-bg)] border border-line-subtle rounded-2xl p-4 mb-6 flex items-center gap-3">
                        <Clock className="h-5 w-5 text-warning flex-shrink-0" />
                        <p className="text-yellow-300 text-sm font-medium">
                            Hay <strong>{pending.length} solicitud{pending.length !== 1 ? 'es' : ''}</strong> pendiente{pending.length !== 1 ? 's' : ''} de aprobación.
                        </p>
                    </div>
                )}

                {/* Filtro de estado */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    {['', 'PENDING', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'].map(s => (
                        <button
                            key={s || 'ALL'}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 min-h-11 py-2 rounded-xl text-sm font-medium transition ${statusFilter === s ? 'bg-brand text-white' : 'bg-surface border border-line-subtle text-muted hover:bg-canvas'}`}
                        >
                            {s === '' ? 'Todas' : STATUS_CFG[s]?.label || s}
                        </button>
                    ))}
                </div>

                {/* Lista */}
                {loading ? (
                    <div className="text-center py-20 text-muted">Cargando transferencias…</div>
                ) : transfers.length === 0 ? (
                    <div className="text-center py-20 bg-surface rounded-2xl shadow text-muted">
                        <ArrowLeftRight className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No hay transferencias{statusFilter ? ` en estado "${STATUS_CFG[statusFilter]?.label}"` : ''}.</p>
                        <Link href="/inventory/transfers/request" className="mt-4 inline-block text-success font-medium hover:underline">
                            Solicitar una →
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transfers.map((t) => {
                            const cfg = STATUS_CFG[t.status] || STATUS_CFG['PENDING'];
                            const Icon = cfg.Icon;
                            const isPending = t.status === 'PENDING';
                            const canDispatch = (user?.role === 'ADMIN' || user?.branchIds?.includes(t.fromBranch.id)) &&
                                ['ADMIN', 'MANAGER', 'WAREHOUSE'].includes(user?.role || '');
                            const canReceive = user?.role === 'ADMIN' || user?.branchIds?.includes(t.toBranch.id);
                            return (
                                <div key={t.id} className={`bg-surface rounded-2xl shadow p-5 border-l-4 ${isPending ? 'border-yellow-400' : t.status === 'RECEIVED' ? 'border-green-400' : 'border-line'}`}>
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="font-mono text-xs text-muted">{t.transferNumber}</span>
                                                <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                                                    <Icon className="h-3.5 w-3.5" /> {cfg.label}
                                                </span>
                                            </div>
                                            <p className="font-semibold text-ink text-sm">
                                                {t.items.map(i => `${i.product.name} (${i.requestedQty})`).join(' · ')}
                                            </p>
                                            <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
                                                <span className="font-medium">{t.fromBranch.name}</span>
                                                <ArrowLeftRight className="h-3 w-3" />
                                                <span className="font-medium">{t.toBranch.name}</span>
                                                <span className="text-muted">·</span>
                                                <span>{new Date(t.requestedDate).toLocaleDateString('es-PE')}</span>
                                            </p>
                                            {t.notes && <p className="text-xs text-muted mt-1 italic">"{t.notes}"</p>}
                                        </div>

                                        {/* Botones de acción según el estado */}
                                        {canDispatch && isPending && (
                                            <div className="flex gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => handleAction(t.id, 'approve')}
                                                    disabled={!!actionLoading}
                                                    className="flex items-center gap-1.5 px-3 py-2 bg-brand hover:brightness-90 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition"
                                                >
                                                    <ThumbsUp className="h-3.5 w-3.5" />
                                                    {actionLoading === t.id + 'approve' ? 'Despachando…' : 'Despachar'}
                                                </button>
                                                <button
                                                    onClick={() => handleAction(t.id, 'cancel')}
                                                    disabled={!!actionLoading}
                                                    className="flex items-center gap-1.5 px-3 py-2 bg-[var(--status-error-bg)] hover:bg-[var(--status-error-bg)] text-danger border border-line-subtle rounded-xl text-xs font-semibold disabled:opacity-50 transition"
                                                >
                                                    <ThumbsDown className="h-3.5 w-3.5" />
                                                    {actionLoading === t.id + 'cancel' ? 'Cancelando…' : 'Rechazar'}
                                                </button>
                                            </div>
                                        )}
                                        {/* Botón confirmar recepción — para cualquier usuario con la transferencia en tránsito */}
                                        {canReceive && t.status === 'IN_TRANSIT' && (
                                            <button
                                                onClick={() => handleAction(t.id, 'receive')}
                                                disabled={!!actionLoading}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-brand hover:brightness-90 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition flex-shrink-0"
                                            >
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                {actionLoading === t.id + 'receive' ? 'Confirmando…' : 'Confirmar recepción'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <p className="text-xs text-muted text-center mt-6">{transfers.length} transferencia{transfers.length !== 1 ? 's' : ''}</p>
            </div>
        </main>
    );
}
