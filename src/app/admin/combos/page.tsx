'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Plus, Pencil, Trash2, X, AlertCircle, CheckCircle2,
    Package, Search, ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';

/* ──────────────── Types ──────────────── */
type Product = { id: string; name: string; sku: string; unit: string; type: string };
type ComboItem = { productId: string; quantity: number; product?: Product };
type Combo = {
    id: string; name: string; description: string | null;
    price: number; active: boolean; imageUrl: string | null;
    items: (ComboItem & { product: Product })[];
};

const EMPTY_FORM = { name: '', description: '', price: 0, active: true, imageUrl: '' };

/* ──────────────── Component ──────────────── */
export default function CombosPage() {
    const [combos, setCombos] = useState<Combo[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<Combo | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [items, setItems] = useState<ComboItem[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }

    function loadData() {
        setLoading(true);
        Promise.all([
            fetch('/api/admin/combos').then(r => r.json()),
            fetch('/api/admin/products').then(r => r.json()),
        ]).then(([c, p]) => {
            if (c.success) setCombos(c.data);
            if (p.success) setProducts(p.data);
        }).finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, []);

    function openCreate() {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setItems([]);
        setProductSearch('');
        setShowModal(true);
    }

    function openEdit(combo: Combo) {
        setEditingId(combo.id);
        setForm({ name: combo.name, description: combo.description || '', price: combo.price, active: combo.active, imageUrl: combo.imageUrl || '' });
        setItems(combo.items.map(i => ({ productId: i.productId, quantity: i.quantity })));
        setProductSearch('');
        setShowModal(true);
    }

    function addItem(product: Product) {
        if (items.find(i => i.productId === product.id)) return;
        setItems(prev => [...prev, { productId: product.id, quantity: 1 }]);
        setProductSearch('');
    }

    function removeItem(productId: string) {
        setItems(prev => prev.filter(i => i.productId !== productId));
    }

    function updateItemQty(productId: string, qty: number) {
        setItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (items.length === 0) { showToast('error', 'Agregá al menos un producto al combo'); return; }
        setSubmitting(true);
        try {
            const url = editingId ? `/api/admin/combos/${editingId}` : '/api/admin/combos';
            const method = editingId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, items }) });
            const data = await res.json();
            if (data.success) {
                showToast('success', editingId ? 'Combo actualizado' : 'Combo creado');
                setShowModal(false);
                loadData();
            } else {
                showToast('error', data.error || 'Error');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSubmitting(false); }
    }

    async function handleDelete(combo: Combo) {
        setConfirmDelete(null);
        const res = await fetch(`/api/admin/combos/${combo.id}`, { method: 'DELETE' });
        const d = await res.json();
        if (d.success) {
            showToast('success', `Combo "${combo.name}" desactivado`);
            loadData();
        } else {
            showToast('error', d.error || 'Error');
        }
    }

    // Productos que coinciden con la búsqueda y no están ya en el combo
    const suggestedProducts = products.filter(p =>
        (p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase())) &&
        !items.find(i => i.productId === p.id)
    ).slice(0, 6);

    return (
        <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-brand' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Confirm Delete */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-line-subtle rounded-xl shadow-lg w-full max-w-sm p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-ink mb-1">¿Desactivar combo?</h3>
                        <p className="text-muted text-sm mb-6"><strong>{confirmDelete.name}</strong> no aparecerá en el POS.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-2.5 border border-line-subtle rounded-xl text-sm font-medium text-muted hover:bg-canvas">
                                Cancelar
                            </button>
                            <button onClick={() => handleDelete(confirmDelete)}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold">
                                Desactivar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative z-10 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                    <div>
                        <Link href="/admin" className="text-sm text-muted hover:text-ink flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver a Admin
                        </Link>
                        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl flex items-center gap-3">
                            <Layers className="h-7 w-7 text-brand" /> Combos
                        </h1>
                        <p className="text-muted mt-1 text-sm">Agrupaciones de productos con precio especial (burger + bebida, açaí + topping, etc.)</p>
                    </div>
                    <button onClick={openCreate}
                        className="flex min-h-11 items-center gap-2 bg-brand hover:brightness-90 text-white px-4 py-2.5 rounded-xl font-medium transition">
                        <Plus className="h-4 w-4" /> Nuevo combo
                    </button>
                </div>

                {/* Lista */}
                {loading ? (
                    <div className="text-center py-20 text-muted">Cargando combos…</div>
                ) : combos.length === 0 ? (
                    <div className="text-center py-16 text-muted">
                        <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No hay combos registrados</p>
                        <button onClick={openCreate} className="mt-3 text-brand font-medium text-sm hover:underline">
                            + Crear el primero
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {combos.map(combo => (
                            <div key={combo.id} className={`bg-surface border border-line-subtle rounded-xl shadow overflow-x-auto ${!combo.active ? 'opacity-60' : ''}`}>
                                {/* Fila principal */}
                                <div className="flex items-center gap-4 p-5">
                                    {/* Foto */}
                                    {combo.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={combo.imageUrl} alt={combo.name}
                                            className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-line-subtle" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-xl bg-canvas flex items-center justify-center flex-shrink-0">
                                            <Layers className="h-7 w-7 text-teal-400" />
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-ink text-lg">{combo.name}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${combo.active ? 'bg-[var(--status-success-bg)] text-success' : 'bg-canvas text-muted'}`}>
                                                {combo.active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </div>
                                        {combo.description && <p className="text-sm text-muted mt-0.5 truncate">{combo.description}</p>}
                                        <p className="text-xs text-muted mt-1">{combo.items.length} producto{combo.items.length !== 1 ? 's' : ''}</p>
                                    </div>

                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className="text-xl font-black text-brand">Bs. {combo.price.toFixed(2)}</span>
                                        <button onClick={() => openEdit(combo)}
                                            className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => setConfirmDelete(combo)}
                                            className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Desactivar">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => setExpanded(expanded === combo.id ? null : combo.id)}
                                            className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-ink hover:bg-canvas rounded-lg transition">
                                            {expanded === combo.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Detalle expandible */}
                                {expanded === combo.id && (
                                    <div className="bg-surface border-t border-line-subtle px-5 py-4">
                                        <p className="text-xs font-semibold text-muted mb-3 uppercase tracking-wide">Productos incluidos</p>
                                        <div className="space-y-2">
                                            {combo.items.map(item => (
                                                <div key={item.productId} className="flex items-center gap-3 text-sm">
                                                    <Package className="h-4 w-4 text-muted flex-shrink-0" />
                                                    <span className="font-medium text-ink">{item.product.name}</span>
                                                    <span className="text-muted text-xs font-mono">{item.product.sku}</span>
                                                    <span className="ml-auto bg-teal-100 text-brand px-2 py-0.5 rounded-full text-xs font-semibold">
                                                        ×{item.quantity}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                    <div className="bg-surface border border-line-subtle rounded-xl shadow-lg w-full max-w-lg max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-line-subtle sticky top-0 bg-surface border border-line-subtle z-10">
                            <h2 className="text-lg font-bold text-ink">
                                {editingId ? 'Editar combo' : 'Nuevo combo'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"><X className="h-5 w-5" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Imagen */}
                            <div className="flex items-start gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-ink mb-2">Foto</label>
                                    <ImageUpload
                                        value={form.imageUrl || null}
                                        onChange={url => setForm(f => ({ ...f, imageUrl: url || '' }))}
                                        size="sm"
                                    />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-ink mb-1.5">Nombre *</label>
                                        <input required type="text" placeholder="Ej: Combo Familiar" value={form.name}
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                            className="w-full border border-line-subtle rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-ink mb-1.5">Precio (Bs.) *</label>
                                        <input required type="number" min="0" step="0.5" value={form.price === 0 ? '' : form.price}
                                            onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                                            className="w-full border border-line-subtle rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-ink mb-1.5">Descripción</label>
                                <input type="text" placeholder="Ej: Hamburguesa + papas + bebida a precio especial" value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full border border-line-subtle rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                            </div>

                            {/* Toggle activo */}
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${form.active ? 'bg-brand' : 'bg-gray-300'}`}>
                                    <span className={`inline-block h-4 w-4 rounded-full bg-surface border border-line-subtle shadow transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                                <span className="text-sm text-ink">{form.active ? 'Activo en el POS' : 'Inactivo (oculto)'}</span>
                            </div>

                            {/* Builder de productos */}
                            <div>
                                <label className="block text-sm font-semibold text-ink mb-2">
                                    Productos del combo *
                                    <span className="ml-1 font-normal text-muted">({items.length} seleccionados)</span>
                                </label>

                                {/* Items seleccionados */}
                                {items.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                        {items.map(item => {
                                            const p = products.find(pr => pr.id === item.productId);
                                            return (
                                                <div key={item.productId} className="flex flex-wrap items-center gap-3 rounded-xl bg-canvas px-3 py-2">
                                                    <Package className="h-4 w-4 flex-shrink-0 text-brand" />
                                                    <span className="min-w-[120px] flex-1 break-words text-sm font-medium text-ink">{p?.name}</span>
                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        <button type="button" aria-label={`Disminuir cantidad de ${p?.name || 'producto'}`} onClick={() => updateItemQty(item.productId, Math.max(0.5, item.quantity - 0.5))}
                                                            className="h-11 w-11 rounded-full bg-surface border border-line-subtle flex items-center justify-center text-muted hover:bg-canvas text-sm font-bold">−</button>
                                                        <span className="w-8 text-center text-sm font-bold text-brand">{item.quantity}</span>
                                                        <button type="button" aria-label={`Aumentar cantidad de ${p?.name || 'producto'}`} onClick={() => updateItemQty(item.productId, item.quantity + 0.5)}
                                                            className="h-11 w-11 rounded-full bg-surface border border-line-subtle flex items-center justify-center text-muted hover:bg-canvas text-sm font-bold">+</button>
                                                    </div>
                                                    <button type="button" aria-label={`Quitar ${p?.name || 'producto'} del combo`} onClick={() => removeItem(item.productId)}
                                                        className="grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-danger"><X className="h-4 w-4" /></button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Buscador de productos */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                                    <input type="text" placeholder="Buscar producto para agregar…" value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 border border-line-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                                </div>
                                {productSearch && suggestedProducts.length > 0 && (
                                    <div className="mt-1 border border-line-subtle rounded-xl overflow-hidden shadow-sm">
                                        {suggestedProducts.map(p => (
                                            <button key={p.id} type="button" onClick={() => addItem(p)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-canvas border-b border-gray-50 last:border-0 transition">
                                                <Package className="h-4 w-4 text-muted flex-shrink-0" />
                                                <span className="flex-1 font-medium text-ink">{p.name}</span>
                                                <span className="text-xs text-muted font-mono">{p.sku}</span>
                                                <Plus className="h-4 w-4 text-brand" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {productSearch && suggestedProducts.length === 0 && (
                                    <p className="text-xs text-muted mt-2 text-center">No se encontraron productos disponibles</p>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 border border-line-subtle rounded-xl text-sm font-medium text-muted hover:bg-canvas transition">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-brand hover:brightness-90 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                                    {submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear combo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
