'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, TrendingUp, DollarSign, ShoppingBag, Target,
    RefreshCw, Filter, BarChart2
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';

/* ──────────── Types ──────────── */
type DayPoint = { date: string; ventas: number; ingresos: number; burger: number; acai: number };
type Summary = {
    totalRevenue: number; totalSales: number; avgTicket: number;
    byChannel: { channel: string; total: number }[];
    byPayment: { method: string; count: number }[];
};

const CHANNEL_COLORS: Record<string, string> = {
    ACAI: '#8b5cf6',
    BURGUER: '#f97316',
    BURGER: '#f97316',
    OTRO: '#6b7280',
};
const PAYMENT_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b'];
const PAYMENT_LABELS: Record<string, string> = {
    CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', MIXED: 'Mixto',
};

const PERIOD_OPTIONS = [
    { label: '7 días', value: 7 },
    { label: '14 días', value: 14 },
    { label: '30 días', value: 30 },
    { label: '60 días', value: 60 },
    { label: '90 días', value: 90 },
];

function formatDate(isoDate: string) {
    const d = new Date(isoDate + 'T12:00:00');
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
}

function formatCurrency(v: number) {
    return `Bs. ${v.toFixed(0)}`;
}

/* ──────────── Tooltip personalizado ──────────── */
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-3 text-sm">
            <p className="font-semibold text-gray-700 mb-2">{formatDate(label)}</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
                    {p.name}: {p.dataKey === 'ventas' ? p.value : formatCurrency(p.value)}
                </p>
            ))}
        </div>
    );
}

/* ──────────── Component ──────────── */
export default function AdminReportsPage() {
    const [data, setData] = useState<DayPoint[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);

    const [days, setDays] = useState(30);
    const [branchId, setBranchId] = useState('');

    function loadData() {
        setLoading(true);
        const params = new URLSearchParams({ days: String(days), ...(branchId && { branchId }) });
        Promise.all([
            fetch(`/api/admin/sales/chart?${params}`).then(r => r.json()),
            fetch('/api/admin/branches').then(r => r.json()),
        ]).then(([chart, br]) => {
            if (chart.success) { setData(chart.data); setSummary(chart.summary); }
            if (br.success) setBranches(br.data);
        }).finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, []);

    const pieData = summary?.byPayment.map(p => ({
        name: PAYMENT_LABELS[p.method] || p.method,
        value: p.count,
    })) ?? [];

    // Ticks: mostrar cada N días para no saturar
    const tickInterval = days <= 14 ? 0 : days <= 30 ? 3 : days <= 60 ? 6 : 9;

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver a Admin
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <BarChart2 className="h-7 w-7 text-indigo-600" /> Reportes de Ventas
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">Análisis de ingresos y tendencias por período</p>
                    </div>
                    <button onClick={loadData} disabled={loading}
                        className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl font-medium transition text-sm shadow-sm disabled:opacity-40">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
                    </button>
                </div>

                {/* Filtros */}
                <div className="bg-white rounded-2xl shadow p-5 flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Período</label>
                        <div className="flex gap-2 flex-wrap">
                            {PERIOD_OPTIONS.map(o => (
                                <button key={o.value} onClick={() => setDays(o.value)}
                                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition ${days === o.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Sucursal</label>
                        <select value={branchId} onChange={e => setBranchId(e.target.value)}
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                            <option value="">Todas las sucursales</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <button onClick={loadData}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
                        <Filter className="h-4 w-4" /> Aplicar
                    </button>
                </div>

                {/* KPIs */}
                {summary && !loading && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { label: `Ingresos (${days}d)`, value: `Bs. ${summary.totalRevenue.toFixed(2)}`, icon: <DollarSign className="h-5 w-5 text-green-600" />, bg: 'bg-green-100' },
                            { label: `Ventas (${days}d)`, value: summary.totalSales.toString(), icon: <ShoppingBag className="h-5 w-5 text-blue-600" />, bg: 'bg-blue-100' },
                            { label: 'Ticket promedio', value: `Bs. ${summary.avgTicket.toFixed(2)}`, icon: <Target className="h-5 w-5 text-purple-600" />, bg: 'bg-purple-100' },
                        ].map(kpi => (
                            <div key={kpi.label} className="bg-white rounded-2xl shadow p-5 flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl ${kpi.bg} flex items-center justify-center flex-shrink-0`}>
                                    {kpi.icon}
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">{kpi.label}</p>
                                    <p className="text-2xl font-black text-gray-900">{kpi.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Gráfico de ingresos (AreaChart) */}
                <div className="bg-white rounded-2xl shadow p-6">
                    <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-indigo-500" /> Ingresos diarios
                    </h2>
                    <p className="text-xs text-gray-400 mb-5">Ingresos totales en Bolivianos — últimos {days} días</p>
                    {loading ? (
                        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Cargando gráfico…</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradBurger" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradAcai" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tickFormatter={formatDate} interval={tickInterval}
                                    tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={v => `${v}`} tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    axisLine={false} tickLine={false} width={45} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend formatter={(v: string) => {
                                    const labels: Record<string, string> = { ingresos: 'Total', burger: '🍔 Burger', acai: '🥤 Açaí' };
                                    return labels[v] ?? v;
                                }} />
                                <Area type="monotone" dataKey="ingresos" name="ingresos" stroke="#6366f1" strokeWidth={2}
                                    fill="url(#gradIngresos)" dot={false} activeDot={{ r: 5 }} />
                                <Area type="monotone" dataKey="burger" name="burger" stroke="#f97316" strokeWidth={1.5}
                                    fill="url(#gradBurger)" dot={false} activeDot={{ r: 4 }} />
                                <Area type="monotone" dataKey="acai" name="acai" stroke="#8b5cf6" strokeWidth={1.5}
                                    fill="url(#gradAcai)" dot={false} activeDot={{ r: 4 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Gráfico de cantidad de ventas (BarChart) + Pie de métodos de pago */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Bar chart ventas por día */}
                    <div className="bg-white rounded-2xl shadow p-6">
                        <h2 className="font-bold text-gray-900 mb-1">Ventas por día</h2>
                        <p className="text-xs text-gray-400 mb-5">Cantidad de transacciones diarias</p>
                        {loading ? (
                            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Cargando…</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tickFormatter={formatDate} interval={tickInterval}
                                        tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="ventas" name="ventas" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Pie chart métodos de pago */}
                    <div className="bg-white rounded-2xl shadow p-6">
                        <h2 className="font-bold text-gray-900 mb-1">Métodos de pago</h2>
                        <p className="text-xs text-gray-400 mb-3">Distribución por cantidad de ventas</p>
                        {loading || !pieData.length ? (
                            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
                                {loading ? 'Cargando…' : 'Sin datos de pago'}
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <ResponsiveContainer width="55%" height={200}>
                                    <PieChart>
                                        <Pie data={pieData} innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                                            {pieData.map((_, i) => (
                                                <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v: number | undefined) => [`${v ?? 0} ventas`, '']} />

                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-2">
                                    {pieData.map((d, i) => {
                                        const total = pieData.reduce((s, x) => s + x.value, 0);
                                        const pct = total > 0 ? (d.value / total * 100).toFixed(0) : '0';
                                        return (
                                            <div key={d.name} className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{ background: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }} />
                                                <span className="text-xs text-gray-700 flex-1">{d.name}</span>
                                                <span className="text-xs font-bold text-gray-900">{pct}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Link a ventas detalladas */}
                <div className="text-center pb-2">
                    <Link href="/admin/sales"
                        className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:underline">
                        Ver historial detallado de ventas →
                    </Link>
                </div>
            </div>
        </div>
    );
}
