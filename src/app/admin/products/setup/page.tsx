'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Product = { id: string; name: string; sku: string; unit: string; category: string | null; type: string;
    description: string | null; imageUrl: string | null; consumptionMode: string | null; saleRecipeId: string | null; active: boolean;
    setupDraft?: { mode?: string; recipeId?: string; yieldValue?: string; ingredients?: { id: string; quantity: string }[];
        commonPrice?: string; prices?: Record<string, string | undefined> } | null;
    branchProducts: { branchId: string; active: boolean; customPrice: number | null; pricePerKg: number | null }[] };
type Recipe = { id: string; name: string; productId: string; yield: number; yieldUnit: string };
type Branch = { id: string; name: string };
const categories = ['BURGER', 'BURGER_EXTRA', 'BEVERAGE', 'ACAI_BASE', 'ACAI_TOPPING', 'RAW_MATERIAL', 'PACKAGING', 'SUPPLY'];
const labels: Record<string, string> = { BURGER: 'Hamburguesa', BURGER_EXTRA: 'Extra / porción', BEVERAGE: 'Bebida', ACAI_BASE: 'Base Açaí', ACAI_TOPPING: 'Topping', RAW_MATERIAL: 'Materia prima', PACKAGING: 'Empaque', SUPPLY: 'Suministros' };
const field = 'min-h-12 w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink';

