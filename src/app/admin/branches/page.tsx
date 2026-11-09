'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Dialog } from '@/components/ui/dialog';
import {
    Store, Plus, ArrowLeft, MapPin, Phone, X,
    AlertCircle, CheckCircle2, Pencil, Trash2, Loader2
} from 'lucide-react';

type Branch = {
    id: string;
    name: string;
    type: string;
    address?: string;
    phone?: string;
    active: boolean;
};

type FormState = {
    name: string;
    type: string;
    address: string;
    phone: string;
    active: boolean;
};

const BLANK_FORM: FormState = { name: '', type: 'ACAI', address: '', phone: '', active: true };

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
    ACAI: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-400' },
    HAMBURGUESAS: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-400' },
    FABRICA: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-400' },
    // aliases legacy
    BURGER: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-400' },
    FACTORY: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-400' },
    WAREHOUSE: { bg: 'bg-canvas', text: 'text-ink', border: 'border-white/30' },
};

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<Branch | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [form, setForm] = useState<FormState>(BLANK_FORM);

    useEffect(() => { loadBranches(); }, []);

    async function loadBranches() {
        setLoading(true);
        const res = await fetch('/api/admin/branches').then(r => r.json());
        if (res.success) setBranches(res.data);
        setLoading(false);
    }

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }

    function openCreate() {
        setToast(null);
        setEditingBranch(null);
        setForm(BLANK_FORM);
        setShowModal(true);
    }

    function openEdit(b: Branch) {
        setToast(null);
        setEditingBranch(b);
        setForm({ name: b.name, type: b.type, address: b.address || '', phone: b.phone || '', active: b.active });
        setShowModal(true);
    }

    function closeModal() {
        setShowModal(false);
        setEditingBranch(null);
        setForm(BLANK_FORM);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const isEdit = !!editingBranch;
            const url = isEdit ? `/api/admin/branches/${editingBranch.id}` : '/api/admin/branches';
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', isEdit ? `Sucursal "${data.data.name}" actualizada` : `Sucursal "${data.data.name}" creada`);
                closeModal();
                loadBranches();
            } else {
                showToast('error', data.error || 'Error al guardar');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSubmitting(false); }
    }

    async function handleDelete(b: Branch) {
        setDeletingId(b.id);
        setConfirmDelete(null);
        try {
            const res = await fetch(`/api/admin/branches/${b.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                showToast('success', `Sucursal "${b.name}" eliminada`);
                setBranches(prev => prev.filter(x => x.id !== b.id));
            } else {
                showToast('error', data.error || 'Error al eliminar');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setDeletingId(null); }
    }

    function getColors(type: string) {
        return typeColors[type] || { bg: 'bg-canvas', text: 'text-muted', border: 'border-line' };
    }

    return (
        <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-brand' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Modal confirmar eliminación */}
            <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} labelledBy="branches-delete-title" className="max-w-sm">
                {confirmDelete && <div>
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 id="branches-delete-title" className="text-lg font-bold text-ink mb-1">¿Eliminar sucursal?</h3>
                        <p className="text-muted text-sm mb-6">
                            Se eliminará <strong>{confirmDelete.name}</strong>. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-2.5 border border-line-subtle rounded-xl text-sm font-medium text-muted hover:bg-canvas">
                                Cancelar
                            </button>
                            <button onClick={() => handleDelete(confirmDelete)}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold">
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>}
            </Dialog>

            <div className="relative z-10 max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/admin" className="text-sm text-muted hover:text-ink flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver a Admin
                        </Link>
                        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl flex items-center gap-3">
                            <Store className="h-8 w-8 text-brand" /> Sucursales
                        </h1>
                    </div>
                    <button onClick={openCreate}
                        className="flex min-h-11 items-center gap-2 bg-brand hover:brightness-90 text-white px-4 py-2 rounded-xl font-medium transition-colors">
                        <Plus className="h-4 w-4" /> Nueva sucursal
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20 text-muted">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando sucursales…
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {branches.map(b => {
                            const c = getColors(b.type);
                            return (
                                <div key={b.id} className={`bg-surface border border-line-subtle rounded-2xl shadow p-6 border-l-4 ${c.border}`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-bold text-lg text-ink">{b.name}</h3>
                                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium border ${c.bg} ${c.text} border-current`}>
                                                {b.type}
                                            </span>
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${b.active ? 'bg-[var(--status-success-bg)] text-success' : 'bg-[var(--status-error-bg)] text-danger'}`}>
                                                {b.active ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-sm text-muted mb-4">
                                        {b.address && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 flex-shrink-0" /> {b.address}</p>}
                                        {b.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 flex-shrink-0" /> {b.phone}</p>}
                                        {!b.address && !b.phone && <p className="text-muted text-xs italic">Sin dirección ni teléfono</p>}
                                    </div>
                                    <div className="flex gap-2 border-t border-line-subtle pt-4">
                                        <Link href={`/admin/branches/${b.id}`}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 rounded-lg border border-green-200 font-medium transition">
                                             Ver panel
                                        </Link>
                                        <button onClick={() => openEdit(b)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 font-medium transition">
                                            <Pencil className="h-3.5 w-3.5" /> Editar
                                        </button>
                                        <button onClick={() => setConfirmDelete(b)} disabled={deletingId === b.id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg border border-red-200 font-medium transition disabled:opacity-50">
                                            {deletingId === b.id
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <Trash2 className="h-3.5 w-3.5" />}
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {branches.length === 0 && (
                            <div className="col-span-2 text-center py-16 bg-surface border border-line-subtle rounded-2xl shadow text-muted">
                                <Store className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                <p>No hay sucursales registradas.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal crear / editar */}
            <Dialog open={showModal} onClose={() => { if (!submitting) setShowModal(false); }} labelledBy="branches-form-title" className="max-w-md">
                {showModal && <div>
                    <div>
                        <div className="flex items-center justify-between p-6 border-b border-line-subtle">
                            <h2 id="branches-form-title" className="text-lg font-bold text-ink">
                                {editingBranch ? `Editar — ${editingBranch.name}` : 'Nueva Sucursal'}
                            </h2>
                            <button onClick={closeModal} className="grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {toast?.type === 'error' && <p role="alert" className="rounded-lg bg-[var(--status-error-bg)] p-3 text-sm font-semibold text-danger">{toast.msg}</p>}
                            <div>
                                <label className="block text-sm font-semibold text-ink mb-1.5">Nombre *</label>
                                <input required type="text" placeholder="Ej: Skot Açaí Miraflores" value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full border border-line-subtle rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-ink mb-1.5">Tipo *</label>
                                <select required value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                    className="w-full border border-line-subtle rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                                    <option value="ACAI">ACAI — POS Açaí</option>
                                    <option value="HAMBURGUESAS">HAMBURGUESAS — POS Burgers</option>
                                    <option value="FABRICA">FABRICA — Fábrica</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-ink mb-1.5">Dirección</label>
                                <input type="text" placeholder="Av. Ejemplo 123" value={form.address}
                                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                    className="w-full border border-line-subtle rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-ink mb-1.5">Teléfono</label>
                                <input type="tel" placeholder="999 000 000" value={form.phone}
                                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                    className="w-full border border-line-subtle rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                            </div>
                            {editingBranch && (
                                <div className="flex items-center gap-3 bg-surface rounded-xl px-4 py-3">
                                    <label className="text-sm font-semibold text-ink flex-1">Sucursal activa</label>
                                    <button type="button" onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                                        className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.active ? 'bg-brand' : 'bg-gray-300'}`}>
                                        <span className={`inline-block h-5 w-5 mt-0.5 ml-0.5 rounded-full bg-surface border border-line-subtle shadow transform transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={closeModal}
                                    className="flex-1 py-2.5 border border-line-subtle rounded-xl text-sm font-medium text-muted hover:bg-canvas">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-brand hover:brightness-90 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                                    {submitting ? 'Guardando…' : editingBranch ? 'Guardar cambios' : 'Crear sucursal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>}
            </Dialog>
        </main>
    );
}
