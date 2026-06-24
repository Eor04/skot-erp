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
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
    );

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto p-6 md:p-8">
                <div className="mb-8">
                    <Link href="/factory/recipes" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-3">
                        <ArrowLeft className="h-4 w-4" /> Volver a Recetas
                    </Link>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Pencil className="h-8 w-8 text-amber-400" /> Editar Receta
                    </h1>
                    <p className="text-white/50 mt-1 text-sm">Modificá los datos y los ingredientes de esta receta</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl mb-6 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}
                {success && (
                    <div className="bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
                        <Save className="h-5 w-5 flex-shrink-0" />
                        <p>¡Receta actualizada correctamente! Redirigiendo...</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Información General */}
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8">
                        <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Información General</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-white/80 mb-2">Nombre de la Receta *</label>
                                <input type="text" required value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    placeholder="Ej: Base de Açaí Estándar" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-white/80 mb-2">Descripción</label>
                                <input type="text" value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    placeholder="Detalles sobre esta preparación..." />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-2">Producto Resultante *</label>
                                <SearchableSelect
                                    options={products.map(p => ({ value: p.id, label: `${p.name} (${p.unit})` }))}
                                    value={form.productId}
                                    onChange={val => setForm(f => ({ ...f, productId: val }))}
                                    placeholder="Seleccionar producto..."
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-2">Rendimiento *</label>
                                    <input type="number" min="0.01" step="0.01" required value={form.yield}
                                        onChange={e => setForm(f => ({ ...f, yield: parseFloat(e.target.value) }))}
                                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-2">Unidad</label>
                                    <input type="text" required value={form.yieldUnit}
                                        onChange={e => setForm(f => ({ ...f, yieldUnit: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-2">Merma Estimada (%)</label>
                                <input type="number" min="0" max="100" step="0.1" value={form.merma}
                                    onChange={e => setForm(f => ({ ...f, merma: parseFloat(e.target.value) }))}
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-2">Notas Operativas</label>
                                <input type="text" value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    placeholder="Ej: Mezclar a temperatura ambiente..." />
                            </div>

                            {/* Estado activo/inactivo */}
                            <div className="md:col-span-2 flex items-center gap-3">
                                <label className="text-sm font-semibold text-white/80">Estado de la receta:</label>
                                <button type="button"
                                    onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${form.active ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'}`}>
                                    {form.active ? '✅ Activa' : '❌ Inactiva'}
                                </button>
                                <span className="text-xs text-white/40">Solo las recetas activas se usan en ventas</span>
                            </div>
                        </div>
                    </div>

                    {/* Ingredientes */}
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                            <h2 className="text-xl font-bold text-white">Ingredientes (BOM)</h2>
                            <button type="button" onClick={handleAddIngredient}
                                className="flex items-center gap-2 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 px-4 py-2 rounded-lg text-sm font-medium transition">
                                <Plus className="h-4 w-4" /> Agregar Ingrediente
                            </button>
                        </div>

                        {form.ingredients.length === 0 ? (
                            <div className="text-center py-10 text-white/40">
                                <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                <p>No hay ingredientes en esta receta.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {form.ingredients.map((ing, i) => (
                                    <div key={i} className="flex gap-4 items-start bg-black/20 p-4 rounded-xl border border-white/5">
                                        <div className="flex-1">
                                            <label className="block text-xs font-semibold text-white/50 mb-1">Insumo / Ingrediente</label>
                                            <SearchableSelect
                                                options={products.map(p => ({ value: p.id, label: `${p.name} (${p.unit})` }))}
                                                value={ing.ingredientId}
                                                onChange={val => handleIngredientChange(i, 'ingredientId', val)}
                                                placeholder="Buscar ingrediente..."
                                                required
                                            />
                                        </div>
                                        <div className="w-32">
                                            <label className="block text-xs font-semibold text-white/50 mb-1">Cantidad</label>
                                            <input type="number" min="0.001" step="0.001" required value={ing.quantity}
                                                onChange={e => handleIngredientChange(i, 'quantity', parseFloat(e.target.value))}
                                                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-xs font-semibold text-white/50 mb-1">Unidad</label>
                                            <input type="text" required value={ing.unit}
                                                onChange={e => handleIngredientChange(i, 'unit', e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 text-white/70 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                                        </div>
                                        <button type="button" onClick={() => handleRemoveIngredient(i)}
                                            className="mt-6 p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-4 pt-2">
                        <Link href="/factory/recipes"
                            className="px-6 py-3 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 hover:text-white transition font-medium">
                            Cancelar
                        </Link>
                        <button type="submit" disabled={submitting || form.ingredients.length === 0}
                            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-amber-500/20 transition">
                            {submitting ? (
                                <><Loader2 className="h-5 w-5 animate-spin" /> Guardando...</>
                            ) : (
                                <><Save className="h-5 w-5" /> Guardar Cambios</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
