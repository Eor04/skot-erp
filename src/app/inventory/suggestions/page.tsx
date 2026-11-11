'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/session-context';
import { TrendingUp, ArrowLeft, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

type Suggestion = {
    product: { name: string };
    branch: { name: string };
    currentStock: number;
    minStock: number;
    dailyAverage: number;
    daysRemaining: number | null;
    severity: string;
    suggestedQty: number;
};

const urgencyConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    CRITICO: { label: 'Crítico', color: 'text-danger', bg: 'bg-[var(--status-error-bg)]', border: 'border-red-400' },
    ALTO: { label: 'Alto', color: 'text-warning', bg: 'bg-orange-50', border: 'border-orange-400' },
    MEDIO: { label: 'Medio', color: 'text-warning', bg: 'bg-[var(--status-warning-bg)]', border: 'border-yellow-400' },
};

export default function SuggestionsPage() {
    const { user } = useSession();
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
    const [branchId, setBranchId] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        const controller = new AbortController();
        fetch('/api/branches', { signal: controller.signal })
            .then(r => r.json())
            .then(data => {
                if (!data.success) throw new Error(data.error || 'No se pudieron cargar las sucursales');
                setBranches(data.data);
                setBranchId(current => data.data.some((b: { id: string }) => b.id === current)
                    ? current : data.data.find((b: { id: string }) => b.id === user.branchIds[0])?.id || data.data[0]?.id || '');
                if (!data.data.length) setLoading(false);
            })
            .catch(error => {
                if (!controller.signal.aborted) { setError(error.message); setLoading(false); }
            });
        return () => controller.abort();
    }, [user]);

    const fetchSuggestions = useCallback(async (signal?: AbortSignal) => {
        if (!branchId) return;
        setLoading(true);
        setError(null);
        setSuggestions([]);
        try {
            const query = new URLSearchParams({ branchId });
            const res = await fetch(`/api/inventory/suggestions?${query}`, { signal });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'No se pudieron generar las sugerencias');
            setSuggestions(data.data.suggestions.map((s: { productName: string; currentStock: number;
                minStock: number; dailyAverage: number; daysOfStock: number | null; priority: string; suggestedQty: number }) => ({
                product: { name: s.productName }, branch: { name: branches.find(b => b.id === branchId)?.name || '' },
                currentStock: s.currentStock, minStock: s.minStock, dailyAverage: s.dailyAverage,
                daysRemaining: s.daysOfStock, suggestedQty: s.suggestedQty,
                severity: s.currentStock <= 0 ? 'CRITICO' : s.priority === 'ALTA' ? 'ALTO' : 'MEDIO',
            })));
        } catch (error) {
            if (!signal?.aborted) setError(error instanceof Error ? error.message : 'Error de conexión');
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [branchId, branches]);

    useEffect(() => {
        const controller = new AbortController();
        fetchSuggestions(controller.signal);
        return () => controller.abort();
    }, [fetchSuggestions]);

    const summary = {
        critico: suggestions.filter(s => s.severity === 'CRITICO').length,
        alto: suggestions.filter(s => s.severity === 'ALTO').length,
        medio: suggestions.filter(s => s.severity === 'MEDIO').length,
    };

    return (
        <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
                <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                    <div>
                        <Link href="/inventory" className="text-sm text-muted hover:text-ink flex items-center gap-1 mb-2"><ArrowLeft className="h-4 w-4" /> Volver a inventario</Link>
                        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink flex items-center gap-3">
                            <TrendingUp className="h-8 w-8 text-success" /> Sugerencias de Reabastecimiento
                        </h1>
                        <p className="text-muted mt-1">Análisis predictivo basado en promedio de ventas (últimos 7 días)</p>
                    </div>
                    <button onClick={() => fetchSuggestions()} disabled={!branchId || loading} className="flex items-center gap-2 border border-line bg-surface px-3 py-2 rounded-xl text-sm font-medium text-muted hover:bg-canvas transition-colors">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
                    </button>
                </div>

                <div className="mb-6">
                    <label htmlFor="suggestions-branch" className="block text-sm text-muted mb-2">Sucursal</label>
                    <select id="suggestions-branch" value={branchId} onChange={e => setBranchId(e.target.value)}
                        className="min-h-12 w-full max-w-sm bg-surface text-ink border border-line rounded-lg px-4 py-2">
                        {!branches.length && <option value="">Sin sucursales asignadas</option>}
                        {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select>
                </div>
                {error && <p role="alert" className="mb-6 text-danger">{error}</p>}
                {/* KPI */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                    {[
                        { label: 'Críticos', count: summary.critico, color: 'text-danger bg-[var(--status-error-bg)] border border-line-subtle' },
                        { label: 'Alta prioridad', count: summary.alto, color: 'text-warning bg-orange-50 border border-line-subtle' },
                        { label: 'Medio', count: summary.medio, color: 'text-warning bg-[var(--status-warning-bg)] border border-line-subtle' },
                    ].map(s => (
                        <div key={s.label} className={`rounded-2xl p-5 text-center ${s.color}`}>
                            <p className={`text-3xl font-black`}>{s.count}</p>
                            <p className="text-sm font-medium mt-1 text-muted">{s.label}</p>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center py-20 text-muted">Analizando stock…</div>
                ) : error ? null : !branchId ? (
                    <p className="text-muted">No hay sucursales disponibles para consultar.</p>
                ) : suggestions.length === 0 ? (
                    <div className="text-center py-20 bg-surface rounded-2xl shadow">
                        <CheckCircle className="h-14 w-14 text-success mx-auto mb-3" />
                        <p className="text-lg font-semibold text-ink">¡Stock en buen nivel!</p>
                        <p className="text-sm text-muted mt-1">No hay productos que requieran reabastecimiento en este momento.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {suggestions.map((s, i) => {
                            const cfg = urgencyConfig[s.severity] || urgencyConfig['MEDIO'];
                            const suggested = s.suggestedQty;
                            return (
                                <div key={i} className={`bg-surface rounded-2xl shadow p-6 border-l-4 ${cfg.border}`}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-bold text-ink text-lg">{s.product?.name}</h3>
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                                            </div>
                                            <p className="text-sm text-muted">{s.branch?.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-ink">+{suggested}</p>
                                            <p className="text-xs text-muted">unidades sugeridas</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                                        <div className="bg-surface rounded-xl p-3">
                                            <p className="text-xs text-muted mb-1">Stock actual</p>
                                            <p className={`font-bold text-lg ${s.currentStock <= 0 ? 'text-danger' : 'text-ink'}`}>{s.currentStock}</p>
                                        </div>
                                        <div className="bg-surface rounded-xl p-3">
                                            <p className="text-xs text-muted mb-1">Consumo diario</p>
                                            <p className="font-bold text-lg text-ink">{s.dailyAverage?.toFixed(1) || '—'}</p>
                                        </div>
                                        <div className={`rounded-xl p-3 ${cfg.bg}`}>
                                            <p className="text-xs text-muted mb-1">Días restantes</p>
                                            <p className={`font-bold text-lg ${cfg.color}`}>
                                                {s.daysRemaining === null ? '∞' : s.daysRemaining < 1 ? '< 1' : s.daysRemaining}
                                            </p>
                                        </div>
                                    </div>
                                    {s.severity === 'CRITICO' && (
                                        <div className="mt-3 flex items-center gap-1.5 text-danger text-xs font-medium">
                                            <AlertTriangle className="h-4 w-4" /> Requiere acción inmediata
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
