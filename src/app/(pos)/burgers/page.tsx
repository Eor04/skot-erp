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
import { ArrowLeft, CheckCircle, AlertCircle, Layers, Package, ShoppingBag, ClipboardList, X, ChefHat } from 'lucide-react';
import CashGate from '@/components/pos/cash-gate';

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
    customerName?: string;
    items: { name: string; quantity: number; subtotal: number }[];
}

const METHOD_LABEL: Record<string, string> = {
    CASH: '💵 Efectivo', CARD: '💳 Tarjeta', TRANSFER: '📲 QR', MIXED: '🔀 Mixto'
};

export default function BurgersPOSPage() {
    const { user } = useSession();
    const [products, setProducts] = useState<ProductWithPrice[]>([]);
    const [combos, setCombos] = useState<Combo[]>([]);
    const [modifiers, setModifiers] = useState<ProductModifier[]>([]);
    const [activeTab, setActiveTab] = useState<'productos' | 'combos' | 'extras'>('productos');

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

    const loadInitialData = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
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
            if (!silent) setIsLoading(false);
        }
    };

    /** Clic directo en el producto → agrega al carrito sin modificadores */
    const handleProductAdd = (product: ProductWithPrice) => {
        const p: ProductWithPrice = { ...product, customPrice: product.customPrice ?? 0 };
        addToCart(p, []);
    };

    /** Botón "Extras" de la tarjeta → abre el modal de modificadores */
    const handleProductModify = (product: ProductWithPrice) => {
        const p: ProductWithPrice = { ...product, customPrice: product.customPrice ?? 0 };
        setSelectedProduct(p);
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
        customerName?: string;
    }) => {
        try {
            // Expandir combos a sus productos reales (con productId válido en Product table)
            // Los EXTRA (modificadores sueltos) NO tienen productId real → se excluyen de sale_items
            // y su monto se envía por separado como extrasTotal.
            const expandedItems: any[] = [];
            let extrasTotal = 0;

            for (const item of cart) {
                const productId: string = (item.product as any).id ?? '';

                // ── EXTRA suelto ─────────────────────────────────────────────
                if (productId.startsWith('EXTRA-')) {
                    extrasTotal += item.subtotal;
                    continue;
                }

                const comboRef = (item.product as any)._comboRef as Combo | undefined;
                if (comboRef) {
                    // Es un combo: distribuir el precio entre sus items proporcionalmente ajustando céntimos
                    const totalQtyInCombo = comboRef.items.reduce((s, ci) => s + ci.quantity, 0);
                    const comboExpectedSubtotal = comboRef.price * item.quantity;
                    let comboTotalSubtotalAccumulated = 0;

                    comboRef.items.forEach((ci, index) => {
                        const proportion = ci.quantity / totalQtyInCombo;
                        const itemUnitPrice = parseFloat((comboRef.price * proportion).toFixed(2));
                        let subtotal = parseFloat((itemUnitPrice * ci.quantity * item.quantity).toFixed(2));

                        // El último ítem absorbe la diferencia de redondeo para que sume exacto
                        if (index === comboRef.items.length - 1) {
                            subtotal = parseFloat((comboExpectedSubtotal - comboTotalSubtotalAccumulated).toFixed(2));
                        } else {
                            comboTotalSubtotalAccumulated += subtotal;
                        }

                        expandedItems.push({
                            productId: ci.product.id,
                            quantity: ci.quantity * item.quantity,
                            unitPrice: itemUnitPrice,
                            subtotal: subtotal,
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

            // Necesitamos al menos un ítem real para crear la venta
            if (expandedItems.length === 0 && extrasTotal > 0) {
                setSaleResult({ type: 'error', message: 'No se puede procesar una venta solo con extras. Agregá al menos un producto.' });
                return;
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
                    extrasTotal: extrasTotal > 0 ? extrasTotal : undefined,
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
                    customerName: paymentData.customerName,
                    items: cart.map(item => ({ name: item.product.name, quantity: item.quantity, subtotal: item.subtotal })),
                }, ...prev].slice(0, 20));
                clearCart();
                setShowPaymentModal(false);
                setSaleResult({ type: 'success', message: `¡Venta ${data.data.saleNumber}${paymentData.customerName ? ` — ${paymentData.customerName}` : ''} registrada!`, saleNumber: data.data.saleNumber });
                loadInitialData(true);
            } else {
                setSaleResult({ type: 'error', message: data.error || 'Error al procesar la venta' });
            }
        } catch {
            setSaleResult({ type: 'error', message: 'Error de conexión. Inténtalo de nuevo.' });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-black">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4" />
                    <p className="text-white/60">Cargando POS...</p>
                </div>
            </div>
        );
    }

    return (
        <CashGate branchId={branchId} userId={user?.userId || ''} theme="burger">
        <div className="flex h-screen bg-black relative">
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
                <div className="flex items-center justify-between mb-3 bg-black rounded-xl px-4 py-3 border border-white/10">
                    <div className="flex items-center gap-3">
                        {/* Logo Burger */}
                        <img src="/logo-burger.png" alt="Skot Burger"
                            className="h-10 w-auto object-contain"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <h1 className="text-2xl font-bold text-white">POS Hamburguesas</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowHistory(v => !v)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition ${showHistory ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                            <ClipboardList className="h-4 w-4" />
                            Turno
                            {turnHistory.length > 0 && (
                                <span className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-black">
                                    {turnHistory.length}
                                </span>
                            )}
                        </button>
                        <Link href="/" className="text-sm text-white/50 hover:text-white flex items-center gap-1 transition">
                            <ArrowLeft className="h-4 w-4" /> Dashboard
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-3 bg-black rounded-xl p-1 w-fit">
                    <button onClick={() => setActiveTab('productos')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'productos' ? 'bg-yellow-400 text-black shadow' : 'text-white/70 hover:text-white'}`}>
                        <Package className="h-4 w-4" /> Productos ({products.length})
                    </button>
                    <button onClick={() => setActiveTab('combos')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'combos' ? 'bg-yellow-400 text-black shadow' : 'text-white/70 hover:text-white'}`}>
                        <Layers className="h-4 w-4" />
                        Combos ({combos.length})
                        {combos.length > 0 && activeTab !== 'combos' && (
                            <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">{combos.length}</span>
                        )}
                    </button>
                    <button onClick={() => setActiveTab('extras')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'extras' ? 'bg-yellow-400 text-black shadow' : 'text-white/70 hover:text-white'}`}>
                        <ChefHat className="h-4 w-4" />
                        Extras ({modifiers.length})
                    </button>
                </div>

                {/* Contenido del tab con watermark */}
                <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl shadow flex-1 p-4 overflow-hidden relative">
                    {/* Marca de agua */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-0">
                        <img src="/logo-burger.png" alt=""
                            className="w-[90%] h-[90%] object-contain opacity-[0.05] select-none"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                    <div className="relative z-10 h-full">
                    {activeTab === 'productos' ? (
                        <ProductGrid
                            products={products}
                            onProductAdd={handleProductAdd}
                            onOpenModifiers={handleProductModify}
                        />
                    ) : activeTab === 'combos' ? (
                        <CombosGrid combos={combos} onComboSelect={handleComboSelect} />
                    ) : (
                        <ExtrasGrid modifiers={modifiers} onExtraAdd={(mod) => {
                            // Agregar el extra como ítem independiente al carrito
                            const syntheticProduct = {
                                id: `EXTRA-${mod.id}`,
                                name: `⭐ ${mod.name}`,
                                description: mod.description || '',
                                price: mod.price,
                                customPrice: mod.price,
                                imageUrl: null,
                                sku: `EXTRA-${mod.id.slice(0, 6)}`,
                                category: 'EXTRA',
                                unit: 'UND',
                                active: true,
                            } as any;
                            addToCart(syntheticProduct, []);
                        }} />
                    )}
                    </div>
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
                        className="w-96 h-full bg-[#0a0a0f] border-l border-white/10 shadow-2xl flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header del panel */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black text-white">
                            <div>
                                <p className="font-bold text-base flex items-center gap-2"><ClipboardList className="h-5 w-5 text-yellow-400" /> Historial del Turno</p>
                                <p className="text-sm text-white/50">{turnHistory.length} venta{turnHistory.length !== 1 ? 's' : ''}</p>
                            </div>
                            <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-white/10 rounded-xl transition text-white/70 hover:text-white">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Total del turno */}
                        {turnHistory.length > 0 && (
                            <div className="px-5 py-4 bg-white/5 border-b border-white/10 flex justify-between items-center shadow-inner">
                                <span className="text-sm font-semibold text-white/70">Total del turno</span>
                                <span className="text-2xl font-black text-yellow-400 drop-shadow-md">
                                    Bs. {turnHistory.reduce((s, v) => s + v.total, 0).toFixed(2)}
                                </span>
                            </div>
                        )}

                        {/* Lista */}
                        <div className="flex-1 overflow-y-auto py-2 p-3 space-y-3">
                            {turnHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-white/30 py-12">
                                    <ClipboardList className="h-12 w-12 mb-3 opacity-30" />
                                    <p className="text-base font-medium">Sin ventas en este turno</p>
                                </div>
                            ) : (
                                turnHistory.map((sale, i) => (
                                    <div key={sale.saleNumber} className={`bg-white/5 border border-white/10 rounded-xl overflow-hidden ${i === 0 ? 'ring-1 ring-yellow-400/50' : ''}`}>
                                        <div className="px-4 py-3 border-b border-white/5 bg-black/40 flex items-center justify-between">
                                            <span className="font-mono text-xs font-semibold text-yellow-400/90">{sale.saleNumber}</span>
                                            <span className="text-xs text-white/50">{sale.time}</span>
                                        </div>
                                        <div className="p-4">
                                            {sale.customerName && (
                                                <div className="mb-2">
                                                    <span className="text-xs font-bold text-black bg-yellow-400 px-2 py-0.5 rounded-md inline-flex items-center gap-1 shadow-sm">
                                                        <span>👤</span> {sale.customerName}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {/* Detalles de items */}
                                            {sale.items && sale.items.length > 0 && (
                                                <div className="mb-3 space-y-1.5 bg-black/20 rounded-lg p-2.5">
                                                    {sale.items.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between items-start text-xs">
                                                            <span className="text-white/80"><span className="text-white/40 mr-1">{item.quantity}x</span>{item.name}</span>
                                                            <span className="text-white/60 font-mono">Bs. {item.subtotal.toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                                                <span className="text-xs font-medium px-2 py-1 bg-white/10 text-white/80 rounded-lg shadow-inner">
                                                    {METHOD_LABEL[sale.paymentMethod] || sale.paymentMethod}
                                                </span>
                                                <span className="font-black text-white text-lg drop-shadow-md">Bs. {sale.total.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
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
        </CashGate>
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
                    className="flex flex-col bg-white/5 border-2 border-white/10 rounded-xl overflow-hidden hover:border-teal-500 hover:shadow-lg transition group text-left">
                    {/* Imagen */}
                    <div className="relative w-full h-32 bg-black/40 flex-shrink-0">
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
                        <h3 className="font-bold text-white/90 line-clamp-1 group-hover:text-teal-400 transition text-sm">
                            {combo.name}
                        </h3>
                        {/* Items del combo */}
                        <div className="mt-1.5 space-y-0.5 flex-1">
                            {combo.items.slice(0, 3).map(item => (
                                <p key={item.id} className="text-xs text-white/60 line-clamp-1">
                                    · {item.quantity}x {item.product.name}
                                </p>
                            ))}
                            {combo.items.length > 3 && (
                                <p className="text-xs text-gray-400">+{combo.items.length - 3} más…</p>
                            )}
                        </div>
                        {/* Precio */}
                        <div className="mt-2 text-lg font-black text-teal-400">
                            Bs. {combo.price.toFixed(2)}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}

/* ──────────── Grid de extras (modificadores como productos) ──────────── */
function ExtrasGrid({ modifiers, onExtraAdd }: { modifiers: ProductModifier[]; onExtraAdd: (m: ProductModifier) => void }) {
    if (modifiers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
                <ChefHat className="h-14 w-14 mb-3 opacity-30" />
                <p className="text-lg font-medium">No hay extras disponibles</p>
                <p className="text-sm text-gray-400 mt-1">Creá modificadores desde Admin</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto h-full pb-2">
            {modifiers.map(mod => (
                <button key={mod.id} onClick={() => onExtraAdd(mod)}
                    className="flex flex-col bg-white/5 border-2 border-white/10 rounded-xl overflow-hidden hover:border-yellow-400 hover:shadow-lg hover:shadow-yellow-400/20 transition group text-left">
                    {/* Icono decorativo */}
                    <div className="relative w-full h-32 bg-black/40 flex-shrink-0">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <ChefHat className="h-14 w-14 text-amber-200 group-hover:text-amber-300 transition" />
                        </div>
                        <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            EXTRA
                        </div>
                    </div>
                    {/* Info */}
                    <div className="p-3 flex flex-col flex-1">
                        <h3 className="font-bold text-white/90 line-clamp-1 group-hover:text-amber-400 transition text-sm">
                            {mod.name}
                        </h3>
                        {mod.description && (
                            <p className="text-xs text-white/60 line-clamp-2 mt-0.5 flex-1">{mod.description}</p>
                        )}
                        <div className="mt-2 text-lg font-black text-red-400">
                            + Bs. {mod.price.toFixed(2)}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}
