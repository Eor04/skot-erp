'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, DollarSign, TrendingUp, CreditCard, Clock,
    Check, AlertCircle, Loader2, LogIn, LogOut, Lock,
    ShoppingCart, ArrowUpRight, Banknote, Smartphone, Package
} from 'lucide-react';
import { useSession } from '@/lib/session-context';

interface Branch { id: string; name: string; type: string; }
interface CashSession {
    id: string;
    createdAt: string;
    openedAt?: string;
    closedAt?: string;
    sessionStatus: string;
    openedBy?: string;
    openingAmount: number;
    expectedCash: number;
    actualCash: number;
    difference: number;
    totalSales: number;
    cashSales: number;
    cardSales: number;
    transferSales: number;
    totalExpenses: number;
    netCash: number;
    notes?: string;
    user: { name: string };
    branch: { name: string };
}
interface ShiftSummary {
    from: string;
    totalSales: number;
    totalRevenue: number;
    cashTotal: number;
    cardTotal: number;
    transferTotal: number;
    totalItems: number;
    avgTicket: number;
    byMethod: Record<string, number>;
    recentSales: { saleNumber: string; totalAmount: number; paymentMethod: string; createdAt: string }[];
    // Gastos del turno (cargados por separado)
    totalExpenses?: number;
    expensesDetail?: { id: string; description: string; amount: number; category: string; paymentMethod: string }[];
}

function fmt(n: number) { return 'Bs. ' + n.toFixed(2); }

