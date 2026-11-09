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
        <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="min-w-0">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium max-w-sm whitespace-pre-line ${toast.type === 'success' ? 'bg-brand' : 'bg-danger'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                    {toast.msg}
                </div>
            )}
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <Link href="/factory/production" className="text-sm text-muted hover:text-ink flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Volver a Órdenes
                    </Link>
                        <h1 className="text-3xl font-bold text-ink flex items-center gap-3">
                        <Plus className="h-8 w-8 text-brand" /> Nueva Orden de Producción
                    </h1>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-muted">Cargando recetas y sucursales…</div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-5 rounded-xl border border-line-subtle bg-surface p-4 sm:p-6">
                            <h2 className="font-semibold text-ink">Datos de la orden</h2>

                            <div>
                                <label htmlFor="new-order-recipe" className="block text-sm font-semibold text-ink mb-1.5">Receta *</label>
                                <select id="new-order-recipe" required value={form.recipeId} onChange={handleRecipeChange}
                                    className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand">
                                    <option value="">Seleccionar receta…</option>
                                    {recipes.map(r => <option key={r.id} value={r.id}>{r.name} (rinde {r.yield} {r.yieldUnit})</option>)}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="new-order-branch" className="block text-sm font-semibold text-ink mb-1.5">Sucursal destino *</label>
                                <select id="new-order-branch" required value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                                    className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand">
                                    <option value="">Seleccionar sucursal…</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="new-order-quantity" className="block text-sm font-semibold text-ink mb-1.5">
                                    Cantidad a producir {selectedRecipe ? `(${selectedRecipe.yieldUnit})` : ''} *
                                </label>
                                <input id="new-order-quantity" type="number" required min="0.01" step="0.01" placeholder={selectedRecipe ? `Ej: ${selectedRecipe.yield}` : '0'}
                                    value={form.plannedYield} onChange={e => setForm(f => ({ ...f, plannedYield: e.target.value }))}
                                    className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand" />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="new-order-scheduled" className="block text-sm font-semibold text-ink mb-1.5">Fecha programada</label>
                                    <input id="new-order-scheduled" type="datetime-local" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                                        className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand" />
                                </div>
                                <div>
                                    <label htmlFor="new-order-expiry" className="block text-sm font-semibold text-ink mb-1.5">Fecha de vencimiento</label>
                                    <input id="new-order-expiry" type="date" value={form.expirationDate} onChange={e => setForm(f => ({ ...f, expirationDate: e.target.value }))}
                                        className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand" />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="new-order-operator" className="block text-sm font-semibold text-ink mb-1.5">Responsable / Operador *</label>
                                <input id="new-order-operator" type="text" required placeholder="Nombre del operador" value={form.createdBy}
                                    onChange={e => setForm(f => ({ ...f, createdBy: e.target.value }))}
                                    className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand" />
                            </div>

                            <div>
                                <label htmlFor="new-order-notes" className="block text-sm font-semibold text-ink mb-1.5">Notas</label>
                                <textarea id="new-order-notes" rows={2} placeholder="Observaciones opcionales…" value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    className="w-full border border-line-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none" />
                            </div>
                        </div>

                        {/* Preview de ingredientes necesarios */}
                        {selectedRecipe && multiplier > 0 && (
                            <div className="bg-[var(--status-info-bg)] border border-line-subtle rounded-xl p-5">
                                <h3 className="font-semibold text-info mb-3">Materia prima necesaria</h3>
                                <div className="space-y-2">
                                    {selectedRecipe.ingredients.map((ing, i) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-info">{ing.ingredient?.name}</span>
                                            <span className="font-semibold text-ink">{(ing.quantity * multiplier).toFixed(2)} {ing.unit}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-info mt-3">* La API validará disponibilidad real antes de crear la orden</p>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-3">
                            <Link href="/factory/production" className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg border border-line bg-surface px-4 font-semibold text-ink hover:bg-canvas">
                                Cancelar
                            </Link>
                            <button type="submit" disabled={submitting}
                                className="min-h-12 flex-1 rounded-lg bg-brand px-4 font-semibold text-white hover:brightness-90 disabled:opacity-50">
                                {submitting ? 'Creando orden…' : 'Crear orden de producción'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
        </main>
        );
}
