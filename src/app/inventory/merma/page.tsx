'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, AlertCircle, CheckCircle2, X, Search } from 'lucide-react';
import { useSession } from '@/lib/session-context';

const MERMA_REASONS = [
    { value: 'VENCIMIENTO', label: '🗓️ Vencimiento' },
    { value: 'DANO_FISICO', label: '💥 Daño físico' },
    { value: 'DIFERENCIA_RECEPCION', label: '📦 Diferencia en recepción' },
    { value: 'PROCESO_PRODUCCION', label: '🏭 Merma de producción' },
    { value: 'ROBO', label: '🚨 Robo / Faltante' },
    { value: 'OTRO', label: '📝 Otro' },
];

const REASON_COLORS: Record<string, string> = {
    VENCIMIENTO: 'bg-red-100 text-red-400',
    DANO_FISICO: 'bg-orange-100 text-orange-700',
    DIFERENCIA_RECEPCION: 'bg-yellow-100 text-yellow-400',
    PROCESO_PRODUCCION: 'bg-blue-500/20 text-blue-400',
    ROBO: 'bg-purple-100 text-purple-700',
    OTRO: 'bg-gray-100 text-white/80',
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
        <div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: '56px 100px' }} />
            </div>
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                    <div>
                        <button onClick={() => window.history.back()} className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2"><ArrowLeft className="h-4 w-4" /> Volver atrás</button>
                        <h1 className="text-3xl font-bold text-white/90 flex items-center gap-3">
                            <Trash2 className="h-8 w-8 text-red-500" /> Registro de Merma
                        </h1>
                        <p className="text-white/60 mt-1 text-sm">Baja de stock por vencimiento, daño u otros motivos</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-medium transition"
                    >
                        <Plus className="h-4 w-4" /> Registrar merma
                    </button>
                </div>

                {/* Filtros */}
                <div className="flex gap-3 mb-5 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                        <input type="text" placeholder="Buscar producto, SKU o sucursal…"
                            value={searchText} onChange={e => setSearchText(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-white/20 rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                    </div>
                    <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
                        className="border border-white/20 rounded-xl px-3 py-2.5 text-sm bg-white/5 focus:outline-none focus:ring-2 focus:ring-red-300">
                        <option value="" className="bg-gray-900 text-white">Todas las sucursales</option>
                        {branches.map(b => <option key={b.id} value={b.id} className="bg-gray-900 text-white">{b.name}</option>)}
                    </select>
                </div>

                {/* Tabla */}
                {loading ? (
                    <div className="text-center py-20 text-white/40">Cargando registros…</div>
                ) : (
                    <div className="bg-white/5 rounded-2xl shadow overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 border-b border-white/20">
                                <tr>
                                    <th className="text-left px-5 py-4 font-semibold text-white/70">Producto</th>
                                    <th className="text-left px-5 py-4 font-semibold text-white/70">Sucursal</th>
                                    <th className="text-left px-5 py-4 font-semibold text-white/70">Cantidad</th>
                                    <th className="text-left px-5 py-4 font-semibold text-white/70">Motivo</th>
                                    <th className="text-left px-5 py-4 font-semibold text-white/70">Registrado por</th>
                                    <th className="text-left px-5 py-4 font-semibold text-white/70">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(m => (
                                    <tr key={m.id} className="border-b border-white/10 hover:bg-white/5">
                                        <td className="px-5 py-4">
                                            <p className="font-medium text-white/90">{m.product.name}</p>
                                            <p className="text-xs text-white/40 font-mono">{m.product.sku}</p>
                                        </td>
                                        <td className="px-5 py-4 text-white/80">{m.branch.name}</td>
                                        <td className="px-5 py-4 font-bold text-red-400">
                                            -{m.quantity} <span className="text-xs font-normal text-white/40">{m.unit}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${REASON_COLORS[m.reason] || 'bg-gray-100 text-white/70'}`}>
                                                {MERMA_REASONS.find(r => r.value === m.reason)?.label || m.reason}
                                            </span>
                                            {m.description && <p className="text-xs text-white/40 mt-1">{m.description}</p>}
                                        </td>
                                        <td className="px-5 py-4 text-white/80">{m.registeredBy}</td>
                                        <td className="px-5 py-4 text-white/40 text-xs">
                                            {new Date(m.createdAt).toLocaleDateString('es-BO')}
                                            <br />
                                            {new Date(m.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={6} className="px-5 py-12 text-center text-white/40">No hay registros de merma</td></tr>
                                )}
                            </tbody>
                        </table>
                        <div className="px-5 py-3 text-xs text-white/40 bg-white/5 border-t flex justify-between">
                            <span>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
                            {filtered.length > 0 && (
                                <span className="text-red-500 font-medium">Total baja: {totalUnidades.toFixed(2)} unidades</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal registrar merma */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                    <div className="bg-white/5 rounded-2xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white/90 flex items-center gap-2">
                                <Trash2 className="h-5 w-5 text-red-500" /> Registrar Merma
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white/70"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-1.5">Sucursal *</label>
                                    <select required value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                                        className="w-full border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                                        <option value="" className="bg-gray-900 text-white">Seleccionar…</option>
                                        {branches.map(b => <option key={b.id} value={b.id} className="bg-gray-900 text-white">{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-1.5">Producto *</label>
                                    <select required value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
                                        className="w-full border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                                        <option value="" className="bg-gray-900 text-white">Seleccionar…</option>
                                        {products.map(p => <option key={p.id} value={p.id} className="bg-gray-900 text-white">{p.name} ({p.sku})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-1.5">Cantidad *</label>
                                    <input required type="number" min="0.01" step="0.01" value={form.quantity === 0 ? '' : form.quantity}
                                        onChange={e => setForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
                                        className="w-full border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-1.5">Motivo *</label>
                                    <select required value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                        className="w-full border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                                        {MERMA_REASONS.map(r => <option key={r.value} value={r.value} className="bg-gray-900 text-white">{r.label}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-white/80 mb-1.5">
                                        Registrado por *
                                        {user?.name && <span className="ml-1 text-xs font-normal text-white/40">(auto)</span>}
                                    </label>
                                    <input required type="text" placeholder="Nombre del responsable" value={form.registeredBy}
                                        onChange={e => setForm(f => ({ ...f, registeredBy: e.target.value }))}
                                        className="w-full border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-white/80 mb-1.5">Descripción</label>
                                    <textarea rows={2} value={form.description}
                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        placeholder="¿Qué pasó exactamente? (opcional)"
                                        className="w-full border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
                                </div>
                            </div>
                            <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg p-3">
                                ⚠️ Esta acción reducirá el stock de la sucursal seleccionada y quedará registrada en el Kardex.
                            </p>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 border border-white/20 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5 transition">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                                    {submitting ? 'Registrando…' : 'Dar de baja'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
