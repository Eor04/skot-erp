'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, AlertCircle, CheckCircle2, X, Search } from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { Dialog } from '@/components/ui/dialog';

const MERMA_REASONS = [
    { value: 'VENCIMIENTO', label: 'Vencimiento' },
    { value: 'DANO_FISICO', label: 'Daño físico' },
    { value: 'DIFERENCIA_RECEPCION', label: 'Diferencia en recepción' },
    { value: 'PROCESO_PRODUCCION', label: 'Merma de producción' },
    { value: 'ROBO', label: 'Robo / Faltante' },
    { value: 'OTRO', label: 'Otro' },
];

const REASON_COLORS: Record<string, string> = {
    VENCIMIENTO: 'bg-[var(--status-error-bg)] text-danger',
    DANO_FISICO: 'bg-[var(--status-warning-bg)] text-warning',
    DIFERENCIA_RECEPCION: 'bg-[var(--status-warning-bg)] text-warning',
    PROCESO_PRODUCCION: 'bg-[var(--status-info-bg)] text-info',
    ROBO: 'bg-[var(--status-neutral-bg)] text-brand',
    OTRO: 'bg-gray-100 text-ink',
};

type MermaRecord = {
    id: string;
    quantity: number;
    unit: string;
    reason: string;
    description: string | null;
    registeredBy: string;
    createdAt: string;
    branch: { name: string };
    product: { name: string; sku: string };
    internalOrder: { orderNumber: string } | null;
};

type Branch = { id: string; name: string; type: string };
type Product = { id: string; name: string; sku: string; unit: string };

