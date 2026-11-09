'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/lib/session-context';
import { useAcaiSale, Product } from '@/hooks/use-acai-sale';
import { useScale } from '@/hooks/use-scale';
import Link from 'next/link';
import {
    ArrowLeft, Scale, ShoppingCart, CreditCard, Banknote,
    ArrowRightLeft, CheckCircle, AlertCircle, Loader2,
    Check, ChevronRight, RotateCcw, Plus, Minus, Trash2,
    Wifi, WifiOff, Usb, Settings2, X, RefreshCw, Printer
} from 'lucide-react';
import CashGate from '@/components/pos/cash-gate';
import { AcaiOrderSummary } from '@/components/pos/acai/order-summary';
import { Dialog } from '@/components/ui/dialog';
import { getOfflineQueue, saveToOfflineQueue, syncOfflineQueue, OfflineSale } from '@/lib/sync-manager';
import { Comanda, printComanda } from '@/lib/pos/print-comanda';

type Step = 'sabor' | 'balanza' | 'extras';
type PaymentMethodType = 'CASH' | 'CARD' | 'TRANSFER' | 'MIXED';

interface ApiProduct {
    id: string;
    name: string;
    type: string;
    description?: string;
    customPrice: number;
    pricePerKg: number;
    currentStock: number;
}

const STEPS: { key: Step; label: string }[] = [
    { key: 'sabor', label: 'Sabor' },
    { key: 'balanza', label: 'Balanza' },
    { key: 'extras', label: 'Extras' },
];

