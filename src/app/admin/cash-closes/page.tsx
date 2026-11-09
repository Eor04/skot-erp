'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, ClipboardList, Search, ChevronDown, ChevronUp, User,
    ShoppingCart, AlertCircle, Loader2, Banknote, CreditCard, Smartphone,
    TrendingUp, DollarSign, Package,
} from 'lucide-react';

type CashClose = {
    id: string;
    branchId: string;
    userId: string;
    sessionStatus: 'OPEN' | 'CLOSED';
    openingAmount: number | null;
    actualCash: number | null;
    totalSales: number | null;
    cashSales: number | null;
    cardSales: number | null;
    transferSales: number | null;
    totalExpenses: number | null;
    netCash: number | null;
    difference: number | null;
    notes: string | null;
    openedAt: string | null;
    closedAt: string | null;
    createdAt: string;
    branch: { id: string; name: string; type: string };
    user?: { id: string; name: string; email: string };
};

type SaleItem = { quantity: number; unitPrice: number; product: { name: string } };
type Sale = {
    id: string; saleNumber: string; totalAmount: number;
    paymentMethod: string; cashAmount: number | null; cardAmount: number | null;
    transferAmount: number | null; createdAt: string; items: SaleItem[];
};
type Expense = {
    id: string; description: string; amount: number;
    category: string; paymentMethod: string; supplier: string | null; expenseDate: string;
};
type DetailData = {
    session: CashClose;
    sales: Sale[];
    expenses: Expense[];
    totals: { salesCount: number; totalExpenses: number; cashExpenses: number };
};

type Branch  = { id: string; name: string; type: string };
type Summary = {
    totalSessions: number; closedSessions: number; openSessions: number;
    totalSales: number; totalCash: number; totalCard: number; totalTransfer: number;
};

const PERIODS = [
    { label: 'Hoy', days: 0 },
    { label: 'Ayer', days: 1 },
    { label: 'Últimos 7d', days: 7 },
    { label: 'Últimos 30d', days: 30 },
];

const METHOD_ICON: Record<string, React.ReactNode> = {
    CASH:     <Banknote className="h-3.5 w-3.5 text-success" />,
    CARD:     <CreditCard className="h-3.5 w-3.5 text-blue-600" />,
    TRANSFER: <Smartphone className="h-3.5 w-3.5 text-brand" />,
    MIXED:    <DollarSign className="h-3.5 w-3.5 text-orange-500" />,
};
const METHOD_LABEL: Record<string, string> = {
    CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', MIXED: 'Mixto',
};
const CATEGORY_LABEL: Record<string, string> = {
    PROVEEDOR: 'Proveedor', SUELDOS: 'Sueldo', SERVICIOS: 'Servicios',
    MANTENIMIENTO: 'Mantenimiento', OTROS: 'Otros',
};

function toDateStr(d: Date) { return d.toISOString().split('T')[0]; }
function fmt(n: number | null | undefined) {
    if (n == null) return '—';
    return `Bs. ${n.toFixed(2)}`;
}
function fmtDate(s: string | null) {
    if (!s) return '—';
    return new Date(s).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
}
function fmtTime(s: string) {
    return new Date(s).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}