export default function MermaPage() {
    const { user } = useSession();

    const [mermas, setMermas] = useState<MermaRecord[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    // Filtros
    const [filterBranch, setFilterBranch] = useState('');
    const [searchText, setSearchText] = useState('');

    const [form, setForm] = useState({
        branchId: '',
        productId: '',
        quantity: 1,
        reason: 'VENCIMIENTO',
        description: '',
        registeredBy: '',
    });

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }

    function loadData() {
        setLoading(true);
        Promise.all([
            fetch(`/api/inventory/merma${filterBranch ? `?branchId=${filterBranch}` : ''}`).then(r => r.json()),
            fetch('/api/admin/branches').then(r => r.json()),
            fetch('/api/admin/products').then(r => r.json()),
        ]).then(([mermaData, branchData, productData]) => {
            if (mermaData.success) setMermas(mermaData.data);
            if (branchData.success) setBranches(branchData.data);
            if (productData.success) setProducts(productData.data);
        }).finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, [filterBranch]);

    // Auto-rellenar con el nombre del usuario de sesión
    useEffect(() => {
        if (user?.name) {
            setForm(f => ({ ...f, registeredBy: user.name }));
        }
    }, [user]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.branchId || !form.productId) {
            showToast('error', 'Seleccioná una sucursal y un producto');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/inventory/merma', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', data.message || 'Merma registrada');
                setShowModal(false);
                setForm(f => ({ branchId: '', productId: '', quantity: 1, reason: 'VENCIMIENTO', description: '', registeredBy: f.registeredBy }));
                loadData();
            } else {
                showToast('error', data.error || 'Error al registrar');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSubmitting(false); }
    }

    // Filtro de búsqueda en tabla
    const filtered = mermas.filter(m =>
        !searchText ||
        m.product.name.toLowerCase().includes(searchText.toLowerCase()) ||
        m.product.sku.toLowerCase().includes(searchText.toLowerCase()) ||
        m.branch.name.toLowerCase().includes(searchText.toLowerCase())
    );

    const totalUnidades = filtered.reduce((s, m) => s + m.quantity, 0);

    return (
        <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-brand' : 'bg-danger'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="mx-auto max-w-5xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                    <div>
                        <button onClick={() => window.history.back()} className="text-sm text-muted hover:text-ink flex items-center gap-1 mb-2"><ArrowLeft className="h-4 w-4" /> Volver atrás</button>
                        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink flex items-center gap-3">
                            <Trash2 className="h-8 w-8 text-red-500" /> Registro de Merma
                        </h1>
                        <p className="text-muted mt-1 text-sm">Baja de stock por vencimiento, daño u otros motivos</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-danger hover:brightness-90 text-white px-4 py-2.5 rounded-xl font-medium transition"
                    >
                        <Plus className="h-4 w-4" /> Registrar merma
                    </button>
                </div>

                {/* Filtros */}
                <div className="flex gap-3 mb-5 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                        <input type="text" placeholder="Buscar producto, SKU o sucursal…"
                            value={searchText} onChange={e => setSearchText(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-line rounded-xl bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                    </div>
                    <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
                        className="border border-line rounded-xl px-3 py-2.5 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-red-300">
                        <option value="" className="bg-surface text-ink">Todas las sucursales</option>
                        {branches.map(b => <option key={b.id} value={b.id} className="bg-surface text-ink">{b.name}</option>)}
                    </select>
                </div>

                {/* Tabla */}
                {loading ? (
                    <div className="text-center py-20 text-muted">Cargando registros…</div>
                ) : (
                    <div className="bg-surface rounded-2xl shadow overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-surface border-b border-line">
                                <tr>
                                    <th className="text-left px-5 py-4 font-semibold text-muted">Producto</th>
                                    <th className="text-left px-5 py-4 font-semibold text-muted">Sucursal</th>
                                    <th className="text-left px-5 py-4 font-semibold text-muted">Cantidad</th>
                                    <th className="text-left px-5 py-4 font-semibold text-muted">Motivo</th>
                                    <th className="text-left px-5 py-4 font-semibold text-muted">Registrado por</th>
                                    <th className="text-left px-5 py-4 font-semibold text-muted">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(m => (
                                    <tr key={m.id} className="border-b border-line-subtle hover:bg-canvas">
                                        <td className="px-5 py-4">
                                            <p className="font-medium text-ink">{m.product.name}</p>
                                            <p className="text-xs text-muted font-mono">{m.product.sku}</p>
                                        </td>
                                        <td className="px-5 py-4 text-ink">{m.branch.name}</td>
                                        <td className="px-5 py-4 font-bold text-danger">
                                            -{m.quantity} <span className="text-xs font-normal text-muted">{m.unit}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${REASON_COLORS[m.reason] || 'bg-gray-100 text-muted'}`}>
                                                {MERMA_REASONS.find(r => r.value === m.reason)?.label || m.reason}
                                            </span>
                                            {m.description && <p className="text-xs text-muted mt-1">{m.description}</p>}
                                        </td>
                                        <td className="px-5 py-4 text-ink">{m.registeredBy}</td>
                                        <td className="px-5 py-4 text-muted text-xs">
                                            {new Date(m.createdAt).toLocaleDateString('es-BO')}
                                            <br />
                                            {new Date(m.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={6} className="px-5 py-12 text-center text-muted">No hay registros de merma</td></tr>
                                )}
                            </tbody>
                        </table>
                        <div className="px-5 py-3 text-xs text-muted bg-surface border-t flex justify-between">
                            <span>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
                            {filtered.length > 0 && (
                                <span className="text-red-500 font-medium">Total baja: {totalUnidades.toFixed(2)} unidades</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal registrar merma */}
            <Dialog open={showModal} onClose={() => { if (!submitting) setShowModal(false); }} labelledBy="merma-dialog" className="max-w-lg">

                    <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-line-subtle">
                            <h2 id="merma-dialog" className="text-lg font-bold text-ink flex items-center gap-2">
                                <Trash2 className="h-5 w-5 text-red-500" /> Registrar Merma
                            </h2>
                            <button type="button" aria-label="Cerrar registro de merma" disabled={submitting} onClick={() => setShowModal(false)} className="grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-canvas disabled:opacity-50"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-ink mb-1.5">Sucursal *</label>
                                    <select required value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                                        className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                                        <option value="" className="bg-surface text-ink">Seleccionar…</option>
                                        {branches.map(b => <option key={b.id} value={b.id} className="bg-surface text-ink">{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-ink mb-1.5">Producto *</label>
                                    <select required value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
                                        className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                                        <option value="" className="bg-surface text-ink">Seleccionar…</option>
                                        {products.map(p => <option key={p.id} value={p.id} className="bg-surface text-ink">{p.name} ({p.sku})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-ink mb-1.5">Cantidad *</label>
                                    <input required type="number" min="0.01" step="0.01" value={form.quantity === 0 ? '' : form.quantity}
                                        onChange={e => setForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
                                        className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-ink mb-1.5">Motivo *</label>
                                    <select required value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                        className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                                        {MERMA_REASONS.map(r => <option key={r.value} value={r.value} className="bg-surface text-ink">{r.label}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-ink mb-1.5">
                                        Registrado por *
                                        {user?.name && <span className="ml-1 text-xs font-normal text-muted">(auto)</span>}
                                    </label>
                                    <input required type="text" placeholder="Nombre del responsable" value={form.registeredBy}
                                        onChange={e => setForm(f => ({ ...f, registeredBy: e.target.value }))}
                                        className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-ink mb-1.5">Descripción</label>
                                    <textarea rows={2} value={form.description}
                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        placeholder="¿Qué pasó exactamente? (opcional)"
                                        className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
                                </div>
                            </div>
                            <p className="text-xs text-warning bg-orange-50 border border-orange-200 rounded-lg p-3">
                                 Esta acción reducirá el stock de la sucursal seleccionada y quedará registrada en el Kardex.
                            </p>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 border border-line rounded-xl text-sm font-medium text-muted hover:bg-canvas transition">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-danger hover:brightness-90 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                                    {submitting ? 'Registrando…' : 'Dar de baja'}
                                </button>
                            </div>
                        </form>
                    </div>

            </Dialog>
        </main>
    );
}
