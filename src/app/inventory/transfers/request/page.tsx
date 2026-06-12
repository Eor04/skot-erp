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
        <div className="min-h-screen bg-gray-50 p-8">
            {notification && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {notification.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {notification.msg}
                </div>
            )}

            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/inventory/transfers" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Transferencias
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">📦 Solicitar Transferencia</h1>
                    <p className="text-gray-500 mt-1">Solicitá productos de otra sucursal o de la fábrica</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Sucursales */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="font-bold text-gray-800 mb-4">Origen y destino</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Mi sucursal (recibe) *
                                </label>
                                <select
                                    value={form.myBranchId}
                                    onChange={e => setForm(f => ({ ...f, myBranchId: e.target.value }))}
                                    disabled={!!(user?.branchIds?.[0] && user.role !== 'ADMIN')}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 disabled:bg-gray-50"
                                >
                                    <option value="">-- Seleccioná --</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Sucursal de origen (provee) *
                                </label>
                                <select
                                    value={form.fromBranchId}
                                    onChange={e => handleFromBranchChange(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                                >
                                    <option value="">-- Seleccioná --</option>
                                    {otherBranches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.type})</option>)}
                                </select>
                            </div>
                        </div>

                        {myBranch && fromBranch && (
                            <div className="mt-3 p-3 bg-green-50 rounded-xl text-sm text-green-700">
                                📦 <strong>{fromBranch.name}</strong> enviará productos a <strong>{myBranch.name}</strong>
                            </div>
                        )}

                        <div className="mt-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notas para el administrador</label>
                            <textarea
                                rows={2}
                                value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder="Ej: Necesitamos urgente para el fin de semana..."
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
                            />
                        </div>
                    </div>

                    {/* Agregar productos */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="font-bold text-gray-800 mb-4">Productos a solicitar</h2>

                        {!form.fromBranchId ? (
                            <p className="text-gray-400 text-sm">Seleccioná la sucursal de origen para ver sus productos disponibles</p>
                        ) : (
                            <>
                                <div className="flex gap-3 mb-4">
                                    <select
                                        value={selectedProduct}
                                        onChange={e => setSelectedProduct(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                                    >
                                        <option value="">-- Elegí un producto --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} — Stock disponible: {p.currentStock} {p.unit}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number" min="0.01" step="0.01"
                                        value={qty}
                                        onChange={e => setQty(e.target.value)}
                                        placeholder="Cantidad"
                                        className="w-28 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
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
                                            <div key={item.productId} className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3">
                                                <div>
                                                    <p className="font-semibold text-sm text-gray-800">{item.productName}</p>
                                                    <p className="text-xs text-gray-500">{item.requestedQty} {item.unit}</p>
                                                </div>
                                                <button type="button" onClick={() => removeItem(item.productId)} className="text-red-400 hover:text-red-600">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-400 text-sm text-center py-4">Aún no hay productos en la solicitud</p>
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