export default function AcaiPOSPage() {
    const { user } = useSession();
    const branchId = user?.branchIds?.[0] || '';
    const userId   = user?.userId || '';

    const {
        cart,
        setMixtoMode, setFlavor, toggleFlavor,
        confirmWeight, resetWeight,
        addExtra, decrementExtra, removeExtra, clearCart,
    } = useAcaiSale(branchId, userId);

    const [scaleIp,      setScaleIp]      = useState('192.168.1.100');
    const [showNetCfg,   setShowNetCfg]   = useState(false);
    const [scaleIpInput, setScaleIpInput] = useState(scaleIp);

    // Leer la configuración guardada después del montaje, solo en el navegador.
    useEffect(() => {
        try {
            const savedIp = localStorage.getItem('skot_scale_ip');
            if (savedIp) {
                setScaleIp(savedIp);
                setScaleIpInput(savedIp);
            }
        } catch {
            // Mantener la IP predeterminada si el navegador bloquea el almacenamiento.
        }
    }, []);

    const wsUrl = `ws://localhost:8765`;

    const {
        weight, isStable, status: scaleStatus, connect, disconnect, isMockMode, mode: scaleMode,
    } = useScale({ tara: 0.15, autoConnect: false, wsUrl });

    const [flavors,   setFlavors]   = useState<ApiProduct[]>([]);
    const [beverages, setBeverages] = useState<ApiProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [step, setStep]           = useState<Step>('sabor');
    const [showPayment, setShowPayment]         = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<PaymentMethodType>('CASH');
    const [cashGiven, setCashGiven]             = useState('');
    const [cardGiven, setCardGiven]             = useState('');
    const [transferGiven, setTransferGiven]     = useState('');
    const [notification, setNotification]       = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [processing, setProcessing]           = useState(false);
    const [lastComanda, setLastComanda]           = useState<Comanda | null>(null);

    // Offline State
    const [offlineQueue, setOfflineQueue]       = useState<OfflineSale[]>([]);
    const [isSyncing, setIsSyncing]             = useState(false);

    const loadProducts = useCallback(async (silent = false) => {
        if (!branchId) return;
        if (!silent) setIsLoading(true);
        try {
            const r = await fetch(`/api/pos/products?branchId=${branchId}&type=ACAI`);
            const d = await r.json();
            if (d.success) {
                const f = d.data.filter((p: ApiProduct) => p.type === 'ACAI_BASE');
                const b = d.data.filter((p: ApiProduct) => p.type === 'BEVERAGE');
                setFlavors(f);
                setBeverages(b);
                localStorage.setItem('pos-acai-flavors', JSON.stringify(f));
                localStorage.setItem('pos-acai-beverages', JSON.stringify(b));
            }
        } catch (e) {
            console.error('Error cargando Açaí, usando caché:', e);
            const cachedF = localStorage.getItem('pos-acai-flavors');
            const cachedB = localStorage.getItem('pos-acai-beverages');
            if (cachedF) setFlavors(JSON.parse(cachedF));
            if (cachedB) setBeverages(JSON.parse(cachedB));
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [branchId]);

    // Cargar productos
    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    // Auto-dismiss notificaciones
    useEffect(() => {
        if (!notification) return;
        const t = setTimeout(() => setNotification(null), 4000);
        return () => clearTimeout(t);
    }, [notification]);

    const notify = useCallback((type: 'success' | 'error', msg: string) => {
        setNotification({ type, msg });
    }, []);

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
        if (res.synced > 0) {
            notify('success', `¡Se sincronizaron ${res.synced} ventas offline exitosamente!`);
        } else if (res.errors > 0) {
            notify('error', `Hubo ${res.errors} errores al sincronizar ventas offline.`);
        }
    };

    // ¿Se puede cobrar?
    // Reglas:
    //  - Siempre si hay extras y total > 0  (venta de bebidas solas)
    //  - Con bowl: necesita peso confirmado
    const hasBowl    = cart.flavors.length > 0;
    const canCobrar  = cart.total > 0 && (!hasBowl || cart.weightConfirmed);

    // Confirmar peso y avanzar
    const handleConfirmWeight = useCallback(() => {
        if (weight <= 0.02) {
            notify('error', 'El peso debe ser mayor a 0. Colocá el bowl en la balanza.');
            return;
        }
        confirmWeight(weight);
        setStep('extras');
    }, [weight, confirmWeight, notify]);

    // Procesar venta
    const handleProcessSale = async () => {
        if (!canCobrar) return;
        setProcessing(true);
        try {
            const flavorName = cart.isMixto
                ? 'Mixto: ' + cart.flavors.map(f => f.product.name).join(' + ')
                : cart.flavors[0]?.product.name ?? '';

            const items = [
                // Bowl (sabor(es) × peso) — solo si hay bowl
                ...(hasBowl && cart.weightConfirmed ? [{
                    productId: cart.flavors[0].product.id,   // primer sabor como referencia
                    quantity:  cart.totalWeight,              // kg
                    unitPrice: cart.effectivePricePerKg,
                    subtotal:  cart.bowlSubtotal,
                }] : []),
                // Sabores adicionales (mixto, precio 0, solo ticket)
                ...(cart.isMixto && cart.flavors.length > 1
                    ? cart.flavors.slice(1).map(f => ({
                        productId: f.product.id,
                        quantity:  1,
                        unitPrice: 0,
                        subtotal:  0,
                    }))
                    : []),

                // Extras a precio fijo
                ...cart.extras.map(e => ({
                    productId: e.product.id,
                    quantity:  e.quantity,
                    unitPrice: e.unitPrice,
                    subtotal:  e.subtotal,
                })),
            ];

            // En Mixto y Cash, descontamos el vuelto de lo entregado en efectivo para que cuadre exacto con el total
            const cashVal = parseFloat(cashGiven) || 0;
            const cardVal = parseFloat(cardGiven) || 0;
            const transferVal = parseFloat(transferGiven) || 0;
            const changeVal = Math.max(0, cashVal + cardVal + transferVal - cart.total);
            const actualCash = Math.max(0, cashVal - changeVal);

            const payload = {
                branchId, userId,
                paymentMethod: selectedPayment,
                cashAmount: selectedPayment === 'CASH' || selectedPayment === 'MIXED' ? actualCash || (selectedPayment === 'CASH' ? cart.total : 0) : undefined,
                cardAmount: selectedPayment === 'CARD' || selectedPayment === 'MIXED' ? cardVal || (selectedPayment === 'CARD' ? cart.total : 0) : undefined,
                transferAmount: selectedPayment === 'TRANSFER' || selectedPayment === 'MIXED' ? transferVal || (selectedPayment === 'TRANSFER' ? cart.total : 0) : undefined,
                items,
            };

            let isOffline = false;
            let data: any;

            try {
                const res = await fetch('/api/pos/sale', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                data = await res.json();
            } catch (err) {
                isOffline = true;
                const offlineSale = saveToOfflineQueue({
                    createdAt: new Date().toISOString(),
                    payload,
                    type: 'ACAI',
                    displayTotal: cart.total,
                    displayItems: items.map(i => `${i.quantity}x`),
                });
                data = { success: true, data: { saleNumber: offlineSale.offlineId, totalAmount: cart.total } };
            }

            if (data.success) {
                const comanda: Comanda = {
                    saleNumber: data.data.saleNumber,
                    createdAt: new Date(),
                    area: 'Açaí',
                    offline: isOffline,
                    items: [
                        ...(hasBowl ? [{
                            name: cart.isMixto ? 'Bowl mixto' : `Bowl ${cart.flavors[0].product.name}`,
                            quantity: cart.totalWeight,
                            unit: 'kg',
                            details: cart.isMixto ? cart.flavors.map(f => f.product.name) : [],
                        }] : []),
                        ...cart.extras.map(extra => ({
                            name: extra.product.name,
                            quantity: extra.quantity,
                        })),
                    ],
                };
                setLastComanda(comanda);
                clearCart();
                setShowPayment(false);
                setStep('sabor');
                setCashGiven('');
                setCardGiven('');
                setTransferGiven('');
                loadProducts(true);
                if (isOffline) {
                    notify('success', `Venta OFFLINE guardada: ${data.data.saleNumber} — Pendiente de sincronización`);
                } else {
                    notify('success', `Venta ${data.data.saleNumber} — Bs. ${data.data.totalAmount.toFixed(2)}`);
                }
                printComanda(comanda, () => notify('error',
                    `Venta ${comanda.saleNumber} registrada. No se pudo abrir la impresión; usá Reimprimir última comanda.`));
            } else {
                notify('error', data.error || 'Error al registrar la venta');
            }
        } catch (e: any) {
            notify('error', e.message || 'Error desconocido');
        } finally {
            setProcessing(false);
        }
    };

    const paid = parseFloat(cashGiven || '0') + parseFloat(cardGiven || '0') + parseFloat(transferGiven || '0');
    const change = Math.max(0, paid - cart.total);

    const handleMethodChange = (method: PaymentMethodType) => {
        setSelectedPayment(method);
        if (method === 'CASH')     { setCashGiven(cart.total.toFixed(2)); setCardGiven('0.00'); setTransferGiven('0.00'); }
        if (method === 'CARD')     { setCashGiven('0.00'); setCardGiven(cart.total.toFixed(2)); setTransferGiven('0.00'); }
        if (method === 'TRANSFER') { setCashGiven('0.00'); setCardGiven('0.00'); setTransferGiven(cart.total.toFixed(2)); }
        if (method === 'MIXED')    { const h = (cart.total / 2).toFixed(2); setCashGiven(h); setCardGiven('0.00'); setTransferGiven(h); }
    };

    const stepIndex = STEPS.findIndex(s => s.key === step);

    // ── Loading ──────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-950 to-indigo-900">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-purple-300 mx-auto mb-4" />
                    <p className="text-purple-200 font-medium">Cargando POS Açaí...</p>
                </div>
            </div>
        );
    }

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <CashGate branchId={branchId} userId={userId} theme="acai">
        <div data-brand="acai" className="skot-experience skot-acai relative flex min-h-dvh min-w-0 flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">


            {/* Toast */}
            {notification && (
                <div role="status" className={`fixed left-4 right-4 top-4 z-50 flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg sm:left-1/2 sm:right-auto sm:-translate-x-1/2 ${notification.type === 'success' ? 'bg-success' : 'bg-danger'}`}>
                    {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    {notification.msg}
                </div>
            )}

            {/* ═══════════════════════════════════
                PANEL IZQUIERDO – Pasos
            ═══════════════════════════════════ */}
            <div className="acai-workspace flex min-w-0 min-h-0 flex-1 flex-col pb-24 lg:pb-0">

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle bg-surface px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-3">
                        <Link href="/" aria-label="Volver al dashboard" className="grid h-12 w-12 place-items-center rounded-lg border border-line text-brand hover:bg-canvas">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <img src="/logo-acai.png" alt="Açaí"
                            className="h-8 w-auto object-contain"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <div>
                            <h1 className="text-lg font-semibold leading-tight text-ink">POS Açaí</h1>
                            {user?.name && <p className="text-xs text-muted">{user.name}</p>}
                        </div>
                    </div>

                    {/* Offline / Online status y Balanza */}
                    <div className="flex items-center gap-2 relative">

                        {/* Indicador Offline */}
                        {offlineQueue.length > 0 ? (
                            <button onClick={handleSync} disabled={isSyncing} aria-label={`${offlineQueue.length} ventas pendientes. Reintentar sincronización`} className="mr-2 flex min-h-12 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-warning hover:bg-[var(--status-warning-bg)] disabled:opacity-50">
                                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                <span className="hidden md:inline">{isSyncing ? 'Sincronizando' : 'Ventas pendientes'}</span>
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning text-xs font-bold text-white">{offlineQueue.length}</span>
                            </button>
                        ) : (
                            <div className="mr-2 flex min-h-12 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-muted" title="Sin ventas pendientes" aria-label="Sin ventas pendientes">
                                <CheckCircle className="h-4 w-4" />
                            </div>
                        )}

                        {/* Estado cuando está conectado */}
                        {scaleStatus === 'connected' || scaleStatus === 'reading' ? (
                            <div className="flex items-center gap-2">
                                <div className={`flex min-h-12 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold ${
                                    scaleMode === 'network'
                                        ? 'bg-[var(--status-info-bg)] text-info'
                                        : 'bg-[var(--status-success-bg)] text-success'
                                }`}>
                                    {scaleMode === 'network' ? <Wifi className="h-4 w-4" /> : <Scale className="h-4 w-4" />}
                                    <span>{cart.weightConfirmed ? `Peso confirmado: ${cart.totalWeight.toFixed(3)} kg` : `Lectura: ${weight.toFixed(3)} kg · ${isStable ? 'estable sin confirmar' : 'en curso'}`}</span>
                                    {isMockMode && <span className="text-xs opacity-60">(demo)</span>}
                                </div>
                                <button onClick={() => disconnect()}
                                    className="grid h-12 w-12 place-items-center rounded-lg border border-line text-danger hover:bg-[var(--status-error-bg)]"
                                    aria-label="Desconectar balanza">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                {/* Botón USB */}
                                <button
                                    onClick={() => connect('serial')}
                                    className="flex min-h-12 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-brand hover:bg-canvas"
                                    title="Conectar por cable USB (Web Serial)"
                                >
                                    <Usb className="h-3.5 w-3.5" />
                                    USB
                                </button>

                                {/* Botón Red */}
                                <button
                                    onClick={() => connect('network')}
                                    className="flex min-h-12 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-brand hover:bg-canvas"
                                    title="Conectar por red Wi-Fi/Ethernet (requiere bridge corriendo)"
                                >
                                    <Wifi className="h-3.5 w-3.5" />
                                    Red
                                </button>

                                {/* Config IP */}
                                <button
                                    onClick={() => { setScaleIpInput(scaleIp); setShowNetCfg(v => !v); }}
                                    className="grid h-12 w-12 place-items-center rounded-lg border border-line bg-surface text-brand hover:bg-canvas"
                                    aria-label="Configurar IP de la balanza"
                                >
                                    <Settings2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}

                        {/* Panel config IP */}
                        {showNetCfg && (
                            <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-line-subtle bg-surface p-4 text-ink shadow-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-semibold">Configurar balanza en red</p>
                                    <button onClick={() => setShowNetCfg(false)} aria-label="Cerrar configuración de balanza" className="grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-canvas"><X className="h-4 w-4" /></button>
                                </div>
                                <p className="mb-3 text-sm text-muted">Configuración de conexión TCP/IP de la balanza.</p>
                                <label htmlFor="scale-ip-input" className="mb-1 block text-sm font-semibold">IP de la balanza</label>
                                <input
                                    id="scale-ip-input"
                                    value={scaleIpInput}
                                    onChange={e => setScaleIpInput(e.target.value)}
                                    placeholder="192.168.1.100"
                                    className="mb-3 min-h-12 w-full rounded-lg border border-line bg-surface px-3 font-mono text-sm text-ink"
                                />
                                <p className="mb-3 text-xs text-muted">El puente de red también debe estar configurado con esta IP.</p>
                                <button
                                    onClick={() => {
                                        setScaleIp(scaleIpInput);
                                        localStorage.setItem('skot_scale_ip', scaleIpInput);
                                        setShowNetCfg(false);
                                    }}
                                    className="min-h-12 w-full rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:brightness-90"
                                >
                                    Guardar
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs / pasos */}
                <div className="flex gap-2 overflow-x-auto border-b border-line-subtle bg-surface px-4 py-3 sm:px-6" aria-label="Pasos de la venta">
                    {STEPS.map((s, i) => {
                        const isActive = s.key === step;
                        const isDone   = i < stepIndex;
                        return (
                            <button key={s.key} onClick={() => setStep(s.key)}
                                aria-current={isActive ? 'step' : undefined}
                                className={`flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold ${isActive
                                    ? 'bg-brand text-white'
                                    : isDone
                                        ? 'bg-[var(--status-neutral-bg)] text-brand hover:bg-canvas'
                                        : 'border border-line-subtle bg-surface text-muted hover:bg-canvas'}`}
                            >
                                {isDone ? <Check className="h-4 w-4" /> : <span aria-hidden="true">{i + 1}</span>}
                                {s.label}
                            </button>
                        );
                    })}
                </div>

                {/* Contenido del paso */}
                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">

                    {/* ── PASO 1: SABOR ──────────────────────────────── */}
                    {step === 'sabor' && (
                        <div>
                            {/* Toggle normal / mixto */}
                            <div className="flex items-center gap-3 mb-5">
                                <button
                                    onClick={() => setMixtoMode(false)}
                                    aria-pressed={!cart.isMixto} className={`min-h-12 flex-1 rounded-lg border px-3 text-sm font-semibold ${!cart.isMixto
                                        ? 'border-brand bg-brand text-white'
                                        : 'border-line bg-surface text-ink hover:bg-canvas'}`}
                                >
                                    Un sabor
                                </button>
                                <button
                                    onClick={() => setMixtoMode(true)}
                                    aria-pressed={cart.isMixto} className={`min-h-12 flex-1 rounded-lg border px-3 text-sm font-semibold ${cart.isMixto
                                        ? 'border-brand bg-brand text-white'
                                        : 'border-line bg-surface text-ink hover:bg-canvas'}`}
                                >
                                    Mixto (varios sabores)
                                </button>
                            </div>

                            {cart.isMixto && (
                                <p className="mb-4 text-sm text-muted">
                                    Seleccioná todos los sabores que lleva el bowl. El precio/kg será el promedio de los sabores elegidos.
                                </p>
                            )}

                            {flavors.length === 0 ? (
                                <div className="py-16 text-center text-muted">No hay sabores configurados para esta sucursal.</div>
                            ) : (
                                <div className="skot-catalog-grid">
                                    {flavors.map(p => {
                                        const isSelected = cart.isMixto
                                            ? cart.flavors.some(f => f.product.id === p.id)
                                            : cart.flavors[0]?.product.id === p.id;
                                        const isOut = p.currentStock <= 0;

                                        return (
                                            <button
                                                key={p.id}
                                                disabled={isOut}
                                                aria-pressed={isSelected}
                                                onClick={() => {
                                                    if (cart.isMixto) {
                                                        toggleFlavor({ id: p.id, name: p.name, type: p.type }, p.pricePerKg);
                                                    } else {
                                                        setFlavor({ id: p.id, name: p.name, type: p.type }, p.pricePerKg);
                                                        setStep('balanza');
                                                    }
                                                }}
                                                className={`relative min-h-36 min-w-0 overflow-hidden rounded-xl border p-5 text-left disabled:cursor-not-allowed disabled:opacity-60 ${isSelected
                                                    ? 'border-brand bg-[var(--status-neutral-bg)] text-ink'
                                                    : 'border-line-subtle bg-surface text-ink hover:border-brand'}`}
                                            >
                                                {isOut && (
                                                    <div className="absolute right-3 top-3">
                                                        <span className="rounded-full bg-[var(--status-error-bg)] px-3 py-1 text-sm font-semibold text-danger">Sin stock</span>
                                                    </div>
                                                )}
                                                {isSelected && (
                                                    <div className="absolute right-3 top-3 rounded-full bg-brand p-0.5">
                                                        <Check className="h-3 w-3 text-white" />
                                                    </div>
                                                )}
                                                <h3 className="break-words text-lg font-semibold leading-tight">{p.name}</h3>
                                                {p.description && (
                                                    <p className="mt-1 text-sm text-muted">{p.description}</p>
                                                )}
                                                <p className="mt-3 font-display text-xl font-semibold tabular-nums text-brand">
                                                    Bs. {p.pricePerKg.toFixed(2)}/kg
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* En mixto: preview del precio promedio + botón continuar */}
                            {cart.isMixto && cart.flavors.length > 0 && (
                                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line-subtle bg-surface p-4">
                                    <div>
                                        <p className="mb-1 text-sm text-muted">Sabores seleccionados</p>
                                        <p className="text-sm font-semibold text-ink">
                                            {cart.flavors.map(f => f.product.name).join(' + ')}
                                        </p>
                                        <p className="mt-0.5 text-sm text-brand tabular-nums">
                                            Precio promedio: Bs. {cart.effectivePricePerKg.toFixed(2)}/kg
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setStep('balanza')}
                                        className="flex min-h-12 shrink-0 items-center gap-2 rounded-lg bg-brand px-5 font-semibold text-white hover:brightness-90"
                                    >
                                        Continuar <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            {/* Acceso rápido a extras (venta sin bowl) */}
                            <div className="mt-4">
                                <button
                                    onClick={() => setStep('extras')}
                                    className="min-h-12 w-full rounded-lg border border-dashed border-line bg-surface px-3 text-sm font-semibold text-brand hover:bg-canvas"
                                >
                                    Vender bebidas o extras sin bowl
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── PASO 3: BALANZA ────────────────────────────── */}
                    {step === 'balanza' && (
                        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
                            <p className="text-center text-sm text-muted">
                                Colocá el bowl completo (helado + toppings) en la balanza.<br/>
                                El peso aparece automáticamente.
                            </p>

                            {scaleStatus !== 'connected' && scaleStatus !== 'reading' ? (
                                <div className="w-full rounded-xl border border-dashed border-line bg-surface p-8 text-center">
                                    <Scale className="mx-auto mb-4 h-12 w-12 text-brand" />
                                    <p className="mb-6 text-muted">Conectá la balanza Prix 4</p>
                                    <div className="flex flex-wrap items-center justify-center gap-3">
                                        <button onClick={() => connect('serial')}
                                            className="flex min-h-12 items-center gap-2 rounded-lg bg-brand px-5 font-semibold text-white hover:brightness-90">
                                            <Usb className="h-4 w-4" /> USB
                                        </button>
                                        <button onClick={() => connect('network')}
                                            className="flex min-h-12 items-center gap-2 rounded-lg border border-line bg-surface px-5 font-semibold text-brand hover:bg-canvas">
                                            <Wifi className="h-4 w-4" /> Red (TCP/IP)
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full space-y-4">
                                    {/* Display grande del peso */}
                                    <div className="rounded-xl border border-line-subtle bg-[var(--scale-display)] p-6 text-center text-white sm:p-8">
                                        <p className="mb-2 text-sm text-white/80">Lectura de balanza · peso del bowl</p>
                                        <p className="font-display text-5xl font-semibold tracking-tight tabular-nums text-white sm:text-7xl">
                                            {weight.toFixed(3)}
                                        </p>
                                        <p className="mt-1 text-lg text-white/80">kg</p>
                                        <div className={`mt-4 inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-sm font-semibold ${isStable && weight > 0.05 ? 'text-white' : 'text-white/80'}`}>
                                            {isStable && weight > 0.05
                                                ? <><Check className="h-4 w-4" /> Lectura estable · sin confirmar</>
                                                : <><Loader2 className="h-4 w-4 animate-spin" /> Esperando lectura estable</>}
                                        </div>
                                    </div>

                                    {/* Preview precio */}
                                    {cart.flavors.length > 0 && weight > 0.05 && (
                                        <div className="rounded-xl border border-line-subtle bg-surface p-4 text-center">
                                            <p className="text-sm text-muted">Vista previa del precio</p>
                                            <p className="mt-0.5 text-sm text-muted tabular-nums">
                                                {weight.toFixed(3)} kg × Bs. {cart.effectivePricePerKg.toFixed(2)}/kg
                                                {cart.isMixto && <span className="ml-1 text-brand">(promedio mixto)</span>}
                                            </p>
                                            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-brand">
                                                Bs. {(weight * cart.effectivePricePerKg).toFixed(2)}
                                            </p>
                                        </div>
                                    )}

                                    {/* Botones */}
                                    <div className="flex flex-wrap gap-3">
                                        {cart.weightConfirmed && (
                                            <button onClick={resetWeight}
                                                className="flex min-h-12 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-brand hover:bg-canvas">
                                                <RotateCcw className="h-4 w-4" /> Volver a pesar
                                            </button>
                                        )}
                                        <button
                                            onClick={handleConfirmWeight}
                                            disabled={!isStable || weight <= 0.05}
                                            className="hidden min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-lg font-semibold text-white hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50 lg:flex"
                                        >
                                            <Check className="h-5 w-5" />
                                            {cart.weightConfirmed ? 'Confirmar nuevo peso' : 'Confirmar peso'}
                                        </button>
                                    </div>

                                    {cart.weightConfirmed && (
                                        <div className="flex items-center gap-2 rounded-xl border border-line-subtle bg-[var(--status-success-bg)] px-4 py-3 text-sm text-success">
                                            <CheckCircle className="h-4 w-4 flex-shrink-0" />
                                            <span>
                                                Confirmado: <strong>{cart.totalWeight.toFixed(3)} kg</strong>
                                                {' → '}<strong>Bs. {cart.bowlSubtotal.toFixed(2)}</strong>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── PASO 4: EXTRAS ─────────────────────────────── */}
                    {step === 'extras' && (
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-sm text-muted">Agregá bebidas u otros extras.</p>
                                {!hasBowl && (
                                    <span className="rounded-full bg-[var(--status-neutral-bg)] px-2 py-1 text-xs font-semibold text-brand">
                                        Venta directa sin bowl
                                    </span>
                                )}
                            </div>
                            <p className="mb-5 text-sm text-muted">Podés vender extras solos, sin necesidad de un bowl.</p>

                            {beverages.length === 0 ? (
                                <div className="py-12 text-center text-muted">No hay extras configurados.</div>
                            ) : (
                                <div className="skot-catalog-grid">
                                    {beverages.map(p => {
                                        const inCart = cart.extras.find(e => e.product.id === p.id);
                                        const isOut = p.currentStock <= 0;
                                        const atMax = inCart && inCart.quantity >= p.currentStock;
                                        const isDisabled = isOut || atMax;
                                        return (
                                            <button
                                                key={p.id}
                                                disabled={isDisabled}
                                                aria-pressed={Boolean(inCart)}
                                                onClick={() => addExtra({ id: p.id, name: p.name, type: p.type, price: p.customPrice, currentStock: p.currentStock })}
                                                className={`relative min-h-32 min-w-0 overflow-hidden rounded-xl border p-4 text-left disabled:cursor-not-allowed disabled:opacity-60 ${inCart
                                                    ? 'border-brand bg-[var(--status-neutral-bg)] text-ink'
                                                    : 'border-line-subtle bg-surface text-ink hover:border-brand'}`}
                                            >
                                                {isOut && (
                                                    <div className="absolute right-3 top-3">
                                                        <span className="rounded-full bg-[var(--status-error-bg)] px-2 py-1 text-xs font-semibold text-danger">Sin stock</span>
                                                    </div>
                                                )}
                                                {inCart && (
                                                    <div className="absolute right-2.5 top-2.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1 text-xs font-bold text-white">
                                                        {inCart.quantity}
                                                    </div>
                                                )}
                                                <h3 className="break-words text-lg font-semibold">{p.name}</h3>
                                                <p className="mt-3 font-display text-xl font-semibold tabular-nums text-brand">Bs. {p.customPrice.toFixed(2)}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer navegación */}
                <div className="flex flex-wrap items-center gap-3 border-t border-line-subtle bg-surface px-4 py-3 sm:px-6 lg:pb-6">
                    {stepIndex > 0 && (
                        <button onClick={() => setStep(STEPS[stepIndex - 1].key)}
                            className="min-h-12 rounded-lg border border-line bg-surface px-5 font-semibold text-brand hover:bg-canvas">
                            ← Atrás
                        </button>
                    )}

                    {/* Botón avanzar (no en el último paso) */}
                    {stepIndex < STEPS.length - 1 && (
                        <button
                            onClick={() => setStep(STEPS[stepIndex + 1].key)}
                            className="ml-auto flex min-h-12 items-center gap-2 rounded-lg border border-line bg-surface px-6 font-semibold text-brand hover:bg-canvas"
                        >
                            {STEPS[stepIndex + 1].label} <ChevronRight className="h-4 w-4" />
                        </button>
                    )}

                    {/* Botón cobrar — siempre visible si hay total */}
                    {canCobrar && (
                        <button
                            onClick={() => setShowPayment(true)}
                            className="ml-auto hidden min-h-12 items-center gap-2 rounded-lg bg-brand px-8 text-lg font-semibold text-white hover:brightness-90 lg:flex"
                        >
                            <ShoppingCart className="h-5 w-5" />
                            Cobrar — Bs. {cart.total.toFixed(2)}
                        </button>
                    )}
                </div>
            </div>

            <div className="lg:h-full lg:w-[340px] lg:shrink-0">
                <AcaiOrderSummary
                    cart={cart} hasBowl={hasBowl} canCheckout={canCobrar} step={step}
                    confirmEnabled={isStable && weight > 0.05}
                    onConfirmWeight={handleConfirmWeight}
                    onCheckout={() => setShowPayment(true)} onClear={clearCart}
                    onDecrementExtra={decrementExtra} onAddExtra={addExtra} onRemoveExtra={removeExtra}
                    onReprint={lastComanda ? () => printComanda(lastComanda) : undefined}
                />
            </div>

            {/* ═══════════════════════════════════
                MODAL DE PAGO
            ═══════════════════════════════════ */}
            <Dialog open={showPayment} onClose={() => { if (!processing) setShowPayment(false); }} labelledBy="acai-payment-title">
                    <div className="flex max-h-[min(90dvh,800px)] flex-col overflow-hidden bg-surface">
                        <div className="bg-brand px-6 py-5 text-white">
                            <h2 id="acai-payment-title" className="text-xl font-semibold">Procesar pago</h2>
                            <p className="text-white/80 mt-1">
                                Total: <span className="font-black text-2xl">Bs. {cart.total.toFixed(2)}</span>
                            </p>
                        </div>

                        <div className="space-y-4 overflow-y-auto p-6">
                            <div>
                                <p className="mb-2 text-sm font-semibold text-ink">Método de pago</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {([
                                        { method: 'CASH'     as const, label: 'Efectivo',       icon: Banknote       },
                                        { method: 'CARD'     as const, label: 'Tarjeta',         icon: CreditCard     },
                                        { method: 'TRANSFER' as const, label: 'QR',              icon: ArrowRightLeft  },
                                        { method: 'MIXED'    as const, label: 'Mixto',           icon: ShoppingCart   },
                                    ]).map(({ method, label, icon: Icon }) => (
                                        <button key={method} onClick={() => handleMethodChange(method)} aria-pressed={selectedPayment === method}
                                            className={`flex min-h-12 items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${selectedPayment === method
                                                ? 'border-brand bg-brand text-white'
                                                : 'border-line bg-surface text-ink hover:bg-canvas'}`}>
                                            <Icon className="h-4 w-4" />{label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {(selectedPayment === 'CASH' || selectedPayment === 'MIXED') && (
                                <div className="space-y-2 rounded-xl bg-canvas p-4">
                                    <label htmlFor="acai-payment-cash" className="block text-sm font-semibold text-ink">Efectivo</label>
                                    <input id="acai-payment-cash" type="number" step="0.01" value={cashGiven === '0' ? '' : cashGiven}
                                        onChange={e => setCashGiven(e.target.value)}
                                        placeholder={cart.total.toFixed(2)}
                                        className="min-h-12 w-full rounded-lg border border-line bg-surface px-4 text-xl font-semibold tabular-nums text-ink" />
                                </div>
                            )}

                            {(selectedPayment === 'CARD' || selectedPayment === 'MIXED') && (
                                <div className="space-y-2 rounded-xl bg-canvas p-4">
                                    <label htmlFor="acai-payment-card" className="block text-sm font-semibold text-ink">Tarjeta</label>
                                    <input id="acai-payment-card" type="number" step="0.01" value={cardGiven === '0' ? '' : cardGiven}
                                        onChange={e => setCardGiven(e.target.value)}
                                        placeholder=""
                                        className="min-h-12 w-full rounded-lg border border-line bg-surface px-4 text-xl font-semibold tabular-nums text-ink" />
                                </div>
                            )}

                            {(selectedPayment === 'TRANSFER' || selectedPayment === 'MIXED') && (
                                <div className="space-y-2 rounded-xl bg-canvas p-4">
                                    <label htmlFor="acai-payment-transfer" className="block text-sm font-semibold text-ink">QR</label>
                                    <input id="acai-payment-transfer" type="number" step="0.01" value={transferGiven === '0' ? '' : transferGiven}
                                        onChange={e => setTransferGiven(e.target.value)}
                                        placeholder=""
                                        className="min-h-12 w-full rounded-lg border border-line bg-surface px-4 text-xl font-semibold tabular-nums text-ink" />
                                </div>
                            )}

                            {(selectedPayment === 'CASH' || selectedPayment === 'MIXED') && change > 0 && (
                                <div className="flex justify-between items-center px-2 py-1">
                                    <span className="text-sm text-muted">Vuelto</span>
                                    <span className="font-display text-2xl font-semibold tabular-nums text-success">Bs. {change.toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 border-t border-line-subtle px-6 py-4">
                            <button onClick={() => setShowPayment(false)}
                                className="min-h-12 flex-1 rounded-lg border border-line bg-surface px-3 font-semibold text-ink hover:bg-canvas">
                                Cancelar
                            </button>
                            <button onClick={handleProcessSale} disabled={processing || paid < cart.total}
                                className="min-h-12 flex-[2] rounded-lg bg-brand px-3 text-lg font-semibold text-white hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50">
                                {processing
                                    ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Procesando…</span>
                                    : paid < cart.total ? 'Monto insuficiente' : 'Confirmar pago'}
                            </button>
                        </div>
                    </div>
            </Dialog>
        </div>
        </CashGate>
    );
}
