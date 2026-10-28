'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

type Recipe = { id: string; name: string; yield: number; yieldUnit: string; ingredients: { ingredient: { name: string }; quantity: number; unit: string }[] };
type Branch = { id: string; name: string };

export default function NewProductionPage() {
    const router = useRouter();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [form, setForm] = useState({ recipeId: '', branchId: '', plannedYield: '', scheduledDate: '', expirationDate: '', notes: '', createdBy: '' });

    useEffect(() => {
        Promise.all([
            fetch('/api/factory/recipes').then(r => r.json()),
            fetch('/api/admin/branches').then(r => r.json()),
        ]).then(([r, b]) => {
            if (r.success) setRecipes(r.data);
            if (b.success) setBranches(b.data);
        }).finally(() => setLoading(false));
    }, []);

    function handleRecipeChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const rid = e.target.value;
        setForm(f => ({ ...f, recipeId: rid, plannedYield: '' }));
        setSelectedRecipe(recipes.find(r => r.id === rid) || null);
    }

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 5000);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.plannedYield || parseFloat(form.plannedYield) <= 0) {
            showToast('error', 'La cantidad a producir debe ser mayor a 0');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/factory/production', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, plannedYield: parseFloat(form.plannedYield) }),
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', `Orden ${data.data.orderNumber} creada exitosamente`);
                setTimeout(() => router.push('/factory/production'), 1500);
            } else {
                if (data.details) {
                    const missing = data.details.map((d: any) => `${d.ingredient}: necesita ${d.required} ${d.unit}, hay ${d.available}`).join('\n');
                    showToast('error', `Materia prima insuficiente:\n${missing}`);
                } else {
                    showToast('error', data.error || 'Error al crear orden');
                }
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSubmitting(false); }
    }

    const multiplier = selectedRecipe && form.plannedYield ? parseFloat(form.plannedYield) / selectedRecipe.yield : 0;

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: '56px 100px' }} />
            </div>
            <div className="relative z-10 h-full w-full">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium max-w-sm whitespace-pre-line ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                    {toast.msg}
                </div>
            )}
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <Link href="/factory/production" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Volver a Órdenes
                    </Link>
                        <h1 className="text-3xl font-bold text-white/90 flex items-center gap-3">
                        <Plus className="h-8 w-8 text-green-600" /> Nueva Orden de Producción
                    </h1>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-white/40">Cargando recetas y sucursales…</div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-6 space-y-5">
                            <h2 className="font-semibold text-white/90">Datos de la orden</h2>

                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">Receta *</label>
                                <select required value={form.recipeId} onChange={handleRecipeChange}
                                    className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm bg-white/5 border border-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-green-300">
                                    <option value="">Seleccionar receta…</option>
                                    {recipes.map(r => <option key={r.id} value={r.id}>{r.name} (rinde {r.yield} {r.yieldUnit})</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">Sucursal destino *</label>
                                <select required value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                                    className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm bg-white/5 border border-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-green-300">
                                    <option value="">Seleccionar sucursal…</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">
                                    Cantidad a producir {selectedRecipe ? `(${selectedRecipe.yieldUnit})` : ''} *
                                </label>
                                <input type="number" required min="0.01" step="0.01" placeholder={selectedRecipe ? `Ej: ${selectedRecipe.yield}` : '0'}
                                    value={form.plannedYield} onChange={e => setForm(f => ({ ...f, plannedYield: e.target.value }))}
                                    className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-1.5">Fecha programada</label>
                                    <input type="datetime-local" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                                        className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-1.5">Fecha de vencimiento</label>
                                    <input type="date" value={form.expirationDate} onChange={e => setForm(f => ({ ...f, expirationDate: e.target.value }))}
                                        className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">Responsable / Operador *</label>
                                <input type="text" required placeholder="Nombre del operador" value={form.createdBy}
                                    onChange={e => setForm(f => ({ ...f, createdBy: e.target.value }))}
                                    className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">Notas</label>
                                <textarea rows={2} placeholder="Observaciones opcionales…" value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none" />
                            </div>
                        </div>

                        {/* Preview de ingredientes necesarios */}
                        {selectedRecipe && multiplier > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                                <h3 className="font-semibold text-blue-800 mb-3">📋 Materia prima necesaria</h3>
                                <div className="space-y-2">
                                    {selectedRecipe.ingredients.map((ing, i) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-blue-700">{ing.ingredient?.name}</span>
                                            <span className="font-semibold text-blue-900">{(ing.quantity * multiplier).toFixed(2)} {ing.unit}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-blue-500 mt-3">* La API validará disponibilidad real antes de crear la orden</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Link href="/factory/production" className="flex-1 text-center py-3 border border-white/10 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5 transition-colors">
                                Cancelar
                            </Link>
                            <button type="submit" disabled={submitting}
                                className="flex-2 flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-colors">
                                {submitting ? '⏳ Creando orden…' : '✓ Crear orden de producción'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
        </div>
        );
}
