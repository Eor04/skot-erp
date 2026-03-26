'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, RefreshCw } from 'lucide-react';

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
    RAW_MATERIAL: 'bg-gray-100 text-gray-700',
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
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/factory" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver a Fábrica
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <FileText className="h-8 w-8 text-purple-600" /> Recetas (BOM)
                        </h1>
                        <p className="text-gray-500 mt-1">{recipes.length} receta{recipes.length !== 1 ? 's' : ''} registrada{recipes.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button onClick={fetchRecipes} className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-400">Cargando recetas…</div>
                ) : recipes.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow text-gray-400">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No hay recetas registradas.</p>
                        <p className="text-xs mt-2">Las recetas se crean directamente en la base de datos o vía API POST /api/factory/recipes</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {recipes.map(r => (
                            <div key={r.id} className="bg-white rounded-2xl shadow overflow-hidden">
                                <div
                                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="font-bold text-lg text-gray-900">{r.name}</h3>
                                                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${catColors[r.product?.category] || 'bg-gray-100 text-gray-600'}`}>
                                                        {r.product?.category}
                                                    </span>
                                                    {!r.active && <span className="px-2 py-1 text-xs rounded-full font-medium bg-red-100 text-red-600">Inactiva</span>}
                                                </div>
                                                {r.description && <p className="text-sm text-gray-500">{r.description}</p>}
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-6">
                                            <div>
                                                <p className="text-xs text-gray-400">Rendimiento</p>
                                                <p className="font-bold text-gray-800">{r.yield} {r.yieldUnit}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">Ingredientes</p>
                                                <p className="font-bold text-gray-800">{r.ingredients?.length || 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">Merma</p>
                                                <p className="font-bold text-gray-800">{r.merma}%</p>
                                            </div>
                                            <span className="text-gray-400 text-lg">{expandedId === r.id ? '▲' : '▼'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Ingredientes expandidos */}
                                {expandedId === r.id && r.ingredients?.length > 0 && (
                                    <div className="border-t border-gray-100 bg-gray-50">
                                        <div className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ingredientes</div>
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-200">
                                                    <th className="text-left px-6 py-2 font-semibold text-gray-600">Ingrediente</th>
                                                    <th className="text-right px-6 py-2 font-semibold text-gray-600">Cantidad</th>
                                                    <th className="text-right px-6 py-2 font-semibold text-gray-600">Unidad</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {r.ingredients.map((ing, i) => (
                                                    <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-white">
                                                        <td className="px-6 py-3 text-gray-800">{ing.ingredient?.name}</td>
                                                        <td className="px-6 py-3 text-right font-medium text-gray-700">{ing.quantity}</td>
                                                        <td className="px-6 py-3 text-right text-gray-500">{ing.unit}</td>
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
    );
}
