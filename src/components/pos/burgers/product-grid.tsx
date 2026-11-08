'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { Product } from '@prisma/client';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ProductWithPrice = Product & { customPrice?: number; currentStock?: number };

interface ProductGridProps {
    products: ProductWithPrice[];
    onProductAdd: (product: ProductWithPrice) => void;
    onOpenModifiers: (product: ProductWithPrice) => void;
}

export default function ProductGrid({ products, onProductAdd, onOpenModifiers }: ProductGridProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const categories = useMemo(() => Array.from(new Set(products.map(product => product.category).filter((category): category is string => Boolean(category)))), [products]);
    const filtered = selectedCategory ? products.filter(product => product.category === selectedCategory) : products;

    return <div className="flex min-h-0 flex-col">
        <div className="mb-4 flex shrink-0 gap-2 overflow-x-auto pb-2" aria-label="Categorías de productos">
            <button type="button" onClick={() => setSelectedCategory(null)} aria-pressed={selectedCategory === null}
                className={`min-h-12 shrink-0 rounded-lg px-4 font-semibold ${selectedCategory === null ? 'bg-brand text-white' : 'border border-line bg-surface text-ink hover:bg-canvas'}`}>Todos</button>
            {categories.map(category => <button key={category} type="button" onClick={() => setSelectedCategory(category)} aria-pressed={selectedCategory === category}
                className={`min-h-12 shrink-0 rounded-lg px-4 font-semibold ${selectedCategory === category ? 'bg-brand text-white' : 'border border-line bg-surface text-ink hover:bg-canvas'}`}>{category}</button>)}
        </div>
        {filtered.length === 0 ? <p className="rounded-xl border border-line-subtle bg-surface p-6 text-muted">No hay productos en esta categoría.</p> :
        <div className="skot-catalog-grid min-h-0 overflow-y-auto pb-2">
            {filtered.map(product => {
                const unavailable = product.currentStock === 0;
                return <article key={product.id} className={`flex min-h-[206px] min-w-0 flex-col overflow-hidden rounded-xl border border-line-subtle bg-surface ${unavailable ? 'opacity-60' : 'hover:border-brand'}`}>
                    {product.imageUrl && <div className="relative h-28 w-full bg-canvas"><Image src={product.imageUrl} alt="" fill sizes="(max-width: 768px) 100vw, 290px" className="object-cover" /></div>}
                    <div className="flex flex-1 flex-col p-4">
                        <span className="text-xs font-semibold text-muted">{product.category || 'Producto'}</span>
                        <h3 className="mt-1 break-words text-lg font-semibold leading-snug text-ink">{product.name}</h3>
                        {product.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{product.description}</p>}
                        {unavailable && <p className="mt-1 text-sm font-semibold text-danger">Sin stock</p>}
                        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t border-line-subtle pt-4">
                            <span className="skot-display text-xl font-semibold tabular-nums">Bs. {(product.customPrice || 0).toFixed(2)}</span>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="secondary" size="touch" onClick={() => onOpenModifiers(product)} disabled={unavailable} aria-label={`Elegir modificadores de ${product.name}`} className="px-3"><SlidersHorizontal size={18} aria-hidden="true" /> Extras</Button>
                                <Button size="touch" onClick={() => onProductAdd(product)} disabled={unavailable} aria-label={`Agregar ${product.name} al pedido`} className="px-3"><Plus size={18} aria-hidden="true" /> Agregar</Button>
                            </div>
                        </div>
                    </div>
                </article>;
            })}
        </div>}
    </div>;
}
