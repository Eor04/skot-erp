'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Dialog } from '@/components/ui/dialog';
import { PlayCircle, Plus, ArrowLeft, Clock, CheckCircle, Loader, X, AlertCircle, CheckCircle2, Beef } from 'lucide-react';

type Order = {
    id: string;
    orderNumber: string;
    recipe: { name?: string; product?: { name: string; type: string } };
    plannedYield: number;
    branch: { name: string };
    status: string;
    createdAt: string;
};

type Recipe = { id: string; name: string; yield: number; yieldUnit: string; product?: { type: string } };
type Branch = { id: string; name: string; type: string };

const statusConfig: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
    SCHEDULED:   { label: 'Programada', color: 'bg-[var(--status-warning-bg)] text-warning border border-line-subtle', Icon: Clock },
    IN_PROGRESS: { label: 'En Proceso', color: 'bg-[var(--status-info-bg)] text-info border border-line-subtle', Icon: Loader },
    COMPLETED:   { label: 'Completada', color: 'bg-[var(--status-success-bg)] text-success border border-line-subtle', Icon: CheckCircle },
    CANCELLED:   { label: 'Cancelada', color: 'bg-[var(--status-error-bg)] text-danger border border-line-subtle', Icon: X },
};

// Tipos de productos que aplican a producción en fábrica (hamburguesas)
// El Açaí NO se produce — viene directo de proveedores
const BURGER_TYPES = ['BURGER', 'RAW_MATERIAL', 'BURGER_EXTRA'];

