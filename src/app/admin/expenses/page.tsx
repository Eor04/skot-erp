'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Receipt, TrendingDown, Download,
    Calendar, Filter, DollarSign, CreditCard, ArrowRightLeft
} from 'lucide-react';

/* ──────────── Types ──────────── */
type Expense = {
    id: string; description: string; amount: number;
    category: string; paymentMethod: string; supplier: string | null;
    registeredBy: string; notes: string | null; expenseDate: string;
    branch: { id: string; name: string };
};
type Summary = {
    totalAmount: number; totalRecords: number;
    byCategory: { category: string; total: number; count: number }[];
    byPayment: { method: string; total: number }[];
};

const CAT_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
    PROVEEDOR: { label: 'Proveedor', color: 'bg-blue-100 text-blue-700', emoji: '🏭' },
    SERVICIOS: { label: 'Servicios', color: 'bg-purple-100 text-purple-700', emoji: '⚡' },
    MANTENIMIENTO: { label: 'Mantenimiento', color: 'bg-orange-100 text-orange-700', emoji: '🔧' },
    SUELDOS: { label: 'Sueldos', color: 'bg-green-100 text-green-700', emoji: '👷' },
    LOGISTICA: { label: 'Logística', color: 'bg-teal-100 text-teal-700', emoji: '🚚' },
    OTRO: { label: 'Otro', color: 'bg-white/10 text-white/80', emoji: '📋' },
};
const PAY_LABELS: Record<string, string> = {
    CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', MIXED: 'Mixto',
};

const TODAY = new Date().toISOString().split('T')[0];
const MONTH_START = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

