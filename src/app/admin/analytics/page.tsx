'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, TrendingUp, DollarSign, ShoppingBag,
    Package, BarChart3, Loader2, FileText, FileSpreadsheet, Store
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { downloadCSV, downloadPDF } from '@/lib/utils/export';

interface DailySale { date: string; total: number; count: number; cashTotal: number; cardTotal: number; }
interface TopProduct { name: string; quantity: number; revenue: number; }
interface PaymentDist { name: string; value: number; }
interface Branch { id: string; name: string; type: string; }

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899'];

// ---------- Helpers de fecha ----------
function toISO(d: Date) { return d.toISOString().split('T')[0]; }

function periodRange(period: string): { from: string; to: string; label: string } {
    const now = new Date();
    const to = toISO(now);
    if (period === 'today') {
        return { from: to, to, label: 'Hoy' };
    }
    if (period === '7d') {
        return { from: toISO(new Date(Date.now() - 6 * 86400000)), to, label: 'Últimos 7 días' };
    }
    if (period === '14d') {
        return { from: toISO(new Date(Date.now() - 13 * 86400000)), to, label: 'Últimos 14 días' };
    }
    if (period === '30d') {
        return { from: toISO(new Date(Date.now() - 29 * 86400000)), to, label: 'Últimos 30 días' };
    }
    if (period === 'month') {
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: toISO(from), to, label: now.toLocaleString('es-PE', { month: 'long', year: 'numeric' }) };
    }
    if (period === 'year') {
        return { from: `${now.getFullYear()}-01-01`, to, label: String(now.getFullYear()) };
    }
    return { from: toISO(new Date(Date.now() - 29 * 86400000)), to, label: '30 días' };
}

