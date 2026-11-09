'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Scale, Save, CheckCircle2, AlertCircle, Settings2, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

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
                showToast('success', 'Configuración guardada correctamente');
                loadConfig(selected);
            } else {
                showToast('error', d.error || 'Error al guardar');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSaving(false); }
    }

    const branch = branches.find(b => b.id === selected);

    const fieldClass = 'min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-ink';
    return <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-3xl space-y-5">
        {toast && <div role={toast.type === 'error' ? 'alert' : 'status'} className={`fixed left-4 right-4 top-4 z-50 flex items-center gap-2 rounded-lg p-4 text-sm font-semibold text-white shadow-lg sm:left-auto ${toast.type === 'success' ? 'bg-success' : 'bg-danger'}`}>
            {toast.type === 'success' ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertCircle size={18} aria-hidden="true" />}{toast.msg}</div>}
        <header><Link href="/admin" className="mb-4 inline-flex min-h-11 items-center gap-2 font-semibold text-brand hover:underline"><ArrowLeft size={18} aria-hidden="true" /> Volver a administración</Link>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted"><Scale size={16} aria-hidden="true" /> Administración <span aria-hidden="true">›</span> Configuración de balanza</div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">Configuración de balanza</h1><p className="mt-2 text-muted">Parámetros de comunicación Prix 4 por sucursal.</p></header>
        <Card className="p-4 sm:p-5"><h2 className="mb-3 font-display font-semibold">Sucursal</h2><div role="group" aria-label="Seleccionar sucursal" className="flex flex-wrap gap-2">{branches.map(b => <button key={b.id} type="button" aria-pressed={selected === b.id} onClick={() => setSelected(b.id)} className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold ${selected === b.id ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:bg-canvas'}`}>{b.name}</button>)}</div>
            {selected && <p className="mt-3 text-sm text-muted">{config ? 'Configuración existente' : 'Se creará una configuración nueva'}{branch ? ` · ${branch.name}` : ''}</p>}</Card>
        {!selected ? <Card className="p-10 text-center text-muted"><Scale size={30} className="mx-auto mb-3" aria-hidden="true" />Seleccioná una sucursal para configurar su balanza</Card>
            : loading ? <Card role="status" className="p-10 text-center text-muted">Cargando configuración…</Card>
                : <form onSubmit={handleSave} className="space-y-4"><Card className="flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-display font-semibold">Estado de la balanza</h2><p className="mt-1 text-sm text-muted">Activar o desactivar la integración</p></div>
                    <button type="button" aria-pressed={form.active} onClick={() => setForm(previous => ({ ...previous, active: !previous.active }))} className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 font-semibold ${form.active ? 'border-success bg-[var(--status-success-bg)] text-success' : 'border-line bg-surface text-muted'}`}><Power size={18} aria-hidden="true" />{form.active ? 'Activa' : 'Desactivada'}</button></Card>
                    <Card className="p-5"><h2 className="mb-5 flex items-center gap-2 font-display font-semibold"><Settings2 size={19} className="text-brand" aria-hidden="true" /> Parámetros de conexión</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div><label htmlFor="scale-model" className="mb-1 block text-sm font-semibold">Modelo</label><input id="scale-model" type="text" value={form.modelName} onChange={e => setForm(f => ({ ...f, modelName: e.target.value }))} className={fieldClass} /></div>
                            <div><label htmlFor="scale-serial" className="mb-1 block text-sm font-semibold">N° Serie</label><input id="scale-serial" type="text" value={form.serialNumber ?? ''} placeholder="Opcional" onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value || null }))} className={fieldClass} /></div>
                            <div><label htmlFor="scale-port" className="mb-1 block text-sm font-semibold">Puerto COM</label><select id="scale-port" value={form.port} onChange={e => setForm(f => ({ ...f, port: e.target.value }))} className={fieldClass}>{COM_PORTS.map(port => <option key={port} value={port}>{port}</option>)}</select></div>
                            <div><label htmlFor="scale-baud" className="mb-1 block text-sm font-semibold">Baud Rate</label><select id="scale-baud" value={form.baudRate} onChange={e => setForm(f => ({ ...f, baudRate: parseInt(e.target.value) }))} className={fieldClass}>{BAUD_RATES.map(rate => <option key={rate} value={rate}>{rate}</option>)}</select></div>
                            <div className="sm:col-span-2"><label htmlFor="scale-tara" className="mb-1 block text-sm font-semibold">Tara (kg) · peso del recipiente</label><div className="flex flex-wrap items-center gap-3"><input id="scale-tara" type="number" min="0" step="0.01" value={form.tara === 0 ? '' : form.tara} onChange={e => setForm(f => ({ ...f, tara: parseFloat(e.target.value) || 0 }))} className={`${fieldClass} max-w-36 text-right tabular-nums`} /><StatusBadge>{(form.tara * 1000).toFixed(0)} gr</StatusBadge></div>
                                <p className="mt-2 text-sm text-muted">Se resta automáticamente del peso bruto. Prix 4 estándar: 0.15 kg (150 gr).</p></div>
                        </div></Card>
                    <Button type="submit" size="touch" disabled={saving} className="w-full"><Save size={18} aria-hidden="true" />{saving ? 'Guardando…' : 'Guardar configuración'}</Button>
                </form>}
    </div></main>;
}
