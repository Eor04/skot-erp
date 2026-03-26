'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Search, Filter, Download, TrendingUp,
    DollarSign, CreditCard, ArrowRightLeft, Loader2, ShoppingBag, FileText, FileSpreadsheet
} from 'lucide-react';
import { downloadCSV, downloadPDF, fmt } from '@/lib/utils/export';

interface Branch { id: string; name: string; }
interface Sale {
    id: string;
    saleNumber: string;
    totalAmount: number;
    paymentMethod: string;
    salesChannel: string;
    createdAt: string;
    branch: { name: string; type: string };
    user: { name: string };
    items: { product: { name: string }; quantity: number; unitPrice: number; subtotal: number }[];
    discounts: { type: string; value: number }[];
}
interface Summary {
    totalSales: number;
    totalAmount: number;
    cashTotal: number;
    cardTotal: number;
    transferTotal: number;
}

const PAYMENT_ICONS: Record<string, JSX.Element> = {
    CASH: <DollarSign className="h-3.5 w-3.5" />,
    CARD: <CreditCard className="h-3.5 w-3.5" />,
    TRANSFER: <ArrowRightLeft className="h-3.5 w-3.5" />,
    MIXED: <ShoppingBag className="h-3.5 w-3.5" />,
};
const PAYMENT_LABELS: Record<string, string> = {
    CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', MIXED: 'Mixto',
};
const PAYMENT_COLORS: Record<string, string> = {
    CASH: 'bg-green-100 text-green-700', CARD: 'bg-blue-100 text-blue-700',
    TRANSFER: 'bg-purple-100 text-purple-700', MIXED: 'bg-orange-100 text-orange-700',
};

