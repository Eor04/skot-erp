'use client';

import { useState, useEffect } from 'react';
import { Product, ProductModifier, PaymentMethod } from '@prisma/client';
import ProductGrid from '@/components/pos/burgers/product-grid';
import Cart from '@/components/pos/burgers/cart';
import ModifierModal from '@/components/pos/burgers/modifier-modal';
import PaymentModal from '@/components/pos/burgers/payment-modal';
import { useBurgerSale } from '@/hooks/use-burger-sale';
import { useSession } from '@/lib/session-context';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CheckCircle, AlertCircle, Layers, Package, ShoppingBag, ClipboardList, X } from 'lucide-react';

type ProductWithPrice = Product & { customPrice?: number };

type ComboItem = {
    id: string;
    product: { id: string; name: string; sku: string; unit: string };
    quantity: number;
};
type Combo = {
    id: string; name: string; description: string | null;
    price: number; imageUrl: string | null; active: boolean;
    items: ComboItem[];
};

interface SaleResult {
    type: 'success' | 'error';
    message: string;
    saleNumber?: string;
}

interface TurnSale {
    saleNumber: string;
    total: number;
    paymentMethod: string;
    itemCount: number;
    time: string;
}

const METHOD_LABEL: Record<string, string> = {
    CASH: '💵 Efectivo', CARD: '💳 Tarjeta', TRANSFER: '📲 Transferencia', MIXED: '🔀 Mixto'
};

