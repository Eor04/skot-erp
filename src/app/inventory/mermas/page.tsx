'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/session-context';
import {
    ArrowLeft, Trash2, AlertTriangle, Search, Plus,
    Check, AlertCircle, Loader2, Package, ClipboardList
} from 'lucide-react';

type Branch   = { id: string; name: string; type: string };
type Product  = { id: string; name: string; sku: string; unit: string };
type StockItem = { product: { id: string; name: string; unit: string }; currentStock: number };

const REASON_LABELS: Record<string, string> = {
    VENCIMIENTO:           '📅 Vencimiento',
    DANO_FISICO:           '💥 Daño físico',
    DIFERENCIA_RECEPCION:  '📦 Diferencia en recepción',
    PROCESO_PRODUCCION:    '⚙️ Merma de producción',
    OTRO:                  '🔖 Otro',
};

type Merma = {
    id: string;
    product: { name: string; unit: string };
    branch:  { name: string };
    quantity: number;
    notes:   string | null;
    createdAt: string;
};

export default function MermasPage() {
    const { user } = useSession();
    const [branches,  setBranches]  = useState<Branch[]>([]);
    const [stock,     setStock]     = useState<StockItem[]>([]);
    const [history,   setHistory]   = useState<Merma[]>([]);
    const [loading,   setLoading]   = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toast,     setToast]     = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [search,    setSearch]    = useState('');

    // Form
    const [branchId,   setBranchId]  = useState('');
    const [productId,  setProductId] = useState('');
    const [quantity,   setQuantity]  = useState('');
    const [reason,     setReason]    = useState('VENCIMIENTO');
    const [notes,      setNotes]     = useState('');

    const isAdmin = ['ADMIN', 'MANAGER', 'WAREHOUSE'].includes(user?.role || '');

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg }); setTimeout(() => setToast(null), 4000);
    }

    useEffect(() => {
        fetch('/api/admin/branches').then(r => r.json()).then(d => {
            if (d.success) {
                setBranches(d.data);
                // Si hay branchIds en la sesión, pre-seleccionar
                if (!isAdmin && user?.branchIds?.[0]) setBranchId(user.branchIds[0]);
            }
        });
    }, [user]);

    useEffect(() => {
        if (!branchId) { setStock([]); return; }
        fetch(`/api/inventory/stock?branchId=${branchId}&limit=200`)
            .then(r => r.json())
            .then(d => { if (d.success) setStock(d.data); });
        // Cargar historial de mermas de hoy
        const today = new Date().toISOString().split('T')[0];
        fetch(`/api/inventory/movements?branchId=${branchId}&type=MERMA&startDate=${today}`)
            .then(r => r.json())
            .then(d => {
                const items = Array.isArray(d.data) ? d.data : (d.data?.movements ?? []);
                setHistory(items);
            });
    }, [branchId]);

    const filteredStock = useMemo(() =>
        stock.filter(s => !search || s.product.name.toLowerCase().includes(search.toLowerCase())),
        [stock, search]
    );

    const selectedItem = stock.find(s => s.product.id === productId);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!branchId || !productId || !quantity || parseFloat(quantity) <= 0) {
            return showToast('error', 'Completá todos los campos correctamente');
        }
        const qty = parseFloat(quantity);
        if (selectedItem && qty > selectedItem.currentStock) {
            return showToast('error', `Stock insuficiente. Disponible: ${selectedItem.currentStock} ${selectedItem.product.unit}`);
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/inventory/movements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branchId,
                    productId,
                    quantity: -qty,   // negativo = salida
                    type: 'MERMA',
                    notes: `${REASON_LABELS[reason] || reason}${notes ? ` — ${notes}` : ''}`,
                    createdBy: user?.userId || 'system',
                }),
            });
            const d = await res.json();
            if (d.success) {
                showToast('success', `Merma de ${qty} ${selectedItem?.product.unit || ''} registrada`);
                setProductId(''); setQuantity(''); setNotes('');
                // Refrescar stock e historial
                const today = new Date().toISOString().split('T')[0];
                Promise.all([
                    fetch(`/api/inventory/stock?branchId=${branchId}&limit=200`).then(r => r.json()),
                    fetch(`/api/inventory/movements?branchId=${branchId}&type=MERMA&startDate=${today}`).then(r => r.json()),
                ]).then(([stockData, histData]) => {
                    if (stockData.success) setStock(stockData.data);
                    const items = Array.isArray(histData.data) ? histData.data : (histData.data?.movements ?? []);
                    setHistory(items);
                });
            } else {
                showToast('error', d.error || 'Error al registrar merma');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSubmitting(false); }
    }

    const totalMermaHoy = history.reduce((s, m) => s + Math.abs(m.quantity), 0);
    const productosAfectados = new Set(history.map(m => m.product.name)).size;

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <Link href="/inventory" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Inventario
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Trash2 className="h-7 w-7 text-red-500" /> Registro de Mermas
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Registrá pérdidas, vencimientos y daños de inventario
                    </p>
                </div>

                {/* KPIs del día */}
                {branchId && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                            <p className="text-xs font-medium text-red-600">Mermas hoy (cantidad)</p>
                            <p className="text-2xl font-black text-red-700 mt-1">{totalMermaHoy.toFixed(2)}</p>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                            <p className="text-xs font-medium text-orange-600">Productos afectados hoy</p>
                            <p className="text-2xl font-black text-orange-700 mt-1">{productosAfectados}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Formulario */}
                    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
                        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" /> Registrar nueva merma
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Sucursal */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Sucursal *</label>
                                {isAdmin ? (
                                    <select value={branchId} onChange={e => { setBranchId(e.target.value); setProductId(''); }}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                                        <option value="">Seleccioná</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                ) : (
                                    <input value={branches.find(b => b.id === branchId)?.name || ''} disabled
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50" />
                                )}
                            </div>

                            {/* Buscar producto */}
                            {branchId && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Producto *</label>
                                    {productId ? (
                                        <div className="flex items-center justify-between bg-red-50 rounded-xl px-3 py-2.5 border border-red-200">
                                            <div>
                                                <span className="font-medium text-red-800 text-sm">{selectedItem?.product.name}</span>
                                                <span className="text-xs text-red-500 ml-2">
                                                    Stock: {selectedItem?.currentStock} {selectedItem?.product.unit}
                                                </span>
                                            </div>
                                            <button type="button" onClick={() => setProductId('')} className="text-red-400 hover:text-red-600">✕</button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="relative mb-2">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input value={search} onChange={e => setSearch(e.target.value)}
                                                    placeholder="Buscar producto…"
                                                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                                            </div>
                                            <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                                                {filteredStock.slice(0, 10).map(s => (
                                                    <button key={s.product.id} type="button"
                                                        onClick={() => { setProductId(s.product.id); setSearch(''); }}
                                                        className="w-full text-left px-3 py-2 hover:bg-red-50 text-sm flex justify-between items-center">
                                                        <span>{s.product.name}</span>
                                                        <span className="text-xs text-gray-400">{s.currentStock} {s.product.unit}</span>
                                                    </button>
                                                ))}
                                                {filteredStock.length === 0 && (
                                                    <p className="text-center text-xs text-gray-400 py-4">Sin resultados</p>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Cantidad y motivo */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                                        Cantidad a dar de baja *{selectedItem && <span className="font-normal text-gray-400 ml-1">({selectedItem.product.unit})</span>}
                                    </label>
                                    <input type="number" min="0.01" step="0.01" value={quantity === 0 ? '' : quantity}
                                        onChange={e => setQuantity(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Motivo *</label>
                                    <select value={reason} onChange={e => setReason(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                                        {Object.entries(REASON_LABELS).map(([k, v]) => (
                                            <option key={k} value={k}>{v}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Notas */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Observaciones</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                                    placeholder="Descripción adicional, lote afectado..."
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
                            </div>

                            {/* Stock warning */}
                            {selectedItem && quantity && parseFloat(quantity) > selectedItem.currentStock && (
                                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">
                                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                    La cantidad supera el stock disponible ({selectedItem.currentStock} {selectedItem.product.unit})
                                </div>
                            )}

                            <button type="submit" disabled={submitting || !branchId || !productId || !quantity}
                                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition">
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                Registrar Merma
                            </button>
                        </form>
                    </div>

                    {/* Historial de hoy */}
                    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
                        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-gray-400" /> Mermas de hoy
                        </h2>
                        {!branchId ? (
                            <div className="text-center py-12 text-gray-400">
                                <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Seleccioná una sucursal</p>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Check className="h-10 w-10 mx-auto mb-2 opacity-30 text-green-400" />
                                <p className="text-sm text-green-600 font-medium">Sin mermas registradas hoy</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
                                {history.map(m => (
                                    <div key={m.id} className="py-3 flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 text-sm truncate">{m.product.name}</p>
                                            <p className="text-xs text-gray-400 mt-0.5 truncate">{m.notes || '—'}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="font-bold text-red-600 text-sm">-{Math.abs(m.quantity)} {m.product.unit}</p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(m.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {history.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <Link href="/inventory/movements"
                                    className="text-xs text-purple-600 hover:underline">
                                    Ver historial completo en Kardex →
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