// Formato de etiqueta del eje (compacto para año)
function dayLabel(dateStr: string, period: string) {
    const d = new Date(dateStr + 'T12:00:00');
    if (period === 'year') return d.toLocaleDateString('es-PE', { month: 'short' });
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

// Agrupación: por día normalmente, por mes cuando period='year'
function groupKey(dateStr: string, period: string) {
    return period === 'year' ? dateStr.slice(0, 7) : dateStr.split('T')[0];
}

const BRANCH_TYPE_LABELS: Record<string, string> = {
    ACAI: '?? Açaí',
    HAMBURGUESAS: '?? Hamburguesas',
    FABRICA: '?? Fábrica',
    FACTORY: '?? Fábrica',
    WAREHOUSE: '?? Almacén',
};

const PERIOD_OPTIONS = [
    { key: 'today', label: 'Hoy' },
    { key: '7d', label: '7d' },
    { key: '14d', label: '14d' },
    { key: '30d', label: '30d' },
    { key: 'month', label: 'Mes' },
    { key: 'year', label: 'Año' },
];

export default function AnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [branchId, setBranchId] = useState('');   // '' = todas
    const [period, setPeriod] = useState('30d');
    const [dailySales, setDailySales] = useState<DailySale[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [paymentDist, setPaymentDist] = useState<PaymentDist[]>([]);
    const [kpis, setKpis] = useState({ totalRevenue: 0, totalSales: 0, avgTicket: 0, todayRevenue: 0 });

    // Cargar sucursales una vez
    useEffect(() => {
        fetch('/api/admin/branches')
            .then(r => r.json())
            .then(d => { if (d.success) setBranches(d.data); });
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const { from, to } = periodRange(period);
            const qs = new URLSearchParams({ from, to, limit: '2000' });
            if (branchId) qs.set('branchId', branchId);

            const res = await fetch(`/api/admin/sales?${qs}`);
            const data = await res.json();
            if (!data.success) return;

            const sales = data.data ?? [];
            const summary = data.summary ?? {};

            // KPIs
            const todayStr = toISO(new Date());
            const todayRevenue = sales
                .filter((s: any) => s.createdAt?.startsWith(todayStr))
                .reduce((sum: number, s: any) => sum + (s.totalAmount ?? 0), 0);

            setKpis({
                totalRevenue: summary.totalAmount ?? 0,
                totalSales: summary.totalSales ?? 0,
                avgTicket: summary.totalSales > 0 ? (summary.totalAmount / summary.totalSales) : 0,
                todayRevenue,
            });

            // Agrupación (día o mes)
            const byKey: Record<string, { total: number; count: number; cashTotal: number; cardTotal: number }> = {};
            for (const s of sales) {
                const key = groupKey(s.createdAt ?? '', period);
                if (!key) continue;
                if (!byKey[key]) byKey[key] = { total: 0, count: 0, cashTotal: 0, cardTotal: 0 };
                byKey[key].total += s.totalAmount ?? 0;
                byKey[key].count += 1;
                if (s.paymentMethod === 'CASH') byKey[key].cashTotal += s.totalAmount ?? 0;
                if (s.paymentMethod === 'CARD') byKey[key].cardTotal += s.totalAmount ?? 0;
            }
            const daily = Object.entries(byKey)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => ({
                    date: dayLabel(k, period),
                    total: parseFloat(v.total.toFixed(2)),
                    count: v.count,
                    cashTotal: parseFloat(v.cashTotal.toFixed(2)),
                    cardTotal: parseFloat(v.cardTotal.toFixed(2)),
                }));
            setDailySales(daily);

            // Top productos
            const productMap: Record<string, TopProduct> = {};
            for (const s of sales) {
                for (const item of (s.items ?? [])) {
                    const name = item.product?.name || 'Desconocido';
                    if (!productMap[name]) productMap[name] = { name, quantity: 0, revenue: 0 };
                    productMap[name].quantity += item.quantity ?? 0;
                    productMap[name].revenue += item.subtotal ?? 0;
                }
            }
            setTopProducts(Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 6));

            // Distribución método de pago
            const payMap: Record<string, number> = {};
            for (const s of sales) payMap[s.paymentMethod] = (payMap[s.paymentMethod] || 0) + (s.totalAmount ?? 0);
            const labelMap: Record<string, string> = { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', MIXED: 'Mixto' };
            setPaymentDist(Object.entries(payMap).map(([k, v]) => ({ name: labelMap[k] || k, value: parseFloat(v.toFixed(2)) })));
        } finally {
            setLoading(false);
        }
    }, [period, branchId]);

    useEffect(() => { loadData(); }, [loadData]);

    const { label: periodLabel } = periodRange(period);
    const selectedBranch = branches.find(b => b.id === branchId);
    const reportTitle = `Analytics${selectedBranch ? ' — ' + selectedBranch.name : ''} — ${periodLabel}`;

    // Filtros rápidos por tipo de sucursal
    const branchTypeGroups: Record<string, Branch[]> = {};
    for (const b of branches) {
        const key = b.type;
        if (!branchTypeGroups[key]) branchTypeGroups[key] = [];
        branchTypeGroups[key].push(b);
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">

                {/* -- Header -- */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div>
                        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-1">
                            <ArrowLeft className="h-4 w-4" /> Volver a Admin
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <BarChart3 className="h-7 w-7 text-purple-600" /> Analytics y Reportes
                        </h1>
                        {(selectedBranch || period !== '30d') && (
                            <p className="text-sm text-gray-500 mt-0.5">
                                {selectedBranch ? `?? ${selectedBranch.name}` : '?? Todas las sucursales'} · {periodLabel}
                            </p>
                        )}
                    </div>

                    {/* Export */}
                    <div className="flex gap-2 items-center flex-wrap">
                        <button
                            onClick={() => downloadCSV(dailySales.map(d => ({
                                'Fecha': d.date, 'Total (S/)': d.total.toFixed(2),
                                'N° Ventas': d.count, 'Efectivo (S/)': d.cashTotal.toFixed(2), 'Tarjeta (S/)': d.cardTotal.toFixed(2),
                            })), `analytics_${period}`)}
                            disabled={dailySales.length === 0}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 text-sm font-semibold disabled:opacity-40 transition">
                            <FileSpreadsheet className="h-4 w-4" /> CSV
                        </button>
                        <button
                            onClick={async () => {
                                setExporting(true);
                                try {
                                    await downloadPDF({
                                        title: reportTitle,
                                        subtitle: `Ingresos: Bs. ${kpis.totalRevenue.toFixed(2)}  |  Ticket promedio: Bs. ${kpis.avgTicket.toFixed(2)}`,
                                        filename: `analytics_${period}`,
                                        columns: [
                                            { header: 'Fecha', dataKey: 'date' },
                                            { header: 'Total (S/)', dataKey: 'total' },
                                            { header: 'N° Ventas', dataKey: 'count' },
                                            { header: 'Efectivo (S/)', dataKey: 'cashTotal' },
                                            { header: 'Tarjeta (S/)', dataKey: 'cardTotal' },
                                        ],
                                        rows: dailySales,
                                    });
                                } finally { setExporting(false); }
                            }}
                            disabled={dailySales.length === 0 || exporting}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 text-sm font-semibold disabled:opacity-40 transition">
                            {exporting ? <><Loader2 className="h-4 w-4 animate-spin" /> PDF…</> : <><FileText className="h-4 w-4" /> PDF</>}
                        </button>
                    </div>
                </div>

                {/* -- Barra de filtros -- */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap gap-4 items-center">
                    {/* Filtro período */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-500 mr-1">Período:</span>
                        {PERIOD_OPTIONS.map(p => (
                            <button key={p.key} onClick={() => setPeriod(p.key)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${period === p.key ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-5 bg-gray-200" />

                    {/* Filtro sucursal — Todas */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-500 mr-1">
                            <Store className="h-3.5 w-3.5 inline mr-0.5" /> Sucursal:
                        </span>
                        <button onClick={() => setBranchId('')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${branchId === '' ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            Todas
                        </button>

                        {/* Botones agrupados por tipo */}
                        {Object.entries(branchTypeGroups).map(([type, bs]) => (
                            bs.length === 1 ? (
                                // Una sola sucursal de ese tipo ? botón directo
                                <button key={bs[0].id} onClick={() => setBranchId(bs[0].id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${branchId === bs[0].id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                    {BRANCH_TYPE_LABELS[type] || type}{' '}{bs[0].name}
                                </button>
                            ) : (
                                // Múltiples ? select mini
                                <select key={type}
                                    value={bs.some(b => b.id === branchId) ? branchId : ''}
                                    onChange={e => setBranchId(e.target.value)}
                                    className={`px-2 py-1.5 rounded-xl text-xs font-semibold border transition focus:outline-none ${bs.some(b => b.id === branchId) ? 'bg-purple-600 text-white border-purple-500' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                    <option value="">{BRANCH_TYPE_LABELS[type] || type}</option>
                                    {bs.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            )
                        ))}
                    </div>
                </div>

                {/* -- Contenido -- */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
                    </div>
                ) : (
                    <>
                        {/* KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            {[
                                { label: 'Ingresos totales', value: `Bs. ${kpis.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-green-600  bg-green-50' },
                                { label: 'Ventas realizadas', value: kpis.totalSales, icon: ShoppingBag, color: 'text-blue-600   bg-blue-50' },
                                { label: 'Ticket promedio', value: `Bs. ${kpis.avgTicket.toFixed(2)}`, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
                                { label: 'Ingresos hoy', value: `Bs. ${kpis.todayRevenue.toFixed(2)}`, icon: Package, color: 'text-orange-600 bg-orange-50' },
                            ].map(({ label, value, icon: Icon, color }) => {
                                const [tc, bg] = color.split(' ');
                                return (
                                    <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                        <div className={`inline-flex p-2.5 rounded-xl ${bg} mb-3`}>
                                            <Icon className={`h-5 w-5 ${tc}`} />
                                        </div>
                                        <p className="text-xs text-gray-500 font-medium">{label}</p>
                                        <p className="text-2xl font-black text-gray-800 mt-1">{value}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Gráficos principales */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                            {/* Ingresos por período */}
                            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h2 className="text-sm font-bold text-gray-800 mb-4">
                                    Ingresos (S/) — {periodLabel}
                                    {selectedBranch && <span className="ml-2 text-xs text-gray-400 font-normal">{selectedBranch.name}</span>}
                                </h2>
                                {dailySales.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={260}>
                                        <BarChart data={dailySales} barSize={period === 'year' ? 32 : 20}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip formatter={(v: any) => [`Bs. ${Number(v).toFixed(2)}`, 'Total']} />
                                            <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-56 text-gray-400">Sin datos para este período</div>
                                )}
                            </div>

                            {/* Métodos de pago */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h2 className="text-sm font-bold text-gray-800 mb-4">Métodos de Pago</h2>
                                {paymentDist.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart>
                                            <Pie data={paymentDist} cx="50%" cy="45%" innerRadius={55} outerRadius={85} dataKey="value">
                                                {paymentDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Pie>
                                            <Legend iconType="circle" iconSize={8} />
                                            <Tooltip formatter={(v: any) => `Bs. ${Number(v).toFixed(2)}`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-56 text-gray-400">Sin datos</div>
                                )}
                            </div>
                        </div>

                        {/* Top productos */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                            <h2 className="text-sm font-bold text-gray-800 mb-4">Top Productos por Ingresos</h2>
                            {topProducts.length > 0 ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={topProducts} layout="vertical" barSize={16}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                                        <XAxis type="number" tick={{ fontSize: 11 }} />
                                        <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} />
                                        <Tooltip formatter={(v: any) => [`Bs. ${Number(v).toFixed(2)}`, 'Ingresos']} />
                                        <Bar dataKey="revenue" fill="#10b981" radius={[0, 6, 6, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center py-12 text-gray-400">Sin datos de productos</div>
                            )}
                        </div>

                        {/* Tendencia cantidad de ventas */}
                        {dailySales.length > 1 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h2 className="text-sm font-bold text-gray-800 mb-4">Cantidad de Ventas — {periodLabel}</h2>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={dailySales}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Ventas" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
