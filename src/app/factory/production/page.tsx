'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PlayCircle, Plus, ArrowLeft, Clock, CheckCircle, Loader, X, AlertCircle, CheckCircle2 } from 'lucide-react';

type Order = {
    id: string;
    orderNumber: string;
    recipe: { name?: string; product?: { name: string } };
    plannedYield: number;
    branch: { name: string };
    status: string;
    createdAt: string;
};

type Recipe = { id: string; name: string; yield: number; yieldUnit: string };
type Branch = { id: string; name: string };

const statusConfig: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
    SCHEDULED: { label: 'Programada', color: 'bg-yellow-100 text-yellow-700', Icon: Clock },
    IN_PROGRESS: { label: 'En Proceso', color: 'bg-blue-100 text-blue-700', Icon: Loader },
    COMPLETED: { label: 'Completada', color: 'bg-green-100 text-green-700', Icon: CheckCircle },
    CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-700', Icon: X },
};

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

    useEffect(() => { fetchAll(); }, []);

    async function fetchAll() {
        setLoading(true);
        try {
            const [oRes, rRes, bRes] = await Promise.all([
                fetch('/api/factory/production'),
                fetch('/api/factory/recipes'),
                fetch('/api/admin/branches'),
            ]);
            const [o, r, b] = await Promise.all([oRes.json(), rRes.json(), bRes.json()]);
            if (o.success) setOrders(o.data);
            if (r.success) setRecipes(r.data);
            if (b.success) setBranches(b.data);
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

    async function handleComplete(id: string) {
        setCompletingId(id);
        try {
            const res = await fetch(`/api/factory/production/${id}/complete`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast('success', 'Orden completada y stock actualizado');
                fetchAll();
            } else {
                showToast('error', data.error || 'Error al completar');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setCompletingId(null); }
    }

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: '56px 100px' }} />
            </div>
            <div className="relative z-10 h-full w-full">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/factory" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver a Fábrica
                        </Link>
                        <h1 className="text-3xl font-bold text-white/90 flex items-center gap-3">
                            <PlayCircle className="h-8 w-8 text-green-600" /> Órdenes de Producción
                        </h1>
                    </div>
                    <button onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium transition-colors">
                        <Plus className="h-4 w-4" /> Nueva orden
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-white/40">Cargando órdenes…</div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow text-white/40">
                        <PlayCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No hay órdenes de producción.</p>
                        <button onClick={() => setShowModal(true)} className="mt-4 text-green-600 font-medium hover:underline">Crear primera orden →</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map(order => {
                            const cfg = statusConfig[order.status] || statusConfig['SCHEDULED'];
                            const Icon = cfg.Icon;
                            return (
                                <div key={order.id} className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <span className="font-mono text-sm text-white/40">{order.orderNumber}</span>
                                            <div>
                                                <p className="font-semibold text-white/90">{order.recipe?.name || order.recipe?.product?.name}</p>
                                                <p className="text-sm text-white/60">{order.plannedYield} uds · {order.branch?.name} · {new Date(order.createdAt).toLocaleDateString('es-PE')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                                                <Icon className="h-3.5 w-3.5" /> {cfg.label}
                                            </span>
                                            {order.status === 'SCHEDULED' || order.status === 'IN_PROGRESS' ? (
                                                <button onClick={() => handleComplete(order.id)} disabled={completingId === order.id}
                                                    className="text-xs font-semibold px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50">
                                                    {completingId === order.id ? 'Completando…' : 'Completar ✓'}
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                    <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white/90">Nueva Orden de Producción</h2>
                            <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white/70"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">Receta *</label>
                                <select required value={form.recipeId} onChange={e => setForm(f => ({ ...f, recipeId: e.target.value }))}
                                    className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300">
                                    <option value="">Seleccionar…</option>
                                    {recipes.map(r => <option key={r.id} value={r.id}>{r.name} (rinde {r.yield} {r.yieldUnit})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">Sucursal *</label>
                                <select required value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                                    className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300">
                                    <option value="">Seleccionar…</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">Cantidad a producir *</label>
                                <input type="number" min="1" step="0.01" required value={form.plannedYield === 0 ? '' : form.plannedYield}
                                    onChange={e => setForm(f => ({ ...f, plannedYield: parseFloat(e.target.value) }))}
                                    className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">Fecha programada</label>
                                <input type="datetime-local" value={form.scheduledDate}
                                    onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                                    className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">Responsable *</label>
                                <input type="text" required placeholder="Nombre del operador" value={form.createdBy}
                                    onChange={e => setForm(f => ({ ...f, createdBy: e.target.value }))}
                                    className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">Notas</label>
                                <textarea rows={2} placeholder="Observaciones…" value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 border border-white/10 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5 transition-colors">Cancelar</button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                                    {submitting ? 'Creando…' : 'Crear orden'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
        </div>
        );
}
