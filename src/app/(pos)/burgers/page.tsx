'use client';

import { User } from 'lucide-react';
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
import { ArrowLeft, CheckCircle, AlertCircle, Layers, Package, ShoppingBag, ClipboardList, X, ChefHat, Wifi, WifiOff, RefreshCw, Printer } from 'lucide-react';
import CashGate from '@/components/pos/cash-gate';
import { getOfflineQueue, saveToOfflineQueue, syncOfflineQueue, OfflineSale } from '@/lib/sync-manager';
import { Comanda, printComanda } from '@/lib/pos/print-comanda';

type ProductWithPrice = Product & { customPrice?: number; configVersion?: string | null; consumptionSnapshot?: unknown; offlineAuthorization?: string | null };

type ComboItem = {
    id: string;
    product: { id: string; name: string; sku: string; unit: string; configVersion?: string | null; consumptionSnapshot?: unknown; offlineAuthorization?: string | null };
    quantity: number;
};
type Combo = {
    id: string; name: string; description: string | null;
    price: number; imageUrl: string | null; active: boolean;
    items: ComboItem[]; offlineAuthorization?: string;
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
    comanda: Comanda;
}

const METHOD_LABEL: Record<string, string> = {
    CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'QR', MIXED: 'Mixto'
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

    // Offline State
    const [offlineQueue, setOfflineQueue] = useState<OfflineSale[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    const branchId = user?.branchIds?.[0] || '';

    const {
        cart, discount,
        addToCart, removeFromCart, updateQuantity, clearCart,
        applyDiscount, calculateTotal, calculateSubtotal, calculateDiscountAmount,
    } = useBurgerSale(branchId);

    useEffect(() => { if (branchId) loadInitialData(); }, [branchId, user?.userId]);

    // Limpiar notificación
    useEffect(() => {
        if (saleResult) {
            const t = setTimeout(() => setSaleResult(null), 4000);
            return () => clearTimeout(t);
        }
    }, [saleResult]);

    // Offline queue listener
    useEffect(() => {
        const updateQueue = () => setOfflineQueue(getOfflineQueue());
        updateQueue();
        window.addEventListener('skot-offline-queue-updated', updateQueue);
        window.addEventListener('online', handleSync);
        return () => {
            window.removeEventListener('skot-offline-queue-updated', updateQueue);
            window.removeEventListener('online', handleSync);
        };
    }, []);

    const handleSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        const res = await syncOfflineQueue();
        setIsSyncing(false);
        if (res.synced > 0 && res.errors === 0) {
            setSaleResult({ type: 'success', message: `¡Se sincronizaron ${res.synced} ventas offline exitosamente!` });
        } else if (res.errors > 0) {
            const queue = getOfflineQueue();
            const failedSales = queue.filter(s => s.status === 'failed');
            const errorMessages = [...new Set(failedSales.map(s => s.errorMessage))].join(' | ');
            setSaleResult({ type: 'error', message: `No se pudieron sincronizar ${res.errors} ventas. Error: ${errorMessages}` });
        }
    };

    const loadInitialData = async (silent = false) => {
        const cacheScope = `${branchId}-${user?.userId || 'guest'}`;
        try {
            if (!silent) setIsLoading(true);
            const [productsRes, modifiersRes, combosRes] = await Promise.all([
                fetch(`/api/pos/products?branchId=${branchId}&type=BURGER`),
                fetch(`/api/pos/modifiers?category=BURGER&branchId=${encodeURIComponent(branchId)}`),
                fetch(`/api/pos/combos?branchId=${branchId}`),
            ]);
            const [productsData, modifiersData, combosData] = await Promise.all([
                productsRes.json(), modifiersRes.json(), combosRes.json(),
            ]);

            if (productsData.success) {
                setProducts(productsData.data);
                localStorage.setItem(`pos-burgers-products-${cacheScope}`, JSON.stringify(productsData.data));
            }
            if (modifiersData.success) {
                setModifiers(modifiersData.data);
                localStorage.setItem(`pos-burgers-modifiers-${cacheScope}`, JSON.stringify(modifiersData.data));
            }
            if (combosData.success) {
                setCombos(combosData.data);
                localStorage.setItem(`pos-burgers-combos-${cacheScope}`, JSON.stringify(combosData.data));
            }
        } catch (error) {
            console.error('Error cargando datos, intentando desde caché local:', error);
            const cachedP = localStorage.getItem(`pos-burgers-products-${cacheScope}`);
            const cachedM = localStorage.getItem(`pos-burgers-modifiers-${cacheScope}`);
            const cachedC = localStorage.getItem(`pos-burgers-combos-${cacheScope}`);
            if (cachedP) setProducts(JSON.parse(cachedP));
            if (cachedM) setModifiers(JSON.parse(cachedM));
            if (cachedC) setCombos(JSON.parse(cachedC));
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
            name: combo.name,
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
            const extraModifiers: { modifierId: string; quantity: number; price: number; offlineAuthorization?: string }[] = [];
            let comboGroup = 0;

            for (const item of cart) {
                const productId: string = (item.product as any).id ?? '';

                // ── EXTRA suelto ─────────────────────────────────────────────
                if (productId.startsWith('EXTRA-')) {
                    extrasTotal += item.subtotal;
                    extraModifiers.push({ modifierId: productId.slice(6), quantity: item.quantity, price: (item.product as any).customPrice || 0,
                        offlineAuthorization: (item.product as any).offlineAuthorization });
                    continue;
                }

                const comboRef = (item.product as any)._comboRef as Combo | undefined;
                if (comboRef) {
                    const group = String(comboGroup++);
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
                            comboId: comboRef.id,
                            comboGroup: group,
                            configVersion: ci.product.configVersion,
                            consumptionSnapshot: ci.product.consumptionSnapshot,
                            offlineAuthorization: ci.product.offlineAuthorization,
                            comboAuthorization: comboRef.offlineAuthorization,
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
                        configVersion: (item.product as ProductWithPrice).configVersion,
                        consumptionSnapshot: (item.product as ProductWithPrice).consumptionSnapshot,
                        offlineAuthorization: (item.product as ProductWithPrice).offlineAuthorization,
                        quantity: item.quantity,
                        unitPrice: (item.product as any).customPrice || 0,
                        subtotal: item.subtotal,
                        modifiers: item.selectedModifiers.map(m => ({
                            modifierId: m.modifier.id,
                            quantity: m.quantity,
                            price: m.modifier.price,
                            offlineAuthorization: (m.modifier as any).offlineAuthorization,
                        })),
                    });
                }
            }

            // Necesitamos al menos un ítem real para crear la venta
            if (expandedItems.length === 0 && extrasTotal > 0) {
                setSaleResult({ type: 'error', message: 'No se puede procesar una venta solo con extras. Agregá al menos un producto.' });
                return;
            }

            const payload = {
                branchId,
                userId: user?.userId,
                paymentMethod: paymentData.method,
                cashAmount: paymentData.cashAmount,
                cardAmount: paymentData.cardAmount,
                transferAmount: paymentData.transferAmount,
                items: expandedItems,
                extrasTotal: extrasTotal > 0 ? extrasTotal : undefined,
                extraModifiers: extraModifiers.length ? extraModifiers : undefined,
                discount: discount
                    ? { type: discount.type, value: discount.value, authorizedBy: discount.authorizedBy }
                    : undefined,
            };

            let isOffline = false;
            let data: any;

            try {
                const response = await fetch('/api/pos/sale', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                data = await response.json();
            } catch (fetchErr) {
                const authorized = expandedItems.every(item => item.offlineAuthorization &&
                    (!item.comboId || item.comboAuthorization) && (item.modifiers || []).every((m: any) => m.offlineAuthorization)) &&
                    extraModifiers.every(item => item.offlineAuthorization);
                if (!authorized) {
                    setSaleResult({ type: 'error', message: 'No se puede guardar esta venta sin conexión. Actualiza el catálogo con internet y verifica la clave de autorización offline.' });
                    return;
                }
                isOffline = true;
                // Guardar en cola offline
                const offlineSale = saveToOfflineQueue({
                    createdAt: new Date().toISOString(),
                    payload,
                    type: 'BURGER',
                    displayTotal: calculateTotal(),
                    displayItems: cart.map(i => `${i.quantity}x ${i.product.name}`),
                });
                data = { success: true, data: { saleNumber: offlineSale.offlineId } };
            }

            if (data.success) {
                const total = calculateTotal();
                const comanda: Comanda = {
                    saleNumber: data.data.saleNumber,
                    createdAt: new Date(),
                    area: 'Hamburguesas',
                    customerName: paymentData.customerName,
                    offline: isOffline,
                    items: cart.map(item => {
                        const combo = (item.product as any)._comboRef as Combo | undefined;
                        return {
                            name: item.product.name,
                            quantity: item.quantity,
                            details: combo
                                ? combo.items.map(ci => `${ci.quantity * item.quantity} × ${ci.product.name}`)
                                : item.selectedModifiers.map(({ modifier, quantity }) =>
                                    `${quantity * item.quantity} × ${modifier.name}`),
                        };
                    }),
                };
                setTurnHistory(prev => [{
                    saleNumber: data.data.saleNumber,
                    total,
                    paymentMethod: paymentData.method,
                    itemCount: cart.reduce((s, i) => s + i.quantity, 0),
                    time: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
                    customerName: paymentData.customerName,
                    items: cart.map(item => ({ name: item.product.name, quantity: item.quantity, subtotal: item.subtotal })),
                    comanda,
                }, ...prev].slice(0, 20));
                clearCart();
                setShowPaymentModal(false);
                if (isOffline) {
                    setSaleResult({ type: 'success', message: `¡Venta OFFLINE ${data.data.saleNumber} guardada y pendiente de sincronización!`, saleNumber: data.data.saleNumber });
                } else {
                    setSaleResult({ type: 'success', message: `¡Venta ${data.data.saleNumber}${paymentData.customerName ? ` — ${paymentData.customerName}` : ''} registrada!`, saleNumber: data.data.saleNumber });
                }
                loadInitialData(true);
                printComanda(comanda, () => setSaleResult({
                    type: 'success',
                    message: `Venta ${comanda.saleNumber} registrada. No se pudo abrir la impresión; reimprimí desde Turno.`,
                    saleNumber: comanda.saleNumber,
                }));
            } else {
                setSaleResult({ type: 'error', message: data.error || 'Error al procesar la venta' });
            }
        } catch (e: any) {
            setSaleResult({ type: 'error', message: e.message || 'Error desconocido' });
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
        <div data-brand="burger" className="skot-experience relative flex min-h-dvh min-w-0 flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">
            {/* Toast de resultado */}
            {saleResult && (
                <div role="status" className={`fixed left-4 right-4 top-4 z-50 flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white shadow-lg sm:left-1/2 sm:right-auto sm:-translate-x-1/2 ${saleResult.type === 'success' ? 'bg-success' : 'bg-danger'}`}>
                    {saleResult.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    {saleResult.message}
                </div>
            )}

            {/* Lado izquierdo */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4 pb-28 lg:overflow-hidden lg:pb-4">
                {/* Header */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-subtle bg-surface px-4 py-3">
                    <div className="flex items-center gap-3">
                        {/* Logo Burger */}
                        <img src="/logo-burger.png" alt="Skot Burger"
                            className="h-10 w-auto object-contain"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <h1 className="text-xl font-semibold text-ink sm:text-2xl">POS Hamburguesas</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowHistory(v => !v)}
                            className={`flex min-h-12 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${showHistory ? 'bg-brand text-white' : 'border border-line bg-surface text-ink hover:bg-canvas'}`}>
                            <ClipboardList className="h-4 w-4" />
                            Turno
                            {turnHistory.length > 0 && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs font-bold text-white">
                                    {turnHistory.length}
                                </span>
                            )}
                        </button>

                        {/* Offline Indicator */}
                        {offlineQueue.length > 0 ? (
                            <button onClick={handleSync} disabled={isSyncing} aria-label={`${offlineQueue.length} ventas pendientes. Reintentar sincronización`} className="flex min-h-12 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-warning hover:bg-[var(--status-warning-bg)] disabled:opacity-50">
                                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">{isSyncing ? 'Sincronizando' : 'Ventas pendientes'}</span>
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning text-xs font-bold text-white">{offlineQueue.length}</span>
                            </button>
                        ) : (
                            <div className="flex min-h-12 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-muted" aria-label="Sin ventas pendientes" title="Sin ventas pendientes">
                                <CheckCircle className="h-4 w-4" />
                            </div>
                        )}

                        <Link href="/" className="ml-2 flex min-h-12 items-center gap-1 text-sm font-semibold text-brand hover:underline">
                            <ArrowLeft className="h-4 w-4" /> Dashboard
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-3 flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line-subtle bg-surface p-1" aria-label="Secciones del catálogo">
                    <button onClick={() => setActiveTab('productos')}
                        aria-pressed={activeTab === 'productos'} className={`flex min-h-12 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${activeTab === 'productos' ? 'bg-brand text-white' : 'text-ink hover:bg-canvas'}`}>
                        <Package className="h-4 w-4" /> Productos ({products.length})
                    </button>
                    <button onClick={() => setActiveTab('combos')}
                        aria-pressed={activeTab === 'combos'} className={`flex min-h-12 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${activeTab === 'combos' ? 'bg-brand text-white' : 'text-ink hover:bg-canvas'}`}>
                        <Layers className="h-4 w-4" />
                        Combos ({combos.length})
                        {combos.length > 0 && activeTab !== 'combos' && (
                            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs font-bold text-white">{combos.length}</span>
                        )}
                    </button>
                    <button onClick={() => setActiveTab('extras')}
                        aria-pressed={activeTab === 'extras'} className={`flex min-h-12 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${activeTab === 'extras' ? 'bg-brand text-white' : 'text-ink hover:bg-canvas'}`}>
                        <ChefHat className="h-4 w-4" />
                        Extras ({modifiers.length})
                    </button>
                </div>

                {/* Contenido del tab con watermark */}
                <div className="relative min-h-0 flex-1 rounded-xl border border-line-subtle bg-surface p-4 lg:overflow-hidden">
                    {/* Marca de agua */}
                    <div className="hidden">
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
            <div className="lg:h-full lg:w-[360px] lg:shrink-0">
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
                                                        <User size={14} aria-hidden="true" /> {sale.customerName}
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
                                            <button type="button" onClick={() => printComanda(sale.comanda)}
                                                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-yellow-400/50 text-yellow-300 font-semibold hover:bg-yellow-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300">
                                                <Printer className="h-4 w-4" /> Reimprimir comanda
                                            </button>
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
                basePrice={selectedProduct?.customPrice || 0}
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
            <div className="flex flex-col items-center justify-center py-16 text-muted">
                <Layers className="h-14 w-14 mb-3 opacity-30" />
                <p className="text-lg font-medium">No hay combos activos</p>
                <p className="mt-1 text-sm">Creá combos desde Administración → Combos</p>
            </div>
        );
    }

    return (
        <div className="skot-catalog-grid max-h-full overflow-y-auto pb-2">
            {combos.map(combo => (
                <button key={combo.id} onClick={() => onComboSelect(combo)}
                    className="group flex min-h-[206px] min-w-0 flex-col overflow-hidden rounded-xl border border-line-subtle bg-surface text-left hover:border-brand">
                    {/* Imagen */}
                    <div className="relative h-28 w-full shrink-0 bg-canvas">
                        {combo.imageUrl ? (
                            <Image src={combo.imageUrl} alt="" fill className="object-cover"
                                sizes="(max-width: 768px) 100vw, 290px" />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <ShoppingBag className="h-12 w-12 text-muted" />
                            </div>
                        )}
                        {/* Badge */}
                        <div className="absolute left-2 top-2 rounded-full bg-[var(--status-neutral-bg)] px-2 py-0.5 text-xs font-semibold text-brand">
                            COMBO
                        </div>
                    </div>
                    {/* Info */}
                    <div className="p-3 flex flex-col flex-1">
                        <h3 className="break-words text-lg font-semibold text-ink">
                            {combo.name}
                        </h3>
                        {/* Items del combo */}
                        <div className="mt-1.5 space-y-0.5 flex-1">
                            {combo.items.slice(0, 3).map(item => (
                                <p key={item.id} className="line-clamp-2 text-sm text-muted">
                                    · {item.quantity}x {item.product.name}
                                </p>
                            ))}
                            {combo.items.length > 3 && (
                                <p className="text-sm text-muted">+{combo.items.length - 3} más…</p>
                            )}
                        </div>
                        {/* Precio */}
                        <div className="mt-2 border-t border-line-subtle pt-3 font-display text-xl font-semibold tabular-nums text-brand">
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
            <div className="flex flex-col items-center justify-center py-16 text-muted">
                <ChefHat className="h-14 w-14 mb-3 opacity-30" />
                <p className="text-lg font-medium">No hay extras disponibles</p>
                <p className="mt-1 text-sm">Creá modificadores desde Administración</p>
            </div>
        );
    }

    return (
        <div className="skot-catalog-grid max-h-full overflow-y-auto pb-2">
            {modifiers.map(mod => (
                <button key={mod.id} onClick={() => onExtraAdd(mod)}
                    className="group flex min-h-[206px] min-w-0 flex-col overflow-hidden rounded-xl border border-line-subtle bg-surface text-left hover:border-brand">
                    {/* Icono decorativo */}
                    <div className="relative h-24 w-full shrink-0 bg-canvas">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <ChefHat className="h-11 w-11 text-muted" />
                        </div>
                        <div className="absolute left-2 top-2 rounded-full bg-[var(--status-neutral-bg)] px-2 py-0.5 text-xs font-semibold text-brand">
                            EXTRA
                        </div>
                    </div>
                    {/* Info */}
                    <div className="p-3 flex flex-col flex-1">
                        <h3 className="break-words text-lg font-semibold text-ink">
                            {mod.name}
                        </h3>
                        {mod.description && (
                            <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted">{mod.description}</p>
                        )}
                        <div className="mt-2 border-t border-line-subtle pt-3 font-display text-xl font-semibold tabular-nums text-brand">
                            + Bs. {mod.price.toFixed(2)}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}
