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
    { value: 'PROVEEDOR', label: '🛒 Proveedor', color: 'bg-orange-100 text-orange-700' },
    { value: 'SERVICIOS', label: '💡 Servicios', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'MANTENIMIENTO', label: '🔧 Mantenimiento', color: 'bg-blue-100   text-blue-700' },
    { value: 'SUELDOS', label: '👤 Sueldos', color: 'bg-purple-100 text-purple-700' },
    { value: 'LOGISTICA', label: '🚚 Logística', color: 'bg-cyan-100   text-cyan-700' },
    { value: 'OTRO', label: '📝 Otro', color: 'bg-gray-100   text-gray-700' },
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
    const { user } = useSession();

    const [branchId, setBranchId] = useState('');
    const [branches, setBranches] = useState<{ id: string; name: string; type: string }[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [summary, setSummary] = useState<Summary>({ total: 0, sumAmount: 0 });
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [filterCat, setFilterCat] = useState('');
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [form, setForm] = useState(BLANK);

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    /* ── Cargar sucursales y pre-seleccionar la del usuario ── */
    useEffect(() => {
        fetch('/api/admin/branches')
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    setBranches(d.data);
                    if (!isAdmin && user?.branchIds?.[0]) {
                        setBranchId(user.branchIds[0]);
                    }
                }
            });
    }, [user, isAdmin]);

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
        <div className="min-h-screen bg-gray-50">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="max-w-3xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Inicio
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Receipt className="h-8 w-8 text-rose-600" />
                            Registro de Gastos
                        </h1>
                        {currentBranch && (
                            <p className="text-gray-500 mt-1 text-sm">Sucursal: <strong>{currentBranch.name}</strong></p>
                        )}
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        disabled={!branchId}
                        className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm shadow-rose-200"
                    >
                        <Plus className="h-4 w-4" /> Nuevo gasto
                    </button>
                </div>

                {/* Selector de sucursal (solo admin) */}
                {isAdmin && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Sucursal</label>
                        <select
                            value={branchId}
                            onChange={e => setBranchId(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
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
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <p className="text-xs text-gray-400 font-medium mb-1">Total gastos</p>
                            <p className="text-3xl font-black text-gray-800">{summary.total}</p>
                        </div>
                        <div className="bg-rose-50 rounded-2xl border border-rose-100 p-5">
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
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${!filterCat ? 'bg-rose-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            Todos
                        </button>
                        {CATEGORIES.map(c => (
                            <button
                                key={c.value}
                                onClick={() => setFilterCat(c.value === filterCat ? '' : c.value)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${filterCat === c.value ? 'bg-rose-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Lista de gastos */}
                {!branchId ? (
                    <div className="text-center py-20 text-gray-400">
                        <DollarSign className="h-14 w-14 mx-auto mb-4 opacity-20" />
                        <p>{isAdmin ? 'Seleccioná una sucursal para ver sus gastos' : 'Cargando…'}</p>
                    </div>
                ) : loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-rose-500" /></div>
                ) : expenses.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400">
                        <Receipt className="h-10 w-10 mx-auto mb-3 opacity-25" />
                        <p>No hay gastos registrados{filterCat ? ` en la categoría seleccionada` : ''}.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {expenses.map(ex => {
                            const cat = getCatCfg(ex.category);
                            return (
                                <div key={ex.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>
                                                    {cat.label}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {ex.paymentMethod === 'CASH' ? '💵' : ex.paymentMethod === 'CARD' ? '💳' : '🏦'}
                                                </span>
                                            </div>
                                            <p className="font-semibold text-gray-900">{ex.description}</p>
                                            {ex.supplier && <p className="text-xs text-gray-500 mt-0.5">Proveedor: {ex.supplier}</p>}
                                            {ex.notes && <p className="text-xs text-gray-400 mt-0.5 italic">"{ex.notes}"</p>}
                                            <p className="text-xs text-gray-300 mt-1">
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
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">Registrar Gasto</h2>
                            <button onClick={() => { setShowForm(false); setForm(BLANK); }} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {/* Categoría */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {CATEGORIES.map(c => (
                                        <button
                                            key={c.value} type="button"
                                            onClick={() => setForm(f => ({ ...f, category: c.value }))}
                                            className={`py-2 px-1 text-xs rounded-xl border font-medium text-center transition ${form.category === c.value ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Descripción */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descripción *</label>
                                <input required type="text" placeholder="Ej: Pago proveedor de açaí, Factura Luz…"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                            </div>
                            {/* Monto + Método de pago */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Monto (S/) *</label>
                                    <input required type="number" min="0.01" step="0.01" placeholder="0.00"
                                        value={form.amount}
                                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pago</label>
                                    <select value={form.paymentMethod}
                                        onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                                        {PAY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            {/* Proveedor */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Proveedor (opcional)</label>
                                <input type="text" placeholder="Nombre del proveedor"
                                    value={form.supplier}
                                    onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                            </div>
                            {/* Notas */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notas</label>
                                <textarea rows={2} placeholder="Observaciones…"
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => { setShowForm(false); setForm(BLANK); }}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-bold transition">
                                    {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</span> : 'Registrar gasto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
