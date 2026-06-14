'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, ArrowUpCircle, ArrowDownCircle, RefreshCw,
    ArrowRightLeft, Factory, Trash2, Wrench, Search, Filter, Download
} from 'lucide-react';

/* ──────────── Types ──────────── */
type Movement = {
    id: string; type: string; quantity: number;
    previousStock: number; newStock: number;
    reference: string | null; notes: string | null;
    createdBy: string; createdAt: string;
    product: { id: string; name: string; sku: string; unit: string };
    branch: { id: string; name: string };
};

/* ──────────── Config de tipos ──────────── */
const TYPE_CONFIG: Record<string, { label: string; color: string; badge: string; icon: React.ReactNode }> = {
    ENTRADA: { label: 'Entrada', badge: 'bg-green-100 text-green-800', color: 'text-green-600', icon: <ArrowUpCircle className="h-4 w-4" /> },
    SALIDA: { label: 'Salida', badge: 'bg-red-100 text-red-800', color: 'text-red-600', icon: <ArrowDownCircle className="h-4 w-4" /> },
    TRANSFERENCIA: { label: 'Transferencia', badge: 'bg-blue-100 text-blue-800', color: 'text-blue-600', icon: <ArrowRightLeft className="h-4 w-4" /> },
    PRODUCCION: { label: 'Producción', badge: 'bg-purple-100 text-purple-800', color: 'text-purple-600', icon: <Factory className="h-4 w-4" /> },
    MERMA: { label: 'Merma', badge: 'bg-orange-100 text-orange-800', color: 'text-orange-600', icon: <Trash2 className="h-4 w-4" /> },
    AJUSTE: { label: 'Ajuste', badge: 'bg-white/10 text-white/80', color: 'text-white/70', icon: <Wrench className="h-4 w-4" /> },
};

const TODAY = new Date().toISOString().split('T')[0];
const WEEK_START = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];

