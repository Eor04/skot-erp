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

    return <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
            <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
                <div><Link href="/factory" className="mb-4 inline-flex min-h-11 items-center gap-2 font-semibold text-brand hover:underline"><ArrowLeft size={18} aria-hidden="true" /> Volver a fábrica</Link>
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted"><FileText size={16} aria-hidden="true" /> Fábrica <span aria-hidden="true">›</span> Recetas</div>
                    <h1 className="font-display text-2xl font-semibold sm:text-3xl">Recetas (BOM)</h1>
                    <p className="mt-2 text-muted">{recipes.length} receta{recipes.length !== 1 ? 's' : ''} registrada{recipes.length !== 1 ? 's' : ''}</p>
                </div><div className="flex flex-wrap gap-2">
                    <button type="button" onClick={fetchRecipes} disabled={loading} className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-surface px-4 font-semibold hover:bg-canvas disabled:opacity-50"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Actualizar</button>
                    <Link href="/factory/recipes/new" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-brand px-4 font-semibold text-white hover:brightness-90"><Plus size={18} aria-hidden="true" /> Nueva receta</Link>
                </div>
            </header>
            {loading ? <div role="status" className="rounded-xl border border-line-subtle bg-surface p-12 text-center text-muted">Cargando recetas…</div>
                : recipes.length === 0 ? <div className="rounded-xl border border-line-subtle bg-surface p-12 text-center text-muted">No hay recetas registradas.</div>
                    : <div className="space-y-3">{recipes.map(recipe => <section key={recipe.id} className="overflow-hidden rounded-xl border border-line-subtle bg-surface">
                        <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
                            <button type="button" aria-expanded={expandedId === recipe.id} onClick={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)} className="min-w-0 flex-1 text-left">
                                <span className="block break-words font-display text-lg font-semibold">{recipe.name}</span>
                                <span className="mt-1 block text-sm text-muted">{recipe.product?.category || 'Sin categoría'}{!recipe.active && ' · Inactiva'}</span>
                                {recipe.description && <span className="mt-2 block break-words text-sm text-muted">{recipe.description}</span>}
                                <span className="mt-2 block text-sm font-semibold text-brand">{expandedId === recipe.id ? 'Ocultar ingredientes' : 'Ver ingredientes'}</span>
                            </button>
                            <Link href={`/factory/recipes/${recipe.id}/edit`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 font-semibold text-brand hover:bg-canvas"><Pencil size={16} aria-hidden="true" /> Editar</Link>
                        </div>
                        <dl className="grid grid-cols-3 gap-3 border-t border-line-subtle bg-canvas px-4 py-3 text-sm sm:px-5">
                            <div><dt className="text-muted">Rendimiento</dt><dd className="font-semibold tabular-nums">{recipe.yield} {recipe.yieldUnit}</dd></div>
                            <div><dt className="text-muted">Ingredientes</dt><dd className="font-semibold tabular-nums">{recipe.ingredients?.length || 0}</dd></div>
                            <div><dt className="text-muted">Merma</dt><dd className="font-semibold tabular-nums">{recipe.merma}%</dd></div>
                        </dl>
                        {expandedId === recipe.id && recipe.ingredients?.length > 0 && <div className="overflow-x-auto border-t border-line-subtle"><table className="w-full min-w-[420px] text-sm"><thead className="bg-canvas text-muted"><tr><th scope="col" className="px-4 py-2 text-left">Ingrediente</th><th scope="col" className="px-4 py-2 text-right">Cantidad</th><th scope="col" className="px-4 py-2 text-right">Unidad</th></tr></thead><tbody>{recipe.ingredients.map((ingredient, index) => <tr key={index} className="border-t border-line-subtle"><th scope="row" className="break-words px-4 py-3 text-left font-medium">{ingredient.ingredient?.name}</th><td className="px-4 py-3 text-right tabular-nums">{ingredient.quantity}</td><td className="px-4 py-3 text-right">{ingredient.unit}</td></tr>)}</tbody></table></div>}
                    </section>)}</div>}
        </div>
    </main>;
}
