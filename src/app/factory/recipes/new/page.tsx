'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, X, Save, AlertCircle, Trash2 } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';

type Product = {
    id: string;
    name: string;
    sku: string;
    unit: string;
    type: string;
};

export default function NewRecipePage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: '',
        description: '',
        productId: '',
        yield: 1,
        yieldUnit: 'kg',
        merma: 0,
        notes: '',
        ingredients: [] as { ingredientId: string; quantity: number; unit: string }[]
    });

    useEffect(() => {
        fetch('/api/admin/products')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setProducts(data.data);
                }
            })
            .catch(() => setError('Error al cargar productos'))
            .finally(() => setLoading(false));
    }, []);

    const handleAddIngredient = () => {
        setForm(f => ({
            ...f,
            ingredients: [...f.ingredients, { ingredientId: '', quantity: 1, unit: 'kg' }]
        }));
    };

    const handleRemoveIngredient = (index: number) => {
        setForm(f => ({
            ...f,
            ingredients: f.ingredients.filter((_, i) => i !== index)
        }));
    };

    const handleIngredientChange = (index: number, field: string, value: any) => {
        setForm(f => {
            const newIngredients = [...f.ingredients];
            newIngredients[index] = { ...newIngredients[index], [field]: value };
            
            // Auto-update unit if ingredient changes
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
            const res = await fetch('/api/factory/recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            
            if (data.success) {
                router.push('/factory/recipes');
            } else {
                setError(data.error || 'Error al crear receta');
            }
        } catch (err) {
            setError('Error de conexión con el servidor.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: '56px 100px' }} />
            </div>
            
            <div className="relative z-10 max-w-4xl mx-auto p-6 md:p-8">
                <div className="mb-8">
                    <Link href="/factory/recipes" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-3">
                        <ArrowLeft className="h-4 w-4" /> Volver a Recetas
                    </Link>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Plus className="h-8 w-8 text-purple-400" /> Crear Nueva Receta
                    </h1>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl mb-6 flex items-start gap-3 backdrop-blur-sm">
                        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8">
                        <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Información General</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-white/80 mb-2">Nombre de la Receta *</label>
                                <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Ej: Base de Açaí Estándar" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-white/80 mb-2">Descripción</label>
                                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                                    <input type="number" min="0.01" step="0.01" required value={form.yield} onChange={e => setForm(f => ({ ...f, yield: parseFloat(e.target.value) }))}
                                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-2">Unidad</label>
                                    <input type="text" required value={form.yieldUnit} onChange={e => setForm(f => ({ ...f, yieldUnit: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-2">Merma Estimada (%)</label>
                                <input type="number" min="0" max="100" step="0.1" value={form.merma} onChange={e => setForm(f => ({ ...f, merma: parseFloat(e.target.value) }))}
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-2">Notas Operativas</label>
                                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Ej: Mezclar a temperatura ambiente..." />
                            </div>
                        </div>
                    </div>

                    {/* Ingedients List */}
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                            <h2 className="text-xl font-bold text-white">Ingredientes (BOM)</h2>
                            <button type="button" onClick={handleAddIngredient}
                                className="flex items-center gap-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 px-4 py-2 rounded-lg text-sm font-medium transition">
                                <Plus className="h-4 w-4" /> Agregar Ingrediente
                            </button>
                        </div>

                        {form.ingredients.length === 0 ? (
                            <div className="text-center py-10 text-white/40">
                                <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                <p>No has agregado ningún ingrediente a esta receta.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {form.ingredients.map((ing, i) => (
                                    <div key={i} className="flex gap-4 items-start bg-black/20 p-4 rounded-xl border border-white/5">
                                        <div className="flex-1">
                                            <label className="block text-xs font-semibold text-white/50 mb-1">Insumo / Materia Prima</label>
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
                                            <input type="number" min="0.001" step="0.001" required value={ing.quantity} onChange={e => handleIngredientChange(i, 'quantity', parseFloat(e.target.value))}
                                                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-xs font-semibold text-white/50 mb-1">Unidad</label>
                                            <input type="text" required value={ing.unit} onChange={e => handleIngredientChange(i, 'unit', e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 text-white/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
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

                    <div className="flex justify-end gap-4 pt-4">
                        <Link href="/factory/recipes"
                            className="px-6 py-3 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 hover:text-white transition font-medium">
                            Cancelar
                        </Link>
                        <button type="submit" disabled={submitting || form.ingredients.length === 0}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-purple-500/20 transition">
                            {submitting ? (
                                <span className="flex items-center gap-2"><span className="animate-spin text-xl leading-none">⟳</span> Guardando...</span>
                            ) : (
                                <><Save className="h-5 w-5" /> Guardar Receta</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
