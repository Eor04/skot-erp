'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Scale, Save, CheckCircle2, AlertCircle, Settings2, Power } from 'lucide-react';

type ScaleConfig = {
    id?: string;
    branchId: string;
    modelName: string;
    serialNumber: string | null;
    port: string;
    baudRate: number;
    tara: number;
    active: boolean;
    branch?: { id: string; name: string; type: string };
};

type Branch = { id: string; name: string; type: string };

const BAUD_RATES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
const COM_PORTS = ['COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', '/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyS0'];

const DEFAULT_CONFIG: Omit<ScaleConfig, 'branchId'> = {
    modelName: 'Prix 4', serialNumber: null, port: 'COM1',
    baudRate: 9600, tara: 0.15, active: true,
};

export default function ScaleConfigPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selected, setSelected] = useState('');
    const [config, setConfig] = useState<ScaleConfig | null>(null);
    const [form, setForm] = useState({ ...DEFAULT_CONFIG });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }

    useEffect(() => {
        fetch('/api/admin/branches').then(r => r.json()).then(d => {
            if (d.success) {
                // Solo sucursales ACAI necesitan balanza
                const acai = d.data.filter((b: Branch) => b.type === 'ACAI');
                setBranches(acai.length > 0 ? acai : d.data);
            }
        });
    }, []);

    const loadConfig = useCallback(async (branchId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/scale-config?branchId=${branchId}`);
            const d = await res.json();
            if (d.success && d.data) {
                setConfig(d.data);
                setForm({
                    modelName: d.data.modelName,
                    serialNumber: d.data.serialNumber,
                    port: d.data.port,
                    baudRate: d.data.baudRate,
                    tara: d.data.tara,
                    active: d.data.active,
                });
            } else {
                setConfig(null);
                setForm({ ...DEFAULT_CONFIG });
            }
        } catch { showToast('error', 'Error al cargar'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (selected) loadConfig(selected);
    }, [selected, loadConfig]);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!selected) return;
        setSaving(true);
        try {
            const res = await fetch('/api/admin/scale-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ branchId: selected, ...form }),
            });
            const d = await res.json();
            if (d.success) {
                showToast('success', '✅ Configuración guardada correctamente');
                loadConfig(selected);
            } else {
                showToast('error', d.error || 'Error al guardar');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSaving(false); }
    }

    const branch = branches.find(b => b.id === selected);

    return (
        <div className="min-h-screen relative overflow-hidden p-4 md:p-8" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: '56px 100px' }} />
            </div>
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/admin" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Volver a Admin
                    </Link>
                    <h1 className="text-3xl font-bold text-white/90 flex items-center gap-3">
                        <Scale className="h-8 w-8 text-indigo-600" /> Configuración de Balanza
                    </h1>
                    <p className="text-white/60 mt-1">Parámetros de comunicación con la balanza Prix 4 por sucursal</p>
                </div>

                {/* Selector de sucursal */}
                <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-6 mb-6">
                    <label className="block text-sm font-semibold text-white/80 mb-2">Sucursal</label>
                    <div className="flex flex-wrap gap-2">
                        {branches.map(b => (
                            <button key={b.id} onClick={() => setSelected(b.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${selected === b.id ? 'bg-indigo-600 text-white shadow' : 'bg-white/10 text-white/70 hover:bg-gray-200'}`}>
                                {b.type === 'ACAI' ? '🥤' : b.type === 'HAMBURGUESAS' ? '🍔' : '🏭'} {b.name}
                            </button>
                        ))}
                    </div>
                    {selected && (
                        <p className="text-xs mt-3 text-white/40">
                            {config ? '⚙️ Configuración existente encontrada' : '🆕 No hay configuración — se creará nueva'}
                        </p>
                    )}
                </div>

                {!selected ? (
                    <div className="text-center py-16 text-white/40">
                        <Scale className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Seleccioná una sucursal para configurar su balanza</p>
                    </div>
                ) : loading ? (
                    <div className="text-center py-16 text-white/40">Cargando…</div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-5">
                        {/* Estado */}
                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-white/90">Estado de la balanza</p>
                                    <p className="text-sm text-white/40 mt-0.5">Activar o desactivar la integración</p>
                                </div>
                                <button type="button" onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl border transition"
                                    style={{
                                        borderColor: form.active ? '#4f46e5' : '#d1d5db',
                                        background: form.active ? '#eef2ff' : '#f9fafb',
                                        color: form.active ? '#4f46e5' : '#9ca3af',
                                    }}>
                                    <Power className="h-4 w-4" />
                                    {form.active ? 'Activa' : 'Desactivada'}
                                </button>
                            </div>
                        </div>

                        {/* Parámetros de conexión */}
                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow p-6">
                            <h2 className="font-semibold text-white/90 mb-5 flex items-center gap-2">
                                <Settings2 className="h-5 w-5 text-indigo-500" /> Parámetros de conexión
                            </h2>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-1.5">Modelo</label>
                                    <input type="text" value={form.modelName}
                                        onChange={e => setForm(f => ({ ...f, modelName: e.target.value }))}
                                        className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-1.5">N° Serie</label>
                                    <input type="text" value={form.serialNumber ?? ''} placeholder="Opcional"
                                        onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value || null }))}
                                        className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-1.5">Puerto COM</label>
                                    <select value={form.port} onChange={e => setForm(f => ({ ...f, port: e.target.value }))}
                                        className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                                        {COM_PORTS.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-1.5">Baud Rate</label>
                                    <select value={form.baudRate} onChange={e => setForm(f => ({ ...f, baudRate: parseInt(e.target.value) }))}
                                        className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                                        {BAUD_RATES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-white/80 mb-1.5">
                                        Tara (kg) — Peso del recipiente (ej: bowl)
                                    </label>
                                    <div className="flex gap-3 items-center">
                                        <input type="number" min="0" step="0.01" value={form.tara === 0 ? '' : form.tara}
                                            onChange={e => setForm(f => ({ ...f, tara: parseFloat(e.target.value) || 0 }))}
                                            className="w-32 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 text-right" />
                                        <span className="text-sm text-white/40">kg = {(form.tara * 1000).toFixed(0)} gr</span>
                                    </div>
                                    <p className="text-xs text-white/40 mt-1.5">
                                        Se resta automáticamente del peso bruto. Prix 4 estándar: 0.15 kg (150 gr).
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={saving}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-2xl font-semibold transition shadow">
                            <Save className="h-5 w-5" />
                            {saving ? 'Guardando…' : 'Guardar configuración'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
