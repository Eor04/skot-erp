'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/session-context';
import { useAcaiSale, Product } from '@/hooks/use-acai-sale';
import { useScale } from '@/hooks/use-scale';
import Link from 'next/link';
import {
    ArrowLeft, Scale, Wifi, WifiOff, Plus, Minus, Trash2,
    ShoppingCart, CreditCard, Banknote, ArrowRightLeft,
    CheckCircle, AlertCircle, Loader2
} from 'lucide-react';

type PaymentMethodType = 'CASH' | 'CARD' | 'TRANSFER' | 'MIXED';

interface ApiProduct {
    id: string;
    name: string;
    type: string;
    description?: string;
    imageUrl?: string;
    category?: string;
    customPrice: number;
    pricePerKg: number;
}

export default function AcaiPOSPage() {
    const { user } = useSession();
    const branchId = user?.branchIds?.[0] || '';
    const userId = user?.userId || '';

    const {
        cart, setBase, addTopping, addExtra, removeItem, clearCart, processSale,
    } = useAcaiSale(branchId, userId);

    const {
        weight, isStable, status: scaleStatus, connect, disconnect, isMockMode
    } = useScale({ tara: 0.15, autoConnect: false });

    const [bases, setBases] = useState<ApiProduct[]>([]);
    const [toppings, setToppings] = useState<ApiProduct[]>([]);
    const [beverages, setBeverages] = useState<ApiProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'base' | 'toppings' | 'extras'>('base');
    const [showPayment, setShowPayment] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<PaymentMethodType>('CASH');
    const [cashGiven, setCashGiven] = useState('');
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (branchId) loadProducts();
    }, [branchId]);

    useEffect(() => {
        if (notification) {
            const t = setTimeout(() => setNotification(null), 4000);
            return () => clearTimeout(t);
        }
    }, [notification]);

    const loadProducts = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/pos/products?branchId=${branchId}&type=ACAI`);
            const data = await res.json();
            if (data.success) {
                setBases(data.data.filter((p: ApiProduct) => p.type === 'ACAI_BASE'));
                setToppings(data.data.filter((p: ApiProduct) => p.type === 'ACAI_TOPPING'));
                setBeverages(data.data.filter((p: ApiProduct) => p.type === 'BEVERAGE'));
            }
        } catch (err) {
            console.error('Error cargando productos:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectBase = (p: ApiProduct) => {
        setBase({ id: p.id, name: p.name, type: 'ACAI_BASE', price: p.customPrice });
        setActiveTab('toppings');
    };

    const handleAddTopping = (p: ApiProduct) => {
        if (weight <= 0) {
            setNotification({ type: 'error', message: 'Colocá el bowl en la balanza primero' });
            return;
        }
        addTopping(
            { id: p.id, name: p.name, type: 'ACAI_TOPPING', pricePerKg: p.pricePerKg },
            weight,
            p.pricePerKg
        );
    };

    const handleAddExtra = (p: ApiProduct) => {
        addExtra({ id: p.id, name: p.name, type: 'BEVERAGE', price: p.customPrice }, 1);
    };

    const handleProcessSale = async () => {
        setProcessing(true);
        try {
            // Usar API directa en vez del hook offline
            const response = await fetch('/api/pos/sale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branchId,
                    userId,
                    paymentMethod: selectedPayment,
                    cashAmount: selectedPayment === 'CASH' ? cart.total : undefined,
                    items: [
                        ...(cart.base ? [{
                            productId: cart.base.product.id,
                            quantity: 1,
                            unitPrice: cart.base.price,
                            subtotal: cart.base.price,
                        }] : []),
                        ...cart.toppings.map(t => ({
                            productId: t.product.id,
                            quantity: t.weight,
                            unitPrice: t.pricePerKg,
                            subtotal: t.subtotal,
                        })),
                        ...cart.extras.map(e => ({
                            productId: e.product.id,
                            quantity: e.quantity,
                            unitPrice: e.unitPrice,
                            subtotal: e.subtotal,
                        })),
                    ],
                }),
            });
            const data = await response.json();
            if (data.success) {
                clearCart();
                setShowPayment(false);
                setNotification({ type: 'success', message: `¡Venta ${data.data.saleNumber} registrada!` });
                setActiveTab('base');
            } else {
                setNotification({ type: 'error', message: data.error || 'Error al procesar venta' });
            }
        } catch {
            setNotification({ type: 'error', message: 'Error de conexión' });
        } finally {
            setProcessing(false);
        }
    };

    const change = selectedPayment === 'CASH' && cashGiven
        ? Math.max(0, parseFloat(cashGiven) - cart.total)
        : 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-50 to-pink-50">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-600">Cargando POS Açaí...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-purple-50 to-pink-50 relative">
            {/* Notificaciones */}
            {notification && (
                <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 rounded-xl shadow-xl text-white font-semibold ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    {notification.message}
                </div>
            )}

            {/* Panel izquierdo: productos */}
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-purple-600 hover:text-purple-800">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-800">🥤 POS Açaí</h1>
                    </div>
                    {/* Estado de balanza */}
                    <div className="flex items-center gap-2">
                        {isMockMode && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                                Mock
                            </span>
                        )}
                        <button
                            onClick={scaleStatus === 'connected' ? disconnect : connect}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${scaleStatus === 'connected'
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-purple-600 text-white hover:bg-purple-700'
                                }`}
                        >
                            <Scale className="h-4 w-4" />
                            {scaleStatus === 'connected' ? 'Balanza conectada' : 'Conectar balanza'}
                        </button>
                    </div>
                </div>

                {/* Lectura de peso */}
                {scaleStatus === 'connected' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-4 mb-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Peso actual (neto)</p>
                            <p className="text-4xl font-black text-purple-700">
                                {weight.toFixed(3)} <span className="text-lg font-normal text-gray-400">kg</span>
                            </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${isStable ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {isStable ? '✅ Estable' : '⏳ Estabilizando...'}
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                    {(['base', 'toppings', 'extras'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition ${activeTab === tab
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                                : 'bg-white text-gray-600 hover:bg-purple-50 border border-gray-200'
                                }`}
                        >
                            {tab === 'base' ? '🥤 Base' : tab === 'toppings' ? '🍓 Toppings' : '🥤 Extras'}
                        </button>
                    ))}
                </div>

                {/* ── Aviso precios no configurados ── */}
                {bases.some(p => p.customPrice === 0) || toppings.some(p => p.pricePerKg === 0) ? (
                    <div className="mb-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-amber-800">
                        <span className="text-base">⚠️</span>
                        <span>Algunos productos tienen precio <strong>Bs. 0.00</strong>. Configurá los precios en{' '}
                            <a href="/admin/branch-products" className="underline font-semibold hover:text-amber-900">
                                Admin → Precios por Sucursal
                            </a>.
                        </span>
                    </div>
                ) : null}

                {/* Grid de productos */}
                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {activeTab === 'base' && bases.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => handleSelectBase(p)}
                                className={`bg-white rounded-2xl p-4 border-2 text-left transition hover:shadow-lg ${cart.base?.product.id === p.id ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-100 hover:border-purple-300'
                                    }`}
                            >
                                <div className="text-3xl mb-2">🥤</div>
                                <h3 className="font-bold text-gray-800 text-sm">{p.name}</h3>
                                {p.customPrice > 0 ? (
                                    <p className="text-purple-600 font-bold text-lg mt-1">Bs. {p.customPrice.toFixed(2)}</p>
                                ) : (
                                    <p className="text-xs font-semibold text-red-500 mt-1 bg-red-50 rounded-lg px-2 py-0.5 inline-block">⚠ Sin precio</p>
                                )}
                            </button>
                        ))}

                        {activeTab === 'toppings' && toppings.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => handleAddTopping(p)}
                                disabled={scaleStatus !== 'connected'}
                                className={`bg-white rounded-2xl p-4 border-2 text-left transition hover:shadow-lg ${scaleStatus !== 'connected' ? 'opacity-50 cursor-not-allowed' : 'border-gray-100 hover:border-pink-300'
                                    }`}
                            >
                                <div className="text-3xl mb-2">🍓</div>
                                <h3 className="font-bold text-gray-800 text-sm">{p.name}</h3>
                                <p className="text-pink-600 font-bold text-lg mt-1">Bs. {p.pricePerKg.toFixed(2)}/kg</p>
                                {scaleStatus !== 'connected' && (
                                    <p className="text-xs text-red-400 mt-1">Conectá la balanza</p>
                                )}
                            </button>
                        ))}

                        {activeTab === 'extras' && beverages.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => handleAddExtra(p)}
                                className="bg-white rounded-2xl p-4 border-2 border-gray-100 text-left transition hover:shadow-lg hover:border-indigo-300"
                            >
                                <div className="text-3xl mb-2">🧃</div>
                                <h3 className="font-bold text-gray-800 text-sm">{p.name}</h3>
                                <p className="text-indigo-600 font-bold text-lg mt-1">Bs. {p.customPrice.toFixed(2)}</p>
                            </button>
                        ))}
                    </div>

                    {activeTab === 'base' && bases.length === 0 && (
                        <div className="text-center py-16 text-gray-400">No hay bases configuradas</div>
                    )}
                    {activeTab === 'toppings' && toppings.length === 0 && (
                        <div className="text-center py-16 text-gray-400">No hay toppings configurados</div>
                    )}
                    {activeTab === 'extras' && beverages.length === 0 && (
                        <div className="text-center py-16 text-gray-400">No hay extras configurados</div>
                    )}
                </div>
            </div>

            {/* Panel derecho: carrito */}
            <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-purple-600" />
                        Orden Actual
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {/* Base */}
                    {cart.base && (
                        <div className="bg-purple-50 rounded-xl p-3 flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-sm text-gray-800">🥤 {cart.base.product.name}</p>
                                <p className="text-purple-600 font-bold">Bs. {cart.base.price.toFixed(2)}</p>
                            </div>
                            <button onClick={() => removeItem(cart.base!.id, 'base')} className="text-red-400 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Toppings */}
                    {cart.toppings.map((t) => (
                        <div key={t.id} className="bg-pink-50 rounded-xl p-3 flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-sm text-gray-800">🍓 {t.product.name}</p>
                                <p className="text-xs text-gray-500">{t.weight.toFixed(3)}kg × S/{t.pricePerKg.toFixed(2)}/kg</p>
                                <p className="text-pink-600 font-bold">Bs. {t.subtotal.toFixed(2)}</p>
                            </div>
                            <button onClick={() => removeItem(t.id, 'topping')} className="text-red-400 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}

                    {/* Extras */}
                    {cart.extras.map((e) => (
                        <div key={e.id} className="bg-indigo-50 rounded-xl p-3 flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-sm text-gray-800">🧃 {e.product.name}</p>
                                <p className="text-xs text-gray-500">×{e.quantity} — S/{e.unitPrice.toFixed(2)} c/u</p>
                                <p className="text-indigo-600 font-bold">Bs. {e.subtotal.toFixed(2)}</p>
                            </div>
                            <button onClick={() => removeItem(e.id, 'extra')} className="text-red-400 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}

                    {!cart.base && cart.toppings.length === 0 && cart.extras.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Seleccioná una base para empezar</p>
                        </div>
                    )}
                </div>

                {/* Total y pago */}
                <div className="border-t border-gray-200 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Total</span>
                        <span className="text-2xl font-black text-purple-700">Bs. {cart.total.toFixed(2)}</span>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={clearCart}
                            disabled={cart.total <= 0}
                            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold transition hover:bg-gray-50 disabled:opacity-40"
                        >
                            Limpiar
                        </button>
                        <button
                            onClick={() => setShowPayment(true)}
                            disabled={cart.total <= 0}
                            className="flex-[2] py-3 rounded-xl bg-purple-600 text-white font-bold text-lg transition hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg shadow-purple-200"
                        >
                            Cobrar
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de pago */}
            {showPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5 text-white">
                            <h2 className="text-xl font-bold">Procesar Pago</h2>
                            <p className="text-white/80 mt-1">Total: <span className="font-bold text-2xl">Bs. {cart.total.toFixed(2)}</span></p>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Método de pago */}
                            <div className="grid grid-cols-2 gap-2">
                                {([
                                    { method: 'CASH' as const, label: 'Efectivo', icon: Banknote },
                                    { method: 'CARD' as const, label: 'Tarjeta', icon: CreditCard },
                                    { method: 'TRANSFER' as const, label: 'Transferencia', icon: ArrowRightLeft },
                                    { method: 'MIXED' as const, label: 'Mixto', icon: ShoppingCart },
                                ]).map(({ method, label, icon: Icon }) => (
                                    <button
                                        key={method}
                                        onClick={() => setSelectedPayment(method)}
                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-medium text-sm transition ${selectedPayment === method
                                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Monto en efectivo */}
                            {selectedPayment === 'CASH' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto recibido</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={cashGiven}
                                        onChange={(e) => setCashGiven(e.target.value)}
                                        placeholder={cart.total.toFixed(2)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                    {change > 0 && (
                                        <p className="text-green-600 font-bold mt-2 text-lg">Cambio: Bs. {change.toFixed(2)}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setShowPayment(false)}
                                className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-semibold text-gray-600 hover:bg-gray-50 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleProcessSale}
                                disabled={processing}
                                className="flex-[2] py-3 rounded-xl bg-purple-600 text-white font-bold text-lg hover:bg-purple-700 transition disabled:bg-gray-300 shadow-lg"
                            >
                                {processing ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" /> Procesando...
                                    </span>
                                ) : 'Confirmar Pago'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
