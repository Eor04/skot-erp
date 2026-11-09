'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Search, Package, AlertTriangle, XCircle,
    CheckCircle, Loader2, RefreshCw, Pencil, Save, X, Plus, Minus
} from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

interface Branch { id: string; name: string; type: string; }
interface StockItem {
    id: string;
    productId: string;
    product: { id?: string; name: string; sku: string; type: string; unit: string; category: string | null };
    branch?: { id: string; name: string };
    currentStock: number;
    minStock: number;
    maxStock: number | null;
    isLow: boolean;
    isCritical: boolean;
    lastUpdated: string;
}
interface Summary { total: number; low: number; critical: number; ok: number; }

const TYPE_LABELS: Record<string, string> = {
    ACAI_BASE: 'Base Açaí',
    ACAI_TOPPING: 'Topping Açaí',
    BURGER: 'Hamburguesa',
    BURGER_EXTRA: 'Extra / Porción',
    BEVERAGE: 'Bebida',
    RAW_MATERIAL: 'Materia Prima',
    PACKAGING: 'Empaque',
};
/* ── Fila editable ── */
function StockRow({
    item, canEdit, onSaved,
}: {
    item: StockItem;
    canEdit: boolean;
    onSaved: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [newStock, setNewStock] = useState(item.currentStock);
    const [newMin, setNewMin] = useState(item.minStock);
    const [reason, setReason] = useState('AJUSTE');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    async function save() {
        setSaving(true);
        try {
            const res = await fetch('/api/inventory/stock/adjust', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inventoryId: item.id,
                    newStock,
                    newMinStock: newMin,
                    reason,
                }),
            });
            const d = await res.json();
            if (d.success) {
                setToast('Guardado');
                setTimeout(() => setToast(''), 2000);
                setEditing(false);
                onSaved();
            } else {
                setToast('Error: ' + (d.error || 'Error'));
                setTimeout(() => setToast(''), 3000);
            }
        } finally { setSaving(false); }
    }

    const status = item.isCritical ? { label: 'Sin stock', tone: 'error' as const, Icon: XCircle }
        : item.isLow ? { label: 'Bajo', tone: 'warning' as const, Icon: AlertTriangle }
            : { label: 'OK', tone: 'success' as const, Icon: CheckCircle };
    const Cell = 'flex min-h-11 items-center justify-between gap-3 border-t border-line-subtle px-4 py-2 text-sm md:table-cell md:border-0 md:px-4 md:py-3';

    return <tr className="block overflow-hidden rounded-xl border border-line-subtle bg-surface md:table-row md:rounded-none md:border-0 md:border-t md:hover:bg-canvas">
        <th scope="row" className="block break-words px-4 py-3 text-left font-display font-semibold md:table-cell">{item.product.name}</th>
        <td className={Cell}><span className="text-muted md:hidden">SKU</span><span className="font-mono text-xs text-muted">{item.product.sku}</span></td>
        <td className={Cell}><span className="text-muted md:hidden">Tipo</span><StatusBadge>{TYPE_LABELS[item.product.type] || item.product.type}</StatusBadge></td>
        <td className={Cell + ' md:text-right'}><span className="text-muted md:hidden">Stock actual</span>
            {editing ? <div className="flex flex-wrap items-center justify-end gap-1">
                <button type="button" aria-label={`Disminuir stock de ${item.product.name}`} onClick={() => setNewStock(value => Math.max(0, value - 1))} className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-surface hover:bg-canvas"><Minus size={16} aria-hidden="true" /></button>
                <input type="number" min="0" step="0.01" aria-label={`Nuevo stock de ${item.product.name}`} value={newStock === 0 ? '' : newStock} onChange={event => setNewStock(parseFloat(event.target.value) || 0)} className="h-11 w-20 rounded-lg border border-line bg-surface px-2 text-center text-ink tabular-nums" />
                <button type="button" aria-label={`Aumentar stock de ${item.product.name}`} onClick={() => setNewStock(value => value + 1)} className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-surface hover:bg-canvas"><Plus size={16} aria-hidden="true" /></button>
                <span className="ml-1 text-xs text-muted">{item.product.unit}</span>
            </div> : <strong className="font-display font-semibold tabular-nums">{item.currentStock} <span className="text-xs font-normal text-muted">{item.product.unit}</span></strong>}
        </td>
        <td className={Cell + ' md:text-right'}><span className="text-muted md:hidden">Mínimo</span>
            {editing ? <input type="number" min="0" step="0.01" aria-label={`Stock mínimo de ${item.product.name}`} value={newMin === 0 ? '' : newMin} onChange={event => setNewMin(parseFloat(event.target.value) || 0)} className="h-11 w-20 rounded-lg border border-line bg-surface px-2 text-center text-ink tabular-nums" /> : <span className="tabular-nums">{item.minStock}</span>}
        </td>
        <td className={Cell}><span className="text-muted md:hidden">Estado</span><StatusBadge tone={status.tone}><status.Icon size={14} className="mr-1" aria-hidden="true" />{status.label}</StatusBadge></td>
        <td className={Cell}><span className="text-muted md:hidden">Fecha / motivo</span>
            {editing ? <select aria-label={`Motivo del ajuste de ${item.product.name}`} value={reason} onChange={event => setReason(event.target.value)} className="h-11 rounded-lg border border-line bg-surface px-2 text-ink">
                <option value="AJUSTE">Ajuste</option><option value="ENTRADA">Entrada</option><option value="MERMA">Merma</option><option value="INVENTARIO_FISICO">Inv. físico</option>
            </select> : <span className="text-muted">{new Date(item.lastUpdated).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</span>}
        </td>
        {canEdit && <td className={Cell + ' md:text-right'}><span className="text-muted md:hidden">Acciones</span><div className="flex flex-wrap items-center justify-end gap-2">
            {toast && <span role={toast === 'Guardado' ? 'status' : 'alert'} className={`text-sm font-semibold ${toast === 'Guardado' ? 'text-success' : 'text-danger'}`}>{toast}</span>}
            {editing ? <div className="flex flex-wrap justify-end gap-2"><Button size="touch" onClick={save} disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />} Guardar</Button>
                    <Button variant="secondary" size="touch" onClick={() => { setEditing(false); setNewStock(item.currentStock); setNewMin(item.minStock); }} disabled={saving}><X size={16} aria-hidden="true" /> Cancelar</Button></div>
                    : <Button variant="quiet" size="touch" onClick={() => setEditing(true)} aria-label={`Ajustar stock de ${item.product.name}`}><Pencil size={17} aria-hidden="true" /> <span className="md:sr-only">Ajustar</span></Button>}</div>
        </td>}
    </tr>;
}

