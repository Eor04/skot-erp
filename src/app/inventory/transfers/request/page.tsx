'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useSession } from '@/lib/session-context';

interface Branch { id: string; name: string; type: string; }
interface Product { id: string; name: string; sku: string; unit: string; currentStock: number; }
interface TransferItem { productId: string; productName: string; requestedQty: number; unit: string; }

export default function TransferRequestPage() {
    const { user, loading: sessionLoading } = useSession();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [items, setItems] = useState<TransferItem[]>([]);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [outgoing, setOutgoing] = useState(false);
    const [readiness, setReadiness] = useState<Record<string, string>>({});
    const loadedForUser = useRef<string | null>(null);

    const [form, setForm] = useState({
        myBranchId: '',      // sucursal que RECIBE (la del usuario)
        fromBranchId: '',    // sucursal que ENVÍA (de donde pederán los productos)
        notes: '',
    });

    // Items form state
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState('');
    const [productSearch, setProductSearch] = useState('');

    useEffect(() => {
        if (!sessionLoading && user && loadedForUser.current !== user.userId) {
            loadedForUser.current = user.userId;
            loadBranches();
        }
    }, [sessionLoading, user?.userId]);

    useEffect(() => {
        if (!form.fromBranchId || !form.myBranchId || !items.length || form.fromBranchId === form.myBranchId) {
            setReadiness({});
            return;
        }
        const controller = new AbortController();
        const params = new URLSearchParams({ fromBranchId: form.fromBranchId, toBranchId: form.myBranchId });
        for (const item of items) params.append('productId', item.productId);
        fetch(`/api/inventory/transfer-readiness?${params}`, { signal: controller.signal })
            .then(response => response.json())
            .then(result => {
                if (result.success) setReadiness(Object.fromEntries(result.data.map((row: { productId: string; reason: string }) => [row.productId, row.reason])));
                else setReadiness({});
            }).catch(error => { if (error.name !== 'AbortError') setReadiness({}); });
        return () => controller.abort();
    }, [form.fromBranchId, form.myBranchId, items]);

    const loadBranches = async () => {
        const params = new URLSearchParams(window.location.search);
        const source = params.get('from');
        const outgoingRequest = Boolean(source);
        setOutgoing(outgoingRequest);
        const res = await fetch(source ? `/api/inventory/transfer-destinations?fromBranchId=${encodeURIComponent(source)}` : '/api/branches');
        const d = await res.json();
        if (d.success) {
            setBranches(d.data);
            // Pre-seleccionar la primera sucursal del usuario como destino
            if (source) {
                setForm(f => ({ ...f, myBranchId: '', fromBranchId: source }));
                await loadProducts(source, params.get('product'), Number(params.get('qty')));
            } else if (user?.branchIds?.[0]) {
                setForm(f => ({ ...f, myBranchId: user.branchIds[0] }));
            }
        } else {
            showNotification('error', d.error || 'No se pudieron cargar las sucursales');
        }
    };

    const loadProducts = async (branchId: string, initialProduct?: string | null, initialQty?: number) => {
        if (!branchId) return;
        const res = await fetch(`/api/inventory/stock?branchId=${encodeURIComponent(branchId)}&limit=10000`);
        const d = await res.json();
        if (d.success) {
            const loaded: Product[] = d.data.map((s: any) => ({
                id: s.productId,
                name: s.product.name,
                sku: s.product.sku,
                unit: s.product.unit,
                currentStock: s.currentStock,
            }));
            setProducts(loaded);
            const product = loaded.find(p => p.id === initialProduct);
            if (product && initialQty && initialQty > 0 && product.currentStock > 0) setItems([{
                productId: product.id, productName: product.name, unit: product.unit,
                requestedQty: Math.min(initialQty, product.currentStock),
            }]);
            if (product && initialQty && product.currentStock < initialQty) showNotification('error', 'La cantidad precargada se ajustó al stock disponible en origen.');
        }
    };

    const handleFromBranchChange = (branchId: string) => {
        setForm(f => ({ ...f, fromBranchId: branchId }));
        setItems([]);
        setSelectedProduct('');
        loadProducts(branchId);
    };

    const addItem = () => {
        if (!selectedProduct || !qty || parseFloat(qty) <= 0) return;
        const prod = products.find(p => p.id === selectedProduct);
        if (!prod) return;
        if (items.find(i => i.productId === selectedProduct)) return; // evitar duplicados
        setItems(prev => [...prev, {
            productId: prod.id,
            productName: prod.name,
            requestedQty: parseFloat(qty),
            unit: prod.unit,
        }]);
        setSelectedProduct('');
        setQty('');
    };

    const removeItem = (productId: string) => {
        setItems(prev => prev.filter(i => i.productId !== productId));
    };

    const showNotification = (type: 'success' | 'error', msg: string) => {
        setNotification({ type, msg });
        setTimeout(() => setNotification(null), 4000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.myBranchId || !form.fromBranchId) {
            showNotification('error', 'Seleccioná la sucursal de origen');
            return;
        }
        if (items.length === 0) {
            showNotification('error', 'Agregá al menos un producto');
            return;
        }
        if (form.myBranchId === form.fromBranchId) {
            showNotification('error', 'Origen y destino no pueden ser la misma sucursal');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/inventory/transfers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromBranchId: form.fromBranchId, // de donde vienen los productos
                    toBranchId: form.myBranchId,     // a donde van (mi sucursal)
                    requestedBy: user?.userId,
                    notes: form.notes || null,
                    items: items.map(i => ({ productId: i.productId, requestedQty: i.requestedQty })),
                }),
            });
            const data = await res.json();

            if (data.success) {
                showNotification('success', `Transferencia ${data.data.transferNumber} creada y pendiente de despacho`);
                setItems([]);
                setForm(f => ({ ...f, fromBranchId: outgoing ? f.fromBranchId : '', notes: '' }));
                if (outgoing) loadProducts(form.fromBranchId);
                else setProducts([]);
            } else {
                showNotification('error', data.error || 'Error al enviar la solicitud');
            }
        } catch {
            showNotification('error', 'Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    const myBranch = branches.find(b => b.id === form.myBranchId);
    const fromBranch = branches.find(b => b.id === form.fromBranchId);
    const otherBranches = branches.filter(b => b.id !== form.myBranchId);

    return (
        <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            {notification && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${notification.type === 'success' ? 'bg-brand' : 'bg-danger'}`}>
                    {notification.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {notification.msg}
                </div>
            )}

            <div className="mx-auto max-w-3xl">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/inventory/transfers" className="text-sm text-muted hover:text-ink flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Transferencias
                    </Link>
                    <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">{outgoing ? 'Preparar envío' : 'Solicitar transferencia'}</h1>
                    <p className="text-muted mt-1">{outgoing ? 'Elige la sucursal que recibirá el envío' : 'Solicitá productos de otra sucursal o de la fábrica'}</p>
                    {!outgoing && <p className="mt-2 text-sm text-muted">Para pedir insumos a fábrica también puedes usar <Link className="text-brand underline" href="/inventory/internal-orders">pedidos internos</Link>.</p>}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Sucursales */}
                    <div className="bg-surface rounded-2xl shadow-sm border border-line-subtle p-6">
                        <h2 className="font-bold text-ink mb-4">Origen y destino</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-ink mb-1.5">
                                    Sucursal de destino (recibe) *
                                </label>
                                <select
                                    aria-label="Mi sucursal que recibe"
                                    value={form.myBranchId}
                                    onChange={e => setForm(f => ({ ...f, myBranchId: e.target.value }))}
                                    disabled={!outgoing && !!(user?.branchIds?.[0] && user.role !== 'ADMIN')}
                                    className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 disabled:bg-surface"
                                >
                                    <option value="" className="bg-surface text-ink">-- Seleccioná --</option>
                                    {branches.map(b => <option key={b.id} value={b.id} className="bg-surface text-ink">{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-ink mb-1.5">
                                    Sucursal de origen (provee) *
                                </label>
                                <select
                                    aria-label="Sucursal de origen que provee"
                                    value={form.fromBranchId}
                                    onChange={e => handleFromBranchChange(e.target.value)}
                                    disabled={outgoing}
                                    className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                                >
                                    <option value="" className="bg-surface text-ink">-- Seleccioná --</option>
                                    {otherBranches.map(b => <option key={b.id} value={b.id} className="bg-surface text-ink">{b.name} ({b.type})</option>)}
                                </select>
                            </div>
                        </div>

                        {myBranch && fromBranch && (
                            <div className="mt-3 p-3 bg-[var(--status-success-bg)] rounded-xl text-sm text-success">
                                <strong>{fromBranch.name}</strong> enviará productos a <strong>{myBranch.name}</strong>
                            </div>
                        )}

                        <div className="mt-4">
                            <label className="block text-sm font-semibold text-ink mb-1.5">Notas para el administrador</label>
                            <textarea
                                aria-label="Notas para el administrador"
                                rows={2}
                                value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder="Ej: Necesitamos urgente para el fin de semana..."
                                className="w-full bg-surface text-ink border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
                            />
                        </div>
                    </div>

                    {/* Agregar productos */}
                    <div className="bg-surface rounded-2xl shadow-sm border border-line-subtle p-6">
                        <h2 className="font-bold text-ink mb-4">Productos a solicitar</h2>

                        {!form.fromBranchId ? (
                            <p className="text-muted text-sm">Seleccioná la sucursal de origen para ver sus productos disponibles</p>
                        ) : (
                            <>
                                <div className="flex flex-wrap gap-3 mb-4">
                                    <ProductCombobox
                                        products={products}
                                        value={selectedProduct}
                                        onChange={setSelectedProduct}
                                    />
                                    <input
                                        aria-label="Cantidad a solicitar"
                                        type="number" min="0.01" step="0.01"
                                        value={qty}
                                        onChange={e => setQty(e.target.value)}
                                        placeholder="Cantidad"
                                        className="w-28 bg-surface text-ink border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="flex items-center gap-1 px-4 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:brightness-90 transition"
                                    >
                                        <Plus className="h-4 w-4" /> Agregar
                                    </button>
                                </div>

                                {/* Lista de items */}
                                {items.length > 0 ? (
                                    <div className="space-y-2">
                                        {items.map(item => (
                                            <div key={item.productId} className="flex items-center justify-between bg-[var(--status-success-bg)] rounded-xl px-4 py-3">
                                                <div>
                                                    <p className="font-semibold text-sm text-ink">{item.productName}</p>
                                                    <p className="text-xs text-muted">{item.requestedQty} {item.unit}</p>
                                                    {readiness[item.productId] && <p className="mt-1 text-xs text-warning">
                                                        {readiness[item.productId]}.{' '}
                                                        {(user?.role === 'ADMIN' || (user?.role === 'MANAGER' && user.branchIds?.includes(form.myBranchId)))
                                                            ? <Link className="underline" href={`/admin/branch-products?branchId=${encodeURIComponent(form.myBranchId)}&product=${encodeURIComponent(item.productId)}`}>Revisar configuración</Link>
                                                            : 'Avisá a administración para revisarlo.'}
                                                    </p>}
                                                </div>
                                                <button type="button" onClick={() => removeItem(item.productId)} aria-label={`Quitar ${item.productName} de la solicitud`} className="grid h-11 w-11 place-items-center rounded-lg text-danger hover:bg-[var(--status-error-bg)]">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted text-sm text-center py-4">Aún no hay productos en la solicitud</p>
                                )}
                            </>
                        )}
                    </div>

                    {/* Botón enviar */}
                    <button
                        type="submit"
                        disabled={submitting || items.length === 0}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand hover:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg transition "
                    >
                        {submitting
                            ? <><Loader2 className="h-5 w-5 animate-spin" /> Enviando solicitud…</>
                            : <><Send className="h-5 w-5" /> {outgoing ? 'Crear transferencia' : 'Enviar solicitud'}</>
                        }
                    </button>
                    <p className="text-center text-sm"><Link href="/inventory/transfers" className="text-brand underline">Ver transferencias y despachos</Link></p>
                </form>
            </div>
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
        <div className="relative min-w-[200px] flex-1">
            <input
                aria-label="Buscar y seleccionar producto"
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
                className="w-full bg-surface text-ink border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
            />
            {show && (
                <div className="absolute z-50 mt-1 w-full bg-surface border border-line rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {filtered.length > 0 ? filtered.map(p => (
                        <div
                            key={p.id}
                            className="px-3 py-2 hover:bg-canvas cursor-pointer text-sm text-ink border-b border-line-subtle last:border-0"
                            onClick={() => {
                                onChange(p.id);
                                setSearch(`${p.name} ${p.sku ? `(${p.sku})` : ''}`);
                                setShow(false);
                            }}
                        >
                            <div className="font-medium">{p.name} {p.sku ? `(${p.sku})` : ''}</div>
                            <div className="text-xs text-muted">Stock disponible: {p.currentStock} {p.unit}</div>
                        </div>
                    )) : (
                        <div className="px-3 py-2 text-sm text-muted">No hay resultados</div>
                    )}
                </div>
            )}
        </div>
    );
}
