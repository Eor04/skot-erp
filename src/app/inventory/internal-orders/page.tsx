'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Package, Clock, CheckCircle2, Truck, XCircle, AlertCircle, ChevronDown, ChevronUp, X, ThumbsUp, ThumbsDown, PackageCheck } from 'lucide-react';
import { useSession } from '@/lib/session-context';

type OrderStatus = 'PENDING' | 'APPROVED' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED';

type InternalOrder = {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    requestedBy: string;
    requestedAt: string;
    notes: string | null;
    fromBranch: { id: string; name: string; type: string };
    toBranch: { id: string; name: string; type: string };
    items: Array<{
        id: string;
        requestedQty: number;
        approvedQty: number | null;
        dispatchedQty: number | null;
        receivedQty: number | null;
        unit: string;
        product: { id: string; name: string; sku: string; unit: string };
    }>;
};

type Branch = { id: string; name: string; type: string };
type Product = { id: string; name: string; sku: string; unit: string };

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3.5 w-3.5" /> },
    APPROVED: { label: 'Aprobado', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    DISPATCHED: { label: 'Despachado', color: 'bg-purple-100 text-purple-700', icon: <Truck className="h-3.5 w-3.5" /> },
    RECEIVED: { label: 'Recibido', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3.5 w-3.5" /> },
};

export default function InternalOrdersPage() {
    const { user } = useSession();
    const isSystemAdmin = user?.role === 'ADMIN';
    const isManager = user?.role === 'MANAGER';
    // Para cosas de lectura general
    const isAdmin = isSystemAdmin || isManager;
    const [orders, setOrders] = useState<InternalOrder[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});

    const [form, setForm] = useState({
        fromBranchId: '',
        toBranchId: '',
        requestedBy: '',
        notes: '',
        items: [{ productId: '', requestedQty: 1, unit: 'unit' }],
    });

    useEffect(() => {
        const branchId = !isAdmin ? user?.branchIds?.[0] : null;
        const ordersUrl = branchId
            ? `/api/inventory/internal-orders?branchId=${branchId}`
            : '/api/inventory/internal-orders';

        Promise.all([
            fetch(ordersUrl).then(r => r.json()),
            fetch('/api/branches').then(r => r.json()),
            fetch('/api/products').then(r => r.json()),
        ]).then(([ordersData, branchesData, productsData]) => {
            if (ordersData.success) setOrders(ordersData.data);
            if (branchesData.success) setBranches(branchesData.data);
            if (productsData.success) setProducts(productsData.data);
            // Pre-rellenar formulario para cajeros
            if (!isAdmin && branchId) {
                setForm(f => ({
                    ...f,
                    fromBranchId: branchId,
                    requestedBy: user?.name || '',
                }));
            }
        }).finally(() => setLoading(false));
    }, [isAdmin, user]);

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }

    async function handleOrderAction(orderId: string, action: 'approve' | 'cancel' | 'dispatch' | 'receive') {
        setActionLoading(orderId + action);
        try {
            let res: Response;
            if (action === 'receive') {
                const order = orders.find(o => o.id === orderId);
                if (!order) throw new Error('Pedido no encontrado');
                res = await fetch(`/api/inventory/internal-orders/${orderId}/receive`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        receivedBy: user?.userId ?? 'admin',
                        items: order.items.map(i => ({
                            itemId: i.id,
                            receivedQty: i.dispatchedQty ?? i.requestedQty,
                        })),
                    }),
                });
            } else if (action === 'dispatch') {
                const order = orders.find(o => o.id === orderId);
                if (!order) throw new Error('Pedido no encontrado');
                res = await fetch(`/api/inventory/internal-orders/${orderId}/dispatch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        dispatchedBy: user?.userId ?? 'admin',
                        items: order.items.map(i => ({
                            itemId: i.id,
                            dispatchedQty: i.approvedQty ?? i.requestedQty,
                        })),
                    }),
                });
            } else {
                // approve o cancel → POST /approve con status opcional
                res = await fetch(`/api/inventory/internal-orders/${orderId}/approve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        approvedBy: user?.userId ?? 'admin',
                        status: action === 'cancel' ? 'CANCELLED' : 'APPROVED',
                        items: action === 'approve' ? orders.find(o => o.id === orderId)?.items.map(i => ({
                            itemId: i.id,
                            approvedQty: editedQuantities[`${orderId}_${i.id}`] ?? i.requestedQty,
                        })) : undefined,
                    }),
                });
            }
            const data = await res.json();
            if (data.success) {
                const msgs: Record<string, string> = {
                    approve: '✅ Pedido aprobado',
                    cancel: '❌ Pedido cancelado',
                    dispatch: '🚚 Pedido despachado',
                    receive: '📦 Recepción confirmada — stock actualizado',
                };
                showToast('success', msgs[action] || 'Listo');
                const refreshed = await fetch('/api/inventory/internal-orders').then(r => r.json());
                if (refreshed.success) setOrders(refreshed.data);
            } else {
                showToast('error', data.error || 'Error al procesar');
            }
        } catch (err: any) {
            showToast('error', err.message || 'Error de conexión');
        } finally {
            setActionLoading(null);
        }
    }

    async function changeOrderFactory(orderId: string, newFactoryId: string) {
        try {
            const res = await fetch(`/api/inventory/internal-orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toBranchId: newFactoryId }),
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', 'Fábrica reasignada correctamente');
                setOrders(orders.map(o => o.id === orderId ? { ...o, toBranch: data.data.toBranch } : o));
            } else {
                showToast('error', data.error || 'Error al reasignar');
            }
        } catch {
            showToast('error', 'Error de conexión');
        }
    }

    function addItem() {
        setForm(f => ({ ...f, items: [...f.items, { productId: '', requestedQty: 1, unit: 'unit' }] }));
    }

    function removeItem(idx: number) {
        setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
    }

    function updateItem(idx: number, field: string, value: any) {
        setForm(f => ({
            ...f,
            items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item),
        }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.items.every(i => i.productId && i.requestedQty > 0)) {
            showToast('error', 'Completá todos los ítems del pedido');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/inventory/internal-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                setOrders(prev => [data.data, ...prev]);
                showToast('success', `Pedido ${data.data.orderNumber} creado`);
                setShowModal(false);
                setForm({ fromBranchId: '', toBranchId: '', requestedBy: '', notes: '', items: [{ productId: '', requestedQty: 1, unit: 'unit' }] });
            } else {
                showToast('error', data.error || 'Error al crear pedido');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSubmitting(false); }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/inventory" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver a Inventario
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Truck className="h-8 w-8 text-blue-600" /> Pedidos Internos
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">Solicitudes de stock de sucursales a la fábrica</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                    >
                        <Plus className="h-4 w-4" /> Nuevo pedido
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-400">Cargando pedidos...</div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No hay pedidos internos registrados</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.map(order => {
                            const config = STATUS_CONFIG[order.status];
                            const isExpanded = expanded === order.id;
                            const canApproveOrDispatch = isSystemAdmin || user?.branchIds?.includes(order.toBranch.id);
                            const canReceive = isSystemAdmin || user?.branchIds?.includes(order.fromBranch.id);
                            return (
                                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100">
                                    <div
                                        className="flex items-center justify-between p-5 cursor-pointer"
                                        onClick={() => setExpanded(isExpanded ? null : order.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <p className="font-mono font-bold text-gray-800 text-sm">{order.orderNumber}</p>
                                                <p className="text-xs text-gray-400">{new Date(order.requestedAt).toLocaleDateString('es')}</p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">
                                                    {order.fromBranch.name} → {order.toBranch.name}
                                                </p>
                                                <p className="text-xs text-gray-500">Solicitado por: {order.requestedBy}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${config.color}`}>
                                                {config.icon} {config.label}
                                            </span>
                                            <span className="text-xs text-gray-400">{order.items.length} ítem{order.items.length !== 1 ? 's' : ''}</span>
                                            {/* Botones de acción según estado */}
                                            {canApproveOrDispatch && order.status === 'PENDING' && (
                                                <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => handleOrderAction(order.id, 'approve')} disabled={!!actionLoading}
                                                        className="flex items-center gap-1 px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                                                        <ThumbsUp className="h-3 w-3" />
                                                        {actionLoading === order.id + 'approve' ? '...' : 'Aprobar'}
                                                    </button>
                                                    <button onClick={() => handleOrderAction(order.id, 'cancel')} disabled={!!actionLoading}
                                                        className="flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold disabled:opacity-50">
                                                        <ThumbsDown className="h-3 w-3" />
                                                        {actionLoading === order.id + 'cancel' ? '...' : 'Rechazar'}
                                                    </button>
                                                </div>
                                            )}
                                            {order.status === 'APPROVED' && canApproveOrDispatch && (
                                                <button onClick={e => { e.stopPropagation(); handleOrderAction(order.id, 'dispatch'); }} disabled={!!actionLoading}
                                                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                                                    <Truck className="h-3 w-3" />
                                                    {actionLoading === order.id + 'dispatch' ? '...' : 'Despachar'}
                                                </button>
                                            )}
                                            {order.status === 'DISPATCHED' && canReceive && (
                                                <button onClick={e => { e.stopPropagation(); handleOrderAction(order.id, 'receive'); }} disabled={!!actionLoading}
                                                    className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                                                    <PackageCheck className="h-3 w-3" />
                                                    {actionLoading === order.id + 'receive' ? '...' : 'Confirmar recepción'}
                                                </button>
                                            )}
                                            {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                        </div>
                                    </div>
                                            {isExpanded && (
                                                <div className="border-t border-gray-100 p-5">
                                                    {canApproveOrDispatch && order.status === 'PENDING' && (
                                                        <div className="mb-4 flex items-center gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100">
                                                            <Truck className="h-4 w-4 text-blue-600" />
                                                            <span className="text-sm font-semibold text-blue-900">Reasignar Fábrica:</span>
                                                            <select 
                                                                value={order.toBranch.id}
                                                                onChange={e => changeOrderFactory(order.id, e.target.value)}
                                                                onClick={e => e.stopPropagation()}
                                                                className="text-xs border border-blue-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                                            >
                                                                {branches.filter(b => b.type === 'FABRICA').map(b => (
                                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="text-left text-xs text-gray-500 font-semibold">
                                                                <th className="pb-2">Producto</th>
                                                                <th className="pb-2">SKU</th>
                                                                <th className="pb-2">Solicitado</th>
                                                                <th className="pb-2">Aprobado</th>
                                                        <th className="pb-2">Despachado</th>
                                                        <th className="pb-2">Recibido</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {order.items.map(item => (
                                                        <tr key={item.id} className="border-t border-gray-50">
                                                            <td className="py-2 font-medium text-gray-900">{item.product.name}</td>
                                                            <td className="py-2 font-mono text-xs text-gray-500">{item.product.sku}</td>
                                                                <td className="py-2 text-gray-700">{item.requestedQty} {item.unit}</td>
                                                                <td className="py-2 text-gray-700">
                                                                    {canApproveOrDispatch && order.status === 'PENDING' ? (
                                                                        <input 
                                                                            type="number" 
                                                                            min="0" 
                                                                            step="0.01"
                                                                            className="w-20 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                            value={editedQuantities[`${order.id}_${item.id}`] ?? item.requestedQty}
                                                                            onChange={e => setEditedQuantities(prev => ({ ...prev, [`${order.id}_${item.id}`]: parseFloat(e.target.value) || 0 }))}
                                                                            onClick={e => e.stopPropagation()}
                                                                        />
                                                                    ) : (
                                                                        item.approvedQty ?? '—'
                                                                    )}
                                                                </td>
                                                                <td className="py-2 text-gray-700">{item.dispatchedQty ?? '—'}</td>
                                                            <td className="py-2 text-gray-700">{item.receivedQty ?? '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {order.notes && (
                                                <p className="text-xs text-gray-500 mt-3 bg-gray-50 rounded-lg px-3 py-2">📝 {order.notes}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal nuevo pedido */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-start justify-center p-4 overflow-y-auto pt-10">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">Nuevo Pedido Interno</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sucursal solicitante *</label>
                                    {isAdmin ? (
                                        <select required value={form.fromBranchId} onChange={e => setForm(f => ({ ...f, fromBranchId: e.target.value }))}
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                                            <option value="">Seleccionar...</option>
                                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    ) : (
                                        <div className="w-full border border-gray-100 bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-700 font-medium">
                                            {branches.find(b => b.id === form.fromBranchId)?.name || 'Mi sucursal'}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sucursal receptora (fábrica) *</label>
                                    <select required value={form.toBranchId} onChange={e => setForm(f => ({ ...f, toBranchId: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                                        <option value="">Seleccionar...</option>
                                        {branches.filter(b => b.type === 'FABRICA').map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Solicitado por *</label>
                                <input required type="text" placeholder="Tu nombre" value={form.requestedBy}
                                    onChange={e => setForm(f => ({ ...f, requestedBy: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                            </div>

                            <div className="border border-gray-200 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-700">Productos solicitados</h3>
                                    <button type="button" onClick={addItem}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                                        <Plus className="h-3.5 w-3.5" /> Agregar
                                    </button>
                                </div>
                                {form.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2 items-center">
                                        <select required value={item.productId} onChange={e => updateItem(idx, 'productId', e.target.value)}
                                            className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300">
                                            <option value="">Producto...</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                        </select>
                                        <input type="number" min="0.01" step="0.01" value={item.requestedQty}
                                            onChange={e => updateItem(idx, 'requestedQty', parseFloat(e.target.value))}
                                            className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300" />
                                        <select value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}
                                            className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300">
                                            {['unit', 'kg', 'gr', 'litro', 'ml', 'bolsa'].map(u => <option key={u}>{u}</option>)}
                                        </select>
                                        {form.items.length > 1 && (
                                            <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notas</label>
                                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Observaciones opcionales..."
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                                    {submitting ? 'Enviando...' : 'Enviar pedido'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
