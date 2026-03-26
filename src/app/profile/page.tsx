'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Lock, ShieldCheck, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useSession } from '@/lib/session-context';

type ProfileData = {
    id: string; name: string; email: string; role: string;
    active: boolean; createdAt: string;
    branches: { branch: { id: string; name: string; type: string } }[];
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    ADMIN: { label: 'Administrador', color: 'bg-purple-100 text-purple-700' },
    MANAGER: { label: 'Gerente', color: 'bg-blue-100 text-blue-700' },
    CASHIER: { label: 'Cajero', color: 'bg-green-100 text-green-700' },
    WAREHOUSE: { label: 'Almacén', color: 'bg-orange-100 text-orange-700' },
};
const TYPE_EMOJI: Record<string, string> = { ACAI: '🥤', HAMBURGUESAS: '🍔', FABRICA: '🏭' };

export default function ProfilePage() {
    const { user } = useSession();
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
                showToast('success', '✅ Contraseña actualizada correctamente');
                setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
            } else {
                showToast('error', data.error || 'Error al cambiar la contraseña');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSavingPwd(false); }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Volver al inicio
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <User className="h-7 w-7 text-blue-600" /> Mi perfil
                    </h1>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    <button onClick={() => setTab('info')}
                        className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${tab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <span className="flex items-center gap-2"><User className="h-4 w-4" /> Información</span>
                    </button>
                    <button onClick={() => setTab('password')}
                        className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${tab === 'password' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <span className="flex items-center gap-2"><Lock className="h-4 w-4" /> Contraseña</span>
                    </button>
                </div>

                {/* Tab Info */}
                {tab === 'info' && (
                    <div className="space-y-4">
                        {loading || !profile ? (
                            <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400">Cargando perfil…</div>
                        ) : (
                            <>
                                {/* Avatar */}
                                <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black flex-shrink-0">
                                        {profile.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
                                        <p className="text-gray-500 text-sm">{profile.email}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_LABELS[profile.role]?.color || 'bg-gray-100 text-gray-600'}`}>
                                                {ROLE_LABELS[profile.role]?.label || profile.role}
                                            </span>
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${profile.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                {profile.active ? '● Activo' : '● Inactivo'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Detalles */}
                                <div className="bg-white rounded-2xl shadow divide-y divide-gray-50">
                                    <div className="px-5 py-4 flex justify-between text-sm">
                                        <span className="text-gray-500">Usuario desde</span>
                                        <span className="font-medium text-gray-900">
                                            {new Date(profile.createdAt).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="px-5 py-4 flex justify-between text-sm">
                                        <span className="text-gray-500">Email</span>
                                        <span className="font-medium text-gray-900">{profile.email}</span>
                                    </div>
                                    <div className="px-5 py-4 flex justify-between text-sm">
                                        <span className="text-gray-500">Rol</span>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_LABELS[profile.role]?.color}`}>
                                            {ROLE_LABELS[profile.role]?.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Sucursales */}
                                {profile.branches.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow p-5">
                                        <h3 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 text-blue-500" /> Sucursales asignadas
                                        </h3>
                                        <div className="space-y-2">
                                            {profile.branches.map(ub => (
                                                <div key={ub.branch.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl text-sm">
                                                    <span className="text-lg">{TYPE_EMOJI[ub.branch.type] || '🏢'}</span>
                                                    <span className="font-medium text-gray-800">{ub.branch.name}</span>
                                                    <span className="ml-auto text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">{ub.branch.type}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Tab Contraseña */}
                {tab === 'password' && (
                    <div className="bg-white rounded-2xl shadow p-6">
                        <h2 className="font-bold text-gray-900 mb-1">Cambiar contraseña</h2>
                        <p className="text-sm text-gray-500 mb-6">Por seguridad, necesitás ingresar tu contraseña actual antes de cambiarla.</p>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contraseña actual</label>
                                <div className="relative">
                                    <input required type={showCurrent ? 'text' : 'password'} value={currentPwd}
                                        onChange={e => setCurrentPwd(e.target.value)}
                                        placeholder="Tu contraseña actual"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                                    <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nueva contraseña</label>
                                <div className="relative">
                                    <input required type={showNew ? 'text' : 'password'} value={newPwd}
                                        onChange={e => setNewPwd(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                                    <button type="button" onClick={() => setShowNew(!showNew)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {/* Indicador de fortaleza */}
                                {newPwd && (
                                    <div className="mt-2 flex gap-1">
                                        {[4, 6, 8, 10].map((min, i) => (
                                            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${newPwd.length >= min ? ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'][i] : 'bg-gray-200'}`} />
                                        ))}
                                        <span className="text-xs text-gray-400 ml-2">
                                            {newPwd.length < 6 ? 'Muy corta' : newPwd.length < 8 ? 'Débil' : newPwd.length < 10 ? 'Moderada' : 'Fuerte'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmar nueva contraseña</label>
                                <input required type="password" value={confirmPwd}
                                    onChange={e => setConfirmPwd(e.target.value)}
                                    placeholder="Repetí la nueva contraseña"
                                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${confirmPwd && newPwd !== confirmPwd ? 'border-red-300 focus:ring-red-300 bg-red-50' : 'border-gray-200 focus:ring-blue-300'}`} />
                                {confirmPwd && newPwd !== confirmPwd && (
                                    <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                                )}
                            </div>
                            <button type="submit" disabled={savingPwd || (confirmPwd !== '' && newPwd !== confirmPwd)}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition mt-2">
                                {savingPwd ? 'Actualizando…' : 'Cambiar contraseña'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
