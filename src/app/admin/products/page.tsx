'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Package, PackagePlus, Pencil, Plus, Settings2, Trash2, X } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';

type Product = {
    id: string; name: string; sku: string; unit: string;
    category: string; type: string; description: string | null;
    price: number; costPrice: number; isActive: boolean; imageUrl: string | null;
    consumptionMode: 'STOCK' | 'RECIPE' | null; saleRecipeId: string | null;
};

const CATEGORIES = ['ACAI_BASE', 'ACAI_TOPPING', 'BURGER', 'BURGER_EXTRA', 'BEVERAGE', 'RAW_MATERIAL', 'SUPPLY'];
const CAT_LABELS: Record<string, string> = {
    ACAI_BASE: 'Base Açaí', ACAI_TOPPING: 'Topping Açaí', BURGER: 'Hamburguesa',
    BURGER_EXTRA: 'Extra / Porción', BEVERAGE: 'Bebida', RAW_MATERIAL: 'Materia Prima', SUPPLY: 'Suministros',
};
const EMPTY_FORM = { name: '', sku: '', unit: 'kg', category: 'RAW_MATERIAL', subcategory: '', price: 0, costPrice: 0, description: '', imageUrl: '' };
const fieldClass = 'min-h-12 w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted';

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [formError, setFormError] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [configTarget, setConfigTarget] = useState<Product | null>(null);
    const [configMode, setConfigMode] = useState<'' | 'STOCK' | 'RECIPE'>('');
    const [configRecipe, setConfigRecipe] = useState('');
    const [configRecipes, setConfigRecipes] = useState<{ id: string; name: string; yield: number; yieldUnit: string }[]>([]);
    const [configError, setConfigError] = useState('');
    const [configLoading, setConfigLoading] = useState(false);

    function loadProducts() {
        setLoading(true);
        setLoadError('');
        fetch('/api/admin/products')
            .then(async response => {
                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo cargar el catálogo');
                if (!Array.isArray(data.data)) throw new Error('La respuesta del catálogo no tiene un formato válido');
                setProducts(data.data);
            })
            .catch(error => setLoadError(error instanceof Error ? error.message : 'Error de conexión al cargar productos'))
            .finally(() => setLoading(false));
    }
    useEffect(() => { loadProducts(); }, []);

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }
    function openCreate() {
        setFormError('');
        setEditingId(null);
        setForm(EMPTY_FORM);
        setShowModal(true);
    }
    async function openConfig(product: Product) {
        setConfigTarget(product);
        setConfigMode(product.consumptionMode || '');
        setConfigRecipe(product.saleRecipeId || '');
        setConfigError('');
        setConfigLoading(true);
        try {
            const result = await fetch(`/api/factory/recipes?active=true&productId=${encodeURIComponent(product.id)}`).then(r => r.json());
            if (!result.success) throw new Error(result.error || 'No se pudieron cargar las recetas');
            setConfigRecipes(result.data);
        } catch (error) { setConfigRecipes([]); setConfigError(error instanceof Error ? error.message : 'Error de conexión'); }
        finally { setConfigLoading(false); }
    }
    async function saveConfig(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!configTarget) return;
        setSubmitting(true);
        setConfigError('');
        try {
            const response = await fetch(`/api/admin/products/${configTarget.id}/consumption`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: configMode, recipeId: configMode === 'RECIPE' ? configRecipe : null }),
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'No se pudo guardar');
            setConfigTarget(null);
            showToast('success', `Preparación de ${configTarget.name} guardada`);
            loadProducts();
        } catch (error) { setConfigError(error instanceof Error ? error.message : 'Error de conexión'); }
        finally { setSubmitting(false); }
    }
    function openEdit(product: Product) {
        setFormError('');
        setEditingId(product.id);
        setForm({
            name: product.name, sku: product.sku, unit: product.unit,
            category: product.type, subcategory: product.category || '', price: product.price,
            costPrice: product.costPrice, description: product.description || '',
            imageUrl: product.imageUrl || '',
        });
        setShowModal(true);
    }
    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError('');
        setSubmitting(true);
        try {
            const isEdit = Boolean(editingId);
            const url = isEdit ? `/api/admin/products/${editingId}` : '/api/admin/products';
            const method = isEdit ? 'PUT' : 'POST';
            const response = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, type: form.category, category: form.subcategory || null }),
            });
            const data = await response.json();
            if (data.success) {
                showToast('success', isEdit ? `"${form.name}" actualizado` : `"${form.name}" creado`);
                setShowModal(false);
                loadProducts();
            } else setFormError(data.error || 'Error al guardar');
        } catch { setFormError('Error de conexión'); }
        finally { setSubmitting(false); }
    }
    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleteError('');
        setDeleting(true);
        try {
            const response = await fetch(`/api/admin/products/${deleteTarget.id}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.success) {
                showToast('success', `"${deleteTarget.name}" eliminado`);
                setDeleteTarget(null);
                loadProducts();
            } else setDeleteError(data.error || 'Error al eliminar');
        } catch { setDeleteError('Error de conexión'); }
        finally { setDeleting(false); }
    }

    const filtered = products.filter(product => {
        const matchSearch = product.name.toLowerCase().includes(search.toLowerCase()) || product.sku.toLowerCase().includes(search.toLowerCase());
        const matchCat = !catFilter || product.category === catFilter || product.type === catFilter;
        return matchSearch && matchCat;
    });
    const uniqueCategories = [...new Set(products.map(product => product.category || product.type).filter(Boolean))];
    const productActions = (product: Product) => <div className="flex justify-end gap-1">
        <Link href={`/inventory/internal-orders?product=${encodeURIComponent(product.id)}`} aria-label={`Abastecer ${product.name}`} title="Pedir a fábrica" className="grid h-11 w-11 place-items-center rounded-lg text-brand hover:bg-canvas"><PackagePlus size={18} aria-hidden="true" /></Link>
        <Link href={`/admin/products/setup?product=${encodeURIComponent(product.id)}`} aria-label={`Preparar ${product.name} para venta`} title="Preparar para venta" className="grid h-11 w-11 place-items-center rounded-lg text-brand hover:bg-canvas"><Plus size={18} aria-hidden="true" /></Link>
        <button type="button" onClick={() => openConfig(product)} aria-label={`Configurar preparación de ${product.name}`} title="Configurar preparación" className="grid h-11 w-11 place-items-center rounded-lg text-brand hover:bg-canvas"><Settings2 size={18} aria-hidden="true" /></button>
        <button type="button" onClick={() => openEdit(product)} aria-label={`Editar ${product.name}`} className="grid h-11 w-11 place-items-center rounded-lg text-brand hover:bg-canvas"><Pencil size={18} aria-hidden="true" /></button>
        <button type="button" onClick={() => { setDeleteError(''); setDeleteTarget(product); }} aria-label={`Eliminar ${product.name}`} className="grid h-11 w-11 place-items-center rounded-lg text-danger hover:bg-[var(--status-error-bg)]"><Trash2 size={18} aria-hidden="true" /></button>
    </div>;

    return <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
            {toast && <div role={toast.type === 'error' ? 'alert' : 'status'} className={`fixed left-4 right-4 top-4 z-50 flex items-center gap-2 rounded-lg p-4 text-sm font-semibold shadow-lg sm:left-auto ${toast.type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                {toast.type === 'success' ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertCircle size={18} aria-hidden="true" />}{toast.msg}</div>}
            <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <Link href="/admin" className="mb-4 inline-flex min-h-11 items-center gap-2 font-semibold text-brand hover:underline"><ArrowLeft size={18} aria-hidden="true" /> Volver a administración</Link>
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted"><Package size={16} aria-hidden="true" /> Administración <span aria-hidden="true">›</span> Productos</div>
                    <h1 className="font-display text-2xl font-semibold sm:text-3xl">Catálogo de productos</h1>
                    <p className="mt-2 text-muted">{products.length} producto{products.length === 1 ? '' : 's'} en el catálogo global</p>
                </div>
                <div className="flex flex-wrap gap-2"><Link href="/admin/products/setup" className="inline-flex min-h-12 items-center rounded-lg bg-brand px-4 font-semibold text-white">Preparar para venta</Link><Button size="touch" onClick={openCreate}><Plus size={18} aria-hidden="true" /> Nuevo producto</Button></div>
            </header>

            <Card className="mb-4 flex flex-wrap items-end gap-3 p-4">
                <div className="min-w-[220px] flex-1"><label htmlFor="product-search" className="mb-1 block text-sm font-semibold">Buscar producto</label>
                    <input id="product-search" type="search" placeholder="Nombre o SKU" value={search} onChange={event => setSearch(event.target.value)} className={fieldClass} /></div>
                <div className="w-full sm:w-60"><label htmlFor="product-category" className="mb-1 block text-sm font-semibold">Categoría</label>
                    <select id="product-category" value={catFilter} onChange={event => setCatFilter(event.target.value)} className={fieldClass}>
                        <option value="">Todas las categorías</option>{uniqueCategories.map(category => <option key={category} value={category}>{CAT_LABELS[category] || category}</option>)}
                    </select></div>
            </Card>

            <Card className="overflow-hidden">
                {loading ? <div role="status" className="flex items-center justify-center gap-3 p-16 text-muted"><Loader2 size={22} className="animate-spin" aria-hidden="true" /> Cargando productos…</div>
                    : loadError ? <div role="alert" className="p-8 text-center text-danger">{loadError}. Actualiza la página o vuelve a iniciar sesión.</div>
                    : <><div className="divide-y divide-line-subtle md:hidden">{filtered.map(product => <article key={product.id} className="space-y-3 p-4">
                        <div className="flex items-start gap-3">
                            {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-line-subtle object-cover" />
                                : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[var(--status-neutral-bg)] text-brand"><Package size={20} aria-hidden="true" /></span>}
                            <div className="min-w-0 flex-1"><h2 className="break-words font-display font-semibold">{product.name}</h2><p className="mt-1 font-mono text-xs text-muted">{product.sku}</p>{!product.consumptionMode && ['BURGER', 'BURGER_EXTRA', 'BEVERAGE', 'ACAI_BASE'].includes(product.type) && <p className="text-xs text-warning">Preparación pendiente</p>}</div>
                            <StatusBadge tone={product.isActive ? 'success' : 'error'}>{product.isActive ? 'Activo' : 'Inactivo'}</StatusBadge>
                        </div>
                        <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted">{CAT_LABELS[product.category || product.type] || product.category || product.type} · {product.unit}</p>{productActions(product)}</div>
                    </article>)}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-sm">
                        <thead className="bg-canvas text-muted"><tr>
                            <th scope="col" className="px-4 py-3 text-left">Producto</th>
                            <th scope="col" className="px-4 py-3 text-left">SKU</th>
                            <th scope="col" className="px-4 py-3 text-left">Categoría</th>
                            <th scope="col" className="px-4 py-3 text-left">Unidad</th>
                            <th scope="col" className="px-4 py-3 text-left">Estado</th>
                            <th scope="col" className="px-4 py-3 text-right">Acciones</th>
                        </tr></thead>
                        <tbody>{filtered.map(product => <tr key={product.id} className="border-t border-line-subtle hover:bg-canvas">
                            <th scope="row" className="px-4 py-3 text-left font-semibold"><span className="flex min-w-[180px] items-center gap-3">
                                {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-line-subtle object-cover" />
                                    : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--status-neutral-bg)] text-brand"><Package size={18} aria-hidden="true" /></span>}
                                <span className="break-words">{product.name}{!product.consumptionMode && ['BURGER', 'BURGER_EXTRA', 'BEVERAGE', 'ACAI_BASE'].includes(product.type) && <span className="block text-xs text-warning">Preparación pendiente</span>}</span></span></th>
                            <td className="px-4 py-3 font-mono text-xs text-muted">{product.sku}</td>
                            <td className="px-4 py-3"><StatusBadge>{CAT_LABELS[product.category || product.type] || product.category || product.type}</StatusBadge></td>
                            <td className="px-4 py-3">{product.unit}</td>
                            <td className="px-4 py-3"><StatusBadge tone={product.isActive ? 'success' : 'error'}>{product.isActive ? 'Activo' : 'Inactivo'}</StatusBadge></td>
                            <td className="px-4 py-3">{productActions(product)}</td>
                        </tr>)}</tbody>
                    </table></div>{filtered.length === 0 && <p className="border-t border-line-subtle p-8 text-center text-muted">No se encontraron productos.</p>}
                    <p className="border-t border-line-subtle px-4 py-3 text-sm text-muted">{filtered.length} de {products.length} productos</p></>}
            </Card>
        </div>

        <Dialog open={showModal} onClose={() => { if (!submitting) setShowModal(false); }} labelledBy="product-form-title" className="max-w-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-line-subtle p-5"><div>
                <p className="text-xs font-semibold text-muted">Catálogo global</p>
                <h2 id="product-form-title" className="font-display text-xl font-semibold">{editingId ? 'Editar producto' : 'Nuevo producto'}</h2>
            </div><button type="button" onClick={() => setShowModal(false)} disabled={submitting} aria-label="Cerrar formulario" className="grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-canvas disabled:opacity-50"><X size={20} aria-hidden="true" /></button></div>
            <form onSubmit={handleSubmit} className="max-h-[min(75dvh,660px)] space-y-5 overflow-y-auto p-5">
                {formError && <p role="alert" className="rounded-lg bg-[var(--status-error-bg)] p-3 text-sm font-semibold text-danger">{formError}</p>}
                <div><p className="mb-2 text-sm font-semibold">Foto del producto</p><ImageUpload value={form.imageUrl || null} onChange={url => setForm(previous => ({ ...previous, imageUrl: url || '' }))} size="md" /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2"><label htmlFor="product-name" className="mb-1 block text-sm font-semibold">Nombre *</label>
                        <input id="product-name" required type="text" placeholder="Ej: Açaí Base XL" value={form.name} onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} className={fieldClass} /></div>
                    <div><label htmlFor="product-sku" className="mb-1 block text-sm font-semibold">SKU *</label>
                        <input id="product-sku" required type="text" placeholder="ACAI-XL-001" value={form.sku} onChange={event => setForm(previous => ({ ...previous, sku: event.target.value.toUpperCase() }))} className={`${fieldClass} font-mono`} /></div>
                    <div><label htmlFor="product-unit" className="mb-1 block text-sm font-semibold">Unidad *</label>
                        <select id="product-unit" required value={form.unit} onChange={event => setForm(previous => ({ ...previous, unit: event.target.value }))} className={fieldClass}>
                            {['kg', 'gr', 'litro', 'ml', 'unidad', 'doc', 'bolsa', 'paquete', 'bote', 'envase', 'caja', 'hoja', 'rollo', 'balde', 'porcion'].map(unit => <option key={unit}>{unit}</option>)}
                        </select></div>
                    <div className="sm:col-span-2"><label htmlFor="product-form-category" className="mb-1 block text-sm font-semibold">Categoría *</label>
                        <select id="product-form-category" required value={form.category} onChange={event => setForm(previous => ({ ...previous, category: event.target.value }))} className={fieldClass}>
                            {CATEGORIES.map(category => <option key={category} value={category}>{CAT_LABELS[category] || category}</option>)}
                        </select></div>
                    <div><label htmlFor="product-subcategory" className="mb-1 block text-sm font-semibold">Subcategoría</label><input id="product-subcategory" value={form.subcategory} onChange={event => setForm(previous => ({ ...previous, subcategory: event.target.value }))} className={fieldClass} placeholder="Ej: VASOS, TAPAS, CARNES" /></div><p className="sm:col-span-2 text-sm text-muted">Los precios de venta se definen para cada sucursal.</p>
                    <div className="sm:col-span-2"><label htmlFor="product-description" className="mb-1 block text-sm font-semibold">Descripción</label>
                        <textarea id="product-description" rows={2} placeholder="Descripción opcional…" value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} className={`${fieldClass} resize-y`} /></div>
                </div>
                <div className="flex flex-wrap gap-3 border-t border-line-subtle pt-4"><Button variant="secondary" onClick={() => setShowModal(false)} disabled={submitting} className="flex-1">Cancelar</Button>
                    <Button type="submit" disabled={submitting} className="flex-1">{submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear producto'}</Button></div>
            </form>
        </Dialog>

        <Dialog open={Boolean(configTarget)} onClose={() => { if (!submitting) setConfigTarget(null); }} labelledBy="consumption-title" className="max-w-lg">
            <form onSubmit={saveConfig} className="space-y-4 p-5">
                <h2 id="consumption-title" className="font-display text-xl font-semibold">Preparación: {configTarget?.name}</h2>
                <p className="text-sm text-muted">Elige qué existencias debe descontar cada venta en la sucursal.</p>
                {configError && <p role="alert" className="text-danger">{configError}</p>}
                <label className="block"><span className="mb-1 block font-semibold">Forma de venta</span>
                    <select required value={configMode} onChange={e => setConfigMode(e.target.value as '' | 'STOCK' | 'RECIPE')} className={fieldClass}>
                        <option value="">Seleccionar</option>
                        <option value="STOCK">Vendo unidades en stock</option>
                        <option value="RECIPE">Se prepara al vender con ingredientes</option>
                    </select>
                </label>
                {configMode === 'RECIPE' && <label className="block"><span className="mb-1 block font-semibold">Receta de venta</span>
                    <select required value={configRecipe} disabled={configLoading} onChange={e => setConfigRecipe(e.target.value)} className={fieldClass}>
                        <option value="">Seleccionar receta</option>
                        {configRecipes.map(r => <option key={r.id} value={r.id}>{r.name} · rinde {r.yield} {r.yieldUnit}</option>)}
                    </select><Link href="/factory/recipes/new" className="mt-2 inline-block text-brand underline">Crear receta</Link>
                </label>}
                <p className="text-sm text-muted">Sincroniza las ventas pendientes en las cajas antes de cambiar esta configuración.</p>
                <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setConfigTarget(null)} disabled={submitting}>Cancelar</Button><Button type="submit" disabled={submitting || configLoading}>Guardar preparación</Button></div>
            </form>
        </Dialog>

        <Dialog open={Boolean(deleteTarget)} onClose={() => { if (!deleting) setDeleteTarget(null); }} labelledBy="delete-product-title" className="max-w-sm">
            <div className="space-y-4 p-6"><span className="grid h-11 w-11 place-items-center rounded-lg bg-[var(--status-error-bg)] text-danger"><Trash2 size={21} aria-hidden="true" /></span>
                <h2 id="delete-product-title" className="font-display text-xl font-semibold">Eliminar producto</h2>
                <p>¿Estás seguro que querés eliminar <strong className="break-words">{deleteTarget?.name}</strong>?</p>
                <p className="text-sm text-muted">El producto quedará inactivo y se conservará el historial de ventas e inventario.</p>
                {deleteError && <p role="alert" className="rounded-lg bg-[var(--status-error-bg)] p-3 text-sm font-semibold text-danger">{deleteError}</p>}
                <div className="flex gap-3"><Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1">Cancelar</Button>
                    <Button variant="danger" onClick={handleDelete} disabled={deleting} className="flex-1">{deleting ? 'Eliminando…' : 'Sí, eliminar'}</Button></div>
            </div>
        </Dialog>
    </main>;
}
