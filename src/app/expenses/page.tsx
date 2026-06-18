'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Plus, Loader2, CheckCircle, AlertCircle,
    Receipt, Filter, DollarSign, X
} from 'lucide-react';
import { useSession } from '@/lib/session-context';

interface Expense {
    id: string;
    category: string;
    description: string;
    amount: number;
    supplier?: string;
    paymentMethod: string;
    notes?: string;
    registeredBy: string;
    expenseDate: string;
    branch: { name: string };
}

interface Summary { total: number; sumAmount: number }

const CATEGORIES = [
    { value: 'PROVEEDOR', label: '🛒 Proveedor', color: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' },
    { value: 'SERVICIOS', label: '💡 Servicios', color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
    { value: 'MANTENIMIENTO', label: '🔧 Mantenimiento', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
    { value: 'SUELDOS', label: '👤 Sueldos', color: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
    { value: 'LOGISTICA', label: '🚚 Logística', color: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' },
    { value: 'OTRO', label: '📝 Otro', color: 'bg-white/10 text-white/70 border border-white/20' },
];

const PAY_METHODS = [
    { value: 'CASH', label: 'Efectivo' },
    { value: 'CARD', label: 'Tarjeta' },
    { value: 'TRANSFER', label: 'Transferencia' },
];

const BLANK = {
    description: '', category: 'PROVEEDOR', amount: '',
    supplier: '', paymentMethod: 'CASH', notes: '',
};

function getCatCfg(cat: string) {
    return CATEGORIES.find(c => c.value === cat) || CATEGORIES[5];
}

function fmt(n: number) {
    return 'Bs. ' + n.toFixed(2);
}

export default function ExpensesPage() {
    const { user, loading: sessionLoading } = useSession();

    const [branchId, setBranchId] = useState('');
    const [branches, setBranches] = useState<{ id: string; name: string; type: string }[]>([]);
    const [branchesLoading, setBranchesLoading] = useState(false);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [summary, setSummary] = useState<Summary>({ total: 0, sumAmount: 0 });
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [filterCat, setFilterCat] = useState('');
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [form, setForm] = useState(BLANK);

    const isAdmin = user?.role === 'ADMIN';

    /* ── Para cajeros: branchId directo de la sesión (sin esperar fetch) ── */
    useEffect(() => {
        if (sessionLoading || !user || isAdmin) return;
        if (user.branchIds?.[0]) setBranchId(user.branchIds[0]);
    }, [user, isAdmin, sessionLoading]);

    /* ── Admins: cargar lista de sucursales para el selector ── */
    useEffect(() => {
        if (sessionLoading || !user || !isAdmin) return;
        setBranchesLoading(true);
        fetch('/api/admin/branches')
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    setBranches(d.data);
                    if (d.data.length === 1) setBranchId(d.data[0].id);
                }
            })
            .catch(() => {})
            .finally(() => setBranchesLoading(false));
    }, [user, isAdmin, sessionLoading]);

    /* ── Cargar gastos cuando cambia la sucursal o filtro ── */
    const loadExpenses = useCallback(async (bid: string, cat: string) => {
        if (!bid) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ branchId: bid });
            if (cat) params.set('category', cat);
            const res = await fetch(`/api/expenses?${params}`);
            const d = await res.json();
            if (d.success) {
                setExpenses(d.data);
                setSummary(d.summary);
            }
        } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (branchId) loadExpenses(branchId, filterCat);
    }, [branchId, filterCat, loadExpenses]);

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!branchId) return showToast('error', 'Seleccioná una sucursal');
        setSubmitting(true);
        try {
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, branchId, registeredBy: user?.userId }),
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', `Gasto de ${fmt(data.data.amount)} registrado`);
                setForm(BLANK);
                setShowForm(false);
                loadExpenses(branchId, filterCat);
            } else {
                showToast('error', data.error || 'Error al registrar');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSubmitting(false); }
    }

    const currentBranch = branches.find(b => b.id === branchId);

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: '56px 100px' }} />
            </div>
            <div className="relative z-10">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-500/90 backdrop-blur border border-green-500/50' : 'bg-red-500/90 backdrop-blur border border-red-500/50'}`}>
                    {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="max-w-3xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver al dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-white/90 flex items-center gap-3">
                            <Receipt className="h-8 w-8 text-rose-600" />
                            Registro de Gastos
                        </h1>
                        {currentBranch && (
                            <p className="text-white/60 mt-1 text-sm">Sucursal: <strong>{currentBranch.name}</strong></p>
                        )}
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        disabled={!branchId}
                        className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-white/10 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm shadow-rose-200"
                    >
                        <Plus className="h-4 w-4" /> Nuevo gasto
                    </button>
                </div>

                {/* Selector de sucursal (solo admin) */}
                {isAdmin && (
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl shadow-sm border border-white/10 p-4 mb-5">
                        <label className="block text-sm font-semibold text-white/80 mb-2">Sucursal</label>
                        <select
                            value={branchId}
                            onChange={e => setBranchId(e.target.value)}
                            className="w-full border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                        >
                            <option value="">-- Seleccioná una sucursal --</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name} ({b.type})</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* KPIs */}
                {branchId && (
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl shadow-sm border border-white/10 p-5">
                            <p className="text-xs text-white/40 font-medium mb-1">Total gastos</p>
                            <p className="text-3xl font-black text-white/80">{summary.total}</p>
                        </div>
                        <div className="bg-rose-500/10 rounded-2xl border border-rose-500/20 backdrop-blur-md p-5">
                            <p className="text-xs text-rose-400 font-medium mb-1">Monto total</p>
                            <p className="text-3xl font-black text-rose-700">{fmt(summary.sumAmount)}</p>
                        </div>
                    </div>
                )}

                {/* Filtro categorías */}
                {branchId && (
                    <div className="flex gap-2 flex-wrap mb-4">
                        <button
                            onClick={() => setFilterCat('')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${!filterCat ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30' : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'}`}
                        >
                            Todos
                        </button>
                        {CATEGORIES.map(c => (
                            <button
                                key={c.value}
                                onClick={() => setFilterCat(c.value === filterCat ? '' : c.value)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${filterCat === c.value ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30' : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'}`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Lista de gastos */}
                {sessionLoading || branchesLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-white/40 gap-3">
                        <Loader2 className="h-10 w-10 animate-spin text-rose-400" />
                        <p className="text-sm">Cargando...</p>
                    </div>
                ) : !branchId ? (
                    <div className="text-center py-20 text-white/40">
                        <DollarSign className="h-14 w-14 mx-auto mb-4 opacity-20" />
                        <p>{isAdmin ? 'Seleccioná una sucursal para ver sus gastos' : 'No tenés sucursal asignada. Contactá al administrador.'}</p>
                    </div>
                ) : loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-rose-500" /></div>
                ) : expenses.length === 0 ? (
                    <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10 text-white/40">
                        <Receipt className="h-10 w-10 mx-auto mb-3 opacity-25" />
                        <p>No hay gastos registrados{filterCat ? ` en la categoría seleccionada` : ''}.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {expenses.map(ex => {
                            const cat = getCatCfg(ex.category);
                            return (
                                <div key={ex.id} className="bg-white/5 backdrop-blur-md rounded-2xl shadow-sm border border-white/10 p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>
                                                    {cat.label}
                                                </span>
                                                <span className="text-xs text-white/40">
                                                    {ex.paymentMethod === 'CASH' ? '💵' : ex.paymentMethod === 'CARD' ? '💳' : '🏦'}
                                                </span>
                                            </div>
                                            <p className="font-semibold text-white/90">{ex.description}</p>
                                            {ex.supplier && <p className="text-xs text-white/60 mt-0.5">Proveedor: {ex.supplier}</p>}
                                            {ex.notes && <p className="text-xs text-white/40 mt-0.5 italic">"{ex.notes}"</p>}
                                            <p className="text-xs text-white/30 mt-1">
                                                {new Date(ex.expenseDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xl font-black text-rose-600">{fmt(ex.amount)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal: Nuevo gasto */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white/90">Registrar Gasto</h2>
                            <button onClick={() => { setShowForm(false); setForm(BLANK); }} className="text-white/40 hover:text-white/70">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {/* Categoría */}
                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-2">Categoría *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {CATEGORIES.map(c => (
                                        <button
                                            key={c.value} type="button"
                                            onClick={() => setForm(f => ({ ...f, category: c.value }))}
                                            className={`py-2 px-1 text-xs rounded-xl border font-medium text-center transition ${form.category === c.value ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-white/70 hover:bg-white/10'}`}
                                        >
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Descripción */}
                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">Descripción *</label>
                                <input required type="text" placeholder="Ej: Pago proveedor de açaí, Factura Luz…"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                            </div>
                            {/* Monto + Método de pago */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-1.5">Monto (Bs.) *</label>
                                    <input required type="number" min="0.01" step="0.01" placeholder=""
                                        value={form.amount}
                                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                        className="w-full border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-1.5">Pago</label>
                                    <select value={form.paymentMethod}
                                        onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                                        className="w-full border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                                        {PAY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            {/* Proveedor */}
                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">Proveedor (opcional)</label>
                                <input type="text" placeholder="Nombre del proveedor"
                                    value={form.supplier}
                                    onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                                    className="w-full border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                            </div>
                            {/* Notas */}
                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">Notas</label>
                                <textarea rows={2} placeholder="Observaciones…"
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    className="w-full border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => { setShowForm(false); setForm(BLANK); }}
                                    className="flex-1 py-2.5 border border-white/20 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white shadow-lg shadow-rose-500/30 py-2.5 rounded-xl text-sm font-bold transition">
                                    {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</span> : 'Registrar gasto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
</div>
    );
}
