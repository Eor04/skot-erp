'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

    return <main data-brand="admin" className="skot-experience flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
            <header className="mb-7 text-center">
                <Image src="/logo-skot.png" alt="Skot" width={200} height={78} priority className="mx-auto h-auto w-36 object-contain" />
                <p className="mt-4 text-sm font-semibold tracking-wide text-muted">Sistema de gestión multisucursal</p>
            </header>
            <section aria-labelledby="login-title" className="rounded-xl border border-line-subtle bg-surface p-6 shadow-sm sm:p-8">
                <div className="mb-6 border-b border-line-subtle pb-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand">Acceso a Skot ERP</p>
                    <h1 id="login-title" className="font-display text-2xl font-semibold">Bienvenido</h1>
                    <p className="mt-2 text-sm text-muted">Ingresá con tu cuenta para continuar.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div><label htmlFor="login-email" className="mb-1 block text-sm font-semibold">Correo electrónico</label>
                        <input id="login-email" type="email" required autoComplete="email" placeholder="tu@skot.com" value={email} onChange={event => setEmail(event.target.value)} className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-ink placeholder:text-muted" /></div>
                    <div><label htmlFor="login-password" className="mb-1 block text-sm font-semibold">Contraseña</label>
                        <div className="relative"><input id="login-password" type={showPass ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 pr-14 text-ink" />
                            <button type="button" aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPass} onClick={() => setShowPass(value => !value)} className="absolute right-1 top-1 grid h-10 w-11 place-items-center rounded-lg text-muted hover:bg-canvas">{showPass ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}</button>
                        </div></div>
                    {error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-[var(--status-error-bg)] p-3 text-sm font-semibold text-danger"><AlertCircle size={18} className="shrink-0" aria-hidden="true" />{error}</p>}
                    <Button type="submit" size="touch" disabled={loading} className="w-full">{loading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}{loading ? 'Ingresando…' : 'Ingresar'}</Button>
                </form>
            </section>
            <p className="mt-6 text-center text-xs text-muted">Skot ERP · Acceso restringido</p>
        </div>
    </main>;
}
