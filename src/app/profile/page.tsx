'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Lock, ShieldCheck, CheckCircle2, AlertCircle, Eye, EyeOff, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

type ProfileData = {
    id: string; name: string; email: string; role: string;
    active: boolean; createdAt: string;
    branches: { branch: { id: string; name: string; type: string } }[];
};

const ROLE_LABELS: Record<string, string> = { ADMIN: 'Administrador', MANAGER: 'Gerente', CASHIER: 'Cajero', WAREHOUSE: 'Almacén' };

export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'info' | 'password'>('info');

    // Cambio de contraseña
    const [currentPwd, setCurrentPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [savingPwd, setSavingPwd] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 5000);
    }

    useEffect(() => {
        fetch('/api/profile/password')
            .then(r => r.json())
            .then(d => { if (d.success) setProfile(d.data); })
            .finally(() => setLoading(false));
    }, []);

    async function handlePasswordChange(e: React.FormEvent) {
        e.preventDefault();
        if (newPwd !== confirmPwd) { showToast('error', 'Las contraseñas nuevas no coinciden'); return; }
        if (newPwd.length < 6) { showToast('error', 'La contraseña debe tener al menos 6 caracteres'); return; }
        setSavingPwd(true);
        try {
            const res = await fetch('/api/profile/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', 'Contraseña actualizada correctamente');
                setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
            } else {
                showToast('error', data.error || 'Error al cambiar la contraseña');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSavingPwd(false); }
    }

    const fieldClass = 'min-h-12 w-full rounded-lg border border-line bg-surface px-3 pr-14 text-ink placeholder:text-muted';
    return <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
            {toast && <div role={toast.type === 'error' ? 'alert' : 'status'} className={`fixed left-4 right-4 top-4 z-50 flex items-center gap-2 rounded-lg p-4 text-sm font-semibold text-white shadow-lg sm:left-auto ${toast.type === 'success' ? 'bg-success' : 'bg-danger'}`}>
                {toast.type === 'success' ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertCircle size={18} aria-hidden="true" />}{toast.msg}</div>}
            <header className="mb-7"><Link href="/" className="mb-4 inline-flex min-h-11 items-center gap-2 font-semibold text-brand hover:underline"><ArrowLeft size={18} aria-hidden="true" /> Volver al inicio</Link>
                <div className="mb-2 flex items-center gap-2 text-sm text-muted"><User size={16} aria-hidden="true" /> Cuenta <span aria-hidden="true">›</span> Mi perfil</div>
                <h1 className="font-display text-2xl font-semibold sm:text-3xl">Mi perfil</h1><p className="mt-2 text-muted">Tus datos y opciones de acceso.</p></header>
            <div role="group" aria-label="Opciones de perfil" className="mb-5 flex gap-2 border-b border-line-subtle pb-2">
                <button type="button" aria-pressed={tab === 'info'} onClick={() => setTab('info')} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 font-semibold ${tab === 'info' ? 'bg-brand text-white' : 'text-muted hover:bg-surface'}`}><User size={18} aria-hidden="true" /> Información</button>
                <button type="button" aria-pressed={tab === 'password'} onClick={() => setTab('password')} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 font-semibold ${tab === 'password' ? 'bg-brand text-white' : 'text-muted hover:bg-surface'}`}><Lock size={18} aria-hidden="true" /> Contraseña</button>
            </div>
            {tab === 'info' && <div className="space-y-4">{loading || !profile ? <Card role="status" className="p-8 text-center text-muted">Cargando perfil…</Card> : <>
                <Card className="flex flex-wrap items-center gap-4 p-5"><span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[var(--status-neutral-bg)] font-display text-2xl font-semibold text-brand">{profile.name.charAt(0).toUpperCase()}</span>
                    <div className="min-w-0"><h2 className="break-words font-display text-xl font-semibold">{profile.name}</h2><p className="break-all text-sm text-muted">{profile.email}</p><div className="mt-2 flex flex-wrap gap-2"><StatusBadge>{ROLE_LABELS[profile.role] || profile.role}</StatusBadge><StatusBadge tone={profile.active ? 'success' : 'error'}>{profile.active ? 'Activo' : 'Inactivo'}</StatusBadge></div></div>
                </Card>
                <Card className="divide-y divide-line-subtle"><h2 className="px-5 py-4 font-display font-semibold">Datos de la cuenta</h2>
                    <dl className="divide-y divide-line-subtle text-sm"><div className="flex flex-wrap justify-between gap-2 px-5 py-3"><dt className="text-muted">Usuario desde</dt><dd>{new Date(profile.createdAt).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' })}</dd></div>
                        <div className="flex flex-wrap justify-between gap-2 px-5 py-3"><dt className="text-muted">Correo</dt><dd className="break-all">{profile.email}</dd></div>
                        <div className="flex flex-wrap justify-between gap-2 px-5 py-3"><dt className="text-muted">Rol</dt><dd>{ROLE_LABELS[profile.role] || profile.role}</dd></div></dl></Card>
                {profile.branches.length > 0 && <Card className="p-5"><h2 className="mb-3 flex items-center gap-2 font-display font-semibold"><ShieldCheck size={19} className="text-brand" aria-hidden="true" /> Sucursales asignadas</h2>
                    <ul className="space-y-2">{profile.branches.map(assignment => <li key={assignment.branch.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line-subtle p-3"><Store size={19} className="text-brand" aria-hidden="true" /><span className="min-w-0 flex-1 break-words font-semibold">{assignment.branch.name}</span><StatusBadge>{assignment.branch.type}</StatusBadge></li>)}</ul>
                </Card>}
            </>}</div>}
            {tab === 'password' && <Card className="p-5 sm:p-6"><h2 className="font-display text-xl font-semibold">Cambiar contraseña</h2><p className="mt-2 text-sm text-muted">Ingresá tu contraseña actual antes de guardar una nueva.</p>
                <form onSubmit={handlePasswordChange} className="mt-6 space-y-4">
                    <div><label htmlFor="current-password" className="mb-1 block text-sm font-semibold">Contraseña actual</label><div className="relative"><input id="current-password" required type={showCurrent ? 'text' : 'password'} autoComplete="current-password" value={currentPwd} onChange={event => setCurrentPwd(event.target.value)} className={fieldClass} />
                        <button type="button" aria-label={showCurrent ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'} onClick={() => setShowCurrent(value => !value)} className="absolute right-1 top-1 grid h-10 w-11 place-items-center rounded-lg text-muted hover:bg-canvas">{showCurrent ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}</button></div></div>
                    <div><label htmlFor="new-password" className="mb-1 block text-sm font-semibold">Nueva contraseña</label><div className="relative"><input id="new-password" required type={showNew ? 'text' : 'password'} autoComplete="new-password" value={newPwd} onChange={event => setNewPwd(event.target.value)} className={fieldClass} />
                        <button type="button" aria-label={showNew ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'} onClick={() => setShowNew(value => !value)} className="absolute right-1 top-1 grid h-10 w-11 place-items-center rounded-lg text-muted hover:bg-canvas">{showNew ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}</button></div>
                        {newPwd && <p className="mt-2 text-xs text-muted">{newPwd.length < 6 ? 'Muy corta' : newPwd.length < 8 ? 'Débil' : newPwd.length < 10 ? 'Moderada' : 'Fuerte'}</p>}</div>
                    <div><label htmlFor="confirm-password" className="mb-1 block text-sm font-semibold">Confirmar nueva contraseña</label><input id="confirm-password" required type="password" autoComplete="new-password" value={confirmPwd} onChange={event => setConfirmPwd(event.target.value)} aria-invalid={Boolean(confirmPwd && newPwd !== confirmPwd)} aria-describedby={confirmPwd && newPwd !== confirmPwd ? 'password-mismatch' : undefined} className={`min-h-12 w-full rounded-lg border bg-surface px-3 text-ink ${confirmPwd && newPwd !== confirmPwd ? 'border-danger' : 'border-line'}`} />
                        {confirmPwd && newPwd !== confirmPwd && <p id="password-mismatch" className="mt-1 text-sm text-danger">Las contraseñas no coinciden</p>}</div>
                    <Button type="submit" size="touch" disabled={savingPwd || (confirmPwd !== '' && newPwd !== confirmPwd)} className="w-full">{savingPwd ? 'Actualizando…' : 'Cambiar contraseña'}</Button>
                </form>
            </Card>}
        </div>
    </main>;
}
