'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Users, Plus, ArrowLeft, X, AlertCircle, CheckCircle2,
    Shield, Pencil, Trash2, Loader2
} from 'lucide-react';

type User = {
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
    branches?: { branch: { id: string; name: string } }[];
};
type Branch = { id: string; name: string };

type FormState = {
    name: string;
    email: string;
    role: string;
    branchId: string;
    password: string;
    active: boolean;
};

const BLANK_FORM: FormState = {
    name: '', email: '', role: 'CASHIER', branchId: '', password: '', active: true,
};

const roleColors: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-700',
    MANAGER: 'bg-blue-100 text-blue-700',
    CASHIER: 'bg-green-100 text-green-700',
    FACTORY_OPERATOR: 'bg-orange-100 text-orange-700',
    WAREHOUSE: 'bg-white/10 text-white/80',
};

const ROLES: { value: string; label: string; desc?: string }[] = [
    { value: 'ADMIN',    label: 'Administrador', desc: 'Acceso total a todas las sucursales. No requiere sucursal.' },
    { value: 'MANAGER',  label: 'Gerente',        desc: 'Administra una sucursal específica.' },
    { value: 'CASHIER',  label: 'Cajero',          desc: 'Opera el POS de su sucursal.' },
    { value: 'WAREHOUSE', label: 'Almacén / Fábrica', desc: 'Gestiona inventario y producción.' },
];

const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Administrador', MANAGER: 'Gerente',
    CASHIER: 'Cajero', WAREHOUSE: 'Almacén / Fábrica', FACTORY_OPERATOR: 'Operador Fábrica',
};

