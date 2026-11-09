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
    critical: { label: 'Sin stock', color: 'bg-[var(--status-error-bg)] text-danger', bar: 'bg-danger', icon: <XCircle className="h-4 w-4" /> },
    low:      { label: 'Stock bajo', color: 'bg-[var(--status-warning-bg)] text-warning', bar: 'bg-warning', icon: <AlertTriangle className="h-4 w-4" /> },
    ok:       { label: 'Normal', color: 'bg-[var(--status-success-bg)] text-success', bar: 'bg-success', icon: <CheckCircle2 className="h-4 w-4" /> },
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
        <div className="mt-1 h-2 w-full rounded-full bg-canvas">
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

    return <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4"><div>
            <Link href="/factory" className="mb-4 inline-flex min-h-11 items-center gap-2 font-semibold text-brand hover:underline"><ArrowLeft size={18} aria-hidden="true" /> Volver a fábrica</Link>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted"><Package size={16} aria-hidden="true" /> Fábrica <span aria-hidden="true">›</span> Materiales</div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">Inventario completo</h1>
            <p className="mt-2 text-muted">Stock de la sucursal seleccionada{lastUpd && <span className="ml-2 text-sm">· Actualizado {lastUpd.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</span>}</p>
        </div><button type="button" onClick={load} disabled={loading} className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-surface px-4 font-semibold hover:bg-canvas disabled:opacity-50"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Actualizar</button></header>
        <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Resumen de stock">{([
            { label: 'Sin stock', val: critical, key: 'critical' as const, color: 'text-danger' },
            { label: 'Stock bajo', val: low, key: 'low' as const, color: 'text-warning' },
            { label: 'Normal', val: ok, key: 'ok' as const, color: 'text-success' },
        ]).map(k => <button key={k.key} type="button" aria-pressed={filter === k.key} onClick={() => setFilter(filter === k.key ? 'all' : k.key)} className={`min-h-24 rounded-xl border bg-surface p-3 text-left sm:p-4 ${filter === k.key ? 'border-brand' : 'border-line-subtle'}`}><span className="block text-xs text-muted sm:text-sm">{k.label}</span><strong className={`mt-2 block font-display text-2xl tabular-nums sm:text-3xl ${k.color}`}>{k.val}</strong></button>)}</div>
        <section className="rounded-xl border border-line-subtle bg-surface p-4" aria-label="Filtros de inventario"><div className="grid gap-3 sm:grid-cols-2">
            {branches.length > 1 && <div><label htmlFor="materials-branch" className="mb-1 block text-sm font-semibold">Sucursal</label><select id="materials-branch" value={branchId} onChange={e => setBranchId(e.target.value)} className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-ink"><option value="">Todas las sucursales</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.type})</option>)}</select></div>}
            <div><label htmlFor="materials-search" className="mb-1 flex items-center gap-2 text-sm font-semibold"><Search size={16} aria-hidden="true" /> Buscar</label><input id="materials-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre o SKU" className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-ink placeholder:text-muted" /></div>
        </div>{filter !== 'all' && <button type="button" onClick={() => setFilter('all')} className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-brand hover:underline"><Filter size={16} aria-hidden="true" /> Quitar filtro de estado</button>}</section>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo de producto">{['', ...availableTypes].map(type => <button key={type || 'all'} type="button" aria-pressed={typeFilter === type} onClick={() => setTypeFilter(type)} className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold ${typeFilter === type ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:bg-canvas'}`}>{TYPE_LABELS[type] || type} <span className="tabular-nums">({stocks.filter(s => type === '' || s.product.type === type).length})</span></button>)}</div>
        {loading ? <div role="status" className="rounded-xl border border-line-subtle bg-surface p-12 text-center text-muted">Cargando inventario…</div> : filtered.length === 0 ? <div className="rounded-xl border border-line-subtle bg-surface p-12 text-center text-muted">No hay productos con esas condiciones</div> : <section className="overflow-hidden rounded-xl border border-line-subtle bg-surface"><div className="overflow-x-auto"><table className="w-full min-w-[670px] text-sm"><thead className="bg-canvas text-muted"><tr><th scope="col" className="px-4 py-3 text-left">Producto</th><th scope="col" className="px-4 py-3 text-left">Tipo</th><th scope="col" className="px-4 py-3 text-left">Categoría</th><th scope="col" className="px-4 py-3 text-right">Stock actual</th><th scope="col" className="px-4 py-3 text-right">Mínimo</th><th scope="col" className="px-4 py-3 text-left">Nivel</th><th scope="col" className="px-4 py-3 text-left">Estado</th></tr></thead><tbody>{filtered.map(stock => { const sev = getSeverity(stock.currentStock, stock.minStock);const cfg = SEV_CONFIG[sev];return <tr key={stock.id} className="border-t border-line-subtle hover:bg-canvas"><th scope="row" className="px-4 py-3 text-left"><span className="block break-words font-semibold">{stock.product.name}</span><span className="font-mono text-xs text-muted">{stock.product.sku}</span></th><td className="px-4 py-3">{TYPE_LABELS[stock.product.type] || stock.product.type}</td><td className="px-4 py-3 text-muted">{stock.product.category || '—'}</td><td className="px-4 py-3 text-right font-display font-semibold tabular-nums">{stock.currentStock % 1 === 0 ? stock.currentStock : stock.currentStock.toFixed(2)} <span className="text-xs font-normal text-muted">{stock.product.unit}</span></td><td className="px-4 py-3 text-right tabular-nums">{stock.minStock} {stock.product.unit}</td><td className="w-24 px-4 py-3"><StockBar current={stock.currentStock} min={stock.minStock} /></td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>{cfg.icon}{cfg.label}</span></td></tr>;})}</tbody></table></div><p className="border-t border-line-subtle px-4 py-3 text-sm text-muted">Mostrando {filtered.length} de {stocks.length} productos{typeFilter && ` · Tipo: ${TYPE_LABELS[typeFilter] || typeFilter}`}</p></section>}
        <nav className="flex flex-wrap gap-3" aria-label="Acciones de inventario"><Link href="/factory/receiving" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-brand px-4 font-semibold text-white hover:brightness-90"><PackagePlus size={18} aria-hidden="true" /> Registrar entrada</Link><Link href="/inventory/movements" className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-surface px-4 font-semibold text-brand hover:bg-canvas"><TrendingDown size={18} aria-hidden="true" /> Ver kardex</Link></nav>
    </div></main>;
}
