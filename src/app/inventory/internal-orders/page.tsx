'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Package, Clock, CheckCircle2, Truck, XCircle, AlertCircle, ChevronDown, ChevronUp, X, ThumbsUp, ThumbsDown, PackageCheck } from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { Dialog } from '@/components/ui/dialog';

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
        currentFactoryStock: number;
        product: { id: string; name: string; sku: string; unit: string };
    }>;
};

type Branch = { id: string; name: string; type: string };
type Product = { id: string; name: string; sku: string; unit: string };

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING: { label: 'Pendiente', color: 'bg-[var(--status-warning-bg)] text-warning', icon: <Clock className="h-3.5 w-3.5" /> },
    APPROVED: { label: 'Aprobado', color: 'bg-[var(--status-info-bg)] text-info', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    DISPATCHED: { label: 'Despachado', color: 'bg-[var(--status-neutral-bg)] text-brand', icon: <Truck className="h-3.5 w-3.5" /> },
    RECEIVED: { label: 'Recibido', color: 'bg-[var(--status-success-bg)] text-success', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    CANCELLED: { label: 'Cancelado', color: 'bg-[var(--status-error-bg)] text-danger', icon: <XCircle className="h-3.5 w-3.5" /> },
};

export default function InternalOrdersPage() {
    const { user } = useSession();
    const isSystemAdmin = user?.role === 'ADMIN';
    const isManager = user?.role === 'MANAGER';
    // Para cosas de lectura general
    const isAdmin = isSystemAdmin || isManager;
    const [orders, setOrders] = useState<InternalOrder[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [factories, setFactories] = useState<Branch[]>([]);
    const [factoriesError, setFactoriesError] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});
    const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
    const [productSearch, setProductSearch] = useState('');
    const [prefillNote, setPrefillNote] = useState('');
    const prefilledProduct = useRef(false);

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
            fetch('/api/branches/factories').then(r => r.json()).catch(() => ({ success: false, error: 'No se pudieron cargar las fábricas' })),
            fetch('/api/products').then(r => r.json()),
        ]).then(([ordersData, branchesData, factoriesData, productsData]) => {
            if (ordersData.success) setOrders(ordersData.data);
            if (branchesData.success) setBranches(branchesData.data);
            if (factoriesData.success) {
                setFactories(factoriesData.data);
                setFactoriesError('');
            } else {
                setFactoriesError(factoriesData.error || 'No se pudieron cargar las fábricas');
            }
            if (productsData.success) {
                setProducts(productsData.data);
                const productId = new URLSearchParams(window.location.search).get('product');
                if (productId && !prefilledProduct.current) {
                    prefilledProduct.current = true;
                    fetch(`/api/inventory/internal-orders/prefill?productId=${encodeURIComponent(productId)}`).then(r => r.json()).then(prefill => {
                        if (!prefill.success) throw new Error(prefill.error || 'No se pudo preparar el pedido');
                        setForm(f => ({ ...f, items: prefill.data.items }));
                        setPrefillNote(prefill.data.mode === 'RECIPE'
                            ? `Se cargaron los ingredientes para 1 unidad de ${prefill.data.productName}. Ajusta las cantidades al abastecimiento que necesitas.`
                            : prefill.data.mode === 'UNCLASSIFIED'
                                ? 'Este producto aún no tiene preparación clasificada; el pedido se cargó como stock del producto. Revisa su configuración antes de abastecer.' : '');
                        setShowModal(true);
                    }).catch(error => showToast('error', error instanceof Error ? error.message : 'No se pudo preparar el pedido'));
                }
            }
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
                            receivedQty: receivedQuantities[`${orderId}_${i.id}`] ?? i.dispatchedQty ?? 0,
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
                            dispatchedQty: editedQuantities[`${orderId}_${i.id}`] ?? i.approvedQty ?? i.requestedQty,
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
                    approve: 'Pedido aprobado',
                    cancel: 'Pedido cancelado',
                    dispatch: 'Pedido despachado',
                    receive: 'Recepción confirmada — stock actualizado',
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
            items: f.items.map((item, i) => i === idx ? { ...item, [field]: value,
                ...(field === 'productId' ? { unit: products.find(p => p.id === value)?.unit || 'unit' } : {}) } : item),
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
                setForm({ fromBranchId: !isAdmin ? user?.branchIds?.[0] || '' : '', toBranchId: '', requestedBy: !isAdmin ? user?.name || '' : '', notes: '', items: [{ productId: '', requestedQty: 1, unit: 'unit' }] });
                setPrefillNote('');
            } else {
                showToast('error', data.error || 'Error al crear pedido');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSubmitting(false); }
    }

    return (
        <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-brand' : 'bg-danger'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="mx-auto max-w-5xl">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <button onClick={() => window.history.back()} className="text-sm text-muted hover:text-ink flex items-center gap-1 mb-2"><ArrowLeft className="h-4 w-4" /> Volver atrás</button>
                        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink flex items-center gap-3">
                            <Truck className="h-8 w-8 text-info" /> Pedidos Internos
                        </h1>
                        <p className="text-muted mt-1 text-sm">Solicitudes de stock de sucursales a la fábrica</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-brand hover:brightness-90 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                    >
                        <Plus className="h-4 w-4" /> Nuevo pedido
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-muted">Cargando pedidos...</div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-20 text-muted">
                        <Package className="h-12 w-12 mx-auto mb-3 text-muted" />
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
                                <div key={order.id} className="bg-surface rounded-2xl shadow-sm border border-line-subtle">
                                    <div
                                        className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-5 cursor-pointer"
                                        onClick={() => setExpanded(isExpanded ? null : order.id)}
                                    >
                                        <div className="flex min-w-0 flex-wrap items-center gap-4">
                                            <div className="min-w-0 text-center">
                                                <p className="break-all font-mono font-bold text-ink text-sm">{order.orderNumber}</p>
                                                <p className="text-xs text-muted">{new Date(order.requestedAt).toLocaleDateString('es')}</p>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="break-words font-medium text-ink text-sm">
                                                    {order.fromBranch.name} → {order.toBranch.name}
                                                </p>
                                                <p className="text-xs text-muted">Solicitado por: {order.requestedBy}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${config.color}`}>
                                                {config.icon} {config.label}
                                            </span>
                                            <span className="text-xs text-muted">{order.items.length} ítem{order.items.length !== 1 ? 's' : ''}</span>
                                            {/* Botones de acción según estado */}
                                            {canApproveOrDispatch && order.status === 'PENDING' && (
                                                <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => handleOrderAction(order.id, 'approve')} disabled={!!actionLoading}
                                                        className="flex items-center gap-1 px-2.5 py-1 bg-brand hover:brightness-90 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                                                        <ThumbsUp className="h-3 w-3" />
                                                        {actionLoading === order.id + 'approve' ? '...' : 'Aprobar'}
                                                    </button>
                                                    <button onClick={() => handleOrderAction(order.id, 'cancel')} disabled={!!actionLoading}
                                                        className="flex items-center gap-1 px-2.5 py-1 bg-[var(--status-error-bg)] hover:bg-[var(--status-error-bg)] text-danger border border-red-200 rounded-lg text-xs font-semibold disabled:opacity-50">
                                                        <ThumbsDown className="h-3 w-3" />
                                                        {actionLoading === order.id + 'cancel' ? '...' : 'Rechazar'}
                                                    </button>
                                                </div>
                                            )}
                                            {order.status === 'APPROVED' && canApproveOrDispatch && (
                                                <button onClick={e => { e.stopPropagation(); handleOrderAction(order.id, 'dispatch'); }} disabled={!!actionLoading}
                                                    className="flex items-center gap-1 px-2.5 py-1 bg-brand hover:brightness-90 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                                                    <Truck className="h-3 w-3" />
                                                    {actionLoading === order.id + 'dispatch' ? '...' : 'Despachar'}
                                                </button>
                                            )}
                                            {order.status === 'DISPATCHED' && canReceive && (
                                                <button onClick={e => { e.stopPropagation(); handleOrderAction(order.id, 'receive'); }} disabled={!!actionLoading}
                                                    className="flex items-center gap-1 px-2.5 py-1 bg-brand hover:brightness-90 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                                                    <PackageCheck className="h-3 w-3" />
                                                    {actionLoading === order.id + 'receive' ? '...' : 'Confirmar recepción'}
                                                </button>
                                            )}
                                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
                                        </div>
                                    </div>
                                            {isExpanded && (
                                                <div className="border-t border-line-subtle p-5">
                                                    {(isSystemAdmin || (isManager && user?.branchIds?.includes(order.fromBranch.id))) && order.status === 'PENDING' && (
                                                        <div className="mb-4 flex items-center gap-2 bg-blue-500/10 p-3 rounded-xl border border-blue-100">
                                                            <Truck className="h-4 w-4 text-info" />
                                                            <span className="text-sm font-semibold text-blue-900">Reasignar Fábrica:</span>
                                                            <select
                                                                value={order.toBranch.id}
                                                                onChange={e => changeOrderFactory(order.id, e.target.value)}
                                                                onClick={e => e.stopPropagation()}
                                                                className="text-xs border border-blue-500/30 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-surface"
                                                            >
                                                                {factories.map(b => (
                                                                    <option key={b.id} value={b.id} className="bg-surface text-ink">{b.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                    <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
                                                        <thead>
                                                            <tr className="text-left text-xs text-muted font-semibold">
                                                                <th className="pb-2">Producto</th>
                                                                <th className="pb-2">SKU</th>
                                                                <th className="pb-2">Solicitado</th>
                                                                <th className="pb-2">Aprobado</th>
                                                                <th className="pb-2">Despachado</th>
                                                                <th className="pb-2">Recibido</th>
                                                                <th className="pb-2 text-right">Stock Fábrica</th>
                                                            </tr>
                                                </thead>
                                                <tbody>
                                                    {order.items.map(item => (
                                                        <tr key={item.id} className="border-t border-line-subtle">
                                                            <td className="py-2 font-medium text-ink">{item.product.name}</td>
                                                            <td className="py-2 font-mono text-xs text-muted">{item.product.sku}</td>
                                                                <td className="py-2 text-ink">{item.requestedQty} {item.unit}</td>
                                                                <td className="py-2 text-ink">
                                                                    {canApproveOrDispatch && order.status === 'PENDING' ? (
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            step="0.01"
                                                                            className="w-20 bg-surface text-ink border border-blue-400/40 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-muted"
                                                                            value={(editedQuantities[`${order.id}_${item.id}`] ?? item.requestedQty) === 0 ? '' : (editedQuantities[`${order.id}_${item.id}`] ?? item.requestedQty)}
                                                                            onChange={e => setEditedQuantities(prev => ({ ...prev, [`${order.id}_${item.id}`]: parseFloat(e.target.value) || 0 }))}
                                                                            onClick={e => e.stopPropagation()}
                                                                        />
                                                                    ) : (
                                                                        item.approvedQty ?? '—'
                                                                    )}
                                                                </td>
                                                                <td className="py-2 text-ink">
                                                                    {canApproveOrDispatch && order.status === 'APPROVED' ? (
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            step="0.01"
                                                                            className="w-20 bg-surface text-ink border border-purple-400/40 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 placeholder:text-muted"
                                                                            value={(editedQuantities[`${order.id}_${item.id}`] ?? item.approvedQty ?? item.requestedQty) === 0 ? '' : (editedQuantities[`${order.id}_${item.id}`] ?? item.approvedQty ?? item.requestedQty)}
                                                                            onChange={e => setEditedQuantities(prev => ({ ...prev, [`${order.id}_${item.id}`]: parseFloat(e.target.value) || 0 }))}
                                                                            onClick={e => e.stopPropagation()}
                                                                        />
                                                                    ) : (
                                                                        item.dispatchedQty ?? '—'
                                                                    )}
                                                                </td>
                                                                <td className="py-2 text-ink">{canReceive && order.status === 'DISPATCHED' ? (
                                                                    <input type="number" min="0" max={item.dispatchedQty ?? 0} step="0.01"
                                                                        aria-label={`Cantidad recibida de ${item.product.name}`}
                                                                        className="w-20 rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink"
                                                                        value={receivedQuantities[`${order.id}_${item.id}`] ?? item.dispatchedQty ?? 0}
                                                                        onChange={e => setReceivedQuantities(prev => ({ ...prev, [`${order.id}_${item.id}`]: e.target.value === '' ? 0 : Number(e.target.value) }))}
                                                                        onClick={e => e.stopPropagation()} />
                                                                ) : item.receivedQty ?? '—'}</td>
                                                                <td className="py-2 text-right">
                                                                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${item.currentFactoryStock < (item.approvedQty ?? item.requestedQty) ? 'bg-[var(--status-error-bg)] text-danger border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                                                                        {item.currentFactoryStock} {item.unit}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                    ))}
                                                </tbody>
                                            </table></div>
                                            {order.notes && (
                                                <p className="text-xs text-muted mt-3 bg-surface rounded-lg px-3 py-2"> {order.notes}</p>
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
            <Dialog open={showModal} onClose={() => { if (!submitting) setShowModal(false); }} labelledBy="internal-order-dialog" className="max-w-lg">

                    <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg border border-line-subtle">
                        <div className="flex items-center justify-between p-6 border-b border-line-subtle">
                            <h2 id="internal-order-dialog" className="text-lg font-bold text-ink">Nuevo Pedido Interno</h2>
                            <button type="button" aria-label="Cerrar pedido interno" disabled={submitting} onClick={() => setShowModal(false)} className="grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-canvas disabled:opacity-50">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {prefillNote && <p role="note" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{prefillNote}</p>}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-ink mb-1.5">Sucursal solicitante *</label>
                                    {isAdmin ? (
                                        <select required value={form.fromBranchId} onChange={e => setForm(f => ({ ...f, fromBranchId: e.target.value }))}
                                            className="w-full bg-surface text-ink border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                                            <option value="" className="bg-surface text-ink">Seleccionar...</option>
                                            {branches.filter(b => b.type !== 'FABRICA').map(b => <option key={b.id} value={b.id} className="bg-surface text-ink">{b.name}</option>)}
                                        </select>
                                    ) : (
                                        <div className="w-full border border-line-subtle bg-surface rounded-xl px-3 py-2.5 text-sm text-ink font-medium">
                                            {branches.find(b => b.id === form.fromBranchId)?.name || 'Mi sucursal'}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-ink mb-1.5">Sucursal receptora (fábrica) *</label>
                                    <select required value={form.toBranchId} onChange={e => setForm(f => ({ ...f, toBranchId: e.target.value }))}
                                        className="w-full bg-surface text-ink border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                                        <option value="" className="bg-surface text-ink">Seleccionar...</option>
                                        {factories.map(b => <option key={b.id} value={b.id} className="bg-surface text-ink">{b.name}</option>)}
                                    </select>
                                    {factoriesError && <p className="text-xs text-danger mt-1">{factoriesError}</p>}
                                    {!factoriesError && factories.length === 0 && <p className="text-xs text-amber-400 mt-1">No hay fábricas activas disponibles.</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-ink mb-1.5">Solicitado por *</label>
                                <input required type="text" placeholder="Tu nombre" value={form.requestedBy}
                                    onChange={e => setForm(f => ({ ...f, requestedBy: e.target.value }))}
                                    className="w-full bg-surface text-ink border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                            </div>

                            <div className="border border-line rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-ink">Productos solicitados</h3>
                                    <button type="button" onClick={addItem}
                                        className="text-xs text-info hover:text-blue-300 font-medium flex items-center gap-1">
                                        <Plus className="h-3.5 w-3.5" /> Agregar
                                    </button>
                                </div>
                                {form.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2 items-center">
                                        <ProductCombobox
                                            products={products}
                                            value={item.productId}
                                            onChange={val => updateItem(idx, 'productId', val)}
                                        />
                                        <input type="number" min="0.01" step="0.01" value={item.requestedQty === 0 ? '' : item.requestedQty}
                                            onChange={e => updateItem(idx, 'requestedQty', parseFloat(e.target.value))}
                                            className="w-20 bg-surface text-ink border border-line rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300" />
                                        <span className="w-20 text-xs text-muted">{item.unit}</span>
                                        {form.items.length > 1 && (
                                            <button type="button" onClick={() => removeItem(idx)} className="text-danger hover:text-danger">
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-ink mb-1.5">Notas</label>
                                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Observaciones opcionales..."
                                    className="w-full bg-surface text-ink border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 border border-line rounded-xl text-sm font-medium text-muted hover:bg-canvas transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-brand hover:brightness-90 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                                    {submitting ? 'Enviando...' : 'Enviar pedido'}
                                </button>
                            </div>
                        </form>
                    </div>

            </Dialog>
        </main>
    );
}

function ProductCombobox({ products, value, onChange }: { products: any[], value: string, onChange: (id: string) => void }) {
    const [search, setSearch] = useState('');
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (value) {
            const p = products.find(p => p.id === value);
            if (p) setSearch(`${p.name} ${p.sku ? `(${p.sku})` : ''}`);
        } else {
            setSearch('');
        }
    }, [value, products]);

    const filtered = products.filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="relative flex-1 min-w-0">
            <input
                type="text"
                placeholder="Buscar y seleccionar producto..."
                value={search}
                onChange={e => {
                    setSearch(e.target.value);
                    setShow(true);
                    onChange('');
                }}
                onFocus={() => setShow(true)}
                onBlur={() => setTimeout(() => setShow(false), 200)}
                className="w-full bg-surface text-ink border border-line rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
            {show && (
                <div className="absolute z-50 mt-1 w-full bg-surface border border-line rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {filtered.length > 0 ? filtered.map(p => (
                        <div
                            key={p.id}
                            className="px-2 py-2 hover:bg-canvas cursor-pointer text-xs text-ink border-b border-line-subtle last:border-0"
                            onClick={() => {
                                onChange(p.id);
                                setSearch(`${p.name} ${p.sku ? `(${p.sku})` : ''}`);
                                setShow(false);
                            }}
                        >
                            {p.name} {p.sku ? `(${p.sku})` : ''}
                        </div>
                    )) : (
                        <div className="px-2 py-2 text-xs text-muted">No hay resultados</div>
                    )}
                </div>
            )}
        </div>
    );
}