/** Roles que NO deben tener sucursal asignada */
const ROLES_WITHOUT_BRANCH = ['ADMIN'];

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [form, setForm] = useState<FormState>(BLANK_FORM);

    useEffect(() => {
        loadAll();
    }, []);

    async function loadAll() {
        setLoading(true);
        const [u, b] = await Promise.all([
            fetch('/api/admin/users').then(r => r.json()),
            fetch('/api/admin/branches').then(r => r.json()),
        ]);
        if (u.success) setUsers(u.data);
        if (b.success) setBranches(b.data);
        setLoading(false);
    }

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }

    function openCreate() {
        setEditingUser(null);
        setForm(BLANK_FORM);
        setShowModal(true);
    }

    function openEdit(u: User) {
        setEditingUser(u);
        setForm({
            name: u.name,
            email: u.email,
            role: u.role,
            branchId: u.branches?.[0]?.branch.id || '',
            password: '', // vacío = no cambiar
            active: u.active,
        });
        setShowModal(true);
    }

    function closeModal() {
        setShowModal(false);
        setEditingUser(null);
        setForm(BLANK_FORM);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const isEdit = !!editingUser;
            const url = isEdit ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
            const method = isEdit ? 'PUT' : 'POST';
            // No enviar password vacía en edición
            const body = { ...form };
            if (isEdit && !body.password) delete (body as any).password;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', isEdit ? `Usuario "${data.data.name}" actualizado` : `Usuario "${data.data.name}" creado`);
                closeModal();
                loadAll();
            } else {
                showToast('error', data.error || 'Error al guardar');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSubmitting(false); }
    }

    async function handleDelete(u: User) {
        setDeletingId(u.id);
        setConfirmDelete(null);
        try {
            const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                showToast('success', `Usuario "${u.name}" eliminado`);
                setUsers(prev => prev.filter(x => x.id !== u.id));
            } else {
                showToast('error', data.error || 'Error al eliminar');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setDeletingId(null); }
    }

    return (
        <div className="min-h-screen relative overflow-hidden p-4 md:p-8" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: '56px 100px' }} />
            </div>
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Modal de confirmación de eliminación */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-white/90 mb-1">¿Eliminar usuario?</h3>
                        <p className="text-white/60 text-sm mb-6">
                            Se eliminará <strong>{confirmDelete.name}</strong>. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-2.5 border border-white/10 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5">
                                Cancelar
                            </button>
                            <button onClick={() => handleDelete(confirmDelete)}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold">
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative z-10 max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/admin" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver a Admin
                        </Link>
                        <h1 className="text-3xl font-bold text-white/90 flex items-center gap-3">
                            <Users className="h-8 w-8 text-blue-600" /> Gestión de Usuarios
                        </h1>
                    </div>
                    <button onClick={openCreate}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium transition-colors">
                        <Plus className="h-4 w-4" /> Nuevo usuario
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20 text-white/40">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando usuarios…
                    </div>
                ) : (
                    <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="text-left px-6 py-4 font-semibold text-white/70">Nombre</th>
                                    <th className="text-left px-6 py-4 font-semibold text-white/70">Email</th>
                                    <th className="text-left px-6 py-4 font-semibold text-white/70">Rol</th>
                                    <th className="text-left px-6 py-4 font-semibold text-white/70">Sucursal</th>
                                    <th className="text-left px-6 py-4 font-semibold text-white/70">Estado</th>
                                    <th className="px-6 py-4" />
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-b border-white/10 hover:bg-white/5">
                                        <td className="px-6 py-4 font-medium text-white/90">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                                                    {u.name.charAt(0).toUpperCase()}
                                                </div>
                                                {u.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-white/70">{u.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium w-fit ${roleColors[u.role] || 'bg-white/10 text-white/70'}`}>
                                                <Shield className="h-3 w-3" /> {ROLE_LABELS[u.role] || u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-white/60 text-xs">
                                            {u.branches?.map(b => b.branch.name).join(', ') || '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                {u.active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 justify-end">
                                                <button onClick={() => openEdit(u)}
                                                    className="p-1.5 text-white/40 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="Editar">
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete(u)}
                                                    disabled={deletingId === u.id}
                                                    className="p-1.5 text-white/40 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                                                    title="Eliminar">
                                                    {deletingId === u.id
                                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                                        : <Trash2 className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-white/40">No hay usuarios registrados</td></tr>
                                )}
                            </tbody>
                        </table>
                        <div className="px-6 py-3 text-xs text-white/40 bg-white/5 border-t">
                            {users.length} usuario{users.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal crear / editar */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                    <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white/90">
                                {editingUser ? `Editar — ${editingUser.name}` : 'Nuevo Usuario'}
                            </h2>
                            <button onClick={closeModal} className="text-white/40 hover:text-white/70">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">Nombre completo *</label>
                                <input required type="text" placeholder="Juan Pérez" value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">Email *</label>
                                <input required type="email" placeholder="juan@skot.com" value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-1.5">Rol *</label>
                                    <select required value={form.role}
                                        onChange={e => {
                                            const newRole = e.target.value;
                                            setForm(f => ({
                                                ...f,
                                                role: newRole,
                                                // Limpiar sucursal si el rol no necesita una
                                                branchId: ROLES_WITHOUT_BRANCH.includes(newRole) ? '' : f.branchId,
                                            }));
                                        }}
                                        className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                                        {ROLES.map(r => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>
                                    {ROLES.find(r => r.value === form.role)?.desc && (
                                        <p className="text-xs text-white/40 mt-1">
                                            {ROLES.find(r => r.value === form.role)?.desc}
                                        </p>
                                    )}
                                </div>
                                {/* Selector de sucursal — oculto para Admin/Gerente */}
                                {!ROLES_WITHOUT_BRANCH.includes(form.role) ? (
                                    <div>
                                        <label className="block text-sm font-semibold text-white/80 mb-1.5">Sucursal *</label>
                                        <select required value={form.branchId}
                                            onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                                            className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                                            <option value="">Seleccioná una sucursal…</option>
                                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="flex items-end pb-1">
                                        <div className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-sm text-slate-400 flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-slate-400" />
                                            Acceso global, sin sucursal
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">
                                    {editingUser ? 'Nueva contraseña (dejar vacía = sin cambio)' : 'Contraseña inicial'}
                                </label>
                                <input type="password" placeholder={editingUser ? '••••••••' : 'Dejar vacío = Skot2025!'} value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                                {!editingUser && <p className="text-xs text-white/40 mt-1">Si se deja vacío, la contraseña por defecto es <code>Skot2025!</code></p>}
                            </div>
                            {editingUser && (
                                <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                                    <label className="text-sm font-semibold text-white/80 flex-1">Usuario activo</label>
                                    <button type="button" onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                                        className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.active ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                        <span className={`inline-block h-5 w-5 mt-0.5 ml-0.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow transform transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={closeModal}
                                    className="flex-1 py-2.5 border border-white/10 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                                    {submitting ? 'Guardando…' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
