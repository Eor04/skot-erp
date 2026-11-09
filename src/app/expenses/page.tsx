'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Plus, Loader2, CheckCircle, AlertCircle,
    Receipt, Filter, DollarSign, X
} from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { Dialog } from '@/components/ui/dialog';

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
    { value: 'PROVEEDOR', label: 'Proveedor', color: 'bg-[var(--status-warning-bg)] text-warning border border-line-subtle' },
    { value: 'SERVICIOS', label: 'Servicios', color: 'bg-[var(--status-warning-bg)] text-warning border border-line-subtle' },
    { value: 'MANTENIMIENTO', label: 'Mantenimiento', color: 'bg-[var(--status-info-bg)] text-info border border-line-subtle' },
    { value: 'SUELDOS', label: 'Sueldos', color: 'bg-[var(--status-neutral-bg)] text-brand border border-line-subtle' },
    { value: 'LOGISTICA', label: 'Logística', color: 'bg-[var(--status-info-bg)] text-info border border-line-subtle' },
    { value: 'OTRO', label: 'Otro', color: 'bg-canvas text-muted border border-line' },
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
        <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="relative z-10">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-brand' : 'bg-danger'}`}>
                    {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="mx-auto max-w-3xl">
                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                    <div>
                        <Link href="/" className="text-sm text-muted hover:text-ink flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver al dashboard
                        </Link>
                        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink flex items-center gap-3">
                            <Receipt className="h-8 w-8 text-rose-600" />
                            Registro de Gastos
                        </h1>
                        {currentBranch && (
                            <p className="text-muted mt-1 text-sm">Sucursal: <strong>{currentBranch.name}</strong></p>
                        )}
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        disabled={!branchId}
                        className="flex items-center gap-2 bg-brand hover:brightness-90 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition "
                    >
                        <Plus className="h-4 w-4" /> Nuevo gasto
                    </button>
                </div>

                {/* Selector de sucursal (solo admin) */}
                {isAdmin && (
                    <div className="bg-surface rounded-2xl shadow-sm border border-line-subtle p-4 mb-5">
                        <label htmlFor="expenses-branch" className="block text-sm font-semibold text-ink mb-2">Sucursal</label>
                        <select
                            id="expenses-branch"
                            value={branchId}
                            onChange={e => setBranchId(e.target.value)}
                            className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div className="bg-surface rounded-2xl shadow-sm border border-line-subtle p-5">
                            <p className="text-xs text-muted font-medium mb-1">Total gastos</p>
                            <p className="text-3xl font-black text-ink">{summary.total}</p>
                        </div>
                        <div className="bg-[var(--status-error-bg)] rounded-2xl border border-rose-500/20 p-5">
                            <p className="text-xs text-danger font-medium mb-1">Monto total</p>
                            <p className="text-3xl font-black text-danger">{fmt(summary.sumAmount)}</p>
                        </div>
                    </div>
                )}

                {/* Filtro categorías */}
                {branchId && (
                    <div className="flex gap-2 flex-wrap mb-4">
                        <button
                            onClick={() => setFilterCat('')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${!filterCat ? 'bg-brand text-white ' : 'bg-surface border border-line-subtle text-muted hover:bg-canvas'}`}
                        >
                            Todos
                        </button>
                        {CATEGORIES.map(c => (
                            <button
                                key={c.value}
                                onClick={() => setFilterCat(c.value === filterCat ? '' : c.value)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${filterCat === c.value ? 'bg-brand text-white ' : 'bg-surface border border-line-subtle text-muted hover:bg-canvas'}`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Lista de gastos */}
                {sessionLoading || branchesLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted gap-3">
                        <Loader2 className="h-10 w-10 animate-spin text-danger" />
                        <p className="text-sm">Cargando...</p>
                    </div>
                ) : !branchId ? (
                    <div className="text-center py-20 text-muted">
                        <DollarSign className="h-14 w-14 mx-auto mb-4 opacity-20" />
                        <p>{isAdmin ? 'Seleccioná una sucursal para ver sus gastos' : 'No tenés sucursal asignada. Contactá al administrador.'}</p>
                    </div>
                ) : loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-rose-500" /></div>
                ) : expenses.length === 0 ? (
                    <div className="text-center py-16 bg-surface rounded-2xl border border-line-subtle text-muted">
                        <Receipt className="h-10 w-10 mx-auto mb-3 opacity-25" />
                        <p>No hay gastos registrados{filterCat ? ` en la categoría seleccionada` : ''}.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {expenses.map(ex => {
                            const cat = getCatCfg(ex.category);
                            return (
                                <div key={ex.id} className="bg-surface rounded-2xl shadow-sm border border-line-subtle p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>
                                                    {cat.label}
                                                </span>
                                                <span className="text-xs text-muted">
                                                    {ex.paymentMethod === 'CASH' ? 'Efectivo' : ex.paymentMethod === 'CARD' ? 'Tarjeta' : 'Transferencia'}
                                                </span>
                                            </div>
                                            <p className="font-semibold text-ink">{ex.description}</p>
                                            {ex.supplier && <p className="text-xs text-muted mt-0.5">Proveedor: {ex.supplier}</p>}
                                            {ex.notes && <p className="text-xs text-muted mt-0.5 italic">"{ex.notes}"</p>}
                                            <p className="text-xs text-muted mt-1">
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
            <Dialog open={showForm} onClose={() => { if (!submitting) setShowForm(false); }} labelledBy="expense-dialog" className="max-w-lg">

                    <div className="bg-surface rounded-xl shadow-xl border border-line-subtle w-full max-w-md max-h-[90dvh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-line-subtle">
                            <h2 id="expense-dialog" className="text-lg font-bold text-ink">Registrar Gasto</h2>
                            <button type="button" aria-label="Cerrar registro de gasto" disabled={submitting} onClick={() => { setShowForm(false); setForm(BLANK); }} className="grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-canvas disabled:opacity-50">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {/* Categoría */}
                            <div>
                                <label className="block text-sm font-semibold text-ink mb-2">Categoría *</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {CATEGORIES.map(c => (
                                        <button
                                            key={c.value} type="button"
                                            onClick={() => setForm(f => ({ ...f, category: c.value }))}
                                            className={`py-2 px-1 text-xs rounded-xl border font-medium text-center transition ${form.category === c.value ? 'border-rose-500 bg-rose-50 text-danger' : 'border-gray-200 text-muted hover:bg-canvas'}`}
                                        >
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Descripción */}
                            <div>
                                <label className="block text-sm font-semibold text-ink mb-1.5">Descripción *</label>
                                <input required type="text" aria-label="Descripción del gasto" placeholder="Ej: Pago proveedor de açaí, Factura Luz…"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                            </div>
                            {/* Monto + Método de pago */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-ink mb-1.5">Monto (Bs.) *</label>
                                    <input required type="number" aria-label="Monto del gasto en bolivianos" min="0.01" step="0.01" placeholder=""
                                        value={form.amount}
                                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                        className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-ink mb-1.5">Pago</label>
                                    <select aria-label="Método de pago" value={form.paymentMethod}
                                        onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                                        className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                                        {PAY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            {/* Proveedor */}
                            <div>
                                <label className="block text-sm font-semibold text-ink mb-1.5">Proveedor (opcional)</label>
                                <input type="text" aria-label="Proveedor" placeholder="Nombre del proveedor"
                                    value={form.supplier}
                                    onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                                    className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                            </div>
                            {/* Notas */}
                            <div>
                                <label className="block text-sm font-semibold text-ink mb-1.5">Notas</label>
                                <textarea rows={2} aria-label="Notas del gasto" placeholder="Observaciones…"
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => { setShowForm(false); setForm(BLANK); }}
                                    className="flex-1 py-2.5 border border-line rounded-xl text-sm font-medium text-muted hover:bg-canvas">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-brand hover:brightness-90 disabled:opacity-50 text-white  py-2.5 rounded-xl text-sm font-bold transition">
                                    {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</span> : 'Registrar gasto'}
                                </button>
                            </div>
                        </form>
                    </div>

            </Dialog>
        </div>
</main>
    );
}
