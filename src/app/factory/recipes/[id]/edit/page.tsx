'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, X, Save, AlertCircle, Trash2, Loader2, Pencil } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';

type Product = {
    id: string;
    name: string;
    sku: string;
    unit: string;
    type: string;
};

export default function EditRecipePage() {
    const router = useRouter();
    const params = useParams();
    const recipeId = params.id as string;

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [form, setForm] = useState({
        name: '',
        description: '',
        productId: '',
        yield: 1,
        yieldUnit: 'kg',
        merma: 0,
        notes: '',
        active: true,
        ingredients: [] as { ingredientId: string; quantity: number; unit: string }[],
    });

    // Cargar productos y la receta actual en paralelo
    useEffect(() => {
        Promise.all([
            fetch('/api/admin/products').then(r => r.json()),
            fetch(`/api/factory/recipes/${recipeId}`).then(r => r.json()),
        ]).then(([productsData, recipeData]) => {
            if (productsData.success) setProducts(productsData.data);
            if (recipeData.success) {
                const r = recipeData.data;
                setForm({
                    name: r.name || '',
                    description: r.description || '',
                    productId: r.productId || '',
                    yield: r.yield || 1,
                    yieldUnit: r.yieldUnit || 'kg',
                    merma: r.merma || 0,
                    notes: r.notes || '',
                    active: r.active ?? true,
                    ingredients: (r.ingredients || []).map((ing: any) => ({
                        ingredientId: ing.ingredientId,
                        quantity: ing.quantity,
                        unit: ing.unit,
                    })),
                });
            } else {
                setError('No se encontró la receta');
            }
        }).catch(() => setError('Error al cargar los datos'))
        .finally(() => setLoading(false));
    }, [recipeId]);

    const handleAddIngredient = () => {
        setForm(f => ({
            ...f,
            ingredients: [...f.ingredients, { ingredientId: '', quantity: 1, unit: 'kg' }],
        }));
    };

    const handleRemoveIngredient = (index: number) => {
        setForm(f => ({
            ...f,
            ingredients: f.ingredients.filter((_, i) => i !== index),
        }));
    };

    const handleIngredientChange = (index: number, field: string, value: any) => {
        setForm(f => {
            const newIngredients = [...f.ingredients];
            newIngredients[index] = { ...newIngredients[index], [field]: value };
            // Auto-sincronizar la unidad con el producto seleccionado
            if (field === 'ingredientId') {
                const prod = products.find(p => p.id === value);
                if (prod) newIngredients[index].unit = prod.unit;
            }
            return { ...f, ingredients: newIngredients };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!form.name || !form.productId || form.ingredients.length === 0) {
            setError('Complete todos los campos requeridos y agregue al menos un ingrediente.');
            return;
        }
        if (form.ingredients.some(i => !i.ingredientId || i.quantity <= 0)) {
            setError('Todos los ingredientes deben tener un producto válido y cantidad mayor a cero.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/factory/recipes/${recipeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                setTimeout(() => router.push('/factory/recipes'), 1200);
            } else {
                setError(data.error || 'Error al guardar los cambios');
            }
        } catch {
            setError('Error de conexión con el servidor.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="skot-experience flex min-h-screen items-center justify-center bg-canvas" data-brand="admin">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
    );

    return (
        <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">

            <div className="mx-auto max-w-4xl">
                <div className="mb-8">
                    <Link href="/factory/recipes" className="text-sm text-muted hover:text-ink flex items-center gap-1 mb-3">
                        <ArrowLeft className="h-4 w-4" /> Volver a Recetas
                    </Link>
                    <h1 className="flex items-center gap-3 font-display text-2xl font-semibold text-ink sm:text-3xl">
                        <Pencil className="h-8 w-8 text-brand" /> Editar Receta
                    </h1>
                    <p className="text-muted mt-1 text-sm">Modificá los datos y los ingredientes de esta receta</p>
                </div>

                {error && (
                    <div className="bg-[var(--status-error-bg)] border border-line text-danger px-4 py-3 rounded-xl mb-6 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}
                {success && (
                    <div role="status" className="mb-6 flex items-center gap-3 rounded-lg border border-line bg-[var(--status-success-bg)] px-4 py-3 text-success">
                        <Save className="h-5 w-5 flex-shrink-0" />
                        <p>¡Receta actualizada correctamente! Redirigiendo...</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Información General */}
                    <div className="rounded-xl border border-line-subtle bg-surface p-4 sm:p-6 md:p-8">
                        <h2 className="text-xl font-bold text-ink mb-6 border-b border-line-subtle pb-4">Información General</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label htmlFor="recipe-name" className="block text-sm font-semibold text-ink mb-2">Nombre de la Receta *</label>
                                <input id="recipe-name" type="text" required value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full bg-surface border border-line-subtle text-ink rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
                                    placeholder="Ej: Base de Açaí Estándar" />
                            </div>

                            <div className="md:col-span-2">
                                <label htmlFor="recipe-description" className="block text-sm font-semibold text-ink mb-2">Descripción</label>
                                <input id="recipe-description" type="text" value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full bg-surface border border-line-subtle text-ink rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
                                    placeholder="Detalles sobre esta preparación..." />
                            </div>

                            <div>
                                <label htmlFor="recipe-product" className="block text-sm font-semibold text-ink mb-2">Producto resultante *</label>
                                <SearchableSelect id="recipe-product"
                                    options={products.map(p => ({ value: p.id, label: `${p.name} (${p.unit})` }))}
                                    value={form.productId}
                                    onChange={val => setForm(f => ({ ...f, productId: val }))}
                                    placeholder="Seleccionar producto..."
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="recipe-yield" className="block text-sm font-semibold text-ink mb-2">Rendimiento *</label>
                                    <input id="recipe-yield" type="number" min="0.01" step="0.01" required value={form.yield}
                                        onChange={e => setForm(f => ({ ...f, yield: parseFloat(e.target.value) }))}
                                        className="w-full bg-surface border border-line-subtle text-ink rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand" />
                                </div>
                                <div>
                                    <label htmlFor="recipe-yield-unit" className="block text-sm font-semibold text-ink mb-2">Unidad</label>
                                    <input id="recipe-yield-unit" type="text" required value={form.yieldUnit}
                                        onChange={e => setForm(f => ({ ...f, yieldUnit: e.target.value }))}
                                        className="w-full bg-surface border border-line-subtle text-ink rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand" />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="recipe-merma" className="block text-sm font-semibold text-ink mb-2">Merma Estimada (%)</label>
                                <input id="recipe-merma" type="number" min="0" max="100" step="0.1" value={form.merma}
                                    onChange={e => setForm(f => ({ ...f, merma: parseFloat(e.target.value) }))}
                                    className="w-full bg-surface border border-line-subtle text-ink rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand" />
                            </div>

                            <div>
                                <label htmlFor="recipe-notes" className="block text-sm font-semibold text-ink mb-2">Notas Operativas</label>
                                <input id="recipe-notes" type="text" value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    className="w-full bg-surface border border-line-subtle text-ink rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
                                    placeholder="Ej: Mezclar a temperatura ambiente..." />
                            </div>

                            {/* Estado activo/inactivo */}
                            <div className="md:col-span-2 flex items-center gap-3">
                                <label className="text-sm font-semibold text-ink">Estado de la receta:</label>
                                <button type="button"
                                    onClick={() => setForm(f => ({ ...f, active: !f.active }))} aria-pressed={form.active}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${form.active ? 'bg-[var(--status-success-bg)] text-success border border-green-500/40' : 'bg-[var(--status-error-bg)] text-danger border border-red-500/40'}`}>
                                    {form.active ? 'Activa' : 'Inactiva'}
                                </button>
                                <span className="text-xs text-muted">Solo las recetas activas se usan en ventas</span>
                            </div>
                        </div>
                    </div>

                    {/* Ingredientes */}
                    <div className="rounded-xl border border-line-subtle bg-surface p-4 sm:p-6 md:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle pb-4 mb-6">
                            <h2 className="text-xl font-bold text-ink">Ingredientes (BOM)</h2>
                            <button type="button" onClick={handleAddIngredient}
                                className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[var(--status-neutral-bg)] px-4 py-2 text-sm font-semibold text-brand hover:bg-canvas">
                                <Plus className="h-4 w-4" /> Agregar Ingrediente
                            </button>
                        </div>

                        {form.ingredients.length === 0 ? (
                            <div className="text-center py-10 text-muted">
                                <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                <p>No hay ingredientes en esta receta.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {form.ingredients.map((ing, i) => (
                                    <div key={i} className="grid grid-cols-2 gap-3 bg-canvas p-4 sm:grid-cols-[minmax(0,1fr)_8rem_6rem_auto] rounded-xl border border-line-subtle">
                                        <div className="col-span-2 min-w-0 sm:col-span-1">
                                            <label htmlFor={`ingredient-product-${i}`} className="block text-xs font-semibold text-muted mb-1">Insumo / Ingrediente</label>
                                            <SearchableSelect id={`ingredient-product-${i}`}
                                                options={products.map(p => ({ value: p.id, label: `${p.name} (${p.unit})` }))}
                                                value={ing.ingredientId}
                                                onChange={val => handleIngredientChange(i, 'ingredientId', val)}
                                                placeholder="Buscar ingrediente..."
                                                required
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <label htmlFor={`ingredient-quantity-${i}`} className="block text-xs font-semibold text-muted mb-1">Cantidad</label>
                                            <input id={`ingredient-quantity-${i}`} type="number" min="0.001" step="0.001" required value={ing.quantity}
                                                onChange={e => handleIngredientChange(i, 'quantity', parseFloat(e.target.value))}
                                                className="w-full bg-surface border border-line-subtle text-ink rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                                        </div>
                                        <div className="min-w-0">
                                            <label htmlFor={`ingredient-unit-${i}`} className="block text-xs font-semibold text-muted mb-1">Unidad</label>
                                            <input id={`ingredient-unit-${i}`} type="text" required value={ing.unit}
                                                onChange={e => handleIngredientChange(i, 'unit', e.target.value)}
                                                className="w-full bg-surface border border-line-subtle text-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                                        </div>
                                        <button type="button" onClick={() => handleRemoveIngredient(i)} aria-label={`Quitar ingrediente ${i + 1}`}
                                            className="col-span-2 min-h-11 rounded-lg p-2 text-muted hover:bg-[var(--status-error-bg)] hover:text-danger sm:col-span-1">
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Botones */}
                    <div className="flex flex-wrap justify-end gap-3 pt-2">
                        <Link href="/factory/recipes"
                            className="inline-flex min-h-12 items-center rounded-lg border border-line px-5 py-3 font-semibold text-ink hover:bg-canvas">
                            Cancelar
                        </Link>
                        <button type="submit" disabled={submitting || form.ingredients.length === 0}
                            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:brightness-90 disabled:opacity-50">
                            {submitting ? (
                                <><Loader2 className="h-5 w-5 animate-spin" /> Guardando...</>
                            ) : (
                                <><Save className="h-5 w-5" /> Guardar Cambios</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}
