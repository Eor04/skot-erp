'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, ClipboardList, Search, ChevronDown, ChevronUp, User } from 'lucide-react';

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
    difference: number | null;
    notes: string | null;
    openedAt: string | null;
    closedAt: string | null;
    createdAt: string;
    branch: { id: string; name: string; type: string };
    user?: { id: string; name: string; email: string };
};

type Branch = { id: string; name: string; type: string };
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

function toDateStr(d: Date) {
    return d.toISOString().split('T')[0];
}

export default function CashClosesReportPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [closes, setCloses] = useState<CashClose[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(false);
    const [branchFilter, setBranchFilter] = useState('');
    const [fromDate, setFromDate] = useState(toDateStr(new Date()));
    const [toDate, setToDate] = useState(toDateStr(new Date()));
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    function toggleExpand(id: string) { setExpandedId(prev => prev === id ? null : id); }

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
            if (d.success) {
                setCloses(d.data);
                setSummary(d.summary);
            }
        } catch { }
        finally { setLoading(false); }
    }, [fromDate, toDate, branchFilter]);

    useEffect(() => { load(); }, [load]);

    function applyPeriod(days: number) {
        const today = new Date();
        if (days === 0) {
            setFromDate(toDateStr(today));
            setToDate(toDateStr(today));
        } else {
            const from = new Date(today);
            from.setDate(today.getDate() - days);
            setFromDate(toDateStr(from));
            setToDate(toDateStr(today));
        }
    }

    function fmt(n: number | null | undefined) {
        if (n == null) return '—';
        return `Bs. ${n.toFixed(2)}`;
    }

    function fmtDate(s: string | null) {
        if (!s) return '—';
        return new Date(s).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
    }

    const filtered = closes.filter(c =>
        !search ||
        c.branch.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Volver a Admin
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <ClipboardList className="h-8 w-8 text-slate-600" /> Historial de Cierres de Caja
                    </h1>
                    <p className="text-gray-500 mt-1">Reporte centralizado de sesiones de caja por sucursal</p>
                </div>

                {/* Filtros */}
                <div className="bg-white rounded-2xl shadow p-5 mb-6 flex flex-wrap gap-4 items-end">
                    {/* Períodos rápidos */}
                    <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">Período rápido</p>
                        <div className="flex gap-2">
                            {PERIODS.map(p => (
                                <button key={p.label} onClick={() => applyPeriod(p.days)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition">
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Fechas */}
                    <div className="flex gap-2 items-end">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Desde</label>
                            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Hasta</label>
                            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                        </div>
                    </div>
                    {/* Sucursal */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Sucursal</label>
                        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
                            <option value="">Todas</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    {/* Búsqueda */}
                    <div className="relative flex-1 min-w-[180px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Buscar</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input type="text" placeholder="Sucursal…" value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                        </div>
                    </div>
                </div>

                {/* KPIs */}
                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Total ventas', value: fmt(summary.totalSales), color: 'text-gray-900' },
                            { label: 'Efectivo', value: fmt(summary.totalCash), color: 'text-green-700' },
                            { label: 'Tarjeta', value: fmt(summary.totalCard), color: 'text-blue-700' },
                            { label: 'Transferencia', value: fmt(summary.totalTransfer), color: 'text-purple-700' },
                        ].map(k => (
                            <div key={k.label} className="bg-white rounded-2xl shadow p-5">
                                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{k.label}</p>
                                <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tabla */}
                {loading ? (
                    <div className="text-center py-16 text-gray-400">Cargando…</div>
                ) : (
                    <div className="bg-white rounded-2xl shadow overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600"></th>
                                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Sucursal</th>
                                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Cajero</th>
                                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Apertura</th>
                                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Cierre</th>
                                    <th className="text-right px-5 py-3.5 font-semibold text-gray-600">Ventas</th>
                                    <th className="text-right px-5 py-3.5 font-semibold text-gray-600">Diferencia</th>
                                    <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(c => {
                                    const isExpanded = expandedId === c.id;
                                    return (
                                        <>
                                            <tr key={c.id}
                                                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                                                onClick={() => toggleExpand(c.id)}>
                                                <td className="px-5 py-3.5 text-gray-400">
                                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <p className="font-medium text-gray-900">{c.branch.name}</p>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className="flex items-center gap-1.5 text-xs text-gray-600">
                                                        <User className="h-3.5 w-3.5 text-gray-400" />
                                                        {c.user?.name || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-gray-500 text-xs">{fmtDate(c.openedAt)}</td>
                                                <td className="px-5 py-3.5 text-gray-500 text-xs">{fmtDate(c.closedAt)}</td>
                                                <td className="px-5 py-3.5 text-right font-semibold text-gray-900">{fmt(c.totalSales)}</td>
                                                <td className={`px-5 py-3.5 text-right font-semibold ${(c.difference ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {fmt(c.difference)}
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.sessionStatus === 'OPEN' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                        {c.sessionStatus === 'OPEN' ? '🔓 Abierta' : '✅ Cerrada'}
                                                    </span>
                                                </td>
                                            </tr>
                                            {/* Desglose expandible */}
                                            {isExpanded && (
                                                <tr key={`${c.id}-detail`} className="bg-slate-50">
                                                    <td colSpan={8} className="px-8 py-4">
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                            {[
                                                                { label: '💵 Ventas efectivo', val: fmt(c.cashSales), color: 'text-green-700' },
                                                                { label: '💳 Ventas tarjeta',  val: fmt(c.cardSales), color: 'text-blue-700' },
                                                                { label: '📲 Transferencias',  val: fmt(c.transferSales), color: 'text-purple-700' },
                                                                { label: '💰 Apertura caja',   val: fmt(c.openingAmount), color: 'text-gray-700' },
                                                            ].map(k => (
                                                                <div key={k.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
                                                                    <p className="text-xs text-gray-400">{k.label}</p>
                                                                    <p className={`text-lg font-bold mt-0.5 ${k.color}`}>{k.val}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {c.notes && (
                                                            <p className="mt-2 text-xs text-gray-400 italic">Nota: "{c.notes}"</p>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">No hay registros en el período seleccionado</td></tr>
                                )}
                            </tbody>
                        </table>
                        <div className="px-5 py-3 text-xs text-gray-400 bg-gray-50 border-t">
                            {filtered.length} sesion{filtered.length !== 1 ? 'es' : ''}
                            {summary && ` — ${summary.openSessions} abierta${summary.openSessions !== 1 ? 's' : ''}, ${summary.closedSessions} cerrada${summary.closedSessions !== 1 ? 's' : ''}`}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