export default function KardexPage() {
    const [movements, setMovements] = useState<Movement[]>([]);
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
    const [products, setProducts] = useState<{ id: string; name: string; sku: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<{ type: string; count: number; totalQty: number }[]>([]);

    const [from, setFrom] = useState(WEEK_START);
    const [to, setTo] = useState(TODAY);
    const [branchId, setBranchId] = useState('');
    const [productId, setProductId] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [search, setSearch] = useState('');

    function loadData() {
        setLoading(true);
        const params = new URLSearchParams({
            from, to, limit: '300',
            ...(branchId && { branchId }),
            ...(productId && { productId }),
            ...(typeFilter && { type: typeFilter }),
        });
        Promise.all([
            fetch(`/api/inventory/kardex?${params}`).then(r => r.json()),
            fetch('/api/admin/branches').then(r => r.json()),
            fetch('/api/admin/products').then(r => r.json()),
        ]).then(([k, b, p]) => {
            if (k.success) { setMovements(k.data); setSummary(k.summary.byType); }
            if (b.success) setBranches(b.data);
            if (p.success) setProducts(p.data);
        }).finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, []);

    function exportCSV() {
        const rows = [
            ['Fecha', 'Sucursal', 'Producto', 'SKU', 'Tipo', 'Cantidad', 'Stock Anterior', 'Stock Nuevo', 'Referencia', 'Registrado por'],
            ...filtered.map(m => [
                m.createdAt.split('T')[0],
                m.branch.name, m.product.name, m.product.sku,
                TYPE_CONFIG[m.type]?.label || m.type,
                m.quantity.toString(), m.previousStock.toString(), m.newStock.toString(),
                m.reference || '', m.createdBy,
            ]),
        ];
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `kardex-${from}-${to}.csv` });
        a.click(); URL.revokeObjectURL(a.href);
    }

    const filtered = movements.filter(m =>
        !search || m.product.name.toLowerCase().includes(search.toLowerCase()) ||
        m.product.sku.toLowerCase().includes(search.toLowerCase()) ||
        (m.reference || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen relative overflow-hidden p-6 md:p-8" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: '56px 100px' }} />
            </div>
            <div className="relative z-10 max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <button onClick={() => window.history.back()} className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver atrás
                        </button>
                        <h1 className="text-3xl font-bold text-white/90 flex items-center gap-3">
                            <RefreshCw className="h-7 w-7 text-indigo-600" /> Kardex de Movimientos
                        </h1>
                        <p className="text-white/60 mt-1 text-sm">Historial completo de entradas, salidas, mermas y ajustes de stock</p>
                    </div>
                    <button onClick={exportCSV} disabled={loading || !filtered.length}
                        className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-md border border-white/10 hover:bg-white/5 text-white/80 px-4 py-2.5 rounded-xl font-medium transition text-sm shadow-sm disabled:opacity-40">
                        <Download className="h-4 w-4" /> Exportar CSV
                    </button>
                </div>

                {/* Filtros */}
                <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-5 space-y-4">
                    <div className="flex gap-2 flex-wrap">
                        {[
                            { label: 'Hoy', from: TODAY, to: TODAY },
                            { label: '7 días', from: WEEK_START, to: TODAY },
                            { label: '15 días', from: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0], to: TODAY },
                            { label: 'Este mes', from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], to: TODAY },
                        ].map(q => (
                            <button key={q.label} onClick={() => { setFrom(q.from); setTo(q.to); }}
                                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 font-medium text-white/70 transition">
                                {q.label}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-white/60 mb-1 block">Desde</label>
                            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                                className="w-full border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-white/60 mb-1 block">Hasta</label>
                            <input type="date" value={to} onChange={e => setTo(e.target.value)}
                                className="w-full border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-white/60 mb-1 block">Sucursal</label>
                            <select value={branchId} onChange={e => setBranchId(e.target.value)}
                                className="w-full border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                                <option value="">Todas</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-white/60 mb-1 block">Tipo</label>
                            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                                className="w-full border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                                <option value="">Todos</option>
                                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-white/60 mb-1 block">Producto</label>
                            <select value={productId} onChange={e => setProductId(e.target.value)}
                                className="w-full border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                                <option value="">Todos</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                            <input type="text" placeholder="Buscar por producto, SKU o referencia…" value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                        </div>
                        <button onClick={loadData}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
                            <Filter className="h-4 w-4" /> Aplicar
                        </button>
                    </div>
                </div>

                {/* Resumen por tipo */}
                {!loading && summary.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {summary.map(s => {
                            const cfg = TYPE_CONFIG[s.type] || { label: s.type, badge: 'bg-white/10 text-white/80', icon: null, color: 'text-white/70' };
                            return (
                                <div key={s.type} className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-4 flex flex-col gap-1 cursor-pointer hover:ring-2 hover:ring-indigo-200 transition"
                                    onClick={() => setTypeFilter(s.type === typeFilter ? '' : s.type)}>
                                    <div className="flex items-center gap-1.5">
                                        <span className={cfg.color}>{cfg.icon}</span>
                                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${cfg.badge}`}>{cfg.label}</span>
                                    </div>
                                    <p className="text-xl font-black text-white/90">{s.count}</p>
                                    <p className="text-xs text-white/40">movimientos</p>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Tabla */}
                <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                        <h2 className="font-bold text-white/90">Movimientos</h2>
                        {!loading && <span className="text-sm text-white/40">{filtered.length} registros</span>}
                    </div>
                    {loading ? (
                        <div className="text-center py-16 text-white/40">Cargando movimientos…</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16 text-white/40">
                            <RefreshCw className="h-10 w-10 mx-auto mb-2 opacity-30" />
                            <p>No se encontraron movimientos en el período</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase whitespace-nowrap">Fecha / Hora</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase">Sucursal</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase">Producto</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase">Tipo</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-white/60 uppercase">Cant.</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-white/60 uppercase">Stock Ant.</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-white/60 uppercase">Stock Nuevo</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase">Referencia</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase">Registrado por</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(m => {
                                        const cfg = TYPE_CONFIG[m.type] || { label: m.type, badge: 'bg-white/10 text-white/80', icon: null, color: 'text-white/70' };
                                        const isEntry = ['ENTRADA', 'PRODUCCION'].includes(m.type);
                                        const isExit = ['SALIDA', 'MERMA'].includes(m.type);
                                        return (
                                            <tr key={m.id} className="border-b border-gray-50 hover:bg-white/5 transition">
                                                <td className="px-4 py-3 text-white/60 whitespace-nowrap text-xs">
                                                    <p>{new Date(m.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}</p>
                                                    <p className="text-white/40">{new Date(m.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</p>
                                                </td>
                                                <td className="px-4 py-3 text-white/80 text-xs">{m.branch.name}</td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-white/90 text-xs">{m.product.name}</p>
                                                    <p className="font-mono text-white/40 text-xs">{m.product.sku}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>
                                                        {cfg.icon} {cfg.label}
                                                    </span>
                                                </td>
                                                <td className={`px-4 py-3 text-right font-bold ${isEntry ? 'text-green-600' : isExit ? 'text-red-600' : 'text-white/80'}`}>
                                                    {isEntry ? '+' : isExit ? '−' : '±'}{Math.abs(m.quantity)} {m.product.unit}
                                                </td>
                                                <td className="px-4 py-3 text-right text-white/70 text-xs">{m.previousStock.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right font-semibold text-white/90 text-xs">{m.newStock.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-xs text-white/60 max-w-[160px]">
                                                    <p className="truncate">{m.reference || '—'}</p>
                                                    {m.notes && <p className="text-white/40 truncate">{m.notes}</p>}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-white/60">{m.createdBy}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
