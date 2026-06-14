'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, TrendingUp, DollarSign, ShoppingBag, Target,
    RefreshCw, Filter, BarChart2, Users, Clock, Download,
    AlertTriangle, CheckCircle
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
type CashierReport = {
    userId: string; userName: string;
    totalSales: number; totalRevenue: number; avgTicket: number;
    cashAmount: number; cardAmount: number; transferAmount: number;
    sessionsCount: number; totalHours: number;
};
type ShiftReport = {
    sessionId: string; cashierName: string; branchName: string;
    openedAt: string | null; closedAt: string | null; durationHours: number | null;
    sessionStatus: string; openingCash: number; actualCash: number;
    expectedCash: number; difference: number;
    totalSales: number; cashSales: number; cardSales: number; transferSales: number;
    notes: string;
};

const PAYMENT_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b'];
const PAYMENT_LABELS: Record<string, string> = {
    CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', MIXED: 'Mixto',
};
const PERIOD_OPTIONS = [
    { label: '7d', value: 7 }, { label: '14d', value: 14 },
    { label: '30d', value: 30 }, { label: '60d', value: 60 }, { label: '90d', value: 90 },
];

function fDate(iso: string) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
}
function fDatetime(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function fBs(v: number) { return `Bs. ${v.toFixed(0)}`; }

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/5 border border-white/10 backdrop-blur-md border border-white/10 rounded-xl shadow-xl p-3 text-sm">
            <p className="font-semibold text-white/80 mb-2">{fDate(label)}</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
                    {p.name}: {p.dataKey === 'ventas' ? p.value : fBs(p.value)}
                </p>
            ))}
        </div>
    );
}

