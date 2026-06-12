'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Package, Search, Plus, Minus, RefreshCw,
    Check, AlertCircle, ChevronDown, History, SlidersHorizontal
} from 'lucide-react';
import { useSession } from '@/lib/session-context';

/* ──────────── Types ──────────── */
type Branch = { id: string; name: string; type: string };
type Product = { id: string; name: string; sku: string; unit: string; currentStock?: number };
type Movement = {
    id: string; quantity: number; previousStock: number; newStock: number;
    type: string; notes: string; createdBy: string; createdAt: string;
    product: { name: string; sku: string; unit: string };
    branch: { name: string };
};

const TYPE_CONFIG = {
    ENTRADA: { label: 'Entrada', color: 'bg-green-100 text-green-700', icon: <Plus className="h-4 w-4" />, desc: 'Aumenta el stock (ingreso de mercancía)' },
    SALIDA: { label: 'Salida', color: 'bg-red-100 text-red-700', icon: <Minus className="h-4 w-4" />, desc: 'Reduce el stock (retiro o consumo manual)' },
    AJUSTE: { label: 'Corrección', color: 'bg-amber-100 text-amber-700', icon: <SlidersHorizontal className="h-4 w-4" />, desc: 'Fija el stock exacto (resultado de conteo físico)' },
} as const;

type AdjType = keyof typeof TYPE_CONFIG;

/* ──────────── Helpers ──────────── */
function fmt(n: number, unit: string) { return `${n.toFixed(unit === 'KG' ? 2 : 0)} ${unit}`; }
function signedClass(n: number) { return n > 0 ? 'text-green-600' : n < 0 ? 'text-red-600' : 'text-gray-500'; }