export default function CashClosesReportPage() {
    const [branches, setBranches]   = useState<Branch[]>([]);
    const [closes, setCloses]       = useState<CashClose[]>([]);
    const [summary, setSummary]     = useState<Summary | null>(null);
    const [loading, setLoading]     = useState(false);
    const [branchFilter, setBranchFilter] = useState('');
    const [fromDate, setFromDate]   = useState(toDateStr(new Date()));
    const [toDate, setToDate]       = useState(toDateStr(new Date()));
    const [search, setSearch]       = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [detail, setDetail]         = useState<DetailData | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        fetch('/api/admin/branches').then(r => r.json()).then(d => {
            if (d.success) setBranches(d.data);
        });
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ from: fromDate, to: toDate, limit: '200' });
            if (branchFilter) params.set('branchId', branchFilter);
            const res = await fetch(`/api/admin/cash-closes?${params}`);
            const d = await res.json();
            if (d.success) { setCloses(d.data); setSummary(d.summary); }
        } catch { }
        finally { setLoading(false); }
    }, [fromDate, toDate, branchFilter]);

    useEffect(() => { load(); }, [load]);

    async function toggleExpand(id: string) {
        if (expandedId === id) { setExpandedId(null); setDetail(null); return; }
        setExpandedId(id);
        setDetail(null);
        setDetailLoading(true);
        try {
            const res = await fetch(`/api/admin/cash-closes/${id}`).then(r => r.json());
            if (res.success) setDetail(res.data);
        } finally { setDetailLoading(false); }
    }

    function applyPeriod(days: number) {
        const today = new Date();
        if (days === 0) { setFromDate(toDateStr(today)); setToDate(toDateStr(today)); }
        else {
            const from = new Date(today); from.setDate(today.getDate() - days);
            setFromDate(toDateStr(from)); setToDate(toDateStr(today));
        }
    }

    const filtered = closes.filter(c =>
        !search || c.branch.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/admin" className="text-sm text-muted hover:text-ink flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Volver a Admin
                    </Link>
                    <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl flex items-center gap-3">
                        <ClipboardList className="h-8 w-8 text-slate-600" /> Historial de Cierres de Caja
                    </h1>
                    <p className="text-muted mt-1">Reporte centralizado de sesiones de caja por sucursal</p>
                </div>

                {/* Filtros */}
                <div className="bg-surface border border-line-subtle rounded-2xl shadow p-5 mb-6 flex flex-wrap gap-4 items-end">
                    <div>
                        <p className="text-xs font-semibold text-muted mb-2">Período rápido</p>
                        <div className="flex gap-2">
                            {PERIODS.map(p => (
                                <button key={p.label} onClick={() => applyPeriod(p.days)}
                                    className="min-h-11 px-3 py-2 rounded-lg text-xs font-medium bg-canvas hover:bg-canvas text-ink transition">
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2 items-end">
                        <div>
                            <label className="block text-xs font-semibold text-muted mb-1">Desde</label>
                            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                                className="border border-line-subtle rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-muted mb-1">Hasta</label>
                            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                                className="border border-line-subtle rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-muted mb-1">Sucursal</label>
                        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
                            className="border border-line-subtle rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
                            <option value="">Todas</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div className="relative flex-1 min-w-[180px]">
                        <label className="block text-xs font-semibold text-muted mb-1">Buscar</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                            <input type="text" placeholder="Sucursal…" value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-line-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                        </div>
                    </div>
                </div>

                {/* KPIs */}
                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Total ventas',    value: fmt(summary.totalSales),    color: 'text-ink' },
                            { label: 'Efectivo',        value: fmt(summary.totalCash),     color: 'text-green-700' },
                            { label: 'Tarjeta',         value: fmt(summary.totalCard),     color: 'text-blue-700' },
                            { label: 'Transferencia',   value: fmt(summary.totalTransfer), color: 'text-purple-700' },
                        ].map(k => (
                            <div key={k.label} className="bg-surface border border-line-subtle rounded-2xl shadow p-5">
                                <p className="text-xs text-muted font-semibold uppercase tracking-wide">{k.label}</p>
                                <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tabla */}
                {loading ? (
                    <div className="text-center py-16 text-muted">Cargando…</div>
                ) : (
                    <div className="bg-surface border border-line-subtle rounded-xl shadow overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead className="bg-surface border-b border-line-subtle">
                                <tr>
                                    <th className="text-left px-5 py-3.5 font-semibold text-muted w-8"></th>
                                    <th className="text-left px-5 py-3.5 font-semibold text-muted">Sucursal</th>
                                    <th className="text-left px-5 py-3.5 font-semibold text-muted">Cajero</th>
                                    <th className="text-left px-5 py-3.5 font-semibold text-muted">Apertura</th>
                                    <th className="text-left px-5 py-3.5 font-semibold text-muted">Cierre</th>
                                    <th className="text-right px-5 py-3.5 font-semibold text-muted">Ventas</th>
                                    <th className="text-right px-5 py-3.5 font-semibold text-muted">Gastos</th>
                                    <th className="text-right px-5 py-3.5 font-semibold text-muted">Diferencia</th>
                                    <th className="text-center px-5 py-3.5 font-semibold text-muted">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(c => {
                                    const isExpanded = expandedId === c.id;
                                    return (
                                        <>
                                            <tr key={c.id}
                                                className="border-b border-line-subtle hover:bg-canvas cursor-pointer"
                                                onClick={() => toggleExpand(c.id)}>
                                                <td className="px-5 py-3.5 text-muted">
                                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <p className="font-medium text-ink">{c.branch.name}</p>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className="flex items-center gap-1.5 text-xs text-muted">
                                                        <User className="h-3.5 w-3.5 text-muted" />
                                                        {c.user?.name || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-muted text-xs">{fmtDate(c.openedAt)}</td>
                                                <td className="px-5 py-3.5 text-muted text-xs">{fmtDate(c.closedAt)}</td>
                                                <td className="px-5 py-3.5 text-right font-semibold text-ink">{fmt(c.totalSales)}</td>
                                                <td className="px-5 py-3.5 text-right font-semibold text-red-600">{fmt(c.totalExpenses)}</td>
                                                <td className={`px-5 py-3.5 text-right font-semibold ${(c.difference ?? 0) < 0 ? 'text-red-600' : 'text-success'}`}>
                                                    {fmt(c.difference)}
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.sessionStatus === 'OPEN' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                        {c.sessionStatus === 'OPEN' ? 'Abierta' : 'Cerrada'}
                                                    </span>
                                                </td>
                                            </tr>

                                            {/* ── Panel de detalle expandible ── */}
                                            {isExpanded && (
                                                <tr key={`${c.id}-detail`} className="bg-canvas shadow-inner border-t border-line-subtle">
                                                    <td colSpan={9} className="px-6 py-5">
                                                        {detailLoading && !detail ? (
                                                            <div className="flex justify-center py-6">
                                                                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                                            </div>
                                                        ) : detail ? (
                                                            <div className="space-y-5">

                                                                {/* KPIs del turno */}
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                                                                    {[
                                                                        { label: '💰 Apertura', val: fmt(c.openingAmount), color: 'text-ink' },
                                                                        { label: '💵 Efectivo ventas', val: fmt(c.cashSales), color: 'text-green-400' },
                                                                        { label: '💳 Tarjeta', val: fmt(c.cardSales), color: 'text-blue-400' },
                                                                        { label: '📲 Transferencia', val: fmt(c.transferSales), color: 'text-purple-400' },
                                                                        { label: '🧾 Total gastos', val: fmt(c.totalExpenses), color: 'text-red-400' },
                                                                        { label: '📊 Neto', val: fmt(c.netCash), color: 'text-ink' },
                                                                        { label: 'Ventas (#)', val: String(detail.totals.salesCount), color: 'text-indigo-400' },
                                                                    ].map(k => (
                                                                        <div key={k.label} className="bg-surface border border-line-subtle rounded-xl border border-line-subtle px-3 py-2.5">
                                                                            <p className="text-xs text-muted">{k.label}</p>
                                                                            <p className={`text-base font-bold mt-0.5 ${k.color}`}>{k.val}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                                    {/* ── VENTAS DEL TURNO ── */}
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <ShoppingCart className="h-4 w-4 text-indigo-500" />
                                                                            <h3 className="font-bold text-ink text-sm">
                                                                                Ventas del turno ({detail.sales.length})
                                                                            </h3>
                                                                        </div>
                                                                        {detail.sales.length === 0 ? (
                                                                            <p className="text-xs text-muted italic py-4 text-center">Sin ventas en este turno</p>
                                                                        ) : (
                                                                            <div className="rounded-xl border border-line-subtle overflow-hidden max-h-72 overflow-y-auto">
                                                                                {detail.sales.map(sale => (
                                                                                    <div key={sale.id} className="border-b border-gray-50 last:border-0 px-3 py-2.5 bg-surface border border-line-subtle hover:bg-canvas">
                                                                                        <div className="flex items-center justify-between gap-2">
                                                                                            <span className="font-mono text-xs text-muted flex-shrink-0">{sale.saleNumber}</span>
                                                                                            <div className="flex items-center gap-1 text-xs text-muted flex-shrink-0">
                                                                                                {METHOD_ICON[sale.paymentMethod]}
                                                                                                {METHOD_LABEL[sale.paymentMethod] || sale.paymentMethod}
                                                                                            </div>
                                                                                            <span className="text-xs text-muted flex-shrink-0">{fmtTime(sale.createdAt)}</span>
                                                                                            <span className="font-bold text-ink text-sm ml-auto flex-shrink-0">{fmt(sale.totalAmount)}</span>
                                                                                        </div>
                                                                                        {/* Items de la venta */}
                                                                                        {sale.items.length > 0 && (
                                                                                            <div className="mt-1 pl-2 border-l-2 border-line-subtle space-y-0.5">
                                                                                                {sale.items.map((item, i) => (
                                                                                                    <p key={i} className="text-xs text-muted">
                                                                                                        {item.quantity}× {item.product.name}
                                                                                                        <span className="ml-1 text-gray-300">— {fmt(item.quantity * item.unitPrice)}</span>
                                                                                                    </p>
                                                                                                ))}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* ── GASTOS DEL TURNO ── */}
                                                                    <div>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <AlertCircle className="h-4 w-4 text-red-400" />
                                                                                <h3 className="font-bold text-ink text-sm">
                                                                                    Gastos del turno ({detail.expenses.length})
                                                                                </h3>
                                                                            </div>
                                                                            {detail.expenses.length > 0 && (
                                                                                <span className="text-sm font-bold text-red-600">
                                                                                    {fmt(detail.totals.totalExpenses)}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {detail.expenses.length === 0 ? (
                                                                            <p className="text-xs text-muted italic py-4 text-center">Sin gastos registrados en este turno</p>
                                                                        ) : (
                                                                            <div className="rounded-xl border border-red-500/20 overflow-hidden max-h-72 overflow-y-auto">
                                                                                {detail.expenses.map(exp => (
                                                                                    <div key={exp.id} className="border-b border-red-500/10 last:border-0 px-3 py-2.5 bg-red-500/5 hover:bg-red-500/10">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <p className="font-medium text-ink text-xs truncate">{exp.description}</p>
                                                                                                {exp.supplier && (
                                                                                                    <p className="text-xs text-muted">Proveedor: {exp.supplier}</p>
                                                                                                )}
                                                                                            </div>
                                                                                            <div className="text-right flex-shrink-0 space-y-0.5">
                                                                                                <p className="font-bold text-red-600 text-sm">{fmt(exp.amount)}</p>
                                                                                                <div className="flex items-center gap-1 justify-end">
                                                                                                    <span className="text-xs text-muted">{CATEGORY_LABEL[exp.category] ?? exp.category}</span>
                                                                                                    <span className="text-gray-300">·</span>
                                                                                                    {METHOD_ICON[exp.paymentMethod]}
                                                                                                    <span className="text-xs text-muted">{METHOD_LABEL[exp.paymentMethod]}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                                {/* Total gastos en efectivo */}
                                                                                {detail.totals.cashExpenses > 0 && (
                                                                                    <div className="px-3 py-2 bg-red-500/10 flex justify-between text-xs font-semibold text-red-400">
                                                                                        <span>Gastos pagados en efectivo</span>
                                                                                        <span>{fmt(detail.totals.cashExpenses)}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Cuadre final */}
                                                                <div className="bg-slate-800 text-white rounded-xl px-5 py-3.5 grid grid-cols-3 gap-4 text-sm">
                                                                    <div>
                                                                        <p className="text-slate-400 text-xs">Efectivo esperado en caja</p>
                                                                        <p className="font-bold text-lg">{fmt(c.openingAmount! + (c.cashSales ?? 0) - detail.totals.cashExpenses)}</p>
                                                                        <p className="text-xs text-slate-500 mt-0.5">apertura + ventas efectivo − gastos efectivo</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-slate-400 text-xs">Efectivo real (contado)</p>
                                                                        <p className="font-bold text-lg">{fmt(c.actualCash)}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-slate-400 text-xs">Diferencia</p>
                                                                        <p className={`font-bold text-lg ${(c.difference ?? 0) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                                            {(c.difference ?? 0) > 0 ? '+' : ''}{fmt(c.difference)}
                                                                        </p>
                                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                                            {(c.difference ?? 0) === 0 ? 'Cuadra perfectamente'
                                                                                : (c.difference ?? 0) > 0 ? '⬆️ Sobrante' : '⬇️ Faltante'}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {c.notes && (
                                                                    <p className="text-xs text-muted italic">📝 Nota: "{c.notes}"</p>
                                                                )}
                                                            </div>
                                                        ) : null}
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={9} className="px-5 py-12 text-center text-muted">No hay registros en el período seleccionado</td></tr>
                                )}
                            </tbody>
                        </table>
                        <div className="px-5 py-3 text-xs text-muted bg-surface border-t">
                            {filtered.length} sesion{filtered.length !== 1 ? 'es' : ''}
                            {summary && ` — ${summary.openSessions} abierta${summary.openSessions !== 1 ? 's' : ''}, ${summary.closedSessions} cerrada${summary.closedSessions !== 1 ? 's' : ''}`}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
