'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Search, Package, AlertTriangle, XCircle,
    CheckCircle, Loader2, RefreshCw, Pencil, Save, X, Plus, Minus
} from 'lucide-react';
import { useSession } from '@/lib/session-context';

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
const TYPE_COLORS: Record<string, string> = {
    ACAI_BASE: 'bg-purple-100 text-purple-700',
    ACAI_TOPPING: 'bg-pink-100 text-pink-700',
    BURGER: 'bg-orange-100 text-orange-700',
    BURGER_EXTRA: 'bg-amber-100 text-amber-700',
    BEVERAGE: 'bg-blue-100 text-blue-700',
    RAW_MATERIAL: 'bg-gray-100 text-gray-700',
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
                setToast('✓ Guardado');
                setTimeout(() => setToast(''), 2000);
                setEditing(false);
                onSaved();
            } else {
                setToast('❌ ' + (d.error || 'Error'));
                setTimeout(() => setToast(''), 3000);
            }
        } finally { setSaving(false); }
    }

    const rowBg = item.isCritical ? 'bg-red-50/40' : item.isLow ? 'bg-yellow-50/40' : '';

    return (
        <tr className={`border-b border-gray-100 hover:bg-gray-50 ${rowBg}`}>
            <td className="px-5 py-3 font-medium text-gray-900 text-sm">{item.product.name}</td>
            <td className="px-5 py-3 font-mono text-xs text-gray-400">{item.product.sku}</td>
            <td className="px-5 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[item.product.type] || 'bg-gray-100 text-gray-600'}`}>
                    {TYPE_LABELS[item.product.type] || item.product.type}
                </span>
            </td>

            {/* Stock actual */}
            <td className={`px-5 py-3 text-right font-bold text-base ${item.isCritical ? 'text-red-600' : item.isLow ? 'text-yellow-600' : 'text-green-700'}`}>
                {editing ? (
                    <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setNewStock(s => Math.max(0, s - 1))} className="p-1 rounded bg-gray-100 hover:bg-gray-200">
                            <Minus className="h-3 w-3" />
                        </button>
                        <input type="number" min="0" step="0.01" value={newStock}
                            onChange={e => setNewStock(parseFloat(e.target.value) || 0)}
                            className="w-20 text-center border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                        <button onClick={() => setNewStock(s => s + 1)} className="p-1 rounded bg-gray-100 hover:bg-gray-200">
                            <Plus className="h-3 w-3" />
                        </button>
                        <span className="text-xs text-gray-400 ml-1">{item.product.unit}</span>
                    </div>
                ) : (
                    <>{item.currentStock} <span className="text-xs font-normal text-gray-400">{item.product.unit}</span></>
                )}
            </td>

            {/* Mín */}
            <td className="px-5 py-3 text-right text-sm text-gray-500">
                {editing ? (
                    <input type="number" min="0" step="0.01" value={newMin}
                        onChange={e => setNewMin(parseFloat(e.target.value) || 0)}
                        className="w-16 text-center border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                ) : item.minStock}
            </td>

            {/* Estado */}
            <td className="px-5 py-3 text-center">
                {item.isCritical ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        <XCircle className="h-3 w-3" /> Sin stock
                    </span>
                ) : item.isLow ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="h-3 w-3" /> Bajo
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="h-3 w-3" /> OK
                    </span>
                )}
            </td>

            {/* Razón (solo al editar) */}
            <td className="px-5 py-3 text-xs text-gray-400">
                {editing ? (
                    <select value={reason} onChange={e => setReason(e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-400">
                        <option value="AJUSTE">Ajuste</option>
                        <option value="ENTRADA">Entrada</option>
                        <option value="MERMA">Merma</option>
                        <option value="INVENTARIO_FISICO">Inv. físico</option>
                    </select>
                ) : (
                    new Date(item.lastUpdated).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
                )}
            </td>

            {/* Acciones */}
            {canEdit && (
                <td className="px-5 py-3 text-right">
                    {toast ? (
                        <span className="text-xs font-semibold text-green-600">{toast}</span>
                    ) : editing ? (
                        <div className="flex items-center gap-1.5 justify-end">
                            <button onClick={save} disabled={saving}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition">
                                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                Guardar
                            </button>
                            <button onClick={() => { setEditing(false); setNewStock(item.currentStock); setNewMin(item.minStock); }}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setEditing(true)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Ajustar stock">
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                    )}
                </td>
            )}
        </tr>
    );
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

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <Link href="/inventory" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-1">
                            <ArrowLeft className="h-4 w-4" /> Inventario
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Package className="h-7 w-7 text-green-600" /> Stock por Sucursal
                            {selectedBranchName && <span className="text-base font-normal text-gray-500">— {selectedBranchName}</span>}
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        {selectedBranchId && (
                            <button onClick={() => loadStock(selectedBranchId)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">
                                <RefreshCw className="h-4 w-4" /> Actualizar
                            </button>
                        )}
                        <Link href="/inventory/transfers/request"
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition">
                            + Solicitar transferencia
                        </Link>
                    </div>
                </div>

                {/* Selector sucursal */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {isAdmin ? 'Seleccioná una sucursal:' : 'Tu sucursal:'}
                    </label>
                    <select value={selectedBranchId} onChange={e => handleBranchChange(e.target.value)}
                        disabled={!isAdmin && !!user?.branchIds?.[0]}
                        className="w-full max-w-sm border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 disabled:bg-gray-50">
                        <option value="">-- Elegí una sucursal --</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.type})</option>)}
                    </select>
                </div>

                {/* KPIs */}
                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                        {[
                            { label: 'Total ítems', value: summary.total, color: 'bg-blue-50 text-blue-700', f: 'ALL' as const },
                            { label: 'Stock OK', value: summary.ok, color: 'bg-green-50 text-green-700', f: 'OK' as const },
                            { label: 'Stock bajo', value: summary.low, color: 'bg-yellow-50 text-yellow-700', f: 'LOW' as const },
                            { label: 'Sin stock', value: summary.critical, color: 'bg-red-50 text-red-700', f: 'CRITICAL' as const },
                        ].map(kpi => (
                            <button key={kpi.label} onClick={() => setFilter(kpi.f)}
                                className={`${kpi.color} rounded-2xl p-4 text-left transition-all ${filter === kpi.f ? 'ring-2 ring-current' : 'hover:scale-105'}`}>
                                <p className="text-xs font-medium opacity-70">{kpi.label}</p>
                                <p className="text-3xl font-black mt-1">{kpi.value}</p>
                            </button>
                        ))}
                    </div>
                )}

                {/* Buscador */}
                {selectedBranchId && (
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input type="text" placeholder="Buscar por nombre o SKU…" value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                    </div>
                )}

                {/* Tabla */}
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
                ) : !selectedBranchId ? (
                    <div className="text-center py-24 text-gray-400">
                        <Package className="h-14 w-14 mx-auto mb-4 opacity-20" />
                        <p>Seleccioná una sucursal para ver su inventario</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Producto</th>
                                    <th className="text-left px-5 py-3 font-semibold text-gray-600">SKU</th>
                                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Tipo</th>
                                    <th className="text-right px-5 py-3 font-semibold text-gray-600">Stock actual</th>
                                    <th className="text-right px-5 py-3 font-semibold text-gray-600">Mín.</th>
                                    <th className="text-center px-5 py-3 font-semibold text-gray-600">Estado</th>
                                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Fecha / Motivo</th>
                                    {canEdit && <th className="px-5 py-3" />}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(item => (
                                    <StockRow key={item.id} item={item} canEdit={canEdit}
                                        onSaved={() => loadStock(selectedBranchId)} />
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={canEdit ? 8 : 7} className="px-6 py-16 text-center text-gray-400">
                                        No se encontraron productos
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                        <div className="px-5 py-3 bg-gray-50 border-t text-xs text-gray-400">
                            {filtered.length} producto{filtered.length !== 1 ? 's' : ''} · {selectedBranchName}
                            {canEdit && <span className="ml-3 text-green-600 font-medium">✏️ Hacé click en el lápiz para ajustar stock</span>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