export default function ProductionPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [completingId, setCompletingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [form, setForm] = useState({ recipeId: '', branchId: '', plannedYield: 1, scheduledDate: '', notes: '', createdBy: '' });
    const [completingOrder, setCompletingOrder] = useState<Order | null>(null);
    const [completeForm, setCompleteForm] = useState({ actualYield: 0, completedBy: '' });

    useEffect(() => { fetchAll(); }, []);

    async function fetchAll() {
        setLoading(true);
        try {
            const [oRes, rRes, bRes] = await Promise.all([
                fetch('/api/factory/production'),
                fetch('/api/factory/recipes?active=true'),
                fetch('/api/admin/branches'),
            ]);
            const [o, r, b] = await Promise.all([oRes.json(), rRes.json(), bRes.json()]);
            if (o.success) setOrders(o.data);
            if (r.success) {
                // Filtrar: solo recetas de hamburguesas/carne/pan. El açaí viene de proveedores.
                const burgerRecipes = r.data.filter((rec: any) =>
                    BURGER_TYPES.includes(rec.product?.type)
                );
                // Si no hay ninguna con tipo coincidente, mostramos todas (fallback)
                setRecipes(burgerRecipes.length > 0 ? burgerRecipes : r.data);
            }
            if (b.success) {
                // Solo sucursales de tipo FABRICA como destino de producción
                const fabricas = b.data.filter((branch: any) => branch.type === 'FABRICA');
                setBranches(fabricas.length > 0 ? fabricas : b.data);
            }
        } catch { }
        finally { setLoading(false); }
    }

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 5000);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/factory/production', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, plannedYield: Number(form.plannedYield) }),
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', `Orden ${data.data.orderNumber} creada`);
                setShowModal(false);
                setForm({ recipeId: '', branchId: '', plannedYield: 1, scheduledDate: '', notes: '', createdBy: '' });
                fetchAll();
            } else {
                showToast('error', data.error || 'Error al crear orden');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSubmitting(false); }
    }

    async function handleCompleteSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!completingOrder) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/factory/production/${completingOrder.id}/complete`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(completeForm)
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', '✅ Producción completada — stock actualizado en kardex');
                setCompletingOrder(null);
                fetchAll();
            } else {
                showToast('error', data.error || 'Error al completar');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSubmitting(false); }
    }

    return (
        <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="min-w-0">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-brand' : 'bg-danger'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="mx-auto max-w-5xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <Link href="/factory" className="text-sm text-muted hover:text-ink flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver a Fábrica
                        </Link>
                        <h1 className="text-3xl font-display font-semibold text-ink flex items-center gap-3">
                            <PlayCircle className="h-8 w-8 text-success" /> Órdenes de Producción
                        </h1>
                        <p className="text-muted text-sm mt-1 flex items-center gap-2">
                            <Beef className="h-4 w-4 text-warning" />
                            Preparación de carnes, panes y mezclas — Hamburguesas únicamente
                        </p>
                    </div>
                    <button onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-brand hover:brightness-90 text-white px-4 py-2 rounded-xl font-medium transition-colors ">
                        <Plus className="h-4 w-4" /> Nueva orden
                    </button>
                </div>

                {/* Aviso informativo */}
                <div className="bg-[var(--status-warning-bg)] border border-line-subtle rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
                    <Beef className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                        <p className="text-warning font-semibold">Solo para preparaciones de hamburguesas</p>
                        <p className="text-muted text-xs mt-0.5">
                            Los productos Açaí (pulpa, toppings, bases) se reciben directamente de proveedores vía <Link href="/factory/receiving" className="underline hover:text-muted">Recepción de mercadería</Link>. Las órdenes de producción son para: mezclas de carne, amasado de harina, preparación de panes, etc.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-muted">Cargando órdenes…</div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-20 bg-surface border border-line-subtle rounded-xl text-muted">
                        <PlayCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No hay órdenes de producción.</p>
                        <button onClick={() => setShowModal(true)} className="mt-4 text-success font-medium hover:underline">Crear primera orden →</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map(order => {
                            const cfg = statusConfig[order.status] || statusConfig['SCHEDULED'];
                            const Icon = cfg.Icon;
                            return (
                                <div key={order.id} className="bg-surface border border-line-subtle rounded-xl p-6">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="font-mono text-sm text-muted">{order.orderNumber}</span>
                                            <div>
                                                <p className="font-semibold text-ink">{order.recipe?.name || order.recipe?.product?.name}</p>
                                                <p className="text-sm text-muted">
                                                    {order.plannedYield} uds · {order.branch?.name} · {new Date(order.createdAt).toLocaleDateString('es-PE')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                                                <Icon className="h-3.5 w-3.5" /> {cfg.label}
                                            </span>
                                            {(order.status === 'SCHEDULED' || order.status === 'IN_PROGRESS') && (
                                                <button onClick={() => {
                                                    setCompletingOrder(order);
                                                    setCompleteForm({ actualYield: order.plannedYield, completedBy: '' });
                                                }}
                                                    className="text-xs font-semibold px-3 py-1.5 bg-brand hover:brightness-90 text-white rounded-lg transition-colors disabled:opacity-50">
                                                    ✓ Completar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal nueva orden */}
            <Dialog open={showModal} onClose={() => { if (!submitting) setShowModal(false); }} labelledBy="new-production-title" className="max-w-md">
                    <div>
                        <div className="flex items-center justify-between p-6 border-b border-line-subtle">
                            <div>
                                <h2 id="new-production-title" className="text-lg font-display font-semibold text-ink">Nueva Orden de Producción</h2>
                                <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                                    <Beef className="h-3.5 w-3.5 text-warning" /> Solo recetas de hamburguesas
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} aria-label="Cerrar nueva orden" className="grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-canvas">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label htmlFor="order-recipe" className="block text-sm font-semibold text-ink mb-1.5">Receta *</label>
                                <select id="order-recipe" required value={form.recipeId}
                                    onChange={e => setForm(f => ({ ...f, recipeId: e.target.value }))}
                                    className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand">
                                    <option value="" className="bg-gray-900">Seleccionar receta…</option>
                                    {recipes.map(r => (
                                        <option key={r.id} value={r.id} className="bg-gray-900">
                                            {r.name} (rinde {r.yield} {r.yieldUnit})
                                        </option>
                                    ))}
                                </select>
                                {recipes.length === 0 && (
                                    <p className="text-xs text-warning mt-1">
                                        No hay recetas de hamburguesas activas. <Link href="/factory/recipes/new" className="underline">Crear receta →</Link>
                                    </p>
                                )}
                            </div>
                            <div>
                                <label htmlFor="order-branch" className="block text-sm font-semibold text-ink mb-1.5">Sucursal / Fábrica *</label>
                                <select id="order-branch" required value={form.branchId}
                                    onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                                    className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand">
                                    <option value="" className="bg-gray-900">Seleccionar…</option>
                                    {branches.map(b => <option key={b.id} value={b.id} className="bg-gray-900">{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="order-quantity" className="block text-sm font-semibold text-ink mb-1.5">Cantidad a producir (kg / unidades) *</label>
                                <input id="order-quantity" type="number" min="1" step="0.01" required
                                    value={form.plannedYield === 0 ? '' : form.plannedYield}
                                    onChange={e => setForm(f => ({ ...f, plannedYield: parseFloat(e.target.value) }))}
                                    className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand" />
                            </div>
                            <div>
                                <label htmlFor="order-scheduled" className="block text-sm font-semibold text-ink mb-1.5">Fecha programada</label>
                                <input id="order-scheduled" type="datetime-local" value={form.scheduledDate}
                                    onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                                    className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand" />
                            </div>
                            <div>
                                <label htmlFor="order-operator" className="block text-sm font-semibold text-ink mb-1.5">Responsable *</label>
                                <input id="order-operator" type="text" required placeholder="Nombre del operador" value={form.createdBy}
                                    onChange={e => setForm(f => ({ ...f, createdBy: e.target.value }))}
                                    className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-muted" />
                            </div>
                            <div>
                                <label htmlFor="order-notes" className="block text-sm font-semibold text-ink mb-1.5">Notas</label>
                                <textarea id="order-notes" rows={2} placeholder="Ej: Lote de carne clásica para el fin de semana…" value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand resize-none placeholder:text-muted" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 border border-line rounded-xl text-sm font-medium text-muted hover:bg-surface transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-brand hover:brightness-90 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                                    {submitting ? 'Creando…' : 'Crear orden'}
                                </button>
                            </div>
                        </form>
                    </div>
            </Dialog>

            {/* Modal Completar Orden */}
            <Dialog open={Boolean(completingOrder)} onClose={() => { if (!submitting) setCompletingOrder(null); }} labelledBy="complete-production-title" className="max-w-md">
                    <div>
                        <div className="flex items-center justify-between p-6 border-b border-line-subtle">
                            <div>
                                <h2 id="complete-production-title" className="text-lg font-display font-semibold text-ink">Completar Producción</h2>
                                <p className="text-xs text-muted mt-0.5">{completingOrder?.orderNumber}</p>
                            </div>
                            <button onClick={() => setCompletingOrder(null)} aria-label="Cerrar confirmación" className="grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-canvas">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCompleteSubmit} className="p-6 space-y-4">
                            <div>
                                <label htmlFor="complete-quantity" className="block text-sm font-semibold text-ink mb-1.5">Cantidad Real Producida *</label>
                                <input id="complete-quantity" type="number" min="0.01" step="0.01" required
                                    value={completeForm.actualYield === 0 ? '' : completeForm.actualYield}
                                    onChange={e => setCompleteForm(f => ({ ...f, actualYield: parseFloat(e.target.value) }))}
                                    className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand" />
                            </div>
                            <div>
                                <label htmlFor="complete-operator" className="block text-sm font-semibold text-ink mb-1.5">Completado por (Operador) *</label>
                                <input id="complete-operator" type="text" required placeholder="Nombre del operador" value={completeForm.completedBy}
                                    onChange={e => setCompleteForm(f => ({ ...f, completedBy: e.target.value }))}
                                    className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-muted" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setCompletingOrder(null)}
                                    className="flex-1 py-2.5 border border-line rounded-xl text-sm font-medium text-muted hover:bg-surface transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-brand hover:brightness-90 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                                    {submitting ? 'Guardando…' : 'Completar Orden'}
                                </button>
                            </div>
                        </form>
                    </div>
            </Dialog>
        </div>
        </main>
    );
}
