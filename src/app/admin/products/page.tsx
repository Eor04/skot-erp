'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Plus, ArrowLeft, Search, X, AlertCircle, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';


type Product = {
    id: string; name: string; sku: string; unit: string;
    category: string; type: string; description: string | null;
    price: number; costPrice: number; isActive: boolean; imageUrl: string | null;
};


const CATEGORIES = ['ACAI_BASE', 'ACAI_TOPPING', 'BURGER', 'BURGER_EXTRA', 'BEVERAGE', 'RAW_MATERIAL', 'PACKAGING'];
const CAT_LABELS: Record<string, string> = {
    ACAI_BASE: 'Base Açaí', ACAI_TOPPING: 'Topping Açaí', BURGER: 'Hamburguesa',
    BURGER_EXTRA: 'Extra / Porción', BEVERAGE: 'Bebida', RAW_MATERIAL: 'Materia Prima', PACKAGING: 'Empaque',
};
const catColors: Record<string, string> = {
    ACAI_BASE: 'bg-purple-100 text-purple-700', ACAI_TOPPING: 'bg-pink-100 text-pink-700',
    BURGER: 'bg-orange-100 text-orange-700', BURGER_EXTRA: 'bg-amber-100 text-amber-700',
    BEVERAGE: 'bg-blue-100 text-blue-700', RAW_MATERIAL: 'bg-gray-100 text-gray-700',
    PACKAGING: 'bg-teal-100 text-teal-700',
};

const EMPTY_FORM = { name: '', sku: '', unit: 'kg', category: 'RAW_MATERIAL', price: 0, costPrice: 0, description: '', imageUrl: '' };


export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('');

    // Modal crear/editar
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    // Confirmar eliminación
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    function loadProducts() {
        setLoading(true);
        fetch('/api/admin/products')
            .then(r => r.json())
            .then(d => { if (d.success) setProducts(d.data); })
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadProducts(); }, []);

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }

    function openCreate() {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setShowModal(true);
    }

    function openEdit(p: Product) {
        setEditingId(p.id);
        setForm({
            name: p.name,
            sku: p.sku,
            unit: p.unit,
            category: p.category || p.type,
            price: p.price,
            costPrice: p.costPrice,
            description: p.description || '',
            imageUrl: p.imageUrl || '',
        });
        setShowModal(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const isEdit = !!editingId;
            const url = isEdit ? `/api/admin/products/${editingId}` : '/api/admin/products';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    type: form.category, // el schema usa `type`, mapeamos category→type
                }),
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', isEdit ? `"${form.name}" actualizado` : `"${form.name}" creado`);
                setShowModal(false);
                loadProducts();
            } else {
                showToast('error', data.error || 'Error al guardar');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/products/${deleteTarget.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                showToast('success', `"${deleteTarget.name}" eliminado`);
                setDeleteTarget(null);
                loadProducts();
            } else {
                showToast('error', data.error || 'Error al eliminar');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setDeleting(false); }
    }

    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase());
        const matchCat = !catFilter || p.category === catFilter || p.type === catFilter;
        return matchSearch && matchCat;
    });

    const uniqueCategories = [...new Set(products.map(p => p.category || p.type).filter(Boolean))];

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver a Admin
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Package className="h-8 w-8 text-orange-600" /> Catálogo de Productos
                        </h1>
                        <p className="text-gray-500 mt-1">{products.length} productos en el catálogo global</p>
                    </div>
                    <button onClick={openCreate} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-medium transition">
                        <Plus className="h-4 w-4" /> Nuevo producto
                    </button>
                </div>

                {/* Filtros */}
                <div className="flex gap-3 mb-6 flex-wrap items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input type="text" placeholder="Buscar por nombre o SKU…" value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    </div>
                    <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300">
                        <option value="">Todas las categorías</option>
                        {uniqueCategories.map(c => (
                            <option key={c} value={c}>{CAT_LABELS[c] || c}</option>
                        ))}
                    </select>
                </div>

                {/* Tabla */}
                {loading ? (
                    <div className="text-center py-20 text-gray-400">Cargando productos…</div>
                ) : (
                    <div className="bg-white rounded-2xl shadow overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-5 py-4 font-semibold text-gray-600">Producto</th>
                                    <th className="text-left px-5 py-4 font-semibold text-gray-600">SKU</th>
                                    <th className="text-left px-5 py-4 font-semibold text-gray-600">Categoría</th>
                                    <th className="text-left px-5 py-4 font-semibold text-gray-600">Unidad</th>
                                    <th className="text-left px-5 py-4 font-semibold text-gray-600">Estado</th>
                                    <th className="text-center px-5 py-4 font-semibold text-gray-600">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(p => (
                                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                {p.imageUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={p.imageUrl} alt={p.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                        <Package className="h-4 w-4 text-gray-300" />
                                                    </div>
                                                )}
                                                <span className="font-medium text-gray-900">{p.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{p.sku}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${catColors[p.category || p.type] || 'bg-gray-100 text-gray-600'}`}>
                                                {CAT_LABELS[p.category || p.type] || p.category}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-600">{p.unit}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                {p.isActive ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openEdit(p)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="Editar"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(p)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">No se encontraron productos</td></tr>
                                )}
                            </tbody>
                        </table>
                        <div className="px-5 py-3 text-xs text-gray-400 bg-gray-50 border-t">
                            {filtered.length} de {products.length} productos
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Crear / Editar */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">
                                {editingId ? '✏️ Editar Producto' : '➕ Nuevo Producto'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Imagen */}
                            <div className="flex flex-col items-center">
                                <label className="block text-sm font-semibold text-gray-700 mb-2 self-start">Foto del producto</label>
                                <ImageUpload
                                    value={form.imageUrl || null}
                                    onChange={url => setForm(f => ({ ...f, imageUrl: url || '' }))}
                                    size="md"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre *</label>
                                    <input required type="text" placeholder="Ej: Açaí Base XL" value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">SKU *</label>
                                    <input required type="text" placeholder="ACAI-XL-001" value={form.sku}
                                        onChange={e => setForm(f => ({ ...f, sku: e.target.value.toUpperCase() }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 font-mono" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unidad *</label>
                                    <select required value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                                        {['kg', 'gr', 'litro', 'ml', 'unidad', 'doc', 'bolsa', 'paquete'].map(u => <option key={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Categoría *</label>
                                    <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                                        {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c] || c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Precio venta (Bs.)</label>
                                    <input type="number" min="0" step="0.01" value={form.price === 0 ? '' : form.price}
                                        onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Costo (Bs.)</label>
                                    <input type="number" min="0" step="0.01" value={form.costPrice === 0 ? '' : form.costPrice}
                                        onChange={e => setForm(f => ({ ...f, costPrice: parseFloat(e.target.value) || 0 }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descripción</label>
                                    <textarea rows={2} placeholder="Descripción opcional…" value={form.description}
                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                                    {submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear producto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal confirmar eliminación */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-xl">
                                <Trash2 className="h-5 w-5 text-red-600" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Eliminar producto</h2>
                        </div>
                        <p className="text-gray-600 text-sm mb-1">¿Estás seguro que querés eliminar:</p>
                        <p className="font-semibold text-gray-900 mb-4">"{deleteTarget.name}"</p>
                        <p className="text-xs text-gray-400 mb-6">El producto quedará inactivo pero se conservará el historial de ventas e inventario.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                                Cancelar
                            </button>
                            <button onClick={handleDelete} disabled={deleting}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                                {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
