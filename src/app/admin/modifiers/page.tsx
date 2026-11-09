'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Pencil, Trash2, X, AlertCircle, CheckCircle2, Settings2 } from 'lucide-react';

type Modifier = {
    id: string; name: string; description: string | null;
    price: number; category: string | null; active: boolean;
};

const CAT_OPTIONS = [
    { value: 'BURGER', label: ' Burgers' },
    { value: 'ACAI', label: ' Açaí' },
    { value: 'BEVERAGE', label: ' Bebidas' },
    { value: 'GENERAL', label: '📋 General' },
];

const EMPTY_FORM = { name: '', description: '', price: 0, category: 'BURGER', active: true };

export default function ModifiersPage() {
    const [modifiers, setModifiers] = useState<Modifier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<Modifier | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [catFilter, setCatFilter] = useState('');

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }

    function loadData() {
        setLoading(true);
        fetch('/api/admin/modifiers').then(r => r.json()).then(d => {
            if (d.success) setModifiers(d.data);
        }).finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, []);

    function openCreate() {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setShowModal(true);
    }

    function openEdit(m: Modifier) {
        setEditingId(m.id);
        setForm({ name: m.name, description: m.description || '', price: m.price, category: m.category || 'BURGER', active: m.active });
        setShowModal(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const url = editingId ? `/api/admin/modifiers/${editingId}` : '/api/admin/modifiers';
            const method = editingId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            const data = await res.json();
            if (data.success) {
                showToast('success', editingId ? 'Modificador actualizado' : 'Modificador creado');
                setShowModal(false);
                loadData();
            } else {
                showToast('error', data.error || 'Error');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSubmitting(false); }
    }

    async function handleDelete(m: Modifier) {
        setConfirmDelete(null);
        const res = await fetch(`/api/admin/modifiers/${m.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast('success', 'Modificador desactivado');
            loadData();
        } else {
            showToast('error', data.error || 'Error');
        }
    }

    const filtered = modifiers.filter(m => !catFilter || m.category === catFilter);
    const grouped = CAT_OPTIONS.map(c => ({
        ...c, items: filtered.filter(m => m.category === c.value),
    })).filter(g => g.items.length > 0);
    const sinCat = filtered.filter(m => !m.category || !CAT_OPTIONS.find(c => c.value === m.category));

    return (
        <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-brand' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            {confirmDelete && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-line-subtle rounded-xl shadow-lg w-full max-w-sm p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-ink mb-1">¿Desactivar modificador?</h3>
                        <p className="text-muted text-sm mb-6">
                            <strong>{confirmDelete.name}</strong> no aparecerá más en el POS.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-2.5 border border-line-subtle rounded-xl text-sm font-medium text-muted hover:bg-canvas">
                                Cancelar
                            </button>
                            <button onClick={() => handleDelete(confirmDelete)}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold">
                                Sí, desactivar
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
                            <Settings2 className="h-7 w-7 text-amber-500" /> Modificadores
                        </h1>
                        <p className="text-muted mt-1 text-sm">Extras y complementos que el cliente puede agregar (queso doble, sin cebolla, etc.)</p>
                    </div>
                    <button onClick={openCreate}
                        className="flex min-h-11 items-center gap-2 bg-brand hover:brightness-90 text-white px-4 py-2.5 rounded-xl font-medium transition">
                        <Plus className="h-4 w-4" /> Nuevo modificador
                    </button>
                </div>

                {/* Filtro categoría */}
                <div className="flex gap-2 mb-5 flex-wrap">
                    <button onClick={() => setCatFilter('')}
                        className={`px-4 py-1.5 rounded-xl text-sm font-medium transition ${!catFilter ? 'bg-brand text-white' : 'bg-surface border border-line-subtle text-muted hover:bg-canvas'}`}>
                        Todos ({modifiers.length})
                    </button>
                    {CAT_OPTIONS.map(c => {
                        const count = modifiers.filter(m => m.category === c.value).length;
                        if (!count) return null;
                        return (
                            <button key={c.value} onClick={() => setCatFilter(c.value)}
                                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition ${catFilter === c.value ? 'bg-brand text-white' : 'bg-surface border border-line-subtle text-muted hover:bg-canvas'}`}>
                                {c.label} ({count})
                            </button>
                        );
                    })}
                </div>

                {loading ? (
                    <div className="text-center py-20 text-muted">Cargando modificadores…</div>
                ) : (
                    <div className="space-y-6">
                        {grouped.map(g => (
                            <div key={g.value} className="bg-surface border border-line-subtle rounded-xl shadow overflow-x-auto">
                                <div className="px-5 py-3 bg-surface border-b border-line-subtle flex items-center gap-2">
                                    <span className="text-base">{g.label.split(' ')[0]}</span>
                                    <h2 className="font-semibold text-ink">{g.label.substring(2)}</h2>
                                    <span className="ml-auto text-xs text-muted font-medium">{g.items.length} modificadores</span>
                                </div>
                                <table className="w-full min-w-[760px] text-sm">
                                    <tbody>
                                        {g.items.map(m => (
                                            <tr key={m.id} className={`border-b border-gray-50 hover:bg-canvas ${!m.active ? 'opacity-40' : ''}`}>
                                                <td className="px-5 py-3.5">
                                                    <p className="font-medium text-ink">{m.name}</p>
                                                    {m.description && <p className="text-xs text-muted mt-0.5">{m.description}</p>}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${m.active ? 'bg-[var(--status-success-bg)] text-success' : 'bg-canvas text-muted'}`}>
                                                        {m.active ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right font-bold text-ink">
                                                    {m.price === 0
                                                        ? <span className="text-brand text-xs font-semibold">Gratis</span>
                                                        : `+Bs. ${m.price.toFixed(2)}`}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => openEdit(m)}
                                                            className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                            title="Editar">
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button onClick={() => setConfirmDelete(m)}
                                                            className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                            title="Desactivar">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                        {sinCat.length > 0 && (
                            <div className="bg-surface border border-line-subtle rounded-xl shadow overflow-x-auto">
                                <div className="px-5 py-3 bg-surface border-b border-line-subtle">
                                    <h2 className="font-semibold text-ink">📋 Sin categoría</h2>
                                </div>
                                <table className="w-full min-w-[760px] text-sm">
                                    <tbody>
                                        {sinCat.map(m => (
                                            <tr key={m.id} className="border-b border-gray-50 hover:bg-canvas">
                                                <td className="px-5 py-3.5 font-medium text-ink">{m.name}</td>
                                                <td className="px-5 py-3.5 text-right font-bold text-ink">+Bs. {m.price.toFixed(2)}</td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex gap-2 justify-end">
                                                        <button onClick={() => openEdit(m)} className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Pencil className="h-4 w-4" /></button>
                                                        <button onClick={() => setConfirmDelete(m)} className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="h-4 w-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {filtered.length === 0 && (
                            <div className="text-center py-16 text-muted">
                                <Settings2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p>No hay modificadores registrados</p>
                                <button onClick={openCreate} className="mt-3 text-brand font-medium text-sm hover:underline">
                                    + Crear el primero
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                    <div className="bg-surface border border-line-subtle rounded-xl shadow-lg w-full max-w-sm">
                        <div className="flex items-center justify-between p-6 border-b border-line-subtle">
                            <h2 className="text-lg font-bold text-ink">
                                {editingId ? '✏️ Editar modificador' : '➕ Nuevo modificador'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-ink mb-1.5">Nombre *</label>
                                <input required type="text" placeholder="Ej: Queso doble" value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full border border-line-subtle rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-ink mb-1.5">Descripción</label>
                                <input type="text" placeholder="Detalle opcional" value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full border border-line-subtle rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-ink mb-1.5">Precio extra (Bs.)</label>
                                    <input required type="number" min="0" step="0.5" value={form.price === 0 ? '' : form.price}
                                        onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                                        className="w-full border border-line-subtle rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                                    <p className="text-xs text-muted mt-1">0 = gratis</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-ink mb-1.5">Categoría</label>
                                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                        className="w-full border border-line-subtle rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300">
                                        {CAT_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${form.active ? 'bg-brand' : 'bg-gray-300'}`}>
                                    <span className={`inline-block h-4 w-4 rounded-full bg-surface border border-line-subtle shadow transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                                <span className="text-sm text-ink">{form.active ? 'Activo (visible en el POS)' : 'Inactivo (oculto en el POS)'}</span>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 border border-line-subtle rounded-xl text-sm font-medium text-muted hover:bg-canvas transition">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-brand hover:brightness-90 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                                    {submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear modificador'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
