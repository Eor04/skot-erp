'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Package, Search, RefreshCw, AlertTriangle,
    TrendingDown, CheckCircle2, XCircle, Filter, PackagePlus
} from 'lucide-react';

type Stock = {
    id: string;
    currentStock: number;
    minStock: number;
    lastUpdated: string;
    status: string;
    product: {
        id: string; name: string; sku: string; unit: string; type: string; category: string | null;
    };
    branch: { id: string; name: string };
};

type Branch = { id: string; name: string; type: string };

function getSeverity(current: number, min: number): 'ok' | 'low' | 'critical' {
    if (current <= 0) return 'critical';
    if (current < min) return 'low';
    return 'ok';
}

const SEV_CONFIG = {
    critical: { label: 'Sin stock', color: 'bg-red-100 text-red-700', bar: 'bg-red-500', icon: <XCircle className="h-4 w-4 text-red-500" /> },
    low: { label: 'Stock bajo', color: 'bg-yellow-100 text-yellow-700', bar: 'bg-yellow-400', icon: <AlertTriangle className="h-4 w-4 text-yellow-500" /> },
    ok: { label: 'Normal', color: 'bg-green-100 text-green-700', bar: 'bg-green-500', icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
};

function StockBar({ current, min, max = null }: { current: number; min: number; max: number | null }) {
    const cap = max ?? Math.max(min * 3, current * 1.5, 1);
    const pct = Math.min((current / cap) * 100, 100);
    const sev = getSeverity(current, min);
    return (
        <div className="w-full bg-white/5 border border-white/10 backdrop-blur-md/10 rounded-full h-2 mt-1">
            <div className={`h-2 rounded-full transition-all ${SEV_CONFIG[sev].bar}`} style={{ width: `${pct}%` }} />
        </div>
    );
}

export default function FactoryMaterialsPage() {
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpd, setLastUpd] = useState<Date | null>(null);
    const [branchId, setBranchId] = useState('');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'critical' | 'low' | 'ok'>('all');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ type: 'RAW_MATERIAL', limit: '200' });
            if (branchId) params.set('branchId', branchId);
            const [sRes, bRes] = await Promise.all([
                fetch(`/api/inventory/stock?${params}`).then(r => r.json()),
                fetch('/api/admin/branches').then(r => r.json()),
            ]);
            if (sRes.success) { setStocks(sRes.data); setLastUpd(new Date()); }
            if (bRes.success) {
                const fabrica = bRes.data.filter((b: Branch) => b.type === 'FABRICA');
                setBranches(fabrica);
                if (!branchId && fabrica.length === 1) setBranchId(fabrica[0].id);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [branchId]);

    useEffect(() => { load(); }, [load]);

    const filtered = stocks.filter(s => {
        if (search && !s.product.name.toLowerCase().includes(search.toLowerCase()) &&
            !s.product.sku.toLowerCase().includes(search.toLowerCase())) return false;
        const sev = getSeverity(s.currentStock, s.minStock);
        if (filter !== 'all' && sev !== filter) return false;
        return true;
    });

    const critical = stocks.filter(s => getSeverity(s.currentStock, s.minStock) === 'critical').length;
    const low = stocks.filter(s => getSeverity(s.currentStock, s.minStock) === 'low').length;
    const ok = stocks.filter(s => getSeverity(s.currentStock, s.minStock) === 'ok').length;

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: '56px 100px' }} />
            </div>
            <div className="relative z-10 h-full w-full">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <Link href="/factory" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Fábrica
                    </Link>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                        <h1 className="text-3xl font-bold text-white/90 flex items-center gap-3">
                                <Package className="h-7 w-7 text-blue-600" /> Inventario de Materia Prima
                            </h1>
                            <p className="text-white/60 text-sm mt-1">
                                Stock de ingredientes y materiales en fábrica
                                {lastUpd && <span className="ml-2 text-white/40">· Actualizado {lastUpd.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</span>}
                            </p>
                        </div>
                        <button onClick={load} disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 backdrop-blur-md border border-white/10 rounded-xl text-sm text-white/70 hover:bg-white/5 transition disabled:opacity-50">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
                        </button>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Sin stock', val: critical, color: 'bg-red-50 border-red-200', tc: 'text-red-700', key: 'critical' },
                        { label: 'Stock bajo', val: low, color: 'bg-yellow-50 border-yellow-200', tc: 'text-yellow-700', key: 'low' },
                        { label: 'Normal', val: ok, color: 'bg-green-50 border-green-200', tc: 'text-green-700', key: 'ok' },
                    ].map(k => (
                        <button key={k.key} onClick={() => setFilter(filter === k.key as any ? 'all' : k.key as any)}
                            className={`border rounded-2xl p-4 text-left transition ${k.color} ${filter === k.key ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}>
                            <p className="text-xs font-medium text-white/60">{k.label}</p>
                            <p className={`text-3xl font-black mt-1 ${k.tc}`}>{k.val}</p>
                        </button>
                    ))}
                </div>

                {/* Sucursal selector + búsqueda */}
                <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-4 flex flex-wrap gap-3 items-center">
                    {branches.length > 1 && (
                        <select value={branchId} onChange={e => setBranchId(e.target.value)}
                            className="border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                            <option value="">Todas las fábricas</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    )}
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por nombre o SKU…"
                            className="pl-9 pr-3 py-2 border border-white/10 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    {filter !== 'all' && (
                        <button onClick={() => setFilter('all')}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                            <Filter className="h-3.5 w-3.5" /> Quitar filtro
                        </button>
                    )}
                </div>

                {/* Tabla / lista */}
                {loading ? (
                    <div className="text-center py-20 text-white/40">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" /> Cargando…
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 text-white/40">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No hay materiales con esas condiciones</p>
                        {!branchId && <p className="text-xs mt-1">Seleccioná una sucursal tipo Fábrica</p>}
                    </div>
                ) : (
                    <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="text-left px-5 py-3.5 font-semibold text-white/70">Material</th>
                                    <th className="text-left px-5 py-3.5 font-semibold text-white/70 hidden sm:table-cell">Categoría</th>
                                    <th className="text-right px-5 py-3.5 font-semibold text-white/70">Stock actual</th>
                                    <th className="text-right px-5 py-3.5 font-semibold text-white/70 hidden md:table-cell">Mínimo</th>
                                    <th className="px-5 py-3.5 font-semibold text-white/70 w-32 hidden md:table-cell">Nivel</th>
                                    <th className="text-center px-5 py-3.5 font-semibold text-white/70">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(s => {
                                    const sev = getSeverity(s.currentStock, s.minStock);
                                    const cfg = SEV_CONFIG[sev];
                                    return (
                                        <tr key={s.id} className={`border-b border-white/10 hover:bg-white/5 ${sev === 'critical' ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-5 py-3.5">
                                                <p className="font-semibold text-white/90">{s.product.name}</p>
                                                <p className="text-xs text-white/40 font-mono">{s.product.sku}</p>
                                            </td>
                                            <td className="px-5 py-3.5 text-white/60 text-xs hidden sm:table-cell">
                                                {s.product.category || '—'}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <span className={`font-bold text-base ${sev === 'critical' ? 'text-red-600' : 'text-white/90'}`}>
                                                    {s.currentStock.toFixed(s.product.unit === 'KG' ? 2 : 0)}
                                                </span>
                                                <span className="text-xs text-white/40 ml-1">{s.product.unit}</span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right text-white/60 text-sm hidden md:table-cell">
                                                {s.minStock} {s.product.unit}
                                            </td>
                                            <td className="px-5 py-3.5 hidden md:table-cell">
                                                <StockBar current={s.currentStock} min={s.minStock} max={null} />
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                                                    {cfg.icon} {cfg.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="px-5 py-3 text-xs text-white/40 bg-white/5 border-t">
                            {filtered.length} material{filtered.length !== 1 ? 'es' : ''}
                        </div>
                    </div>
                )}

                {/* Links de acciones */}
                <div className="flex flex-wrap justify-center gap-4">
                    <Link href="/factory/receiving"
                        className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-semibold bg-green-50 hover:bg-green-100 px-4 py-2 rounded-xl transition">
                        <PackagePlus className="h-4 w-4" />
                        Registrar entrada de mercancía
                    </Link>
                    <Link href="/inventory/adjustments"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                        <TrendingDown className="h-4 w-4" />
                        Ajuste manual de stock →
                    </Link>
                </div>
            </div>
        </div>
    </div>
        );
}