/* ── Página principal ── */
export default function StockPage() {
    const { user } = useSession();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [selectedBranchName, setSelectedBranchName] = useState('');
    const [stock, setStock] = useState<StockItem[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'LOW' | 'CRITICAL' | 'OK'>('ALL');

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
    // Cashiers/Warehouse pueden editar stock de su propia sucursal
    const canEdit = isAdmin || ['CASHIER', 'WAREHOUSE'].includes(user?.role || '');

    const loadBranches = useCallback(async () => {
        const res = await fetch('/api/admin/branches').then(r => r.json());
        if (res.success) {
            setBranches(res.data);
            if (!isAdmin && user?.branchIds?.[0]) {
                const branchId = user.branchIds[0];
                setSelectedBranchId(branchId);
                const b = res.data.find((b: Branch) => b.id === branchId);
                if (b) setSelectedBranchName(b.name);
                loadStock(branchId);
            }
        }
    }, [user, isAdmin]);

    const loadStock = useCallback(async (branchId: string) => {
        if (!branchId) return;
        setLoading(true);
        const res = await fetch(`/api/inventory/stock?branchId=${branchId}`).then(r => r.json());
        if (res.success) { setStock(res.data); setSummary(res.summary); }
        setLoading(false);
    }, []);

    useEffect(() => { loadBranches(); }, [loadBranches]);

    const handleBranchChange = (id: string) => {
        setSelectedBranchId(id);
        const b = branches.find(b => b.id === id);
        setSelectedBranchName(b?.name || '');
        setSearch(''); setFilter('ALL');
        if (id) loadStock(id);
    };

    const filtered = stock.filter(item => {
        const q = search.toLowerCase();
        const matchSearch =
            (item.product?.name ?? '').toLowerCase().includes(q) ||
            (item.product?.sku ?? '').toLowerCase().includes(q);
        const matchFilter =
            filter === 'ALL' ? true :
                filter === 'CRITICAL' ? item.isCritical :
                    filter === 'LOW' ? (item.isLow && !item.isCritical) :
                        !item.isLow;
        return matchSearch && matchFilter;
    });

    return <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <button type="button" onClick={() => window.history.back()} className="mb-4 inline-flex min-h-11 items-center gap-2 font-semibold text-brand hover:underline"><ArrowLeft size={18} aria-hidden="true" /> Volver atrás</button>
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted"><Package size={16} aria-hidden="true" /> Inventario <span aria-hidden="true">›</span> Stock</div>
                    <h1 className="font-display text-2xl font-semibold sm:text-3xl">Stock por sucursal</h1>
                    {selectedBranchName && <p className="mt-2 text-muted">{selectedBranchName}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                    {selectedBranchId && <Button variant="secondary" size="touch" onClick={() => loadStock(selectedBranchId)} disabled={loading}><RefreshCw size={18} className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Actualizar</Button>}
                    <Link href="/inventory/transfers/request" className="inline-flex min-h-12 items-center rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:brightness-90">Solicitar transferencia</Link>
                </div>
            </header>
            <Card className="p-4"><label htmlFor="stock-branch" className="mb-2 block text-sm font-semibold">{isAdmin ? 'Seleccioná una sucursal' : 'Tu sucursal'}</label>
                <select id="stock-branch" value={selectedBranchId} onChange={event => handleBranchChange(event.target.value)} disabled={!isAdmin && !!user?.branchIds?.[0]} className="min-h-12 w-full max-w-sm rounded-lg border border-line bg-surface px-3 text-ink disabled:opacity-70">
                    <option value="">Elegí una sucursal</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name} ({branch.type})</option>)}
                </select></Card>
            {summary && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de stock">{[
                { label: 'Total ítems', value: summary.total, f: 'ALL' as const, tone: 'neutral' as const },
                { label: 'Stock OK', value: summary.ok, f: 'OK' as const, tone: 'success' as const },
                { label: 'Stock bajo', value: summary.low, f: 'LOW' as const, tone: 'warning' as const },
                { label: 'Sin stock', value: summary.critical, f: 'CRITICAL' as const, tone: 'error' as const },
            ].map(kpi => <button key={kpi.f} type="button" aria-pressed={filter === kpi.f} onClick={() => setFilter(kpi.f)} className={`min-h-24 rounded-xl border bg-surface p-4 text-left hover:border-brand ${filter === kpi.f ? 'border-brand' : 'border-line-subtle'}`}>
                <span className="block text-sm text-muted">{kpi.label}</span><span className="mt-2 block font-display text-3xl font-semibold tabular-nums">{kpi.value}</span><StatusBadge tone={kpi.tone} className="mt-2">{filter === kpi.f ? 'Filtro activo' : 'Ver ítems'}</StatusBadge>
            </button>)}</div>}
            {selectedBranchId && <Card className="p-4"><label htmlFor="stock-search" className="mb-2 flex items-center gap-2 text-sm font-semibold"><Search size={16} aria-hidden="true" /> Buscar producto</label><input id="stock-search" type="search" placeholder="Nombre o SKU" value={search} onChange={event => setSearch(event.target.value)} className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-ink placeholder:text-muted" /></Card>}
            {loading ? <Card className="flex items-center justify-center gap-3 p-12 text-muted" role="status"><Loader2 size={22} className="animate-spin" aria-hidden="true" /> Cargando stock…</Card>
                : !selectedBranchId ? <Card className="p-12 text-center text-muted">Seleccioná una sucursal para ver su inventario</Card>
                    : <Card className="overflow-hidden"><div className="md:overflow-x-auto"><table className="block w-full md:table md:min-w-[900px]"><thead className="hidden bg-canvas text-muted md:table-header-group"><tr>
                        <th scope="col" className="px-4 py-3 text-left">Producto</th><th scope="col" className="px-4 py-3 text-left">SKU</th><th scope="col" className="px-4 py-3 text-left">Tipo</th><th scope="col" className="px-4 py-3 text-right">Stock actual</th><th scope="col" className="px-4 py-3 text-right">Mínimo</th><th scope="col" className="px-4 py-3 text-left">Estado</th><th scope="col" className="px-4 py-3 text-left">Fecha / motivo</th>{canEdit && <th scope="col" className="px-4 py-3 text-right">Acciones</th>}
                    </tr></thead><tbody className="grid gap-3 p-3 md:table-row-group md:p-0">{filtered.map(item => <StockRow key={item.id} item={item} canEdit={canEdit} onSaved={() => loadStock(selectedBranchId)} />)}</tbody></table></div>
                        {filtered.length === 0 && <p className="p-10 text-center text-muted">No se encontraron productos</p>}
                        <p className="border-t border-line-subtle px-4 py-3 text-sm text-muted">{filtered.length} producto{filtered.length !== 1 ? 's' : ''} · {selectedBranchName}</p>
                    </Card>}
        </div>
    </main>;
}
