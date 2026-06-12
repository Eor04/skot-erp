'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/session-context';
import Link from 'next/link';
import {
    ArrowLeft, ShoppingBag, Plus, Trash2, Check, AlertCircle,
    Loader2, Package, Search, X, Calendar, TrendingDown,
    Send, PackageCheck, Ban, RefreshCw
} from 'lucide-react';

/* ──────────── Types ──────────── */
type Branch = { id: string; name: string };
type Product = { id: string; name: string; sku: string; unit: string };
type OrderItem = { productId: string; productName: string; unit: string; quantity: string; unitCost: string };

type PurchaseOrder = {
    id: string; orderNumber: string; supplier: string; status: string;
    totalAmount: number; expectedDate: string | null; notes: string | null; createdAt: string;
    branch: { name: string }; user: { name: string };
    items: { product: { name: string; unit: string }; quantity: number; receivedQty: number; unitCost: number; subtotal: number }[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
    SENT: { label: 'Enviado', color: 'bg-blue-100 text-blue-700' },
    PARTIAL: { label: 'Parcial', color: 'bg-orange-100 text-orange-700' },
    RECEIVED: { label: 'Recibido', color: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Cancelado', color: 'bg-gray-100 text-gray-500' },
};

function fmt(n: number) { return 'Bs. ' + n.toFixed(2); }

const BLANK_ITEM: OrderItem = { productId: '', productName: '', unit: '', quantity: '1', unitCost: '' };

export default function PurchaseOrdersPage() {
    const { user } = useSession();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [changingId, setChangingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');

    const [form, setForm] = useState({
        branchId: '', supplier: '', expectedDate: '', notes: '',
    });
    const [items, setItems] = useState<OrderItem[]>([{ ...BLANK_ITEM }]);
    const [productSearch, setProductSearch] = useState<Record<number, string>>({});

    const isAdmin = ['ADMIN', 'MANAGER'].includes(user?.role || '');

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg }); setTimeout(() => setToast(null), 4000);
    }

    async function loadAll(branchId?: string) {
        setLoading(true);
        const bid = branchId || form.branchId || '';
        const [ordRes, brRes, prodRes] = await Promise.all([
            fetch(`/api/admin/purchase-orders${bid ? `?branchId=${bid}` : ''}&limit=50`).then(r => r.json()),
            fetch('/api/admin/branches').then(r => r.json()),
            fetch('/api/admin/products').then(r => r.json()),
        ]);
        if (ordRes.success) setOrders(ordRes.data);
        if (brRes.success) setBranches(brRes.data);
        if (prodRes.success) setProducts(prodRes.data);
        setLoading(false);
    }

    useEffect(() => {
        if (!isAdmin && user?.branchIds?.[0]) setForm(f => ({ ...f, branchId: user!.branchIds![0] }));
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.branchId || !form.supplier) return showToast('error', 'Completá sucursal y proveedor');
        const validItems = items.filter(i => i.productId && parseFloat(i.quantity) > 0 && parseFloat(i.unitCost) >= 0);
        if (!validItems.length) return showToast('error', 'Agregá al menos un producto con cantidad y costo');
        setSubmitting(true);
        try {
            const res = await fetch('/api/admin/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branchId: form.branchId,
                    userId: user?.userId,
                    supplier: form.supplier,
                    expectedDate: form.expectedDate || null,
                    notes: form.notes || null,
                    items: validItems.map(i => ({
                        productId: i.productId,
                        quantity: parseFloat(i.quantity),
                        unitCost: parseFloat(i.unitCost) || 0,
                    })),
                }),
            });
            const d = await res.json();
            if (d.success) {
                showToast('success', `Pedido ${d.data.orderNumber} creado`);
                setShowForm(false);
                setForm({ branchId: form.branchId, supplier: '', expectedDate: '', notes: '' });
                setItems([{ ...BLANK_ITEM }]);
                loadAll(form.branchId);
            } else {
                showToast('error', d.error || 'Error al crear pedido');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSubmitting(false); }
    }

    function addItem() { setItems(prev => [...prev, { ...BLANK_ITEM }]); }
    function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)); }
    function updateItem(i: number, field: keyof OrderItem, val: string) {
        setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
    }
    function selectProduct(i: number, p: Product) {
        setItems(prev => prev.map((item, idx) => idx === i
            ? { ...item, productId: p.id, productName: p.name, unit: p.unit } : item));
        setProductSearch(prev => ({ ...prev, [i]: '' }));
    }

    async function changeStatus(orderId: string, status: string) {
        setChangingId(orderId);
        try {
            const res = await fetch(`/api/admin/purchase-orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            const d = await res.json();
            if (d.success) {
                const labels: Record<string, string> = {
                    SENT: 'marcado como Enviado',
                    RECEIVED: 'recibido — inventario actualizado',
                    CANCELLED: 'cancelado',
                };
                showToast('success', `Pedido ${labels[status] || status}`);
                loadAll(form.branchId);
            } else {
                showToast('error', d.error || 'No se pudo actualizar');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setChangingId(null); }
    }

    const filteredOrders = orders.filter(o => {
        if (statusFilter && o.status !== statusFilter) return false;
        if (search && !o.supplier.toLowerCase().includes(search.toLowerCase()) &&
            !o.orderNumber.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const totalPending = orders.filter(o => o.status === 'PENDING').length;
    const totalSent = orders.filter(o => o.status === 'SENT').length;
    const totalReceived = orders.filter(o => o.status === 'RECEIVED').length;
    const totalSpent = orders.filter(o => o.status === 'RECEIVED').reduce((s, o) => s + o.totalAmount, 0);

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
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Admin
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <ShoppingBag className="h-7 w-7 text-indigo-600" /> Pedidos a Proveedores
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Gestioná compras de materia prima e insumos</p>
                    </div>
                    <button onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold transition shadow-md">
                        <Plus className="h-4 w-4" /> Nuevo Pedido
                    </button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Pendientes', val: totalPending, color: 'bg-yellow-50 border-yellow-200', tc: 'text-yellow-700' },
                        { label: 'Enviados', val: totalSent, color: 'bg-blue-50 border-blue-200', tc: 'text-blue-700' },
                        { label: 'Recibidos', val: totalReceived, color: 'bg-green-50 border-green-200', tc: 'text-green-700' },
                        { label: 'Total gastado', val: fmt(totalSpent), color: 'bg-indigo-50 border-indigo-200', tc: 'text-indigo-700' },
                    ].map(k => (
                        <div key={k.label} className={`border rounded-2xl p-4 ${k.color}`}>
                            <p className="text-xs font-medium text-gray-500">{k.label}</p>
                            <p className={`text-2xl font-black mt-1 ${k.tc}`}>{k.val}</p>
                        </div>
                    ))}
                </div>

                {/* Filtros */}
                <div className="bg-white rounded-2xl shadow p-4 flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por proveedor o N° pedido…"
                            className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {['', ...Object.keys(STATUS_CONFIG)].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                {s ? STATUS_CONFIG[s].label : 'Todos'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lista de pedidos */}
                {loading ? (
                    <div className="text-center py-20 text-gray-400"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" /> Cargando…</div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No hay pedidos registrados aún</p>
                        <button onClick={() => setShowForm(true)} className="mt-3 text-indigo-600 hover:underline text-sm">Crear el primero</button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredOrders.map(order => {
                            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                            return (
                                <div key={order.id} className="bg-white rounded-2xl shadow border border-gray-100 p-5">
                                    <div className="flex items-start justify-between flex-wrap gap-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-xs text-gray-400">{order.orderNumber}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.color}`}>{cfg.label}</span>
                                            </div>
                                            <p className="font-bold text-gray-900 text-lg">{order.supplier}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {order.branch.name} · {order.user.name} ·{' '}
                                                {new Date(order.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                {order.expectedDate && ` · Esperado: ${new Date(order.expectedDate).toLocaleDateString('es-BO')}`}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400">Total</p>
                                            <p className="text-2xl font-black text-indigo-700">{fmt(order.totalAmount)}</p>
                                        </div>
                                    </div>
                                    {/* Items */}
                                    <div className="mt-3 border-t border-gray-50 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {order.items.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm text-gray-600">
                                                <span className="flex items-center gap-1.5">
                                                    <Package className="h-3.5 w-3.5 text-gray-400" />
                                                    {item.product.name}
                                                    <span className="text-gray-400 text-xs">{item.quantity} {item.product.unit}</span>
                                                </span>
                                                <span className="text-gray-800 font-medium">{fmt(item.subtotal)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {order.notes && <p className="text-xs text-gray-400 italic mt-2">"{order.notes}"</p>}

                                    {/* Acciones de estado */}
                                    {order.status !== 'RECEIVED' && order.status !== 'CANCELLED' && (
                                        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                                            {order.status === 'PENDING' && (
                                                <button
                                                    onClick={() => changeStatus(order.id, 'SENT')}
                                                    disabled={changingId === order.id}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition">
                                                    {changingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                                    Marcar como Enviado
                                                </button>
                                            )}
                                            {order.status === 'SENT' && (
                                                <button
                                                    onClick={() => changeStatus(order.id, 'RECEIVED')}
                                                    disabled={changingId === order.id}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition">
                                                    {changingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PackageCheck className="h-3.5 w-3.5" />}
                                                    Confirmar Recepción
                                                </button>
                                            )}
                                            <button
                                                onClick={() => changeStatus(order.id, 'CANCELLED')}
                                                disabled={changingId === order.id}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500 rounded-lg text-xs font-semibold transition">
                                                <Ban className="h-3.5 w-3.5" /> Cancelar
                                            </button>
                                        </div>
                                    )}
                                    {order.status === 'RECEIVED' && (
                                        <p className="mt-3 pt-3 border-t border-gray-100 text-xs text-green-600 font-medium flex items-center gap-1">
                                            <PackageCheck className="h-3.5 w-3.5" /> Stock actualizado en inventario
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de nuevo pedido */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <ShoppingBag className="h-5 w-5 text-indigo-600" /> Nuevo Pedido
                            </h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Sucursal y Proveedor */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Sucursal *</label>
                                    {isAdmin ? (
                                        <select required value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                                            <option value="">Seleccioná</option>
                                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    ) : (
                                        <input value={branches.find(b => b.id === form.branchId)?.name || ''} disabled
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50" />
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Proveedor *</label>
                                    <input required value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                                        placeholder="Nombre del proveedor"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 block mb-1.5"><Calendar className="h-3 w-3 inline mr-1" />Fecha esperada</label>
                                    <input type="date" value={form.expectedDate} onChange={e => setForm(f => ({ ...f, expectedDate: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Notas</label>
                                    <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                        placeholder="Observaciones…"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                                </div>
                            </div>

                            {/* Items del pedido */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-semibold text-gray-600">Productos *</label>
                                    <button type="button" onClick={addItem}
                                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                                        <Plus className="h-3.5 w-3.5" /> Agregar producto
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {items.map((item, i) => (
                                        <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
                                            {/* Buscador de producto */}
                                            <div className="relative">
                                                {item.productId ? (
                                                    <div className="flex items-center justify-between bg-indigo-50 rounded-lg px-3 py-2">
                                                        <span className="text-sm font-medium text-indigo-800">{item.productName}</span>
                                                        <button type="button" onClick={() => updateItem(i, 'productId', '')} className="text-indigo-400 hover:text-indigo-600">
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                                        <input value={productSearch[i] || ''}
                                                            onChange={e => setProductSearch(p => ({ ...p, [i]: e.target.value }))}
                                                            placeholder="Buscar producto…"
                                                            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                                                        {productSearch[i] && (
                                                            <div className="absolute top-full left-0 right-0 border border-gray-200 bg-white rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto">
                                                                {products.filter(p => p.name.toLowerCase().includes((productSearch[i] || '').toLowerCase()) || p.sku.toLowerCase().includes((productSearch[i] || '').toLowerCase())).slice(0, 8).map(p => (
                                                                    <button key={p.id} type="button" onClick={() => selectProduct(i, p)}
                                                                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm">
                                                                        {p.name} <span className="text-gray-400 text-xs">{p.sku}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="text-xs text-gray-500">Cantidad *</label>
                                                    <input type="number" min="0.01" step="0.01" value={item.quantity === 0 ? '' : item.quantity}
                                                        onChange={e => updateItem(i, 'quantity', e.target.value)}
                                                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500">Costo unit. (Bs.)</label>
                                                    <input type="number" min="0" step="0.01" value={item.unitCost === 0 ? '' : item.unitCost}
                                                        onChange={e => updateItem(i, 'unitCost', e.target.value)}
                                                        placeholder=""
                                                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                                                </div>
                                                <div className="flex items-end gap-2">
                                                    <div className="flex-1">
                                                        <label className="text-xs text-gray-500">Subtotal</label>
                                                        <p className="text-sm font-semibold text-gray-800 py-2 px-2 bg-gray-50 rounded-lg">
                                                            {fmt(parseFloat(item.quantity || '0') * parseFloat(item.unitCost || '0'))}
                                                        </p>
                                                    </div>
                                                    {items.length > 1 && (
                                                        <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 mb-1">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Total */}
                                <div className="mt-3 flex justify-end">
                                    <div className="bg-indigo-50 rounded-xl px-4 py-2.5 flex items-center gap-3">
                                        <TrendingDown className="h-4 w-4 text-indigo-500" />
                                        <span className="text-sm text-indigo-700 font-medium">Total del pedido:</span>
                                        <span className="text-xl font-black text-indigo-900">
                                            {fmt(items.reduce((s, i) => s + parseFloat(i.quantity || '0') * parseFloat(i.unitCost || '0'), 0))}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
                                    Crear Pedido
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
