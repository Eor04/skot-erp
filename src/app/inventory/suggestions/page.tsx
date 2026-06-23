'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, ArrowLeft, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

type Suggestion = {
    product: { name: string };
    branch: { name: string };
    currentStock: number;
    minStock: number;
    dailyAverage: number;
    daysRemaining: number | null;
    severity: string;
};

const urgencyConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    CRITICO: { label: '🔴 Crítico', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-400' },
    ALTO: { label: '🟠 Alto', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-400' },
    MEDIO: { label: '🟡 Medio', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-400' },
};

export default function SuggestionsPage() {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchSuggestions() {
        setLoading(true);
        try {
            const res = await fetch('/api/inventory/suggestions');
            const data = await res.json();
            if (data.success) setSuggestions(data.data || []);
        } catch { }
        finally { setLoading(false); }
    }

    useEffect(() => { fetchSuggestions(); }, []);

    const summary = {
        critico: suggestions.filter(s => s.severity === 'CRITICO').length,
        alto: suggestions.filter(s => s.severity === 'ALTO').length,
        medio: suggestions.filter(s => s.severity === 'MEDIO').length,
    };

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: '56px 100px' }} />
            </div>
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <button onClick={() => window.history.back()} className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2"><ArrowLeft className="h-4 w-4" /> Volver atrás</button>
                        <h1 className="text-3xl font-bold text-white/90 flex items-center gap-3">
                            <TrendingUp className="h-8 w-8 text-green-400" /> Sugerencias de Reabastecimiento
                        </h1>
                        <p className="text-white/60 mt-1">Análisis predictivo basado en promedio de ventas (últimos 7 días)</p>
                    </div>
                    <button onClick={fetchSuggestions} className="flex items-center gap-2 border border-white/20 bg-white/5 px-3 py-2 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5 transition-colors">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
                    </button>
                </div>

                {/* KPI */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                        { label: 'Críticos', count: summary.critico, color: 'text-red-400 bg-red-500/10 border border-red-200' },
                        { label: 'Alta prioridad', count: summary.alto, color: 'text-orange-600 bg-orange-50 border border-orange-200' },
                        { label: 'Medio', count: summary.medio, color: 'text-yellow-400 bg-yellow-500/10 border border-yellow-200' },
                    ].map(s => (
                        <div key={s.label} className={`rounded-2xl p-5 text-center ${s.color}`}>
                            <p className={`text-3xl font-black`}>{s.count}</p>
                            <p className="text-sm font-medium mt-1 text-white/70">{s.label}</p>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center py-20 text-white/40">Analizando stock…</div>
                ) : suggestions.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-2xl shadow">
                        <CheckCircle className="h-14 w-14 text-green-400 mx-auto mb-3" />
                        <p className="text-lg font-semibold text-white/80">¡Stock en buen nivel!</p>
                        <p className="text-sm text-white/40 mt-1">No hay productos que requieran reabastecimiento en este momento.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {suggestions.map((s, i) => {
                            const cfg = urgencyConfig[s.severity] || urgencyConfig['MEDIO'];
                            const suggested = Math.ceil((s.minStock * 3) - s.currentStock);
                            return (
                                <div key={i} className={`bg-white/5 rounded-2xl shadow p-6 border-l-4 ${cfg.border}`}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-bold text-white/90 text-lg">{s.product?.name}</h3>
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                                            </div>
                                            <p className="text-sm text-white/60">{s.branch?.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-white/90">+{suggested}</p>
                                            <p className="text-xs text-white/40">unidades sugeridas</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                                        <div className="bg-white/5 rounded-xl p-3">
                                            <p className="text-xs text-white/60 mb-1">Stock actual</p>
                                            <p className={`font-bold text-lg ${s.currentStock <= 0 ? 'text-red-400' : 'text-white/80'}`}>{s.currentStock}</p>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-3">
                                            <p className="text-xs text-white/60 mb-1">Consumo diario</p>
                                            <p className="font-bold text-lg text-white/80">{s.dailyAverage?.toFixed(1) || '—'}</p>
                                        </div>
                                        <div className={`rounded-xl p-3 ${cfg.bg}`}>
                                            <p className="text-xs text-white/60 mb-1">Días restantes</p>
                                            <p className={`font-bold text-lg ${cfg.color}`}>
                                                {s.daysRemaining === null ? '∞' : s.daysRemaining < 1 ? '< 1' : s.daysRemaining}
                                            </p>
                                        </div>
                                    </div>
                                    {s.severity === 'CRITICO' && (
                                        <div className="mt-3 flex items-center gap-1.5 text-red-400 text-xs font-medium">
                                            <AlertTriangle className="h-4 w-4" /> Requiere acción inmediata
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
