'use client';

/**
 * CashGate — Componente de bloqueo del POS
 *
 * Muestra una pantalla de apertura de caja cuando no hay sesión activa.
 * Soporta dos temas: 'burger' (negro/amarillo/rojo) y 'acai' (púrpura).
 * Una vez abierta la caja, renderiza children normalmente.
 */

import { useState } from 'react';
import { Lock, Unlock, DollarSign, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useCashSession } from '@/hooks/use-cash-session';

interface CashGateProps {
    branchId: string;
    userId:   string;
    theme?:   'burger' | 'acai';
    children: React.ReactNode;
}

export default function CashGate({ branchId, userId, theme = 'burger', children }: CashGateProps) {
    const { status, session, opening, error, openCash } = useCashSession(branchId, userId);
    const [amount, setAmount] = useState('');
    const [success, setSuccess] = useState(false);

    const handleOpen = async () => {
        const ok = await openCash(parseFloat(amount) || 0);
        if (ok) setSuccess(true);
    };

    // ── Cargando ─────────────────────────────────────────────────────────────
    if (status === 'loading') {
        return (
            <div className={`flex h-screen items-center justify-center ${theme === 'burger' ? 'bg-black' : 'bg-gradient-to-br from-purple-950 to-indigo-900'}`}>
                <div className="text-center">
                    <Loader2 className={`h-12 w-12 mx-auto animate-spin mb-4 ${theme === 'burger' ? 'text-yellow-400' : 'text-purple-300'}`} />
                    <p className="text-white/60 font-medium">Verificando estado de caja…</p>
                </div>
            </div>
        );
    }

    // ── Caja cerrada → pantalla de apertura ──────────────────────────────────
    if (status === 'closed' || status === 'error') {
        const isBurger = theme === 'burger';
        return (
            <div className={`flex h-screen items-center justify-center relative overflow-hidden
                ${isBurger
                    ? 'bg-black'
                    : 'bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-900'}`}
            >
                {/* Fondo decorativo */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
                    <Lock className="w-[60vmin] h-[60vmin] text-white" />
                </div>

                <div className={`relative z-10 w-full max-w-md mx-4 rounded-3xl shadow-2xl overflow-hidden border
                    ${isBurger
                        ? 'bg-gray-900 border-white/10'
                        : 'bg-white/10 backdrop-blur-sm border-white/20'}`}
                >
                    {/* Header */}
                    <div className={`px-8 py-7 text-center ${isBurger ? 'bg-black border-b border-white/10' : 'bg-white/10 border-b border-white/15'}`}>
                        {/* Logo / ícono */}
                        <div className="flex justify-center mb-4">
                            {isBurger ? (
                                <img src="/logo-burger.png" alt="Skot Burger"
                                    className="h-16 object-contain"
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                                <div className="bg-purple-500/30 rounded-full p-4">
                                    <Lock className="h-10 w-10 text-purple-200" />
                                </div>
                            )}
                        </div>
                        <h1 className={`text-2xl font-black mb-1 ${isBurger ? 'text-white' : 'text-white'}`}>
                            POS Bloqueado
                        </h1>
                        <p className={`text-sm ${isBurger ? 'text-white/50' : 'text-white/60'}`}>
                            Debés abrir la caja antes de realizar ventas
                        </p>
                        {status === 'error' && (
                            <p className="mt-2 text-xs text-red-400 flex items-center justify-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5" />
                                Error de conexión al verificar caja
                            </p>
                        )}
                    </div>

                    {/* Formulario */}
                    <div className="px-8 py-8 space-y-5">
                        <div>
                            <label className={`block text-sm font-semibold mb-2 ${isBurger ? 'text-white/70' : 'text-white/80'}`}>
                                💰 Monto de apertura (Bs.)
                            </label>
                            <div className="relative">
                                <DollarSign className={`absolute left-4 top-3 h-5 w-5 ${isBurger ? 'text-yellow-400' : 'text-purple-300'}`} />
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder=""
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleOpen()}
                                    className={`w-full pl-11 pr-4 py-3 rounded-2xl text-xl font-bold outline-none transition
                                        ${isBurger
                                            ? 'bg-white/5 border border-white/15 text-white placeholder:text-white/20 focus:border-yellow-400 focus:bg-white/10'
                                            : 'bg-white/10 border border-white/20 text-white placeholder:text-white/30 focus:border-purple-400 focus:bg-white/15'}`}
                                />
                            </div>
                            <p className={`text-xs mt-1.5 ${isBurger ? 'text-white/30' : 'text-white/40'}`}>
                                Dejá en 0 si la caja comienza vacía
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Botón abrir caja */}
                        <button
                            onClick={handleOpen}
                            disabled={opening}
                            className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition
                                ${isBurger
                                    ? 'bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/20 disabled:bg-white/10 disabled:text-white/30'
                                    : 'bg-purple-500 text-white hover:bg-purple-400 shadow-lg shadow-purple-500/20 disabled:bg-white/10 disabled:text-white/30'}`}
                        >
                            {opening
                                ? <><Loader2 className="h-5 w-5 animate-spin" /> Abriendo caja…</>
                                : <><Unlock className="h-5 w-5" /> Abrir Caja y Comenzar</>
                            }
                        </button>

                        <p className={`text-center text-xs ${isBurger ? 'text-white/25' : 'text-white/30'}`}>
                            Esta acción quedará registrada en el historial de cierres de caja.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ── Caja abierta → renderizar el POS ────────────────────────────────────
    return <>{children}</>;
}
