'use client';

import { Product } from '@prisma/client';
import { useState } from 'react';
import Image from 'next/image';
import { ChefHat } from 'lucide-react';

interface ProductGridProps {
    products: (Product & { customPrice?: number })[];
    /** Agrega el producto al carrito directo (sin modificadores) */
    onProductAdd: (product: Product & { customPrice?: number }) => void;
    /** Abre el modal de modificadores para ese producto */
    onOpenModifiers: (product: Product & { customPrice?: number }) => void;
}

export default function ProductGrid({ products, onProductAdd, onOpenModifiers }: ProductGridProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const filteredProducts = selectedCategory
        ? products.filter(p => p.category === selectedCategory)
        : products;

    return (
        <div className="flex flex-col h-full">

            {/* Filtro de categorías */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 flex-shrink-0">
                <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition text-sm ${
                        selectedCategory === null
                            ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-200'
                            : 'bg-black text-white hover:bg-gray-800'
                    }`}
                >
                    Todos
                </button>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat!)}
                        className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition text-sm ${
                            selectedCategory === cat
                                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-200'
                                : 'bg-black text-white hover:bg-gray-800'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Grid de productos */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto flex-1 pb-2">
                {filteredProducts.map(product => (
                    <div
                        key={product.id}
                        className="flex flex-col bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-yellow-400 hover:shadow-lg hover:shadow-yellow-100 transition group"
                    >
                        {/* Imagen — clic directo agrega al carrito */}
                        <button
                            onClick={() => onProductAdd(product)}
                            className="relative w-full pt-[70%] bg-gray-100 block"
                            title="Agregar al carrito"
                        >
                            {product.imageUrl ? (
                                <Image
                                    src={product.imageUrl}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <svg className="w-14 h-14 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            )}
                        </button>

                        {/* Info + botones */}
                        <div className="p-3 flex flex-col flex-1">
                            {/* Nombre */}
                            <button
                                onClick={() => onProductAdd(product)}
                                className="text-left"
                                title="Agregar al carrito"
                            >
                                <h3 className="font-semibold text-gray-800 line-clamp-2 mb-1 group-hover:text-black transition text-sm">
                                    {product.name}
                                </h3>
                                {product.description && (
                                    <p className="text-xs text-gray-500 line-clamp-1 mb-2">{product.description}</p>
                                )}
                            </button>

                            {/* Precio */}
                            <div className="mt-auto flex items-center justify-between gap-2">
                                <button
                                    onClick={() => onProductAdd(product)}
                                    className="text-lg font-black text-red-600 hover:text-red-700 transition"
                                    title="Agregar al carrito"
                                >
                                    Bs. {(product.customPrice || 0).toFixed(2)}
                                </button>

                                {/* Botón de modificadores / extras — separado */}
                                <button
                                    onClick={e => { e.stopPropagation(); onOpenModifiers(product); }}
                                    title="Agregar con extras / modificadores"
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-400 text-black text-xs font-bold hover:bg-yellow-300 transition flex-shrink-0"
                                >
                                    <ChefHat className="h-3 w-3" />
                                    Extras
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredProducts.length === 0 && (
                <div className="flex items-center justify-center py-16">
                    <p className="text-gray-500">No hay productos en esta categoría</p>
                </div>
            )}
        </div>
    );
}
