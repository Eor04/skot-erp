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
    critical: { label: 'Sin stock', color: 'bg-red-500/20 text-red-400 border border-red-500/30', bar: 'bg-red-500', icon: <XCircle className="h-4 w-4 text-red-400" /> },
    low:      { label: 'Stock bajo', color: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30', bar: 'bg-yellow-400', icon: <AlertTriangle className="h-4 w-4 text-yellow-400" /> },
    ok:       { label: 'Normal', color: 'bg-green-500/20 text-green-400 border border-green-500/30', bar: 'bg-green-500', icon: <CheckCircle2 className="h-4 w-4 text-green-400" /> },
};

// Labels legibles por tipo de producto
const TYPE_LABELS: Record<string, string> = {
    '': 'Todo',
    'RAW_MATERIAL': 'Materia Prima',
    'BURGER': 'Hamburguesas',
    'BURGER_EXTRA': 'Extras',
    'ACAI_BASE': 'Base Açaí',
    'ACAI_TOPPING': 'Toppings',
    'BEVERAGE': 'Bebidas',
    'PACKAGING': 'Empaques',
};

function StockBar({ current, min }: { current: number; min: number }) {
    const cap = Math.max(min * 3, current * 1.5, 1);
    const pct = Math.min((current / cap) * 100, 100);
    const sev = getSeverity(current, min);
    return (
        <div className="w-full bg-white/5 rounded-full h-2 mt-1">
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
    const [typeFilter, setTypeFilter] = useState(''); // '' = todos los tipos
    const [availableTypes, setAvailableTypes] = useState<string[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            // Sin filtro de tipo — traemos todo el inventario de la sucursal
            const params = new URLSearchParams({ limit: '500' });
            if (branchId) params.set('branchId', branchId);

            const [sRes, bRes] = await Promise.all([
                fetch(`/api/inventory/stock?${params}`).then(r => r.json()),
                fetch('/api/admin/branches').then(r => r.json()),
            ]);
            if (sRes.success) {
                setStocks(sRes.data);
                setLastUpd(new Date());
                // Detectar qué tipos de producto existen en este inventario
                const types = [...new Set<string>(sRes.data.map((s: Stock) => s.product.type))].sort();
                setAvailableTypes(types);
            }
            if (bRes.success) {
                // Mostrar todas las sucursales, no solo FABRICA
                setBranches(bRes.data);
                if (!branchId && bRes.data.length === 1) setBranchId(bRes.data[0].id);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [branchId]);

    useEffect(() => { load(); }, [load]);

    const filtered = stocks.filter(s => {
        // Filtro por tipo de producto
        if (typeFilter && s.product.type !== typeFilter) return false;
        // Filtro de búsqueda
        if (search && !s.product.name.toLowerCase().includes(search.toLowerCase()) &&
            !s.product.sku.toLowerCase().includes(search.toLowerCase())) return false;
        // Filtro por estado
        const sev = getSeverity(s.currentStock, s.minStock);
        if (filter !== 'all' && sev !== filter) return false;
        return true;
    });

    const critical = stocks.filter(s => getSeverity(s.currentStock, s.minStock) === 'critical').length;
    const low      = stocks.filter(s => getSeverity(s.currentStock, s.minStock) === 'low').length;
    const ok       = stocks.filter(s => getSeverity(s.currentStock, s.minStock) === 'ok').length;

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
            </div>
            <div className="relative z-10">
            <div className="max-w-5xl mx-auto space-y-6 px-4 py-8">

                {/* Header */}
                <div>
                    <Link href="/factory" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Fábrica
                    </Link>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h1 className="text-3xl font-bold text-white/90 flex items-center gap-3">
                                <Package className="h-7 w-7 text-blue-400" /> Inventario Completo
                            </h1>
                            <p className="text-white/60 text-sm mt-1">
                                Todo el stock de la sucursal seleccionada
                                {lastUpd && <span className="ml-2 text-white/40">· Actualizado {lastUpd.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</span>}
                            </p>
                        </div>
                        <button onClick={load} disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/70 hover:bg-white/10 transition disabled:opacity-50">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
                        </button>
                    </div>
                </div>

                {/* KPIs de estado */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Sin stock', val: critical, color: 'bg-red-500/10 border-red-500/30', tc: 'text-red-400', key: 'critical' },
                        { label: 'Stock bajo', val: low,      color: 'bg-yellow-500/10 border-yellow-500/30', tc: 'text-yellow-300', key: 'low' },
                        { label: 'Normal',     val: ok,       color: 'bg-green-500/10 border-green-500/30', tc: 'text-green-400', key: 'ok' },
                    ].map(k => (
                        <button key={k.key} onClick={() => setFilter(filter === k.key as any ? 'all' : k.key as any)}
                            className={`border rounded-2xl p-4 text-left transition ${k.color} ${filter === k.key ? 'ring-2 ring-white/30' : 'hover:bg-white/5'}`}>
                            <p className="text-xs font-medium text-white/60">{k.label}</p>
                            <p className={`text-3xl font-black mt-1 ${k.tc}`}>{k.val}</p>
                        </button>
                    ))}
                </div>

                {/* Filtros: sucursal + búsqueda */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-wrap gap-3 items-center">
                    {/* Selector de sucursal — todas, no solo fábricas */}
                    {branches.length > 1 && (
                        <select value={branchId} onChange={e => setBranchId(e.target.value)}
                            className="bg-black/30 text-white border border-white/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                            <option value="" className="bg-gray-900">Todas las sucursales</option>
                            {branches.map(b => <option key={b.id} value={b.id} className="bg-gray-900">{b.name} ({b.type})</option>)}
                        </select>
                    )}
                    {/* Buscador */}
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por nombre o SKU…"
                            className="pl-9 pr-3 py-2 bg-black/30 text-white border border-white/20 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-white/30" />
                    </div>
                    {filter !== 'all' && (
                        <button onClick={() => setFilter('all')}
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium">
                            <Filter className="h-3.5 w-3.5" /> Quitar filtro estado
                        </button>
                    )}
                </div>

                {/* Pestañas por TIPO de producto */}
                <div className="flex flex-wrap gap-2">
                    {['', ...availableTypes].map(t => (
                        <button
                            key={t || 'all'}
                            onClick={() => setTypeFilter(t)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                                typeFilter === t
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                                    : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            {TYPE_LABELS[t] || t}
                            <span className="ml-1.5 text-[10px] opacity-70">
                                ({stocks.filter(s => t === '' ? true : s.product.type === t).length})
                            </span>
                        </button>
                    ))}
                </div>

                {/* Tabla */}
                {loading ? (
                    <div className="text-center py-20 text-white/40">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" /> Cargando…
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 text-white/40">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No hay productos con esas condiciones</p>
                        {!branchId && <p className="text-xs mt-1">Seleccioná una sucursal para ver su inventario</p>}
                    </div>
                ) : (
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="text-left px-5 py-3.5 font-semibold text-white/70">Producto</th>
                                    <th className="text-left px-4 py-3.5 font-semibold text-white/70 hidden sm:table-cell">Tipo</th>
                                    <th className="text-left px-4 py-3.5 font-semibold text-white/70 hidden sm:table-cell">Categoría</th>
                                    <th className="text-right px-5 py-3.5 font-semibold text-white/70">Stock actual</th>
                                    <th className="text-right px-5 py-3.5 font-semibold text-white/70 hidden md:table-cell">Mínimo</th>
                                    <th className="px-5 py-3.5 font-semibold text-white/70 w-28 hidden md:table-cell">Nivel</th>
                                    <th className="text-center px-5 py-3.5 font-semibold text-white/70">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(s => {
                                    const sev = getSeverity(s.currentStock, s.minStock);
                                    const cfg = SEV_CONFIG[sev];
                                    return (
                                        <tr key={s.id} className={`border-b border-white/10 hover:bg-white/5 transition ${sev === 'critical' ? 'bg-red-500/5' : ''}`}>
                                            <td className="px-5 py-3.5">
                                                <p className="font-semibold text-white/90">{s.product.name}</p>
                                                <p className="text-xs text-white/40 font-mono">{s.product.sku}</p>
                                            </td>
                                            <td className="px-4 py-3.5 hidden sm:table-cell">
                                                <span className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
                                                    {TYPE_LABELS[s.product.type] || s.product.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-white/60 text-xs hidden sm:table-cell">
                                                {s.product.category || '—'}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <span className={`font-bold text-base ${sev === 'critical' ? 'text-red-400' : 'text-white/90'}`}>
                                                    {s.currentStock % 1 === 0 ? s.currentStock : s.currentStock.toFixed(2)}
                                                </span>
                                                <span className="text-xs text-white/40 ml-1">{s.product.unit}</span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right text-white/60 text-sm hidden md:table-cell">
                                                {s.minStock} {s.product.unit}
                                            </td>
                                            <td className="px-5 py-3.5 hidden md:table-cell">
                                                <StockBar current={s.currentStock} min={s.minStock} />
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
                        <div className="px-5 py-3 text-xs text-white/40 bg-white/5 border-t border-white/10">
                            Mostrando {filtered.length} de {stocks.length} productos
                            {typeFilter && ` · Tipo: ${TYPE_LABELS[typeFilter] || typeFilter}`}
                        </div>
                    </div>
                )}

                {/* Links de acciones */}
                <div className="flex flex-wrap justify-center gap-4">
                    <Link href="/factory/receiving"
                        className="inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300 font-semibold bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 px-4 py-2 rounded-xl transition">
                        <PackagePlus className="h-4 w-4" />
                        Registrar entrada de mercancía
                    </Link>
                    <Link href="/inventory/movements"
                        className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-4 py-2 rounded-xl transition">
                        <TrendingDown className="h-4 w-4" />
                        Ver Kardex completo →
                    </Link>
                </div>
            </div>
        </div>
        </div>
    );
}
