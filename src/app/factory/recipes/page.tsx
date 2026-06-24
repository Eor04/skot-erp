'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, RefreshCw, Plus, Pencil } from 'lucide-react';

type Recipe = {
    id: string;
    name: string;
    description?: string;
    product: { name: string; category: string };
    yield: number;
    yieldUnit: string;
    merma: number;
    active: boolean;
    ingredients: {
        quantity: number;
        unit: string;
        ingredient: { name: string };
    }[];
};

const catColors: Record<string, string> = {
    ACAI_BASE: 'bg-purple-100 text-purple-700',
    ACAI_TOPPING: 'bg-pink-100 text-pink-700',
    BURGER: 'bg-orange-100 text-orange-700',
    RAW_MATERIAL: 'bg-white/10 text-white/80',
};

export default function RecipesPage() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    async function fetchRecipes() {
        setLoading(true);
        try {
            const res = await fetch('/api/factory/recipes');
            const data = await res.json();
            if (data.success) setRecipes(data.data);
        } catch { }
        finally { setLoading(false); }
    }

    useEffect(() => { fetchRecipes(); }, []);

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: '56px 100px' }} />
            </div>
            <div className="relative z-10 h-full w-full">
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/factory" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver a Fábrica
                        </Link>
                        <h1 className="text-3xl font-bold text-white/90 flex items-center gap-3">
                            <FileText className="h-8 w-8 text-purple-600" /> Recetas (BOM)
                        </h1>
                        <p className="text-white/60 mt-1">{recipes.length} receta{recipes.length !== 1 ? 's' : ''} registrada{recipes.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <button onClick={fetchRecipes} className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-md px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 transition-colors">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
                        </button>
                        <Link href="/factory/recipes/new" className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-purple-500/20 transition">
                            <Plus className="h-4 w-4" /> Nueva Receta
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-white/40">Cargando recetas…</div>
                ) : recipes.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow text-white/40">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No hay recetas registradas.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {recipes.map(r => (
                            <div key={r.id} className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow overflow-hidden">
                                <div
                                    className="p-6 cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="font-bold text-lg text-white/90">{r.name}</h3>
                                                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${catColors[r.product?.category] || 'bg-white/10 text-white/70'}`}>
                                                        {r.product?.category}
                                                    </span>
                                                    {!r.active && <span className="px-2 py-1 text-xs rounded-full font-medium bg-red-100 text-red-600">Inactiva</span>}
                                                </div>
                                                {r.description && <p className="text-sm text-white/60">{r.description}</p>}
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-4">
                                            <div>
                                                <p className="text-xs text-white/40">Rendimiento</p>
                                                <p className="font-bold text-white/90">{r.yield} {r.yieldUnit}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-white/40">Ingredientes</p>
                                                <p className="font-bold text-white/90">{r.ingredients?.length || 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-white/40">Merma</p>
                                                <p className="font-bold text-white/90">{r.merma}%</p>
                                            </div>
                                            {/* Botón Editar */}
                                            <Link
                                                href={`/factory/recipes/${r.id}/edit`}
                                                onClick={e => e.stopPropagation()}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition"
                                            >
                                                <Pencil className="h-3.5 w-3.5" /> Editar
                                            </Link>
                                            <span className="text-white/40 text-lg">{expandedId === r.id ? '▲' : '▼'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Ingredientes expandidos */}
                                {expandedId === r.id && r.ingredients?.length > 0 && (
                                    <div className="border-t border-white/10 bg-white/5">
                                        <div className="px-6 py-3 text-xs font-semibold text-white/60 uppercase tracking-wide">Ingredientes</div>
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-white/10">
                                                    <th className="text-left px-6 py-2 font-semibold text-white/70">Ingrediente</th>
                                                    <th className="text-right px-6 py-2 font-semibold text-white/70">Cantidad</th>
                                                    <th className="text-right px-6 py-2 font-semibold text-white/70">Unidad</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {r.ingredients.map((ing, i) => (
                                                    <tr key={i} className="border-b border-white/10 last:border-0 hover:bg-white/5">
                                                        <td className="px-6 py-3 text-white/90">{ing.ingredient?.name}</td>
                                                        <td className="px-6 py-3 text-right font-medium text-white/80">{ing.quantity}</td>
                                                        <td className="px-6 py-3 text-right text-white/60">{ing.unit}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
        </div>
    );
}
