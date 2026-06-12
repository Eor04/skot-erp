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
    Wifi, WifiOff, Usb, Settings2, X,
} from 'lucide-react';
import CashGate from '@/components/pos/cash-gate';

type Step = 'sabor' | 'balanza' | 'extras';
type PaymentMethodType = 'CASH' | 'CARD' | 'TRANSFER' | 'MIXED';

interface ApiProduct {
    id: string;
    name: string;
    type: string;
    description?: string;
    customPrice: number;
    pricePerKg: number;
}

const STEPS: { key: Step; emoji: string; label: string }[] = [
    { key: 'sabor',    emoji: '🍨', label: 'Sabor'    },
    { key: 'balanza',  emoji: '⚖️', label: 'Balanza'  },
    { key: 'extras',   emoji: '🥤', label: 'Extras'   },
];

// Emoji automático para toppings
function toppingEmoji(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('granola'))                      return '🥣';
    if (n.includes('banana') || n.includes('plát')) return '🍌';
    if (n.includes('fresa') || n.includes('frut'))  return '🍓';
    if (n.includes('miel'))                         return '🍯';
    if (n.includes('leche') || n.includes('cond'))  return '🥛';
    if (n.includes('gomi') || n.includes('candy'))  return '🍬';
    if (n.includes('cereal'))                       return '🌾';
    if (n.includes('coco'))                         return '🥥';
    if (n.includes('chocolate') || n.includes('choco')) return '🍫';
    return '✨';
}

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

    const [scaleIp,      setScaleIp]      = useState(() => localStorage.getItem('skot_scale_ip') || '192.168.1.100');
    const [showNetCfg,   setShowNetCfg]   = useState(false);
    const [scaleIpInput, setScaleIpInput] = useState(scaleIp);

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

    // Cargar productos
    useEffect(() => {
        if (!branchId) return;
        setIsLoading(true);
        fetch(`/api/pos/products?branchId=${branchId}&type=ACAI`)
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    setFlavors(d.data.filter((p: ApiProduct) => p.type === 'ACAI_BASE'));
                    setBeverages(d.data.filter((p: ApiProduct) => p.type === 'BEVERAGE'));
                }
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [branchId]);

    // Auto-dismiss notificaciones
    useEffect(() => {
        if (!notification) return;
        const t = setTimeout(() => setNotification(null), 4000);
        return () => clearTimeout(t);
    }, [notification]);

    const notify = useCallback((type: 'success' | 'error', msg: string) => {
        setNotification({ type, msg });
    }, []);

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

            const res = await fetch('/api/pos/sale', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branchId, userId,
                    paymentMethod: selectedPayment,
                    cashAmount: selectedPayment === 'CASH' || selectedPayment === 'MIXED' ? actualCash || (selectedPayment === 'CASH' ? cart.total : 0) : undefined,
                    cardAmount: selectedPayment === 'CARD' || selectedPayment === 'MIXED' ? cardVal || (selectedPayment === 'CARD' ? cart.total : 0) : undefined,
                    transferAmount: selectedPayment === 'TRANSFER' || selectedPayment === 'MIXED' ? transferVal || (selectedPayment === 'TRANSFER' ? cart.total : 0) : undefined,
                    items,
                }),
            });
            const data = await res.json();
            if (data.success) {
                clearCart();
                setShowPayment(false);
                setStep('sabor');
                setCashGiven('');
                setCardGiven('');
                setTransferGiven('');
                notify('success', `✅ Venta ${data.data.saleNumber} — Bs. ${data.data.totalAmount.toFixed(2)}`);
            } else {
                notify('error', data.error || 'Error al registrar la venta');
            }
        } catch {
            notify('error', 'Error de conexión');
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
        <div className="flex h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-900 relative overflow-hidden">

            {/* Decoración de fondo */}
            <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl" />

            {/* Toast */}
            {notification && (
                <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 rounded-2xl shadow-2xl text-white font-semibold text-sm backdrop-blur-sm border ${notification.type === 'success' ? 'bg-green-600/90 border-green-400/30' : 'bg-red-600/90 border-red-400/30'}`}>
                    {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    {notification.msg}
                </div>
            )}

            {/* ═══════════════════════════════════
                PANEL IZQUIERDO – Pasos
            ═══════════════════════════════════ */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-purple-300 hover:text-white transition">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <img src="/logo-acai.png" alt="Açaí"
                            className="h-8 w-auto object-contain"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <div>
                            <h1 className="text-white font-bold text-lg leading-tight">POS Açaí</h1>
                            {user?.name && <p className="text-purple-300 text-xs">{user.name}</p>}
                        </div>
                    </div>

                    {/* ── Balanza: botones duales USB / Red ── */}
                    <div className="flex items-center gap-2 relative">

                        {/* Estado cuando está conectado */}
                        {scaleStatus === 'connected' || scaleStatus === 'reading' ? (
                            <div className="flex items-center gap-2">
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border ${
                                    scaleMode === 'network'
                                        ? 'bg-blue-500/20 border-blue-400/40 text-blue-300'
                                        : 'bg-green-500/20 border-green-400/40 text-green-300'
                                }`}>
                                    {scaleMode === 'network' ? <Wifi className="h-4 w-4" /> : <Scale className="h-4 w-4" />}
                                    <span>{weight.toFixed(3)} kg{isStable ? ' ✓' : ' …'}</span>
                                    {isMockMode && <span className="text-xs opacity-60">(demo)</span>}
                                </div>
                                <button onClick={() => disconnect()}
                                    className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 text-white/60 hover:text-red-300 transition border border-white/10"
                                    title="Desconectar">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                {/* Botón USB */}
                                <button
                                    onClick={() => connect('serial')}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition border bg-white/10 border-white/20 text-white hover:bg-white/20"
                                    title="Conectar por cable USB (Web Serial)"
                                >
                                    <Usb className="h-3.5 w-3.5" />
                                    USB
                                </button>

                                {/* Botón Red */}
                                <button
                                    onClick={() => connect('network')}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition border bg-blue-500/20 border-blue-400/30 text-blue-200 hover:bg-blue-500/30"
                                    title="Conectar por red Wi-Fi/Ethernet (requiere bridge corriendo)"
                                >
                                    <Wifi className="h-3.5 w-3.5" />
                                    Red
                                </button>

                                {/* Config IP */}
                                <button
                                    onClick={() => { setScaleIpInput(scaleIp); setShowNetCfg(v => !v); }}
                                    className="p-2 rounded-xl bg-white/5 border border-white/15 text-white/50 hover:text-white hover:bg-white/10 transition"
                                    title="Configurar IP de la balanza"
                                >
                                    <Settings2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}

                        {/* Panel config IP */}
                        {showNetCfg && (
                            <div className="absolute top-full right-0 mt-2 z-50 bg-gray-900 border border-white/15 rounded-2xl shadow-2xl p-4 w-72">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-white text-sm font-bold">⚙️ Config. Bridge TCP/IP</p>
                                    <button onClick={() => setShowNetCfg(false)} className="text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
                                </div>
                                <p className="text-white/50 text-xs mb-3">El bridge (<code className="text-purple-300">bridge.js</code>) escucha en <code className="text-blue-300">localhost:8765</code> y se conecta a la balanza.</p>
                                <label className="block text-white/60 text-xs mb-1">IP de la balanza Toledo:</label>
                                <input
                                    value={scaleIpInput}
                                    onChange={e => setScaleIpInput(e.target.value)}
                                    placeholder="192.168.1.100"
                                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm font-mono mb-3 outline-none focus:border-purple-400"
                                />
                                <p className="text-white/40 text-xs mb-3">Editá también <code className="text-yellow-300">SCALE_IP</code> en <code className="text-green-300">scale-bridge/bridge.js</code></p>
                                <button
                                    onClick={() => {
                                        setScaleIp(scaleIpInput);
                                        localStorage.setItem('skot_scale_ip', scaleIpInput);
                                        setShowNetCfg(false);
                                    }}
                                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition"
                                >
                                    Guardar
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs / pasos */}
                <div className="flex gap-1 px-6 py-3 border-b border-white/10">
                    {STEPS.map((s, i) => {
                        const isActive = s.key === step;
                        const isDone   = i < stepIndex;
                        return (
                            <button key={s.key} onClick={() => setStep(s.key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition flex-1 justify-center ${isActive
                                    ? 'bg-white text-purple-900 shadow-lg'
                                    : isDone
                                        ? 'bg-purple-500/30 text-purple-200 hover:bg-purple-500/40'
                                        : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                            >
                                {isDone ? <Check className="h-3.5 w-3.5 text-green-400" /> : <span>{s.emoji}</span>}
                                {s.label}
                            </button>
                        );
                    })}
                </div>

                {/* Contenido del paso */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* ── PASO 1: SABOR ──────────────────────────────── */}
                    {step === 'sabor' && (
                        <div>
                            {/* Toggle normal / mixto */}
                            <div className="flex items-center gap-3 mb-5">
                                <button
                                    onClick={() => setMixtoMode(false)}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition ${!cart.isMixto
                                        ? 'bg-white text-purple-900 border-white'
                                        : 'bg-white/5 text-white/60 border-white/15 hover:border-white/30'}`}
                                >
                                    🍨 Un sabor
                                </button>
                                <button
                                    onClick={() => setMixtoMode(true)}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition ${cart.isMixto
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-lg'
                                        : 'bg-white/5 text-white/60 border-white/15 hover:border-white/30'}`}
                                >
                                    🍨🍓 Mixto (varios sabores)
                                </button>
                            </div>

                            {cart.isMixto && (
                                <p className="text-purple-200/70 text-xs mb-4">
                                    Seleccioná todos los sabores que lleva el bowl. El precio/kg será el promedio de los sabores elegidos.
                                </p>
                            )}

                            {flavors.length === 0 ? (
                                <div className="text-center py-16 text-white/40">No hay sabores configurados para esta sucursal.</div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {flavors.map(p => {
                                        const isSelected = cart.isMixto
                                            ? cart.flavors.some(f => f.product.id === p.id)
                                            : cart.flavors[0]?.product.id === p.id;
                                        const isOut = p.currentStock <= 0;

                                        return (
                                            <button
                                                key={p.id}
                                                disabled={isOut}
                                                onClick={() => {
                                                    if (cart.isMixto) {
                                                        toggleFlavor({ id: p.id, name: p.name, type: p.type }, p.pricePerKg);
                                                    } else {
                                                        setFlavor({ id: p.id, name: p.name, type: p.type }, p.pricePerKg);
                                                        setStep('balanza');
                                                    }
                                                }}
                                                className={`relative rounded-2xl p-5 text-left transition-all border-2 overflow-hidden ${isOut ? 'opacity-60 grayscale cursor-not-allowed bg-black/20 border-white/5' : 'hover:scale-[1.03]'} ${isSelected
                                                    ? 'bg-white border-white text-purple-900 shadow-xl shadow-white/20'
                                                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40'}`}
                                            >
                                                {isOut && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-10">
                                                        <span className="text-red-400 font-black bg-black/80 px-3 py-1 rounded-full text-sm tracking-wider animate-pulse border border-red-500/50 shadow-lg shadow-red-900/50">AGOTADO</span>
                                                    </div>
                                                )}
                                                {isSelected && (
                                                    <div className="absolute top-3 right-3 bg-purple-600 rounded-full p-0.5">
                                                        <Check className="h-3 w-3 text-white" />
                                                    </div>
                                                )}
                                                <div className="text-4xl mb-3">🍨</div>
                                                <h3 className="font-bold text-base leading-tight">{p.name}</h3>
                                                {p.description && (
                                                    <p className={`text-xs mt-1 ${isSelected ? 'text-purple-600' : 'text-white/50'}`}>{p.description}</p>
                                                )}
                                                <p className={`font-bold text-lg mt-2 ${isSelected ? 'text-purple-700' : 'text-purple-300'}`}>
                                                    Bs. {p.pricePerKg.toFixed(2)}/kg
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* En mixto: preview del precio promedio + botón continuar */}
                            {cart.isMixto && cart.flavors.length > 0 && (
                                <div className="mt-6 bg-white/10 border border-white/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-white/60 text-xs mb-1">Sabores seleccionados</p>
                                        <p className="text-white font-semibold text-sm">
                                            {cart.flavors.map(f => f.product.name).join(' + ')}
                                        </p>
                                        <p className="text-purple-300 text-xs mt-0.5">
                                            Precio promedio: Bs. {cart.effectivePricePerKg.toFixed(2)}/kg
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setStep('balanza')}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-400 text-white rounded-xl font-semibold transition flex-shrink-0"
                                    >
                                        Continuar <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            {/* Acceso rápido a extras (venta sin bowl) */}
                            <div className="mt-4">
                                <button
                                    onClick={() => setStep('extras')}
                                    className="w-full py-3 rounded-xl border border-dashed border-white/25 text-white/50 hover:text-white hover:border-white/50 text-sm transition"
                                >
                                    🥤 Solo quiero vender bebidas / extras (sin bowl)
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── PASO 3: BALANZA ────────────────────────────── */}
                    {step === 'balanza' && (
                        <div className="flex flex-col items-center max-w-md mx-auto">
                            <p className="text-purple-200 text-sm mb-8 text-center">
                                Colocá el bowl completo (helado + toppings) en la balanza.<br/>
                                El peso aparece automáticamente.
                            </p>

                            {scaleStatus !== 'connected' ? (
                                <div className="w-full bg-white/5 border-2 border-dashed border-white/20 rounded-3xl p-10 text-center">
                                    <Scale className="h-16 w-16 mx-auto mb-4 text-white/30" />
                                    <p className="text-white/60 mb-6">Conectá la balanza Prix 4</p>
                                    <div className="flex items-center justify-center gap-3">
                                        <button onClick={() => connect('serial')}
                                            className="flex items-center gap-2 px-5 py-3 bg-purple-500 hover:bg-purple-400 text-white rounded-xl font-semibold transition">
                                            <Usb className="h-4 w-4" /> USB
                                        </button>
                                        <button onClick={() => connect('network')}
                                            className="flex items-center gap-2 px-5 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-semibold transition">
                                            <Wifi className="h-4 w-4" /> Red (TCP/IP)
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full space-y-4">
                                    {/* Display grande del peso */}
                                    <div className={`rounded-3xl p-8 text-center border-2 transition-all ${isStable && weight > 0.05
                                        ? 'bg-green-500/20 border-green-400/60 shadow-lg shadow-green-500/10'
                                        : 'bg-white/10 border-white/20'}`}>
                                        <p className="text-white/60 text-sm mb-2">Peso del bowl</p>
                                        <p className={`text-8xl font-black tracking-tight tabular-nums transition-colors ${isStable && weight > 0.05 ? 'text-green-300' : 'text-white'}`}>
                                            {weight.toFixed(3)}
                                        </p>
                                        <p className="text-white/40 text-xl mt-1">kg</p>
                                        <div className={`mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium ${isStable && weight > 0.05
                                            ? 'bg-green-500/30 text-green-200'
                                            : 'bg-yellow-500/20 text-yellow-300'}`}>
                                            {isStable && weight > 0.05
                                                ? <><Check className="h-4 w-4" /> Peso estable — listo</>
                                                : <><Loader2 className="h-4 w-4 animate-spin" /> Estabilizando…</>}
                                        </div>
                                    </div>

                                    {/* Preview precio */}
                                    {cart.flavors.length > 0 && weight > 0.05 && (
                                        <div className="bg-white/10 rounded-2xl p-4 text-center border border-white/20">
                                            <p className="text-white/50 text-xs">Vista previa del precio</p>
                                            <p className="text-white/70 text-sm mt-0.5">
                                                {weight.toFixed(3)} kg × Bs. {cart.effectivePricePerKg.toFixed(2)}/kg
                                                {cart.isMixto && <span className="text-purple-300 ml-1">(promedio mixto)</span>}
                                            </p>
                                            <p className="text-white font-black text-3xl mt-1">
                                                Bs. {(weight * cart.effectivePricePerKg).toFixed(2)}
                                            </p>
                                        </div>
                                    )}

                                    {/* Botones */}
                                    <div className="flex gap-3">
                                        {cart.weightConfirmed && (
                                            <button onClick={resetWeight}
                                                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium transition text-sm">
                                                <RotateCcw className="h-4 w-4" /> Volver a pesar
                                            </button>
                                        )}
                                        <button
                                            onClick={handleConfirmWeight}
                                            disabled={!isStable || weight <= 0.05}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed text-white font-bold text-lg transition shadow-lg shadow-green-500/20"
                                        >
                                            <Check className="h-5 w-5" />
                                            {cart.weightConfirmed ? 'Confirmar nuevo peso' : 'Confirmar peso'}
                                        </button>
                                    </div>

                                    {cart.weightConfirmed && (
                                        <div className="bg-green-500/20 border border-green-400/40 rounded-xl px-4 py-3 flex items-center gap-2 text-green-200 text-sm">
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
                                <p className="text-purple-200 text-sm">Agregá bebidas u otros extras.</p>
                                {!hasBowl && (
                                    <span className="text-xs bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                                        Venta directa sin bowl
                                    </span>
                                )}
                            </div>
                            <p className="text-white/40 text-xs mb-5">Podés vender extras solos, sin necesidad de un bowl.</p>

                            {beverages.length === 0 ? (
                                <div className="text-center py-12 text-white/40">No hay extras configurados.</div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {beverages.map(p => {
                                        const inCart = cart.extras.find(e => e.product.id === p.id);
                                        const isOut = p.currentStock <= 0;
                                        return (
                                            <button
                                                key={p.id}
                                                disabled={isOut}
                                                onClick={() => addExtra({ id: p.id, name: p.name, type: p.type, price: p.customPrice })}
                                                className={`relative rounded-2xl p-4 text-left transition-all border-2 overflow-hidden ${isOut ? 'opacity-60 grayscale cursor-not-allowed bg-black/20 border-white/5' : 'hover:scale-[1.03]'} ${inCart
                                                    ? 'bg-indigo-500/30 border-indigo-400 text-white'
                                                    : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10 hover:border-white/30'}`}
                                            >
                                                {isOut && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-10">
                                                        <span className="text-red-400 font-black bg-black/80 px-2 py-1 rounded-full text-xs tracking-wider animate-pulse border border-red-500/50 shadow-lg shadow-red-900/50">AGOTADO</span>
                                                    </div>
                                                )}
                                                {inCart && (
                                                    <div className="absolute top-2.5 right-2.5 bg-indigo-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 font-bold">
                                                        {inCart.quantity}
                                                    </div>
                                                )}
                                                <div className="text-3xl mb-2">🥤</div>
                                                <h3 className="font-semibold text-sm">{p.name}</h3>
                                                <p className="text-indigo-300 font-bold text-base mt-1">Bs. {p.customPrice.toFixed(2)}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer navegación */}
                <div className="px-6 pb-6 pt-3 border-t border-white/10 flex items-center gap-3">
                    {stepIndex > 0 && (
                        <button onClick={() => setStep(STEPS[stepIndex - 1].key)}
                            className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium transition">
                            ← Atrás
                        </button>
                    )}

                    {/* Botón avanzar (no en el último paso) */}
                    {stepIndex < STEPS.length - 1 && (
                        <button
                            onClick={() => setStep(STEPS[stepIndex + 1].key)}
                            className="ml-auto flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500/80 hover:bg-purple-500 text-white font-semibold transition"
                        >
                            {STEPS[stepIndex + 1].label} <ChevronRight className="h-4 w-4" />
                        </button>
                    )}

                    {/* Botón cobrar — siempre visible si hay total */}
                    {canCobrar && (
                        <button
                            onClick={() => setShowPayment(true)}
                            className="ml-auto flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold text-lg transition shadow-xl shadow-purple-500/30"
                        >
                            <ShoppingCart className="h-5 w-5" />
                            Cobrar — Bs. {cart.total.toFixed(2)}
                        </button>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════
                PANEL DERECHO – Resumen
            ═══════════════════════════════════ */}
            <div className="w-80 bg-black/30 backdrop-blur-sm border-l border-white/10 flex flex-col">
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-white font-bold flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-purple-300" />
                        Orden actual
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">

                    {/* Sabores */}
                    {cart.flavors.length > 0 ? (
                        <div className="bg-purple-500/20 border border-purple-400/30 rounded-xl p-3">
                            <p className="text-xs text-purple-300 mb-1">{cart.isMixto ? '🍨🍓 Sabor Mixto' : '🍨 Sabor'}</p>
                            <div className="space-y-0.5">
                                {cart.flavors.map(f => (
                                    <p key={f.product.id} className="text-white font-semibold text-sm">{f.product.name}</p>
                                ))}
                            </div>
                            {cart.isMixto && cart.flavors.length > 1 && (
                                <p className="text-purple-300 text-xs mt-1">Promedio: Bs. {cart.effectivePricePerKg.toFixed(2)}/kg</p>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white/5 border border-dashed border-white/15 rounded-xl p-3 text-center">
                            <p className="text-white/30 text-xs">Sin bowl — solo extras</p>
                        </div>
                    )}

                    {/* Peso */}
                    {hasBowl && (
                        cart.weightConfirmed ? (
                            <div className="bg-green-500/15 border border-green-400/30 rounded-xl p-3">
                                <p className="text-xs text-green-300 mb-0.5">⚖️ Bowl pesado</p>
                                <p className="text-white font-semibold">{cart.totalWeight.toFixed(3)} kg</p>
                                <p className="text-green-300 font-bold text-lg">Bs. {cart.bowlSubtotal.toFixed(2)}</p>
                            </div>
                        ) : (
                            <div className="bg-white/5 border border-dashed border-white/15 rounded-xl p-3 text-center">
                                <p className="text-white/30 text-xs">⚖️ Pendiente de pesaje</p>
                            </div>
                        )
                    )}

                    {/* Extras */}
                    {cart.extras.map(e => (
                        <div key={e.id} className="bg-indigo-500/15 border border-indigo-400/20 rounded-xl p-3 flex items-center justify-between">
                            <div>
                                <p className="text-white text-sm font-medium">🥤 {e.product.name}</p>
                                <p className="text-indigo-300 text-xs">×{e.quantity} — Bs. {e.unitPrice.toFixed(2)} c/u</p>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <button onClick={() => decrementExtra(e.id)} className="text-white/40 hover:text-white p-1 transition">
                                    <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="text-white font-bold text-sm w-5 text-center">{e.quantity}</span>
                                <button onClick={() => addExtra(e.product, 1)} className="text-white/40 hover:text-white p-1 transition">
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => removeExtra(e.id)} className="text-red-400 hover:text-red-300 p-1 ml-1 transition">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {cart.flavors.length === 0 && cart.extras.length === 0 && (
                        <div className="text-center py-10 text-white/20">
                            <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Seleccioná un sabor o agregá extras</p>
                        </div>
                    )}
                </div>

                {/* Total y acciones */}
                <div className="p-4 border-t border-white/10 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-white/60 font-medium">Total</span>
                        <span className="text-3xl font-black text-white">Bs. {cart.total.toFixed(2)}</span>
                    </div>
                    {canCobrar && (
                        <button onClick={() => setShowPayment(true)}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold transition shadow-lg">
                            Cobrar
                        </button>
                    )}
                    <button onClick={clearCart} disabled={cart.total <= 0}
                        className="w-full py-2.5 rounded-xl border border-white/20 text-white/60 hover:text-white hover:border-white/40 disabled:opacity-30 text-sm transition">
                        Limpiar orden
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════
                MODAL DE PAGO
            ═══════════════════════════════════ */}
            {showPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5 text-white">
                            <h2 className="text-xl font-bold">Procesar pago</h2>
                            <p className="text-white/80 mt-1">
                                Total: <span className="font-black text-2xl">Bs. {cart.total.toFixed(2)}</span>
                            </p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-2">Método de pago</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {([
                                        { method: 'CASH'     as const, label: 'Efectivo',       icon: Banknote       },
                                        { method: 'CARD'     as const, label: 'Tarjeta',         icon: CreditCard     },
                                        { method: 'TRANSFER' as const, label: 'QR',              icon: ArrowRightLeft  },
                                        { method: 'MIXED'    as const, label: 'Mixto',           icon: ShoppingCart   },
                                    ]).map(({ method, label, icon: Icon }) => (
                                        <button key={method} onClick={() => handleMethodChange(method)}
                                            className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-medium text-sm transition ${selectedPayment === method
                                                ? 'border-purple-400 bg-purple-500/20 text-white'
                                                : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'}`}>
                                            <Icon className="h-4 w-4" />{label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {(selectedPayment === 'CASH' || selectedPayment === 'MIXED') && (
                                <div className="bg-white/5 rounded-xl p-4 space-y-2">
                                    <label className="block text-sm font-medium text-white/70">💵 Efectivo</label>
                                    <input type="number" step="0.01" value={cashGiven === 0 ? '' : cashGiven}
                                        onChange={e => setCashGiven(e.target.value)}
                                        placeholder={cart.total.toFixed(2)}
                                        className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-white/20" />
                                </div>
                            )}

                            {(selectedPayment === 'CARD' || selectedPayment === 'MIXED') && (
                                <div className="bg-white/5 rounded-xl p-4 space-y-2">
                                    <label className="block text-sm font-medium text-white/70">💳 Tarjeta</label>
                                    <input type="number" step="0.01" value={cardGiven === 0 ? '' : cardGiven}
                                        onChange={e => setCardGiven(e.target.value)}
                                        placeholder=""
                                        className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-white/20" />
                                </div>
                            )}

                            {(selectedPayment === 'TRANSFER' || selectedPayment === 'MIXED') && (
                                <div className="bg-white/5 rounded-xl p-4 space-y-2">
                                    <label className="block text-sm font-medium text-white/70">📲 QR</label>
                                    <input type="number" step="0.01" value={transferGiven === 0 ? '' : transferGiven}
                                        onChange={e => setTransferGiven(e.target.value)}
                                        placeholder=""
                                        className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-white/20" />
                                </div>
                            )}

                            {(selectedPayment === 'CASH' || selectedPayment === 'MIXED') && change > 0 && (
                                <div className="flex justify-between items-center px-2 py-1">
                                    <span className="text-white/60 text-sm">Vuelto</span>
                                    <span className="text-green-400 font-black text-2xl">Bs. {change.toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        <div className="px-6 pb-6 flex gap-3">
                            <button onClick={() => setShowPayment(false)}
                                className="flex-1 py-3 rounded-xl border border-white/20 text-white/60 hover:text-white hover:border-white/40 font-semibold transition">
                                Cancelar
                            </button>
                            <button onClick={handleProcessSale} disabled={processing || paid < cart.total}
                                className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold text-lg transition shadow-lg">
                                {processing
                                    ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Procesando…</span>
                                    : paid < cart.total ? 'Monto insuficiente' : 'Confirmar pago'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </CashGate>
    );
}
