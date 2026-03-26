'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (data.success) {
                window.location.href = '/';
            } else {
                setError(data.error || 'Error al iniciar sesión');
            }
        } catch {
            setError('Error de conexión. Revisá tu red.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>

            {/* Glows de fondo inspirados en el logo */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Glow morado/rosa — izquierda */}
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.25) 0%, transparent 70%)' }} />
                {/* Glow rojo/naranja — derecha */}
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.2) 0%, transparent 70%)' }} />
                {/* Glow rosa central sutil */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full"
                    style={{ background: 'radial-gradient(ellipse, rgba(236,72,153,0.08) 0%, transparent 70%)' }} />
                {/* Líneas de hexágono sutiles — patrón del logo */}
                <div className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")`,
                        backgroundSize: '56px 100px',
                    }} />
            </div>

            <div className="relative w-full max-w-sm z-10">

                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-block mb-4 drop-shadow-[0_0_30px_rgba(236,72,153,0.5)]">
                        <img
                            src="/logo-skot.png"
                            alt="Skot"
                            className="h-20 w-auto mx-auto object-contain"
                            onError={(e) => {
                                // Fallback si no existe la imagen
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <p className="text-sm font-medium mt-2"
                        style={{ color: 'rgba(255,255,255,0.55)' }}>
                        Sistema de Gestión Multi-Sucursal
                    </p>
                </div>

                {/* Card glassmorphism */}
                <div className="rounded-3xl p-8 shadow-2xl"
                    style={{
                        background: 'rgba(255,255,255,0.04)',
                        backdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 0 0 1px rgba(192,38,211,0.1), 0 24px 48px rgba(0,0,0,0.5)',
                    }}>

                    {/* Header del form */}
                    <h2 className="text-white text-xl font-bold mb-1">Bienvenido</h2>
                    <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Ingresá con tu cuenta de Skot
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                Correo electrónico
                            </label>
                            <input
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="tu@skot.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full rounded-xl px-4 py-3 text-sm transition-all outline-none"
                                style={{
                                    background: 'rgba(255,255,255,0.07)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    color: '#ffffff',
                                    caretColor: '#e879f9',
                                }}
                                onFocus={e => {
                                    e.target.style.border = '1px solid rgba(192,38,211,0.6)';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(192,38,211,0.15)';
                                }}
                                onBlur={e => {
                                    e.target.style.border = '1px solid rgba(255,255,255,0.12)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        {/* Contraseña */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full rounded-xl px-4 py-3 pr-12 text-sm transition-all outline-none"
                                    style={{
                                        background: 'rgba(255,255,255,0.07)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        color: '#ffffff',
                                        caretColor: '#e879f9',
                                    }}
                                    onFocus={e => {
                                        e.target.style.border = '1px solid rgba(192,38,211,0.6)';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(192,38,211,0.15)';
                                    }}
                                    onBlur={e => {
                                        e.target.style.border = '1px solid rgba(255,255,255,0.12)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                                    style={{ color: 'rgba(255,255,255,0.35)' }}>
                                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 rounded-xl px-4 py-3"
                                style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)' }}>
                                <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#f87171' }} />
                                <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
                            </div>
                        )}

                        {/* Botón */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all duration-200 mt-2 disabled:opacity-50"
                            style={{
                                background: loading
                                    ? 'rgba(100,100,120,0.5)'
                                    : 'linear-gradient(135deg, #9333ea 0%, #c026d3 50%, #db2777 100%)',
                                color: '#ffffff',
                                boxShadow: loading ? 'none' : '0 0 20px rgba(192,38,211,0.35), 0 4px 15px rgba(0,0,0,0.3)',
                            }}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Ingresando...
                                </>
                            ) : (
                                <>
                                    <LogIn className="h-4 w-4" />
                                    Ingresar
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    Skot v1.0 — Acceso restringido
                </p>
            </div>
        </div>
    );
}
