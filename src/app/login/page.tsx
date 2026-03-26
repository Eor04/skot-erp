'use client';

import { useState } from 'react';
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
                // Hard navigation para garantizar que la cookie esté disponible
                // antes de que el SessionProvider re-fetche /api/auth/me
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            {/* Fondo decorativo */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-orange-500 shadow-xl mb-4">
                        <span className="text-3xl">🧃</span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">
                        <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">Skot</span>{' '}
                        <span className="text-white/90">ERP</span>
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Sistema de gestión multi-sucursal</p>
                </div>

                {/* Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <h2 className="text-white text-xl font-bold mb-1">Bienvenido</h2>
                    <p className="text-slate-400 text-sm mb-6">Ingresá con tu cuenta de Skot</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Correo electrónico
                            </label>
                            <input
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="tu@skot.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Contraseña */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
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
                                    className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                                >
                                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3">
                                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-purple-500/25 mt-2"
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
                <p className="text-center text-slate-600 text-xs mt-6">
                    Skot ERP v1.0.0 — Acceso restringido
                </p>
            </div>
        </div>
    );
}