export default function AdminExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);

    const [from, setFrom] = useState(MONTH_START);
    const [to, setTo] = useState(TODAY);
    const [branchId, setBranchId] = useState('');
    const [category, setCategory] = useState('');

    function loadData() {
        setLoading(true);
        const params = new URLSearchParams({ from, to, ...(branchId && { branchId }), ...(category && { category }) });
        Promise.all([
            fetch(`/api/admin/expenses?${params}`).then(r => r.json()),
            fetch('/api/admin/branches').then(r => r.json()),
        ]).then(([exp, br]) => {
            if (exp.success) { setExpenses(exp.data); setSummary(exp.summary); }
            if (br.success) setBranches(br.data);
        }).finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, []);

    // Filtros rápidos
    function quickFilter(days: number) {
        const d = new Date();
        const f = new Date();
        f.setDate(d.getDate() - days + 1);
        setFrom(f.toISOString().split('T')[0]);
        setTo(d.toISOString().split('T')[0]);
    }

    // Export CSV
    function exportCSV() {
        const rows = [
            ['Fecha', 'Sucursal', 'Categoría', 'Descripción', 'Proveedor', 'Monto', 'Pago', 'Registrado por'],
            ...expenses.map(e => [
                e.expenseDate.split('T')[0],
                e.branch.name,
                CAT_LABELS[e.category]?.label || e.category,
                e.description,
                e.supplier || '',
                e.amount.toFixed(2),
                PAY_LABELS[e.paymentMethod] || e.paymentMethod,
                e.registeredBy,
            ]),
        ];
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `gastos-${from}-${to}.csv`; a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="min-h-screen relative overflow-hidden p-6 md:p-8" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: '56px 100px' }} />
            </div>
            <div className="relative z-10 max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <Link href="/admin" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver a Admin
                        </Link>
                        <h1 className="text-3xl font-bold text-white/90 flex items-center gap-3">
                            <Receipt className="h-7 w-7 text-rose-600" /> Historial de Gastos
                        </h1>
                        <p className="text-white/60 mt-1 text-sm">Todos los gastos registrados desde sucursales</p>
                    </div>
                    <button onClick={exportCSV} disabled={loading || !expenses.length}
                        className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-md border border-white/10 hover:bg-white/5 text-white/80 px-4 py-2.5 rounded-xl font-medium transition text-sm shadow-sm disabled:opacity-40">
                        <Download className="h-4 w-4" /> Exportar CSV
                    </button>
                </div>

                {/* Filtros */}
                <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-5 space-y-4">
                    {/* Períodos rápidos */}
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={() => { setFrom(TODAY); setTo(TODAY); }}
                            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 font-medium text-white/70 transition">
                            Hoy
                        </button>
                        <button onClick={() => quickFilter(7)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 font-medium text-white/70 transition">
                            Últimos 7 días
                        </button>
                        <button onClick={() => { setFrom(MONTH_START); setTo(TODAY); }}
                            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 font-medium text-white/70 transition">
                            Este mes
                        </button>
                        <button onClick={() => quickFilter(30)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 font-medium text-white/70 transition">
                            Últimos 30 días
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-white/60 mb-1 block">Desde</label>
                            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                                className="w-full border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-white/60 mb-1 block">Hasta</label>
                            <input type="date" value={to} onChange={e => setTo(e.target.value)}
                                className="w-full border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-white/60 mb-1 block">Sucursal</label>
                            <select value={branchId} onChange={e => setBranchId(e.target.value)}
                                className="w-full border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                                <option value="">Todas</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-white/60 mb-1 block">Categoría</label>
                            <select value={category} onChange={e => setCategory(e.target.value)}
                                className="w-full border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                                <option value="">Todas</option>
                                {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={loadData}
                        className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
                        <Filter className="h-4 w-4" /> Aplicar filtros
                    </button>
                </div>

                {/* KPIs */}
                {summary && !loading && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                                <TrendingDown className="h-5 w-5 text-rose-600" />
                            </div>
                            <div>
                                <p className="text-xs text-white/40 font-medium">Total gastos</p>
                                <p className="text-xl font-black text-white/90">Bs. {summary.totalAmount.toFixed(2)}</p>
                                <p className="text-xs text-white/40">{summary.totalRecords} registros</p>
                            </div>
                        </div>
                        {summary.byPayment.map(p => (
                            <div key={p.method} className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                                    {p.method === 'CASH' ? <DollarSign className="h-5 w-5 text-green-600" /> :
                                        p.method === 'CARD' ? <CreditCard className="h-5 w-5 text-blue-600" /> :
                                            p.method === 'TRANSFER' ? <ArrowRightLeft className="h-5 w-5 text-purple-600" /> :
                                                <span className="text-lg">💳</span>}
                                </div>
                                <div>
                                    <p className="text-xs text-white/40 font-medium">{PAY_LABELS[p.method] || p.method}</p>
                                    <p className="text-xl font-black text-white/90">Bs. {p.total.toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tabla por categoría con resumen */}
                {summary && !loading && summary.byCategory.length > 0 && (
                    <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/10">
                            <h2 className="font-bold text-white/90">Desglose por categoría</h2>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {summary.byCategory.sort((a, b) => b.total - a.total).map(c => {
                                const cfg = CAT_LABELS[c.category] || { label: c.category, color: 'bg-white/10 text-white/80', emoji: '📋' };
                                const pct = summary.totalAmount > 0 ? (c.total / summary.totalAmount * 100) : 0;
                                return (
                                    <div key={c.category} className="px-5 py-3 flex items-center gap-4">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                                            {cfg.emoji} {cfg.label}
                                        </span>
                                        <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                                            <div className="bg-rose-400 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-xs text-white/40 w-8 text-right">{pct.toFixed(0)}%</span>
                                        <span className="font-bold text-white/90 text-sm w-28 text-right">Bs. {c.total.toFixed(2)}</span>
                                        <span className="text-xs text-white/40 w-16 text-right">{c.count} reg.</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tabla de gastos */}
                <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                        <h2 className="font-bold text-white/90">Detalle de gastos</h2>
                        {!loading && <span className="text-sm text-white/40">{expenses.length} registros</span>}
                    </div>
                    {loading ? (
                        <div className="text-center py-16 text-white/40">Cargando gastos…</div>
                    ) : expenses.length === 0 ? (
                        <div className="text-center py-16 text-white/40">
                            <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
                            <p>No se encontraron gastos en el período seleccionado</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase">Fecha</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase">Sucursal</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase">Categoría</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase">Descripción</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase">Proveedor</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase">Pago</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-white/60 uppercase">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.map(e => {
                                        const cfg = CAT_LABELS[e.category] || { label: e.category, color: 'bg-white/10 text-white/80', emoji: '📋' };
                                        return (
                                            <tr key={e.id} className="border-b border-gray-50 hover:bg-white/5 transition">
                                                <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                                                    {new Date(e.expenseDate).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: '2-digit' })}
                                                </td>
                                                <td className="px-4 py-3 text-white/80">{e.branch.name}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${cfg.color}`}>
                                                        {cfg.emoji} {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-white/90 max-w-xs">
                                                    <p className="truncate">{e.description}</p>
                                                    {e.notes && <p className="text-xs text-white/40 truncate">{e.notes}</p>}
                                                </td>
                                                <td className="px-4 py-3 text-white/60 text-xs">{e.supplier || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs font-medium text-white/70">{PAY_LABELS[e.paymentMethod] || e.paymentMethod}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-rose-700">
                                                    Bs. {e.amount.toFixed(2)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-rose-50 border-t-2 border-rose-100">
                                    <tr>
                                        <td colSpan={6} className="px-4 py-3 font-bold text-white/80">Total</td>
                                        <td className="px-4 py-3 text-right font-black text-rose-700 text-base">
                                            Bs. {(summary?.totalAmount ?? 0).toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
