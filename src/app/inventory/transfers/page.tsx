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
    fromBranch: { name: string; type: string };
    toBranch: { name: string; type: string };
    items: { product: { name: string }; requestedQty: number }[];
    status: string;
    requestedDate: string;
    notes?: string;
};

const STATUS_CFG: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
    PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-400', Icon: Clock },
    IN_TRANSIT: { label: 'En Tránsito', color: 'bg-blue-500/20 text-blue-400', Icon: Loader },
    RECEIVED: { label: 'Recibida', color: 'bg-green-100 text-green-400', Icon: CheckCircle },
    CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-400', Icon: X },
};

export default function TransfersPage() {
    const { user, loading: sessionLoading } = useSession();
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [statusFilter, setStatusFilter] = useState('');

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

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
            if (!isAdmin && user?.branchIds?.[0]) {
                params.set('branchId', user.branchIds[0]);
            }
            const res = await fetch(`/api/inventory/transfers?${params}`);
            const d = await res.json();
            if (d.success) setTransfers(d.data);
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
                    approve: '✅ Transferencia aprobada — en tránsito',
                    cancel: '❌ Transferencia cancelada',
                    receive: '📦 Recepción confirmada — stock actualizado',
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
        <div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: '56px 100px' }} />
            </div>
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <button onClick={() => window.history.back()} className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2"><ArrowLeft className="h-4 w-4" /> Volver atrás</button>
                        <h1 className="text-3xl font-bold text-white/90 flex items-center gap-3">
                            <ArrowLeftRight className="h-8 w-8 text-blue-400" /> Transferencias
                        </h1>
                    </div>
                    <Link
                        href="/inventory/transfers/request"
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition"
                    >
                        <Send className="h-4 w-4" /> Solicitar transferencia
                    </Link>
                </div>

                {/* Alertas de pendientes para admin */}
                {isAdmin && pending.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
                        <Clock className="h-5 w-5 text-yellow-400 flex-shrink-0" />
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
                            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/5'}`}
                        >
                            {s === '' ? 'Todas' : STATUS_CFG[s]?.label || s}
                        </button>
                    ))}
                </div>

                {/* Lista */}
                {loading ? (
                    <div className="text-center py-20 text-white/40">Cargando transferencias…</div>
                ) : transfers.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-2xl shadow text-white/40">
                        <ArrowLeftRight className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No hay transferencias{statusFilter ? ` en estado "${STATUS_CFG[statusFilter]?.label}"` : ''}.</p>
                        <Link href="/inventory/transfers/request" className="mt-4 inline-block text-green-400 font-medium hover:underline">
                            Solicitar una →
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transfers.map((t) => {
                            const cfg = STATUS_CFG[t.status] || STATUS_CFG['PENDING'];
                            const Icon = cfg.Icon;
                            const isPending = t.status === 'PENDING';
                            return (
                                <div key={t.id} className={`bg-white/5 rounded-2xl shadow p-5 border-l-4 ${isPending ? 'border-yellow-400' : t.status === 'RECEIVED' ? 'border-green-400' : 'border-white/20'}`}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="font-mono text-xs text-white/40">{t.transferNumber}</span>
                                                <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                                                    <Icon className="h-3.5 w-3.5" /> {cfg.label}
                                                </span>
                                            </div>
                                            <p className="font-semibold text-white/90 text-sm">
                                                {t.items.map(i => `${i.product.name} (${i.requestedQty})`).join(' · ')}
                                            </p>
                                            <p className="text-xs text-white/60 mt-0.5 flex items-center gap-1.5">
                                                <span className="font-medium">{t.fromBranch.name}</span>
                                                <ArrowLeftRight className="h-3 w-3" />
                                                <span className="font-medium">{t.toBranch.name}</span>
                                                <span className="text-white/30">·</span>
                                                <span>{new Date(t.requestedDate).toLocaleDateString('es-PE')}</span>
                                            </p>
                                            {t.notes && <p className="text-xs text-white/40 mt-1 italic">"{t.notes}"</p>}
                                        </div>

                                        {/* Botones de acción según el estado */}
                                        {isAdmin && isPending && (
                                            <div className="flex gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => handleAction(t.id, 'approve')}
                                                    disabled={!!actionLoading}
                                                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition"
                                                >
                                                    <ThumbsUp className="h-3.5 w-3.5" />
                                                    {actionLoading === t.id + 'approve' ? 'Aprobando…' : 'Aprobar'}
                                                </button>
                                                <button
                                                    onClick={() => handleAction(t.id, 'cancel')}
                                                    disabled={!!actionLoading}
                                                    className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-100 text-red-400 border border-red-200 rounded-xl text-xs font-semibold disabled:opacity-50 transition"
                                                >
                                                    <ThumbsDown className="h-3.5 w-3.5" />
                                                    {actionLoading === t.id + 'cancel' ? 'Cancelando…' : 'Rechazar'}
                                                </button>
                                            </div>
                                        )}
                                        {/* Botón confirmar recepción — para cualquier usuario con la transferencia en tránsito */}
                                        {t.status === 'IN_TRANSIT' && (
                                            <button
                                                onClick={() => handleAction(t.id, 'receive')}
                                                disabled={!!actionLoading}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition flex-shrink-0"
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

                <p className="text-xs text-white/40 text-center mt-6">{transfers.length} transferencia{transfers.length !== 1 ? 's' : ''}</p>
            </div>
        </div>
    );
}
