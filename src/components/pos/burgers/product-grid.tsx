/**
 * Componente: Grid de Productos para POS de Hamburguesas
 * Muestra los productos en forma de grid con imágenes y categorías
 */

'use client';

import { Product } from '@prisma/client';
import { useState } from 'react';
import Image from 'next/image';

interface ProductGridProps {
    products: (Product & { customPrice?: number })[];
    onProductSelect: (product: Product & { customPrice?: number }) => void;
}

export default function ProductGrid({ products, onProductSelect }: ProductGridProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Obtener categorías únicas
    const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

    // Filtrar productos por categoría
    const filteredProducts = selectedCategory
        ? products.filter((p) => p.category === selectedCategory)
        : products;

    return (
        <div className="flex flex-col h-full">
            {/* Selector de categorías */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${selectedCategory === null
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Todos
                </button>
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category!)}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${selectedCategory === category
                                ? 'bg-orange-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Grid de productos */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto flex-1">
                {filteredProducts.map((product) => (
                    <button
                        key={product.id}
                        onClick={() => onProductSelect(product)}
                        className="flex flex-col bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:border-orange-500 hover:shadow-lg transition group"
                    >
                        {/* Imagen del producto */}
                        <div className="relative w-full pt-[75%] bg-gray-100">
                            {product.imageUrl ? (
                                <Image
                                    src={product.imageUrl}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <svg
                                        className="w-16 h-16 text-gray-300"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Info del producto */}
                        <div className="p-3 flex-1 flex flex-col">
                            <h3 className="font-semibold text-gray-800 text-left line-clamp-2 mb-1 group-hover:text-orange-600 transition">
                                {product.name}
                            </h3>
                            {product.description && (
                                <p className="text-xs text-gray-500 text-left line-clamp-1 mb-2">
                                    {product.description}
                                </p>
                            )}
                            <div className="mt-auto">
                                <div className="text-lg font-bold text-orange-600">
                                    Bs. {(product.customPrice || 0).toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Mensaje si no hay productos */}
            {filteredProducts.length === 0 && (
                <div className="flex items-center justify-center py-16">
                    <p className="text-gray-500 text-lg">
                        No hay productos disponibles en esta categoría
                    </p>
                </div>
            )}
        </div>
    );
}