export default function ProductSetup() {
    const [step, setStep] = useState(1);
    const [products, setProducts] = useState<Product[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [id, setId] = useState('');
    const [form, setForm] = useState({ name: '', sku: '', unit: 'unidad', category: 'BURGER', description: '', imageUrl: '' });
    const [mode, setMode] = useState('');
    const [recipeId, setRecipeId] = useState('');
    const [yieldValue, setYieldValue] = useState('1');
    const [ingredients, setIngredients] = useState([{ id: '', quantity: '' }]);
    const [commonPrice, setCommonPrice] = useState('');
    const [prices, setPrices] = useState<Record<string, string | undefined>>({});
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [availability, setAvailability] = useState<{ branch: string; label: string }[]>([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => { fetch('/api/admin/product-setup').then(r => r.json()).then(d => {
        if (!d.success) throw new Error(d.error || 'No se pudo cargar');
        setProducts(d.data.products); setRecipes(d.data.recipes); setBranches(d.data.branches);
        const productId = new URLSearchParams(window.location.search).get('product');
        const selected = d.data.products.find((p: Product) => p.id === productId);
        if (selected) applyProduct(selected);
    }).catch(e => setError(e.message)); }, []);

    function applyProduct(p: Product) {
        setId(p.id);
        setForm({ name: p.name, sku: p.sku, unit: p.unit, category: categories.includes(p.category || '') ? p.category! : p.type,
            description: p.description || '', imageUrl: p.imageUrl || '' });
        const draft = p.setupDraft;
        setMode(draft?.mode || p.consumptionMode || ''); setRecipeId(draft?.recipeId || p.saleRecipeId || '');
        setYieldValue(typeof draft?.yieldValue === 'string' ? draft.yieldValue : '1');
        setIngredients(Array.isArray(draft?.ingredients) && draft.ingredients.every(i => typeof i?.id === 'string' && typeof i?.quantity === 'string')
            ? draft.ingredients : [{ id: '', quantity: '' }]);
        setCommonPrice(typeof draft?.commonPrice === 'string' ? draft.commonPrice : '');
        setPrices(draft?.prices && typeof draft.prices === 'object' ? draft.prices : Object.fromEntries(p.branchProducts.filter(b => b.active).map(b => [b.branchId,
            String((p.type === 'ACAI_BASE' ? b.pricePerKg : b.customPrice) ?? '')])));
    }
    function chooseProduct(value: string) {
        setId(value); setError(''); setMessage(''); setAvailability([]); setCommonPrice('');
        const p = products.find(product => product.id === value);
        if (p) {
            applyProduct(p);
        } else {
            setForm({ name: '', sku: '', unit: 'unidad', category: 'BURGER', description: '', imageUrl: '' });
            setMode(''); setRecipeId('');
            setYieldValue('1'); setIngredients([{ id: '', quantity: '' }]);
            setPrices({});
        }
    }

    async function save(publish: boolean) {
        setError(''); setMessage(''); setBusy(true);
        try {
            const selected = Object.entries(prices).filter(([branchId, value]) => value !== undefined && branches.some(b => b.id === branchId)).map(([branchId, value]) => ({
                branchId, price: Number(value || commonPrice),
            }));
            const response = await fetch('/api/admin/product-setup', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, id: id || undefined, mode, recipeId: recipeId || undefined, publish,
                    recipe: mode === 'RECIPE' && !recipeId ? { yield: Number(yieldValue),
                        ingredients: ingredients.map(i => ({ id: i.id, quantity: Number(i.quantity) })) } : undefined,
                    branches: selected, draftState: { mode, recipeId, yieldValue, ingredients, commonPrice, prices } }) });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'No se pudo guardar');
            setId(result.data.id);
            setMessage(publish ? 'Producto configurado. Revisa las existencias de cada sucursal antes de vender.' : 'Borrador guardado. Puedes continuar su configuración.');
            if (publish) {
                const checks = await Promise.all(selected.map(async b => {
                    const branch = branches.find(x => x.id === b.branchId)?.name || b.branchId;
                    try {
                        const catalog = await fetch(`/api/pos/products?branchId=${encodeURIComponent(b.branchId)}`).then(r => r.json());
                        const product = catalog.data?.find((p: any) => p.id === result.data.id);
                        return { branch, label: product?.consumptionError || (product ? (product.currentStock >= 1 || (form.category === 'ACAI_BASE' && product.currentStock > 0) ? 'Disponible' : 'Agotado') : 'No disponible en el catálogo') };
                    } catch { return { branch, label: 'No se pudo consultar la disponibilidad' }; }
                }));
                setAvailability(checks);
            }
            const refreshed = await fetch('/api/admin/product-setup').then(r => r.json());
            if (refreshed.success) { setProducts(refreshed.data.products); setRecipes(refreshed.data.recipes); }
        } catch (e) { setError(e instanceof Error ? e.message : 'Error de conexión'); }
        finally { setBusy(false); }
    }

    return <main data-brand="admin" className="skot-experience mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
        <Link href="/admin/products" className="text-brand underline">← Volver a productos</Link>
        <h1 className="font-display text-2xl font-semibold">Preparar producto para venta</h1>
        <p className="text-muted">Paso {step} de 3 · {['Producto', 'Preparación', 'Sucursales y precios'][step - 1]}</p>
        {error && <p role="alert" className="rounded-lg bg-[var(--status-error-bg)] p-3 text-danger">{error}</p>}
        {message && <p role="status" className="rounded-lg bg-[var(--status-success-bg)] p-3 text-success">{message}</p>}
        {availability.length > 0 && <ul aria-label="Disponibilidad por sucursal" className="rounded-lg border border-line-subtle p-4">{availability.map(a => <li key={a.branch}>{a.branch}: {a.label}</li>)}</ul>}
        <section className="space-y-4 rounded-xl border border-line-subtle bg-surface p-4 sm:p-6">
            {step === 1 && <>
                <label className="block">Producto existente o borrador<select className={field} value={id} onChange={e => chooseProduct(e.target.value)}><option value="">Crear producto nuevo</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} · {p.sku}{p.active ? '' : ' · borrador/inactivo'}</option>)}</select></label>
                <label className="block">Nombre *<input className={field} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
                <label className="block">SKU *<input className={field} value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value.toUpperCase() })} /></label>
                <label className="block">Categoría<select className={field} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.map(c => <option value={c} key={c}>{labels[c]}</option>)}</select></label>
                <label className="block">Unidad<input className={field} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></label>
                <label className="block">Descripción<textarea className={field} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
            </>}
            {step === 2 && <>
                <label className="block">¿Qué descuenta la venta?<select className={field} value={mode} onChange={e => setMode(e.target.value)}><option value="">Seleccionar</option><option value="STOCK">Unidades del producto en stock</option><option value="RECIPE">Ingredientes al preparar el producto</option></select></label>
                {mode === 'RECIPE' && <>
                    <label className="block">Receta<select className={field} value={recipeId} onChange={e => setRecipeId(e.target.value)}><option value="">Crear receta con los ingredientes siguientes</option>{recipes.filter(r => r.productId === id).map(r => <option key={r.id} value={r.id}>{r.name} · rinde {r.yield} {r.yieldUnit}</option>)}</select></label>
                    {!recipeId && <><label className="block">Rendimiento de la receta ({form.unit})<input className={field} type="number" min="0.001" step="any" value={yieldValue} onChange={e => setYieldValue(e.target.value)} /></label>
                        {ingredients.map((ingredient, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_130px_auto]">
                            <label>Ingrediente<select aria-label={`Ingrediente ${index + 1}`} className={field} value={ingredient.id} onChange={e => setIngredients(items => items.map((v, i) => i === index ? { ...v, id: e.target.value } : v))}><option value="">Seleccionar</option>{products.filter(p => p.active && p.id !== id).map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}</select></label>
                            <label>Cantidad<input aria-label={`Cantidad del ingrediente ${index + 1}`} className={field} type="number" min="0.001" step="any" value={ingredient.quantity} onChange={e => setIngredients(items => items.map((v, i) => i === index ? { ...v, quantity: e.target.value } : v))} /></label>
                            <button type="button" className="self-end p-3 text-danger" onClick={() => setIngredients(items => items.filter((_, i) => i !== index))}>Quitar</button>
                        </div>)}<button type="button" className="text-brand underline" onClick={() => setIngredients(items => [...items, { id: '', quantity: '' }])}>Agregar ingrediente</button></>}
                </>}
                <p className="text-sm text-muted">Sincroniza las ventas pendientes antes de cambiar la preparación o la receta.</p>
            </>}
            {step === 3 && <>
                <label className="block">Precio común (Bs.)<input className={field} type="number" min="0.01" step="0.01" value={commonPrice} onChange={e => setCommonPrice(e.target.value)} /></label>
                <p className="text-sm text-muted">Selecciona las sucursales y, si necesitas otro precio, escríbelo junto a su nombre. {form.category === 'ACAI_BASE' ? 'El precio es por kilogramo.' : ''}</p>
                {branches.map(branch => <div key={branch.id} className="flex flex-wrap items-center gap-3"><label className="min-w-40 flex-1"><input type="checkbox" checked={prices[branch.id] !== undefined} onChange={e => setPrices(p => ({ ...p, [branch.id]: e.target.checked ? '' : undefined }))} /> {branch.name}</label>
                    {prices[branch.id] !== undefined && <input aria-label={`Precio para ${branch.name}`} className={`${field} max-w-40`} type="number" min="0.01" step="0.01" placeholder="Precio común" value={prices[branch.id]} onChange={e => setPrices(p => ({ ...p, [branch.id]: e.target.value }))} />}</div>)}
            </>}
        </section>
        <div className="flex flex-wrap gap-3"><button type="button" className="min-h-12 rounded-lg border border-line px-4" disabled={busy || step === 1} onClick={() => setStep(step - 1)}>Anterior</button>
            {step < 3 ? <button type="button" className="min-h-12 rounded-lg bg-brand px-4 text-white" onClick={() => setStep(step + 1)}>Siguiente</button> : <button type="button" className="min-h-12 rounded-lg bg-brand px-4 text-white" disabled={busy} onClick={() => save(true)}>Guardar y habilitar</button>}
            <button type="button" className="min-h-12 rounded-lg border border-line px-4" disabled={busy} onClick={() => save(false)}>Guardar borrador</button></div>
    </main>;
}