function duration(openedAt?: string, closedAt?: string) {
    if (!openedAt) return null;
    const ms = (closedAt ? new Date(closedAt) : new Date()).getTime() - new Date(openedAt).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}min` : `${m} min`;
}

const METHOD_ICON: Record<string, React.ReactNode> = {
    CASH: <Banknote className="h-4 w-4 text-green-600" />,
    CARD: <CreditCard className="h-4 w-4 text-blue-600" />,
    TRANSFER: <Smartphone className="h-4 w-4 text-purple-600" />,
    MIXED: <ArrowUpRight className="h-4 w-4 text-orange-500" />,
};
const METHOD_LABEL: Record<string, string> = {
    CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', MIXED: 'Mixto',
};

export default function CashClosePage() {
    const { user } = useSession();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [history, setHistory] = useState<CashSession[]>([]);
    const [activeSession, setActiveSession] = useState<CashSession | null>(null);
    const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [mode, setMode] = useState<'open' | 'close'>('open');
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const [toppings, setToppings] = useState<{ id: string, name: string, unit: string }[]>([]);
    const [toppingRequests, setToppingRequests] = useState<Record<string, number>>({});
    const [selectedFactoryId, setSelectedFactoryId] = useState<string>('');

    const [form, setForm] = useState({
        branchId: '', openingAmount: '', actualCash: '', notes: '',
    });

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }

    const loadShiftSummary = useCallback(async (branchId: string, openedAt?: string) => {
        const params = new URLSearchParams({ branchId });
        if (openedAt) params.set('from', openedAt);

        // Para gastos: filtrar desde la apertura exacta del turno (no desde medianoche)
        const today = new Date().toISOString().split('T')[0];
        const expParams = new URLSearchParams({ branchId, endDate: today });
        if (openedAt) {
            // Pasar datetime completo como startDate para filtrar por hora de apertura
            expParams.set('startDate', openedAt);
        } else {
            expParams.set('startDate', today);
        }

        const [summaryRes, expensesRes] = await Promise.all([
            fetch(`/api/cash-close/shift-summary?${params}`).then(r => r.json()),
            fetch(`/api/expenses?${expParams}`).then(r => r.json()),
        ]);
        if (summaryRes.success) {
            const expD = expensesRes.success ? expensesRes.data : [];
            const expTotal = expensesRes.success ? (expensesRes.summary?.sumAmount ?? 0) : 0;
            setShiftSummary({ ...summaryRes.data, totalExpenses: expTotal, expensesDetail: expD });
        }
    }, []);

    async function loadData(branchId?: string) {
        const bid = branchId || form.branchId;
        const productsPromise = bid 
            ? fetch(`/api/pos/products?branchId=${bid}&type=ACAI_TOPPING`).then(r => r.json())
            : Promise.resolve({ success: true, data: [] });

        const [branchRes, histRes, productsRes] = await Promise.all([
            fetch('/api/branches').then(r => r.json()),
            fetch(`/api/cash-close?limit=15${bid ? '&branchId=' + bid : ''}`).then(r => r.json()),
            productsPromise,
        ]);
        if (branchRes.success) {
            setBranches(branchRes.data);
            const factories = branchRes.data.filter((b: any) => b.type === 'FABRICA');
            if (factories.length > 0) setSelectedFactoryId(factories[0].id);
        }
        if (productsRes.success) {
            setToppings(productsRes.data);
        }
        if (histRes.success) {
            const sessions: CashSession[] = histRes.data;
            setHistory(sessions);
            const open = sessions.find(s => (s as any).sessionStatus === 'OPEN');
            setActiveSession(open || null);
            if (open) {
                setMode('close');
                // Cargar resumen del turno desde la apertura
                const targetBranch = bid || open.branch?.name;
                if (bid || branchId) loadShiftSummary(bid || branchId!, open.openedAt);
            }
        }
        setLoading(false);
    }

    useEffect(() => {
        let initialBid = form.branchId;
        if (!isAdmin && user?.branchIds?.[0]) {
            initialBid = user.branchIds[0];
            setForm(f => ({ ...f, branchId: initialBid }));
        }
        loadData(initialBid);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Cargar resumen cuando hay sesión activa y sabemos el branchId
    useEffect(() => {
        if (activeSession && form.branchId) {
            loadShiftSummary(form.branchId, activeSession.openedAt);
        }
    }, [activeSession, form.branchId, loadShiftSummary]);

    async function handleOpen(e: React.FormEvent) {
        e.preventDefault();
        if (!form.branchId) return showToast('error', 'Seleccioná una sucursal');
        setSubmitting(true);
        try {
            const res = await fetch('/api/cash-close/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branchId: form.branchId,
                    userId: user?.userId,
                    openingAmount: parseFloat(form.openingAmount) || 0,
                    openedBy: user?.name,
                }),
            });
            const d = await res.json();
            if (d.success) {
                showToast('success', '🟢 Caja abierta correctamente');
                setActiveSession(d.data);
                setMode('close');
                loadData(form.branchId);
            } else { showToast('error', d.error || 'Error al abrir caja'); }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSubmitting(false); }
    }

    async function handleClose(e: React.FormEvent) {
        e.preventDefault();
        if (!activeSession && !form.branchId) return showToast('error', 'Seleccioná una sucursal');
        setSubmitting(true);
        try {
            const res = await fetch('/api/cash-close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branchId: activeSession?.branch ? undefined : form.branchId,
                    sessionId: activeSession?.id,
                    userId: user?.userId,
                    openingAmount: parseFloat(form.openingAmount) || activeSession?.openingAmount || 0,
                    actualCash: parseFloat(form.actualCash) || 0,
                    notes: form.notes || null,
                }),
            });
            const d = await res.json();
            if (d.success) {
                // --- Toppings request logic ---
                const requests = Object.entries(toppingRequests).filter(([_, qty]) => qty > 0);
                const currentBranchId = (activeSession as any)?.branchId || form.branchId;
                if (requests.length > 0 && selectedFactoryId && currentBranchId) {
                    const orderPayload = {
                        fromBranchId: currentBranchId,
                        toBranchId: selectedFactoryId,
                        requestedBy: user?.name || 'Cajero',
                        notes: 'Reposición solicitada automáticamente en el cierre de caja',
                        items: requests.map(([productId, requestedQty]) => {
                            const product = toppings.find(t => t.id === productId);
                            return { productId, requestedQty, unit: product?.unit || 'unit' };
                        }),
                    };
                    await fetch('/api/inventory/internal-orders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(orderPayload),
                    });
                }

                showToast('success', '🔴 Caja cerrada correctamente');
                setActiveSession(null);
                setShiftSummary(null);
                setMode('open');
                setForm(f => ({ ...f, actualCash: '', notes: '' }));
                setToppingRequests({});
                loadData(form.branchId);
            } else { showToast('error', d.error || 'Error al cerrar caja'); }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSubmitting(false); }
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
        </div>
    );

    const now = new Date();

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-1">
                        <ArrowLeft className="h-4 w-4" /> Dashboard
                    </Link>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">💰 Cierre de Caja</h1>
                            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {now.toLocaleDateString('es-BO', { weekday: 'long', day: '2-digit', month: 'long' })}
                                {' · '}{now.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        {activeSession && (
                            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-xl text-sm font-semibold">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                Caja abierta · {duration(activeSession.openedAt)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-3 mb-5">
                    <button onClick={() => setMode('open')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition ${mode === 'open' ? 'bg-green-600 text-white shadow-sm shadow-green-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <LogIn className="h-4 w-4" /> Abrir Caja
                    </button>
                    <button onClick={() => setMode('close')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition ${mode === 'close' ? 'bg-red-600 text-white shadow-sm shadow-red-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <LogOut className="h-4 w-4" /> Cerrar Caja
                    </button>
                </div>

                {/* ── RESUMEN DEL TURNO (solo cuando hay sesión activa y modo=close) ── */}
                {mode === 'close' && activeSession && shiftSummary && (
                    <div className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="h-5 w-5 text-indigo-600" />
                            <h2 className="font-bold text-gray-900">Resumen del Turno</h2>
                            <span className="ml-auto text-xs text-gray-400">
                                desde {new Date(shiftSummary.from).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        {/* KPI strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                            {[
                                { label: 'Total ventas', value: shiftSummary.totalSales.toString(), icon: <ShoppingCart className="h-4 w-4 text-indigo-600" />, bg: 'bg-indigo-50' },
                                { label: 'Ingresos', value: fmt(shiftSummary.totalRevenue), icon: <TrendingUp className="h-4 w-4 text-green-600" />, bg: 'bg-green-50' },
                                { label: 'Ticket prom.', value: fmt(shiftSummary.avgTicket), icon: <DollarSign className="h-4 w-4 text-amber-600" />, bg: 'bg-amber-50' },
                                { label: 'Items vendidos', value: shiftSummary.totalItems.toString(), icon: <Package className="h-4 w-4 text-purple-600" />, bg: 'bg-purple-50' },
                            ].map(k => (
                                <div key={k.label} className={`${k.bg} rounded-xl p-3 flex items-center gap-3`}>
                                    <div className="flex-shrink-0">{k.icon}</div>
                                    <div>
                                        <p className="text-xs text-gray-500">{k.label}</p>
                                        <p className="text-lg font-black text-gray-900 leading-tight">{k.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desglose por método de pago */}
                        <div className="grid grid-cols-3 gap-3 mb-5">
                            {[
                                { key: 'cashTotal', label: 'Efectivo', icon: METHOD_ICON.CASH, color: 'border-green-300 bg-green-50/50', val: shiftSummary.cashTotal },
                                { key: 'cardTotal', label: 'Tarjeta', icon: METHOD_ICON.CARD, color: 'border-blue-300 bg-blue-50/50', val: shiftSummary.cardTotal },
                                { key: 'transferTotal', label: 'Transferencia', icon: METHOD_ICON.TRANSFER, color: 'border-purple-300 bg-purple-50/50', val: shiftSummary.transferTotal },
                            ].map(m => (
                                <div key={m.key} className={`border rounded-xl p-3 ${m.color}`}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        {m.icon}
                                        <span className="text-xs font-medium text-gray-600">{m.label}</span>
                                    </div>
                                    <p className="text-xl font-black text-gray-900">{fmt(m.val)}</p>
                                </div>
                            ))}
                        </div>

                        {/* Gastos del turno */}
                        {shiftSummary.totalExpenses !== undefined && (
                            <div className="mb-5">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                        <AlertCircle className="h-3.5 w-3.5 text-red-400" /> Gastos del turno
                                    </p>
                                    <span className="text-sm font-black text-red-600">{fmt(shiftSummary.totalExpenses)}</span>
                                </div>
                                {(shiftSummary.expensesDetail ?? []).length > 0 ? (
                                    <div className="divide-y divide-gray-50 rounded-xl border border-red-100 overflow-hidden">
                                        {(shiftSummary.expensesDetail ?? []).map(exp => (
                                            <div key={exp.id} className="flex items-center px-3 py-2 bg-red-50/40 gap-2 text-xs">
                                                <span className="flex-1 text-gray-700">{exp.description}</span>
                                                <span className="text-gray-400">{exp.category}</span>
                                                <span className="font-bold text-red-600 w-20 text-right">{fmt(exp.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">Sin gastos registrados en este turno.</p>
                                )}
                                {/* Ingreso neto estimado */}
                                <div className="mt-3 flex items-center justify-between bg-slate-800 text-white rounded-xl px-4 py-2.5">
                                    <span className="text-sm font-semibold">Ingreso Neto Estimado</span>
                                    <span className="text-lg font-black">{fmt(shiftSummary.totalRevenue - shiftSummary.totalExpenses)}</span>
                                </div>
                            </div>
                        )}

                        {/* Últimas ventas del turno */}
                        {shiftSummary.recentSales.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-gray-500 mb-2">Últimas ventas del turno</p>
                                <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                    {shiftSummary.recentSales.map(s => (
                                        <div key={s.saleNumber} className="flex items-center px-3 py-2 bg-white hover:bg-gray-50 transition gap-3">
                                            <span className="text-xs text-gray-400 w-28 flex-shrink-0 font-mono">{s.saleNumber}</span>
                                            <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                                                {METHOD_ICON[s.paymentMethod] || <DollarSign className="h-3 w-3" />}
                                                {METHOD_LABEL[s.paymentMethod] || s.paymentMethod}
                                            </div>
                                            <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                                                {new Date(s.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="text-sm font-bold text-gray-900 w-20 text-right flex-shrink-0">{fmt(s.totalAmount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Grid form + historial */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Formulario */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        {mode === 'open' ? (
                            <>
                                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <LogIn className="h-5 w-5 text-green-600" /> Apertura de Caja
                                </h2>
                                <form onSubmit={handleOpen} className="space-y-4">
                                    {isAdmin && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sucursal *</label>
                                            <select required value={form.branchId}
                                                onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300">
                                                <option value="">Seleccioná una sucursal</option>
                                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Efectivo inicial (Bs.)</span>
                                        </label>
                                        <input type="number" min="0" step="0.01" value={form.openingAmount}
                                            onChange={e => setForm(f => ({ ...f, openingAmount: e.target.value }))}
                                            placeholder="0.00"
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                                    </div>
                                    <button type="submit" disabled={submitting}
                                        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                                        Abrir Caja Ahora
                                    </button>
                                </form>
                            </>
                        ) : (
                            <>
                                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Lock className="h-5 w-5 text-red-500" /> Cierre de Caja
                                </h2>
                                {activeSession && (
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-sm text-green-800">
                                        <p className="font-semibold">🟢 Sesión activa</p>
                                        <p className="text-xs mt-0.5">
                                            Abierta: {activeSession.openedAt
                                                ? new Date(activeSession.openedAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
                                                : 'N/A'
                                            } · por {activeSession.openedBy || activeSession.user?.name}
                                            {activeSession.openedAt && ` · duración: ${duration(activeSession.openedAt)}`}
                                        </p>
                                    </div>
                                )}
                                <form onSubmit={handleClose} className="space-y-4">
                                    {isAdmin && !activeSession && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sucursal *</label>
                                            <select required value={form.branchId}
                                                onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                                                <option value="">Seleccioná una sucursal</option>
                                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Efectivo apertura (Bs.)</label>
                                            <input type="number" min="0" step="0.01"
                                                value={form.openingAmount || (activeSession?.openingAmount ?? '')}
                                                onChange={e => setForm(f => ({ ...f, openingAmount: e.target.value }))}
                                                placeholder={String(activeSession?.openingAmount ?? '0.00')}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Efectivo real (Bs.) *</label>
                                            <input required type="number" min="0" step="0.01" value={form.actualCash}
                                                onChange={e => setForm(f => ({ ...f, actualCash: e.target.value }))}
                                                placeholder="0.00"
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                                        </div>
                                    </div>
                                    {/* Preview de diferencia */}
                                    {form.actualCash && shiftSummary && (
                                        <div className={`rounded-xl p-3 text-sm font-semibold flex items-center justify-between ${
                                            parseFloat(form.actualCash) - (shiftSummary.cashTotal - (shiftSummary.totalExpenses ?? 0) + (activeSession?.openingAmount || 0)) >= 0
                                                ? 'bg-blue-50 text-blue-800' : 'bg-red-50 text-red-700'
                                        }`}>
                                            <span>Diferencia estimada:</span>
                                            <span>{fmt(parseFloat(form.actualCash) - shiftSummary.cashTotal + (shiftSummary.totalExpenses ?? 0) - (activeSession?.openingAmount || 0))}</span>
                                        </div>
                                    )}
                                    {/* Solicitud de Toppings (solo si es Açaí) */}
                                    {((activeSession as any)?.branch?.type === 'ACAI' || branches.find(b => b.id === ((activeSession as any)?.branchId || form.branchId))?.type === 'ACAI') && toppings.length > 0 && (
                                        <div className="border border-purple-200 bg-purple-50 rounded-xl p-4 my-4">
                                            <div className="mb-3 flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                                                        <Package className="h-4 w-4" /> Solicitar Reposición de Toppings
                                                    </h3>
                                                    <p className="text-xs text-purple-700 mt-0.5">Opcional. Las cantidades mayores a 0 generarán un pedido interno.</p>
                                                </div>
                                                <div>
                                                    <select value={selectedFactoryId} onChange={e => setSelectedFactoryId(e.target.value)}
                                                        className="text-xs border border-purple-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white text-purple-900 font-semibold">
                                                        {branches.filter(b => b.type === 'FABRICA').map(b => (
                                                            <option key={b.id} value={b.id}>{b.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {toppings.map(t => (
                                                    <div key={t.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-purple-100">
                                                        <span className="text-xs font-semibold text-gray-700">{t.name}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <input type="number" min="0" step="0.01" placeholder="0"
                                                                value={toppingRequests[t.id] || ''}
                                                                onChange={e => setToppingRequests(prev => ({ ...prev, [t.id]: parseFloat(e.target.value) || 0 }))}
                                                                className="w-16 border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-300 text-right" />
                                                            <span className="text-xs text-gray-400 w-8">{t.unit}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Observaciones</label>
                                        <textarea rows={2} value={form.notes}
                                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                            placeholder="Notas del cierre…"
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none" />
                                    </div>
                                    <button type="submit" disabled={submitting}
                                        className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                                        Registrar Cierre
                                    </button>
                                </form>
                            </>
                        )}
                    </div>

                    {/* Historial */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Últimos Cierres</h2>
                        {history.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">Sin cierres registrados</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                                {history.map(c => {
                                    const diff = c.difference;
                                    const openedAt = c.openedAt ? new Date(c.openedAt) : null;
                                    const closedAt = c.closedAt ? new Date(c.closedAt) : new Date(c.createdAt);
                                    const sessionOpen = (c as any).sessionStatus === 'OPEN';
                                    return (
                                        <div key={c.id} className={`border rounded-xl p-4 ${sessionOpen ? 'border-green-300 bg-green-50/40' : 'border-gray-100'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-gray-800 text-sm">{c.branch?.name}</p>
                                                        {sessionOpen && (
                                                            <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" /> ABIERTA
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {c.user.name} · {new Date(c.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </p>
                                                    {openedAt && (
                                                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                            <Clock className="h-3 w-3" />
                                                            {openedAt.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                                                            {!sessionOpen && <> → {closedAt.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })} · {duration(c.openedAt, c.closedAt)}</>}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${diff === 0 ? 'bg-green-100 text-green-700' : diff > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'}`}>
                                                    {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <TrendingUp className="h-3 w-3" />
                                                    Ventas: <span className="font-semibold text-gray-700">{fmt(c.totalSales)}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <AlertCircle className="h-3 w-3 text-red-400" />
                                                    Gastos: <span className="font-semibold text-red-600">{fmt(c.totalExpenses ?? 0)}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <DollarSign className="h-3 w-3 text-green-600" />
                                                    Neto: <span className="font-semibold text-green-700">{fmt(c.netCash ?? c.totalSales)}</span>
                                                </div>
                                            </div>
                                            {c.notes && <p className="text-xs text-gray-400 mt-2 italic">"{c.notes}"</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