export default function SalesPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<string | null>(null);

    // Filtros
    const [filters, setFilters] = useState({
        branchId: '',
        from: new Date().toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
        paymentMethod: '',
    });

    useEffect(() => {
        fetch('/api/admin/branches').then(r => r.json()).then(d => {
            if (d.success) setBranches(d.data);
        });
        loadSales();
    }, []);

    const loadSales = async (f = filters) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (f.branchId) params.set('branchId', f.branchId);
            if (f.from) params.set('from', f.from);
            if (f.to) params.set('to', f.to);
            if (f.paymentMethod) params.set('paymentMethod', f.paymentMethod);
            params.set('limit', '100');

            const res = await fetch(`/api/admin/sales?${params}`);
            const data = await res.json();
            if (data.success) {
                setSales(data.data);
                setSummary(data.summary);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = () => loadSales(filters);

    const filtered = sales.filter(s =>
        s.saleNumber.toLowerCase().includes(search.toLowerCase()) ||
        s.branch.name.toLowerCase().includes(search.toLowerCase()) ||
        s.user.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleExportCSV = () => {
        const rows = filtered.map(s => ({
            'N° Venta': s.saleNumber,
            'Sucursal': s.branch.name,
            'Vendedor': s.user.name,
            'Método': fmt.paymentMethod(s.paymentMethod),
            'Total (S/)': Number(s.totalAmount).toFixed(2),
            'Fecha': fmt.date(s.createdAt),
        }));
        downloadCSV(rows, `ventas_${filters.from}_${filters.to}`);
    };

    const handleExportPDF = async () => {
        setExporting(true);
        try {
            await downloadPDF({
                title: 'Historial de Ventas',
                subtitle: `Período: ${fmt.dateShort(filters.from + 'T12:00:00')} — ${fmt.dateShort(filters.to + 'T12:00:00')}`,
                filename: `ventas_${filters.from}_${filters.to}`,
                orientation: 'landscape',
                columns: [
                    { header: 'N° Venta', dataKey: 'saleNumber' },
                    { header: 'Sucursal', dataKey: 'branch' },
                    { header: 'Vendedor', dataKey: 'user' },
                    { header: 'Método', dataKey: 'method' },
                    { header: 'Total (S/)', dataKey: 'total' },
                    { header: 'Fecha', dataKey: 'date' },
                ],
                rows: filtered.map(s => ({
                    saleNumber: s.saleNumber,
                    branch: s.branch.name,
                    user: s.user.name,
                    method: fmt.paymentMethod(s.paymentMethod),
                    total: `Bs. ${Number(s.totalAmount).toFixed(2)}`,
                    date: fmt.date(s.createdAt),
                })),
            });
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver a Admin
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <TrendingUp className="h-8 w-8 text-indigo-600" /> Historial de Ventas
                        </h1>
                    </div>
                    {/* Botones de exportación */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleExportCSV}
                            disabled={filtered.length === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 text-sm font-semibold disabled:opacity-40 transition"
                        >
                            <FileSpreadsheet className="h-4 w-4" /> CSV
                        </button>
                        <button
                            onClick={handleExportPDF}
                            disabled={filtered.length === 0 || exporting}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 text-sm font-semibold disabled:opacity-40 transition"
                        >
                            {exporting
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Generando…</>
                                : <><FileText className="h-4 w-4" /> PDF</>
                            }
                        </button>
                    </div>
                </div>

                {/* Filtros */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Sucursal</label>
                            <select
                                value={filters.branchId}
                                onChange={e => setFilters(f => ({ ...f, branchId: e.target.value }))}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            >
                                <option value="">Todas</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Desde</label>
                            <input type="date" value={filters.from}
                                onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Hasta</label>
                            <input type="date" value={filters.to}
                                onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Método de pago</label>
                            <select
                                value={filters.paymentMethod}
                                onChange={e => setFilters(f => ({ ...f, paymentMethod: e.target.value }))}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            >
                                <option value="">Todos</option>
                                <option value="CASH">Efectivo</option>
                                <option value="CARD">Tarjeta</option>
                                <option value="TRANSFER">Transferencia</option>
                                <option value="MIXED">Mixto</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button onClick={handleFilter}
                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                            >
                                <Filter className="h-4 w-4" /> Filtrar
                            </button>
                        </div>
                    </div>
                </div>

                {/* KPIs */}
                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Total ventas', value: summary.totalSales, isCurrency: false, color: 'bg-indigo-50 text-indigo-700', icon: TrendingUp },
                            { label: 'Ingresos totales', value: summary.totalAmount, isCurrency: true, color: 'bg-green-50 text-green-700', icon: DollarSign },
                            { label: 'Efectivo', value: summary.cashTotal, isCurrency: true, color: 'bg-yellow-50 text-yellow-700', icon: DollarSign },
                            { label: 'Tarjeta', value: summary.cardTotal, isCurrency: true, color: 'bg-blue-50 text-blue-700', icon: CreditCard },
                        ].map(({ label, value, isCurrency, color, icon: Icon }) => (
                            <div key={label} className={`${color} rounded-2xl p-4`}>
                                <p className="text-xs font-medium opacity-70">{label}</p>
                                <p className="text-2xl font-black mt-1">
                                    {isCurrency ? `Bs. ${Number(value).toFixed(2)}` : value}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Buscador */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input
                        type="text" placeholder="Buscar por número de venta, sucursal o vendedor…"
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                </div>

                {/* Tabla */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-6 py-4 font-semibold text-gray-600">N° Venta</th>
                                    <th className="text-left px-6 py-4 font-semibold text-gray-600">Sucursal</th>
                                    <th className="text-left px-6 py-4 font-semibold text-gray-600">Vendedor</th>
                                    <th className="text-left px-6 py-4 font-semibold text-gray-600">Método</th>
                                    <th className="text-right px-6 py-4 font-semibold text-gray-600">Total</th>
                                    <th className="text-left px-6 py-4 font-semibold text-gray-600">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(sale => (
                                    <>
                                        <tr
                                            key={sale.id}
                                            onClick={() => setExpanded(expanded === sale.id ? null : sale.id)}
                                            className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                                        >
                                            <td className="px-6 py-4 font-mono text-xs text-gray-600">{sale.saleNumber}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{sale.branch.name}</td>
                                            <td className="px-6 py-4 text-gray-600">{sale.user.name}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${PAYMENT_COLORS[sale.paymentMethod] || 'bg-gray-100 text-gray-600'}`}>
                                                    {PAYMENT_ICONS[sale.paymentMethod]}
                                                    {PAYMENT_LABELS[sale.paymentMethod]}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-800">Bs. {sale.totalAmount.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-gray-500 text-xs">{new Date(sale.createdAt).toLocaleString('es-PE')}</td>
                                        </tr>
                                        {expanded === sale.id && (
                                            <tr key={`${sale.id}-detail`} className="bg-indigo-50/50">
                                                <td colSpan={6} className="px-6 py-4">
                                                    <p className="text-xs font-semibold text-gray-500 mb-2">Detalle de la venta:</p>
                                                    <div className="space-y-1">
                                                        {sale.items.map((item, i) => (
                                                            <div key={i} className="flex justify-between text-xs text-gray-700">
                                                                <span>{item.product.name} × {item.quantity}</span>
                                                                <span className="font-medium">Bs. {item.subtotal.toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                        {sale.discounts.length > 0 && (
                                                            <div className="flex justify-between text-xs text-red-600 font-medium border-t border-red-100 pt-1 mt-1">
                                                                <span>Descuento ({sale.discounts[0].value}{sale.discounts[0].type === 'PERCENTAGE' ? '%' : ' S/'})</span>
                                                                <span>-</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                                            <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-25" />
                                            No se encontraron ventas con esos filtros
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <div className="px-6 py-3 text-xs text-gray-400 bg-gray-50 border-t">
                            {filtered.length} venta{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