export default function StockAdjustmentsPage() {
    const { user } = useSession();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [history, setHistory] = useState<Movement[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const [branchId, setBranchId] = useState('');
    const [search, setSearch] = useState('');
    const [adjType, setAdjType] = useState<AdjType>('ENTRADA');
    const [selected, setSelected] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }

    useEffect(() => {
        // Pre-seleccionar sucursal del cajero/almacenero
        if (!isAdmin && user?.branchIds?.[0]) setBranchId(user.branchIds[0]);
        fetch('/api/admin/branches').then(r => r.json()).then(d => {
            if (d.success) setBranches(d.data);
        });
    }, [user, isAdmin]);

    useEffect(() => {
        if (!branchId) { setLoading(false); return; }
        setLoading(true);
        Promise.all([
            fetch(`/api/pos/products?branchId=${branchId}`).then(r => r.json()),
            fetch(`/api/inventory/adjustments?branchId=${branchId}&limit=30`).then(r => r.json()),
        ]).then(([prod, hist]) => {
            if (prod.success) setProducts(prod.data);
            if (hist.success) setHistory(hist.data);
        }).finally(() => setLoading(false));
    }, [branchId]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selected || !branchId || !quantity) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/inventory/adjustments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branchId,
                    productId: selected.id,
                    type: adjType,
                    quantity: parseFloat(quantity),
                    reason: reason || `${TYPE_CONFIG[adjType].label} manual`,
                    createdBy: user?.userId || 'unknown',
                }),
            });
            const d = await res.json();
            if (d.success) {
                showToast('success', d.message || 'Ajuste registrado');
                setSelected(null);
                setQuantity('');
                setReason('');
                // Recargar datos
                const [prod, hist] = await Promise.all([
                    fetch(`/api/pos/products?branchId=${branchId}`).then(r => r.json()),
                    fetch(`/api/inventory/adjustments?branchId=${branchId}&limit=30`).then(r => r.json()),
                ]);
                if (prod.success) setProducts(prod.data);
                if (hist.success) setHistory(hist.data);
            } else {
                showToast('error', d.error || 'Error al ajustar el stock');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSubmitting(false); }
    }

    const filtered = products.filter(p =>
        search === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
    );

    // Preview del nuevo stock
    const newStockPreview = (() => {
        if (!selected || !quantity) return null;
        const q = parseFloat(quantity);
        if (isNaN(q)) return null;
        const cur = (selected as any).currentStock ?? 0;
        if (adjType === 'AJUSTE') return q;
        if (adjType === 'ENTRADA') return cur + Math.abs(q);
        return cur - Math.abs(q);
    })();

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <Link href="/inventory" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Inventario
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <SlidersHorizontal className="h-7 w-7 text-amber-600" /> Ajuste de Stock
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">Corregí discrepancias o registrá entradas y salidas manuales de inventario</p>
                </div>

                {/* Selector de Sucursal (admin) */}
                {isAdmin && (
                    <div className="bg-white rounded-2xl shadow p-4 flex items-center gap-3">
                        <Package className="h-5 w-5 text-gray-400" />
                        <select value={branchId} onChange={e => setBranchId(e.target.value)}
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 flex-1 max-w-xs">
                            <option value="">Seleccioná una sucursal</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                )}

                {!branchId && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center text-amber-700">
                        <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        <p className="font-medium">Seleccioná una sucursal para comenzar</p>
                    </div>
                )}

                {branchId && (
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* ── Formulario de ajuste ── */}
                        <div className="bg-white rounded-2xl shadow p-6 space-y-5">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <RefreshCw className="h-5 w-5 text-amber-600" /> Nuevo Ajuste
                            </h2>

                            {/* Tipo de ajuste */}
                            <div className="grid grid-cols-3 gap-2">
                                {(Object.keys(TYPE_CONFIG) as AdjType[]).map(t => (
                                    <button key={t} onClick={() => setAdjType(t)}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-semibold transition ${adjType === t ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                        {TYPE_CONFIG[t].icon}
                                        {TYPE_CONFIG[t].label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 -mt-2">{TYPE_CONFIG[adjType].desc}</p>

                            {/* Buscador de productos */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Producto *</label>
                                <div className="relative mb-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input value={search} onChange={e => setSearch(e.target.value)}
                                        placeholder="Buscar por nombre o SKU…"
                                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                                </div>
                                {search && !selected && (
                                    <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                                        {filtered.length === 0 ? (
                                            <p className="text-sm text-gray-400 text-center py-4">Sin resultados</p>
                                        ) : filtered.slice(0, 12).map(p => (
                                            <button key={p.id} onClick={() => { setSelected(p); setSearch(p.name); }}
                                                className="w-full text-left flex items-center justify-between px-4 py-2.5 hover:bg-amber-50 transition text-sm">
                                                <div>
                                                    <span className="font-medium text-gray-800">{p.name}</span>
                                                    <span className="text-xs text-gray-400 ml-2">{p.sku}</span>
                                                </div>
                                                <span className="text-xs text-gray-500">{fmt((p as any).currentStock ?? 0, p.unit)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {selected && (
                                    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                                        <div>
                                            <span className="font-semibold text-amber-800 text-sm">{selected.name}</span>
                                            <span className="text-xs text-amber-600 ml-2">Stock actual: {fmt((selected as any).currentStock ?? 0, selected.unit)}</span>
                                        </div>
                                        <button onClick={() => { setSelected(null); setSearch(''); setQuantity(''); }}
                                            className="text-amber-500 hover:text-amber-700 text-xs underline">Cambiar</button>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Cantidad */}
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                                        {adjType === 'AJUSTE' ? 'Stock correcto (cantidad exacta)' : 'Cantidad'} *
                                    </label>
                                    <input type="number" step="0.01" min="0" required value={quantity === 0 ? '' : quantity}
                                        onChange={e => setQuantity(e.target.value)}
                                        placeholder={adjType === 'AJUSTE' ? 'Ej: 25 (stock real contado)' : 'Ej: 10'}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                                    {newStockPreview !== null && selected && (
                                        <p className={`text-xs mt-1.5 font-semibold ${newStockPreview < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            → Nuevo stock: {fmt(newStockPreview, selected.unit)}
                                            {newStockPreview < 0 && ' ⚠️ No puede quedar negativo'}
                                        </p>
                                    )}
                                </div>

                                {/* Motivo */}
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Motivo / Observación</label>
                                    <input type="text" value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        placeholder="Ej: Conteo físico, rotura, merma, ingreso proveedor…"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                                </div>

                                <button type="submit" disabled={!selected || !quantity || submitting || (newStockPreview !== null && newStockPreview < 0)}
                                    className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
                                    {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : TYPE_CONFIG[adjType].icon}
                                    Registrar {TYPE_CONFIG[adjType].label}
                                </button>
                            </form>
                        </div>

                        {/* ── Historial de ajustes ── */}
                        <div className="bg-white rounded-2xl shadow p-6">
                            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <History className="h-5 w-5 text-gray-500" /> Historial de Ajustes
                            </h2>
                            {loading ? (
                                <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                                    <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Cargando…
                                </div>
                            ) : history.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Sin ajustes registrados aún</p>
                                </div>
                            ) : (
                                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                                    {history.map(m => {
                                        const cfg = TYPE_CONFIG[m.type as AdjType] || TYPE_CONFIG.AJUSTE;
                                        const delta = m.newStock - m.previousStock;
                                        return (
                                            <div key={m.id} className="border border-gray-100 rounded-xl p-3.5 hover:bg-gray-50 transition">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.color}`}>
                                                            {cfg.label}
                                                        </span>
                                                        <span className="font-semibold text-gray-800 text-sm">{m.product.name}</span>
                                                    </div>
                                                    <span className={`text-sm font-black ${signedClass(delta)}`}>
                                                        {delta > 0 ? '+' : ''}{delta.toFixed(m.product.unit === 'KG' ? 2 : 0)} {m.product.unit}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-gray-400">
                                                    <span>{m.previousStock} → <strong className="text-gray-700">{m.newStock}</strong> {m.product.unit}</span>
                                                    <span>{m.branch.name}</span>
                                                    <span>{new Date(m.createdAt).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                {m.notes && <p className="text-xs text-gray-400 italic mt-1">"{m.notes}"</p>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