/* ──────────── CSV Export ──────────── */
function exportCSV(rows: object[], filename: string) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
        '\uFEFF' + headers.join(','),
        ...rows.map(r => headers.map(h => `"${(r as any)[h] ?? ''}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

type TabId = 'ventas' | 'cajeros' | 'turnos';

/* ──────────── Main Component ──────────── */
export default function AdminReportsPage() {
    const [activeTab, setActiveTab] = useState<TabId>('ventas');

    // Filtros compartidos
    const [days, setDays] = useState(30);
    const [branchId, setBranchId] = useState('');
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

    // Tab ventas
    const [chartData, setChartData] = useState<DayPoint[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);

    // Tab cajeros
    const [cashiers, setCashiers] = useState<CashierReport[]>([]);

    // Tab turnos
    const [shifts, setShifts] = useState<ShiftReport[]>([]);
    const [shiftSummary, setShiftSummary] = useState<any>(null);

    const [loading, setLoading] = useState(false);

    const dateRange = () => {
        const to = new Date();
        const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return {
            from: from.toISOString().split('T')[0],
            to: to.toISOString().split('T')[0],
        };
    };

    const loadData = useCallback(() => {
        setLoading(true);
        const { from, to } = dateRange();
        const bParam = branchId ? `&branchId=${branchId}` : '';

        const requests: Promise<any>[] = [
            fetch(`/api/admin/branches`).then(r => r.json()),
        ];

        if (activeTab === 'ventas') {
            requests.push(
                fetch(`/api/admin/sales/chart?days=${days}${bParam}`).then(r => r.json()),
            );
        } else if (activeTab === 'cajeros') {
            requests.push(
                fetch(`/api/admin/reports/cashiers?from=${from}&to=${to}${bParam}`).then(r => r.json()),
            );
        } else {
            requests.push(
                fetch(`/api/admin/reports/shifts?from=${from}&to=${to}${bParam}`).then(r => r.json()),
            );
        }

        Promise.all(requests).then(([br, main]) => {
            if (br.success) setBranches(br.data);
            if (activeTab === 'ventas' && main?.success) {
                setChartData(main.data);
                setSummary(main.summary);
            } else if (activeTab === 'cajeros' && main?.success) {
                setCashiers(main.data);
            } else if (activeTab === 'turnos' && main?.success) {
                setShifts(main.data);
                setShiftSummary(main.summary);
            }
        }).finally(() => setLoading(false));
    }, [activeTab, days, branchId]);

    useEffect(() => { loadData(); }, [loadData]);

    const tickInterval = days <= 14 ? 0 : days <= 30 ? 3 : days <= 60 ? 6 : 9;
    const pieData = summary?.byPayment.map(p => ({
        name: PAYMENT_LABELS[p.method] || p.method, value: p.count,
    })) ?? [];

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
        { id: 'ventas', label: 'Ingresos', icon: <TrendingUp className="h-4 w-4" /> },
        { id: 'cajeros', label: 'Por Cajero', icon: <Users className="h-4 w-4" /> },
        { id: 'turnos', label: 'Por Turno', icon: <Clock className="h-4 w-4" /> },
    ];

    return (
        <div className="min-h-screen relative overflow-hidden p-4 md:p-8" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: '56px 100px' }} />
            </div>
            <div className="relative z-10 max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <Link href="/admin" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver a Admin
                        </Link>
                        <h1 className="text-3xl font-bold text-white/90 flex items-center gap-3">
                            <BarChart2 className="h-7 w-7 text-indigo-600" /> Reportes
                        </h1>
                    </div>
                    <button onClick={loadData} disabled={loading}
                        className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-md border border-white/10 hover:bg-white/5 text-white/80 px-4 py-2.5 rounded-xl font-medium transition text-sm shadow-sm disabled:opacity-40">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-1.5 w-fit">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === t.id
                                ? 'bg-indigo-600 text-white shadow'
                                : 'text-white/60 hover:text-white/80 hover:bg-white/5'}`}>
                            {t.icon}{t.label}
                        </button>
                    ))}
                </div>

                {/* Filtros */}
                <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-5 flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="text-xs font-semibold text-white/60 mb-1.5 block">Período</label>
                        <div className="flex gap-2 flex-wrap">
                            {PERIOD_OPTIONS.map(o => (
                                <button key={o.value} onClick={() => setDays(o.value)}
                                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition ${days === o.value ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/70 hover:bg-gray-200'}`}>
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-white/60 mb-1.5 block">Sucursal</label>
                        <select value={branchId} onChange={e => setBranchId(e.target.value)}
                            className="border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                            <option value="">Todas las sucursales</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <button onClick={loadData}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
                        <Filter className="h-4 w-4" /> Aplicar
                    </button>
                </div>

                {/* ── TAB: VENTAS ── */}
                {activeTab === 'ventas' && (
                    <>
                        {summary && !loading && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { label: `Ingresos (${days}d)`, value: `Bs. ${summary.totalRevenue.toFixed(2)}`, icon: <DollarSign className="h-5 w-5 text-green-600" />, bg: 'bg-green-100' },
                                    { label: `Ventas (${days}d)`, value: summary.totalSales.toString(), icon: <ShoppingBag className="h-5 w-5 text-blue-600" />, bg: 'bg-blue-100' },
                                    { label: 'Ticket promedio', value: `Bs. ${summary.avgTicket.toFixed(2)}`, icon: <Target className="h-5 w-5 text-purple-600" />, bg: 'bg-purple-100' },
                                ].map(kpi => (
                                    <div key={kpi.label} className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-5 flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl ${kpi.bg} flex items-center justify-center flex-shrink-0`}>{kpi.icon}</div>
                                        <div>
                                            <p className="text-sm text-white/60 font-medium">{kpi.label}</p>
                                            <p className="text-2xl font-black text-white/90">{kpi.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-6">
                            <h2 className="font-bold text-white/90 mb-1 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-indigo-500" /> Ingresos diarios
                            </h2>
                            <p className="text-xs text-white/40 mb-5">Últimos {days} días en Bs.</p>
                            {loading ? <div className="h-64 flex items-center justify-center text-white/40 text-sm">Cargando…</div> : (
                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} /><stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="date" tickFormatter={fDate} interval={tickInterval} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={v => `${v}`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={45} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend formatter={(v: string) => ({ ingresos: 'Total', burger: '🍔 Burger', acai: '🥤 Açaí' }[v] ?? v)} />
                                        <Area type="monotone" dataKey="ingresos" name="ingresos" stroke="#6366f1" strokeWidth={2} fill="url(#gI)" dot={false} activeDot={{ r: 5 }} />
                                        <Area type="monotone" dataKey="burger" name="burger" stroke="#f97316" strokeWidth={1.5} fill="url(#gB)" dot={false} activeDot={{ r: 4 }} />
                                        <Area type="monotone" dataKey="acai" name="acai" stroke="#8b5cf6" strokeWidth={1.5} fill="url(#gA)" dot={false} activeDot={{ r: 4 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-6">
                                <h2 className="font-bold text-white/90 mb-1">Ventas por día</h2>
                                <p className="text-xs text-white/40 mb-5">Cantidad de transacciones</p>
                                {loading ? <div className="h-52 flex items-center justify-center text-white/40 text-sm">Cargando…</div> : (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="date" tickFormatter={fDate} interval={tickInterval} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="ventas" name="ventas" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-6">
                                <h2 className="font-bold text-white/90 mb-1">Métodos de pago</h2>
                                <p className="text-xs text-white/40 mb-3">Distribución por cantidad de ventas</p>
                                {loading || !pieData.length ? (
                                    <div className="h-52 flex items-center justify-center text-white/40 text-sm">{loading ? 'Cargando…' : 'Sin datos'}</div>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        <ResponsiveContainer width="55%" height={200}>
                                            <PieChart>
                                                <Pie data={pieData} innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                                                    {pieData.map((_, i) => <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />)}
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
                                                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }} />
                                                        <span className="text-xs text-white/80 flex-1">{d.name}</span>
                                                        <span className="text-xs font-bold text-white/90">{pct}%</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="text-center pb-2">
                            <Link href="/admin/sales" className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:underline">
                                Ver historial detallado de ventas →
                            </Link>
                        </div>
                    </>
                )}

                {/* ── TAB: POR CAJERO ── */}
                {activeTab === 'cajeros' && (
                    <div className="space-y-4">
                        {/* KPIs */}
                        {!loading && cashiers.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Cajeros activos', value: cashiers.length, icon: <Users className="h-5 w-5 text-indigo-600" />, bg: 'bg-indigo-50' },
                                    { label: 'Total ingresos', value: fBs(cashiers.reduce((s, c) => s + c.totalRevenue, 0)), icon: <DollarSign className="h-5 w-5 text-green-600" />, bg: 'bg-green-50' },
                                    { label: 'Total ventas', value: cashiers.reduce((s, c) => s + c.totalSales, 0), icon: <ShoppingBag className="h-5 w-5 text-blue-600" />, bg: 'bg-blue-50' },
                                    { label: 'Top cajero', value: cashiers[0]?.userName.split(' ')[0] ?? '—', icon: <Target className="h-5 w-5 text-purple-600" />, bg: 'bg-purple-50' },
                                ].map(k => (
                                    <div key={k.label} className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-4 flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center flex-shrink-0`}>{k.icon}</div>
                                        <div>
                                            <p className="text-xs text-white/60">{k.label}</p>
                                            <p className="text-lg font-black text-white/90">{k.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow overflow-hidden">
                            <div className="p-5 border-b border-white/10 flex items-center justify-between">
                                <h2 className="font-bold text-white/90 flex items-center gap-2">
                                    <Users className="h-5 w-5 text-indigo-500" /> Ranking de Cajeros
                                </h2>
                                <button onClick={() => exportCSV(cashiers, `cajeros-${days}d.csv`)}
                                    className="flex items-center gap-1.5 text-xs text-white/60 hover:text-indigo-600 border border-white/10 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition">
                                    <Download className="h-3.5 w-3.5" /> CSV
                                </button>
                            </div>
                            {loading ? (
                                <div className="p-10 text-center text-white/40 text-sm">Cargando datos…</div>
                            ) : cashiers.length === 0 ? (
                                <div className="p-10 text-center text-white/40 text-sm">Sin datos para el período</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-white/5 text-xs text-white/60 uppercase tracking-wide">
                                                <th className="px-5 py-3 text-left">#</th>
                                                <th className="px-5 py-3 text-left">Cajero</th>
                                                <th className="px-5 py-3 text-right">Ventas</th>
                                                <th className="px-5 py-3 text-right">Ingresos</th>
                                                <th className="px-5 py-3 text-right">Ticket Prom.</th>
                                                <th className="px-5 py-3 text-right">Efectivo</th>
                                                <th className="px-5 py-3 text-right">Tarjeta</th>
                                                <th className="px-5 py-3 text-right">Transferencia</th>
                                                <th className="px-5 py-3 text-right">Turnos</th>
                                                <th className="px-5 py-3 text-right">Horas</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {cashiers.map((c, i) => (
                                                <tr key={c.userId} className={`hover:bg-white/5 transition ${i === 0 ? 'bg-amber-50/50' : ''}`}>
                                                    <td className="px-5 py-3.5 font-bold text-white/40">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                                                    <td className="px-5 py-3.5 font-semibold text-white/90">{c.userName}</td>
                                                    <td className="px-5 py-3.5 text-right font-medium text-white/80">{c.totalSales}</td>
                                                    <td className="px-5 py-3.5 text-right font-bold text-green-700">{fBs(c.totalRevenue)}</td>
                                                    <td className="px-5 py-3.5 text-right text-white/70">{fBs(c.avgTicket)}</td>
                                                    <td className="px-5 py-3.5 text-right text-white/70">{fBs(c.cashAmount)}</td>
                                                    <td className="px-5 py-3.5 text-right text-white/70">{fBs(c.cardAmount)}</td>
                                                    <td className="px-5 py-3.5 text-right text-white/70">{fBs(c.transferAmount)}</td>
                                                    <td className="px-5 py-3.5 text-right text-white/70">{c.sessionsCount}</td>
                                                    <td className="px-5 py-3.5 text-right text-white/70">{c.totalHours > 0 ? `${c.totalHours}h` : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── TAB: POR TURNO ── */}
                {activeTab === 'turnos' && (
                    <div className="space-y-4">
                        {/* KPIs */}
                        {!loading && shiftSummary && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Total turnos', value: shiftSummary.totalSessions, icon: <Clock className="h-5 w-5 text-indigo-600" />, bg: 'bg-indigo-50' },
                                    { label: 'Ingresos totales', value: fBs(shiftSummary.totalRevenue), icon: <DollarSign className="h-5 w-5 text-green-600" />, bg: 'bg-green-50' },
                                    { label: 'Duración media', value: `${shiftSummary.avgDurationHours}h`, icon: <Target className="h-5 w-5 text-blue-600" />, bg: 'bg-blue-50' },
                                    { label: 'Con diferencia', value: shiftSummary.sessionsWithDifference, icon: <AlertTriangle className="h-5 w-5 text-amber-600" />, bg: 'bg-amber-50' },
                                ].map(k => (
                                    <div key={k.label} className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-4 flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center flex-shrink-0`}>{k.icon}</div>
                                        <div>
                                            <p className="text-xs text-white/60">{k.label}</p>
                                            <p className="text-lg font-black text-white/90">{k.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow overflow-hidden">
                            <div className="p-5 border-b border-white/10 flex items-center justify-between">
                                <h2 className="font-bold text-white/90 flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-indigo-500" /> Historial de Turnos
                                </h2>
                                <button onClick={() => exportCSV(shifts, `turnos-${days}d.csv`)}
                                    className="flex items-center gap-1.5 text-xs text-white/60 hover:text-indigo-600 border border-white/10 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition">
                                    <Download className="h-3.5 w-3.5" /> CSV
                                </button>
                            </div>
                            {loading ? (
                                <div className="p-10 text-center text-white/40 text-sm">Cargando datos…</div>
                            ) : shifts.length === 0 ? (
                                <div className="p-10 text-center text-white/40 text-sm">Sin datos para el período</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-white/5 text-xs text-white/60 uppercase tracking-wide">
                                                <th className="px-4 py-3 text-left">Cajero</th>
                                                <th className="px-4 py-3 text-left">Sucursal</th>
                                                <th className="px-4 py-3 text-left">Apertura</th>
                                                <th className="px-4 py-3 text-left">Cierre</th>
                                                <th className="px-4 py-3 text-right">Duración</th>
                                                <th className="px-4 py-3 text-right">Ventas</th>
                                                <th className="px-4 py-3 text-right">Efectivo</th>
                                                <th className="px-4 py-3 text-right">Diferencia</th>
                                                <th className="px-4 py-3 text-center">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {shifts.map(s => {
                                                const hasDiff = Math.abs(s.difference) > 0.5;
                                                return (
                                                    <tr key={s.sessionId} className={`hover:bg-white/5 transition ${hasDiff ? 'bg-red-50/30' : ''}`}>
                                                        <td className="px-4 py-3.5 font-semibold text-white/90">{s.cashierName}</td>
                                                        <td className="px-4 py-3.5 text-white/70">{s.branchName}</td>
                                                        <td className="px-4 py-3.5 text-white/70 text-xs">{fDatetime(s.openedAt)}</td>
                                                        <td className="px-4 py-3.5 text-white/70 text-xs">{fDatetime(s.closedAt)}</td>
                                                        <td className="px-4 py-3.5 text-right text-white/70">
                                                            {s.durationHours !== null ? `${s.durationHours}h` : '—'}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-right font-bold text-green-700">{fBs(s.totalSales)}</td>
                                                        <td className="px-4 py-3.5 text-right text-white/70">{fBs(s.cashSales)}</td>
                                                        <td className={`px-4 py-3.5 text-right font-bold ${hasDiff ? 'text-red-600' : 'text-white/60'}`}>
                                                            {hasDiff ? `${s.difference > 0 ? '+' : ''}${fBs(s.difference)}` : '—'}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-center">
                                                            {s.sessionStatus === 'OPEN'
                                                                ? <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium"><CheckCircle className="h-3 w-3" />Abierto</span>
                                                                : <span className="inline-flex items-center gap-1 text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-full font-medium">Cerrado</span>
                                                            }
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