export default function BurgersPOSPage() {
    const { user } = useSession();
    const [products, setProducts] = useState<ProductWithPrice[]>([]);
    const [combos, setCombos] = useState<Combo[]>([]);
    const [modifiers, setModifiers] = useState<ProductModifier[]>([]);
    const [activeTab, setActiveTab] = useState<'productos' | 'combos'>('productos');

    const [selectedProduct, setSelectedProduct] = useState<ProductWithPrice | null>(null);
    const [showModifierModal, setShowModifierModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [saleResult, setSaleResult] = useState<SaleResult | null>(null);
    const [turnHistory, setTurnHistory] = useState<TurnSale[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    const branchId = user?.branchIds?.[0] || '';

    const {
        cart, discount,
        addToCart, removeFromCart, updateQuantity, clearCart,
        applyDiscount, calculateTotal, calculateSubtotal, calculateDiscountAmount,
    } = useBurgerSale(branchId);

    useEffect(() => { if (branchId) loadInitialData(); }, [branchId]);

    // Limpiar notificación
    useEffect(() => {
        if (saleResult) {
            const t = setTimeout(() => setSaleResult(null), 4000);
            return () => clearTimeout(t);
        }
    }, [saleResult]);

    const loadInitialData = async () => {
        try {
            setIsLoading(true);
            const [productsRes, modifiersRes, combosRes] = await Promise.all([
                fetch(`/api/pos/products?branchId=${branchId}&type=BURGER`),
                fetch('/api/pos/modifiers?category=BURGER'),
                fetch('/api/pos/combos'),
            ]);
            const [productsData, modifiersData, combosData] = await Promise.all([
                productsRes.json(), modifiersRes.json(), combosRes.json(),
            ]);
            if (productsData.success) setProducts(productsData.data);
            if (modifiersData.success) setModifiers(modifiersData.data);
            if (combosData.success) setCombos(combosData.data);
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleProductSelect = (product: ProductWithPrice) => {
        // Garantizamos que customPrice siempre tiene valor antes de agregarlo al carrito
        const productWithPrice: ProductWithPrice = { ...product, customPrice: product.customPrice ?? 0 };
        setSelectedProduct(productWithPrice);
        setShowModifierModal(true);
    };

    const handleModifiersConfirm = (selectedModifiers: ProductModifier[]) => {
        if (selectedProduct) addToCart(selectedProduct, selectedModifiers);
        setShowModifierModal(false);
        setSelectedProduct(null);
    };

    // Agregar combo: guardamos el combo completo en _comboRef para expandirlo en el checkout
    const handleComboSelect = (combo: Combo) => {
        const syntheticProduct = {
            id: `COMBO-${combo.id}`,   // prefijo para identificar en el carrito
            name: `🧩 ${combo.name}`,
            description: combo.description || combo.items.map(i => `${i.quantity}x ${i.product.name}`).join(', '),
            price: combo.price,
            customPrice: combo.price,
            imageUrl: combo.imageUrl,
            sku: `COMBO-${combo.id.slice(0, 6)}`,
            category: 'COMBO',
            unit: 'UND',
            active: true,
            _comboRef: combo,   // referencia completa para expandir en checkout
        } as any;
        addToCart(syntheticProduct, []);
    };

    const handlePaymentConfirm = async (paymentData: {
        method: PaymentMethod;
        cashAmount?: number; cardAmount?: number; transferAmount?: number;
    }) => {
        try {
            // Expandir combos a sus productos reales (con productId válido en Product table)
            const expandedItems: any[] = [];
            for (const item of cart) {
                const comboRef = (item.product as any)._comboRef as Combo | undefined;
                if (comboRef) {
                    // Es un combo: distribuir el precio entre sus items proporcionalmente
                    const totalQtyInCombo = comboRef.items.reduce((s, ci) => s + ci.quantity, 0);
                    comboRef.items.forEach(ci => {
                        const proportion = ci.quantity / totalQtyInCombo;
                        const itemUnitPrice = parseFloat((comboRef.price * proportion).toFixed(2));
                        expandedItems.push({
                            productId: ci.product.id,
                            quantity: ci.quantity * item.quantity,
                            unitPrice: itemUnitPrice,
                            subtotal: parseFloat((itemUnitPrice * ci.quantity * item.quantity).toFixed(2)),
                            modifiers: [],
                        });
                    });
                } else {
                    // Producto normal
                    expandedItems.push({
                        productId: item.product.id,
                        quantity: item.quantity,
                        unitPrice: (item.product as any).customPrice || 0,
                        subtotal: item.subtotal,
                        modifiers: item.selectedModifiers.map(m => ({
                            modifierId: m.modifier.id,
                            quantity: m.quantity,
                            price: m.modifier.price,
                        })),
                    });
                }
            }

            const response = await fetch('/api/pos/sale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branchId,
                    userId: user?.userId,
                    paymentMethod: paymentData.method,
                    cashAmount: paymentData.cashAmount,
                    cardAmount: paymentData.cardAmount,
                    transferAmount: paymentData.transferAmount,
                    items: expandedItems,
                    discount: discount
                        ? { type: discount.type, value: discount.value, authorizedBy: discount.authorizedBy }
                        : undefined,
                }),
            });
            const data = await response.json();
            if (data.success) {
                const total = calculateTotal();
                setTurnHistory(prev => [{
                    saleNumber: data.data.saleNumber,
                    total,
                    paymentMethod: paymentData.method,
                    itemCount: cart.reduce((s, i) => s + i.quantity, 0),
                    time: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
                }, ...prev].slice(0, 20));
                clearCart();
                setShowPaymentModal(false);
                setSaleResult({ type: 'success', message: `¡Venta ${data.data.saleNumber} registrada!`, saleNumber: data.data.saleNumber });
            } else {
                setSaleResult({ type: 'error', message: data.error || 'Error al procesar la venta' });
            }
        } catch {
            setSaleResult({ type: 'error', message: 'Error de conexión. Inténtalo de nuevo.' });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4" />
                    <p className="text-gray-600">Cargando POS...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100 relative">
            {/* Toast de resultado */}
            {saleResult && (
                <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 rounded-xl shadow-xl text-white font-semibold animate-bounce ${saleResult.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {saleResult.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    {saleResult.message}
                </div>
            )}

            {/* Lado izquierdo */}
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <h1 className="text-2xl font-bold text-gray-800">🍔 POS Hamburguesas</h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowHistory(v => !v)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition ${showHistory ? 'bg-orange-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            <ClipboardList className="h-4 w-4" />
                            Turno
                            {turnHistory.length > 0 && (
                                <span className="bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-black">
                                    {turnHistory.length}
                                </span>
                            )}
                        </button>
                        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                            <ArrowLeft className="h-4 w-4" /> Dashboard
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-3 bg-gray-200 rounded-xl p-1 w-fit">
                    <button onClick={() => setActiveTab('productos')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'productos' ? 'bg-white shadow text-orange-700' : 'text-gray-600 hover:text-gray-800'}`}>
                        <Package className="h-4 w-4" /> Productos ({products.length})
                    </button>
                    <button onClick={() => setActiveTab('combos')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'combos' ? 'bg-white shadow text-teal-700' : 'text-gray-600 hover:text-gray-800'}`}>
                        <Layers className="h-4 w-4" />
                        Combos ({combos.length})
                        {combos.length > 0 && activeTab !== 'combos' && (
                            <span className="ml-1 bg-teal-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{combos.length}</span>
                        )}
                    </button>
                </div>

                {/* Contenido del tab */}
                <div className="bg-white rounded-xl shadow flex-1 p-4 overflow-hidden">
                    {activeTab === 'productos' ? (
                        <ProductGrid products={products} onProductSelect={handleProductSelect} />
                    ) : (
                        <CombosGrid combos={combos} onComboSelect={handleComboSelect} />
                    )}
                </div>
            </div>

            {/* Lado derecho: Carrito */}
            <div className="w-96">
                <Cart
                    items={cart} discount={discount}
                    onUpdateQuantity={updateQuantity}
                    onRemoveItem={removeFromCart}
                    onApplyDiscount={() => applyDiscount({ type: 'PERCENTAGE', value: 10 })}
                    onClearCart={clearCart}
                    onCheckout={() => setShowPaymentModal(true)}
                    subtotal={calculateSubtotal()}
                    discountAmount={calculateDiscountAmount()}
                    total={calculateTotal()}
                />
            </div>

            {/* Panel Historial del Turno */}
            {showHistory && (
                <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setShowHistory(false)}>
                    <div
                        className="w-80 h-full bg-white shadow-2xl flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header del panel */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-orange-600 text-white">
                            <div>
                                <p className="font-bold text-sm">📋 Historial del Turno</p>
                                <p className="text-xs text-orange-200">{turnHistory.length} venta{turnHistory.length !== 1 ? 's' : ''}</p>
                            </div>
                            <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-white/10 rounded-lg">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Total del turno */}
                        {turnHistory.length > 0 && (
                            <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 flex justify-between items-center">
                                <span className="text-xs font-semibold text-orange-700">Total del turno</span>
                                <span className="text-lg font-black text-orange-700">
                                    Bs. {turnHistory.reduce((s, v) => s + v.total, 0).toFixed(2)}
                                </span>
                            </div>
                        )}

                        {/* Lista */}
                        <div className="flex-1 overflow-y-auto py-2">
                            {turnHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                                    <ClipboardList className="h-10 w-10 mb-2 opacity-30" />
                                    <p className="text-sm">Sin ventas en este turno</p>
                                </div>
                            ) : (
                                turnHistory.map((sale, i) => (
                                    <div key={sale.saleNumber} className={`px-4 py-3 border-b border-gray-50 ${i === 0 ? 'bg-green-50' : ''}`}>
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-xs text-gray-400">{sale.saleNumber}</span>
                                            <span className="text-xs text-gray-400">{sale.time}</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs text-gray-500">
                                                {METHOD_LABEL[sale.paymentMethod] || sale.paymentMethod} · {sale.itemCount} ítem{sale.itemCount !== 1 ? 's' : ''}
                                            </span>
                                            <span className="font-bold text-gray-800 text-sm">Bs. {sale.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Limpiar historial */}
                        {turnHistory.length > 0 && (
                            <div className="p-3 border-t border-gray-100">
                                <button
                                    onClick={() => { setTurnHistory([]); setShowHistory(false); }}
                                    className="w-full text-xs text-gray-400 hover:text-red-500 py-2 transition font-medium">
                                    🗑️ Limpiar historial del turno
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modales */}
            <ModifierModal
                isOpen={showModifierModal}
                onClose={() => { setShowModifierModal(false); setSelectedProduct(null); }}
                productName={selectedProduct?.name || ''}
                availableModifiers={modifiers}
                onConfirm={handleModifiersConfirm}
            />
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                total={calculateTotal()}
                onConfirm={handlePaymentConfirm}
            />
        </div>
    );
}

/* ──────────── Grid de combos ──────────── */
function CombosGrid({ combos, onComboSelect }: { combos: Combo[]; onComboSelect: (c: Combo) => void }) {
    if (combos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
                <Layers className="h-14 w-14 mb-3 opacity-30" />
                <p className="text-lg font-medium">No hay combos activos</p>
                <p className="text-sm text-gray-400 mt-1">Creá combos desde Admin → Combos</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto h-full pb-2">
            {combos.map(combo => (
                <button key={combo.id} onClick={() => onComboSelect(combo)}
                    className="flex flex-col bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-teal-500 hover:shadow-lg transition group text-left">
                    {/* Imagen */}
                    <div className="relative w-full pt-[70%] bg-teal-50">
                        {combo.imageUrl ? (
                            <Image src={combo.imageUrl} alt={combo.name} fill className="object-cover"
                                sizes="(max-width: 768px) 50vw, 25vw" />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <ShoppingBag className="h-12 w-12 text-teal-200" />
                            </div>
                        )}
                        {/* Badge */}
                        <div className="absolute top-2 left-2 bg-teal-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            COMBO
                        </div>
                    </div>
                    {/* Info */}
                    <div className="p-3 flex flex-col flex-1">
                        <h3 className="font-bold text-gray-800 line-clamp-1 group-hover:text-teal-700 transition text-sm">
                            {combo.name}
                        </h3>
                        {/* Items del combo */}
                        <div className="mt-1.5 space-y-0.5 flex-1">
                            {combo.items.slice(0, 3).map(item => (
                                <p key={item.id} className="text-xs text-gray-500 line-clamp-1">
                                    · {item.quantity}x {item.product.name}
                                </p>
                            ))}
                            {combo.items.length > 3 && (
                                <p className="text-xs text-gray-400">+{combo.items.length - 3} más…</p>
                            )}
                        </div>
                        {/* Precio */}
                        <div className="mt-2 text-lg font-black text-teal-600">
                            Bs. {combo.price.toFixed(2)}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}
