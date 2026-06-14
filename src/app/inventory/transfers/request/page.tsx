'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useSession } from '@/lib/session-context';

interface Branch { id: string; name: string; type: string; }
interface Product { id: string; name: string; sku: string; unit: string; currentStock: number; }
interface TransferItem { productId: string; productName: string; requestedQty: number; unit: string; }

export default function TransferRequestPage() {
    const { user } = useSession();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [items, setItems] = useState<TransferItem[]>([]);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        myBranchId: '',      // sucursal que RECIBE (la del usuario)
        fromBranchId: '',    // sucursal que ENVÍA (de donde pederán los productos)
        notes: '',
    });

    // Items form state
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState('');

    useEffect(() => {
        loadBranches();
    }, [user]);

    const loadBranches = async () => {
        const res = await fetch('/api/branches');
        const d = await res.json();
        if (d.success) {
            setBranches(d.data);
            // Pre-seleccionar la primera sucursal del usuario como destino
            if (user?.branchIds?.[0]) {
                setForm(f => ({ ...f, myBranchId: user.branchIds[0] }));
            }
        }
    };

    const loadProducts = async (branchId: string) => {
        if (!branchId) return;
        const res = await fetch(`/api/inventory/stock?branchId=${branchId}`);
        const d = await res.json();
        if (d.success) {
            setProducts(d.data.map((s: any) => ({
                id: s.productId,
                name: s.product.name,
                sku: s.product.sku,
                unit: s.product.unit,
                currentStock: s.currentStock,
            })));
        }
    };

    const handleFromBranchChange = (branchId: string) => {
        setForm(f => ({ ...f, fromBranchId: branchId }));
        setItems([]);
        setSelectedProduct('');
        loadProducts(branchId);
    };

    const addItem = () => {
        if (!selectedProduct || !qty || parseFloat(qty) <= 0) return;
        const prod = products.find(p => p.id === selectedProduct);
        if (!prod) return;
        if (items.find(i => i.productId === selectedProduct)) return; // evitar duplicados
        setItems(prev => [...prev, {
            productId: prod.id,
            productName: prod.name,
            requestedQty: parseFloat(qty),
            unit: prod.unit,
        }]);
        setSelectedProduct('');
        setQty('');
    };

    const removeItem = (productId: string) => {
        setItems(prev => prev.filter(i => i.productId !== productId));
    };

    const showNotification = (type: 'success' | 'error', msg: string) => {
        setNotification({ type, msg });
        setTimeout(() => setNotification(null), 4000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.myBranchId || !form.fromBranchId) {
            showNotification('error', 'Seleccioná la sucursal de origen');
            return;
        }
        if (items.length === 0) {
            showNotification('error', 'Agregá al menos un producto');
            return;
        }
        if (form.myBranchId === form.fromBranchId) {
            showNotification('error', 'Origen y destino no pueden ser la misma sucursal');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/inventory/transfers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromBranchId: form.fromBranchId, // de donde vienen los productos
                    toBranchId: form.myBranchId,     // a donde van (mi sucursal)
                    requestedBy: user?.userId,
                    notes: form.notes || null,
                    items: items.map(i => ({ productId: i.productId, requestedQty: i.requestedQty })),
                }),
            });
            const data = await res.json();

            if (data.success) {
                showNotification('success', `Solicitud ${data.data.transferNumber} enviada al administrador`);
                setItems([]);
                setForm(f => ({ ...f, fromBranchId: '', notes: '' }));
                setProducts([]);
            } else {
                showNotification('error', data.error || 'Error al enviar la solicitud');
            }
        } catch {
            showNotification('error', 'Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    const myBranch = branches.find(b => b.id === form.myBranchId);
    const fromBranch = branches.find(b => b.id === form.fromBranchId);
    const otherBranches = branches.filter(b => b.id !== form.myBranchId);

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: '56px 100px' }} />
            </div>
            {notification && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {notification.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {notification.msg}
                </div>
            )}

            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/inventory/transfers" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Transferencias
                    </Link>
                    <h1 className="text-3xl font-bold text-white/90">📦 Solicitar Transferencia</h1>
                    <p className="text-white/60 mt-1">Solicitá productos de otra sucursal o de la fábrica</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Sucursales */}
                    <div className="bg-white/5/5/5 backdrop-blur-md rounded-2xl shadow-sm border border-white/10 p-6">
                        <h2 className="font-bold text-white/80 mb-4">Origen y destino</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">
                                    Mi sucursal (recibe) *
                                </label>
                                <select
                                    value={form.myBranchId}
                                    onChange={e => setForm(f => ({ ...f, myBranchId: e.target.value }))}
                                    disabled={!!(user?.branchIds?.[0] && user.role !== 'ADMIN')}
                                    className="w-full border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 disabled:bg-white/5/5/5"
                                >
                                    <option value="" className="text-white/90">-- Seleccioná --</option>
                                    {branches.map(b => <option key={b.id} value={b.id} className="text-white/90">{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-white/80 mb-1.5">
                                    Sucursal de origen (provee) *
                                </label>
                                <select
                                    value={form.fromBranchId}
                                    onChange={e => handleFromBranchChange(e.target.value)}
                                    className="w-full border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                                >
                                    <option value="" className="text-white/90">-- Seleccioná --</option>
                                    {otherBranches.map(b => <option key={b.id} value={b.id} className="text-white/90">{b.name} ({b.type})</option>)}
                                </select>
                            </div>
                        </div>

                        {myBranch && fromBranch && (
                            <div className="mt-3 p-3 bg-green-500/10 rounded-xl text-sm text-green-400">
                                📦 <strong>{fromBranch.name}</strong> enviará productos a <strong>{myBranch.name}</strong>
                            </div>
                        )}

                        <div className="mt-4">
                            <label className="block text-sm font-semibold text-white/80 mb-1.5">Notas para el administrador</label>
                            <textarea
                                rows={2}
                                value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder="Ej: Necesitamos urgente para el fin de semana..."
                                className="w-full border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
                            />
                        </div>
                    </div>

                    {/* Agregar productos */}
                    <div className="bg-white/5/5/5 backdrop-blur-md rounded-2xl shadow-sm border border-white/10 p-6">
                        <h2 className="font-bold text-white/80 mb-4">Productos a solicitar</h2>

                        {!form.fromBranchId ? (
                            <p className="text-white/40 text-sm">Seleccioná la sucursal de origen para ver sus productos disponibles</p>
                        ) : (
                            <>
                                <div className="flex gap-3 mb-4">
                                    <select
                                        value={selectedProduct}
                                        onChange={e => setSelectedProduct(e.target.value)}
                                        className="flex-1 border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                                    >
                                        <option value="" className="text-white/90">-- Elegí un producto --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id} className="text-white/90">
                                                {p.name} — Stock disponible: {p.currentStock} {p.unit}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number" min="0.01" step="0.01"
                                        value={qty}
                                        onChange={e => setQty(e.target.value)}
                                        placeholder="Cantidad"
                                        className="w-28 border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="flex items-center gap-1 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition"
                                    >
                                        <Plus className="h-4 w-4" /> Agregar
                                    </button>
                                </div>

                                {/* Lista de items */}
                                {items.length > 0 ? (
                                    <div className="space-y-2">
                                        {items.map(item => (
                                            <div key={item.productId} className="flex items-center justify-between bg-green-500/10 rounded-xl px-4 py-3">
                                                <div>
                                                    <p className="font-semibold text-sm text-white/80">{item.productName}</p>
                                                    <p className="text-xs text-white/60">{item.requestedQty} {item.unit}</p>
                                                </div>
                                                <button type="button" onClick={() => removeItem(item.productId)} className="text-red-400 hover:text-red-400">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-white/40 text-sm text-center py-4">Aún no hay productos en la solicitud</p>
                                )}
                            </>
                        )}
                    </div>

                    {/* Botón enviar */}
                    <button
                        type="submit"
                        disabled={submitting || items.length === 0}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-lg transition shadow-lg shadow-green-200"
                    >
                        {submitting
                            ? <><Loader2 className="h-5 w-5 animate-spin" /> Enviando solicitud…</>
                            : <><Send className="h-5 w-5" /> Enviar solicitud al administrador</>
                        }
                    </button>
                </form>
            </div>
        </div>
    );
}
