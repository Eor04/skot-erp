/**
 * Componente: Carrito de Compra para POS de Hamburguesas
 * Muestra los items agregados con modificadores, cantidades y totales
 */

'use client';

import { CartItem, DiscountInfo } from '@/hooks/use-burger-sale';
import { Trash2, Plus, Minus } from 'lucide-react';

interface CartProps {
    items: CartItem[];
    discount: DiscountInfo | null;
    onUpdateQuantity: (index: number, quantity: number) => void;
    onRemoveItem: (index: number) => void;
    onApplyDiscount: () => void;
    onClearCart: () => void;
    onCheckout: () => void;
    subtotal: number;
    discountAmount: number;
    total: number;
}

export default function Cart({
    items,
    discount,
    onUpdateQuantity,
    onRemoveItem,
    onApplyDiscount,
    onClearCart,
    onCheckout,
    subtotal,
    discountAmount,
    total,
}: CartProps) {
    return (
        <div className="flex flex-col h-full bg-gray-50 border-l border-gray-200">
            {/* Header */}
            <div className="px-4 py-3 bg-orange-600 text-white">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Pedido Actual</h2>
                    {items.length > 0 && (
                        <button
                            onClick={onClearCart}
                            className="text-sm text-white/90 hover:text-white underline"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
                <div className="text-sm text-white/80 mt-1">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                </div>
            </div>

            {/* Lista de items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <svg
                            className="w-16 h-16 mb-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                        </svg>
                        <p className="text-sm">Carrito vacío</p>
                    </div>
                ) : (
                    items.map((item, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-lg p-3 shadow-sm border border-gray-200"
                        >
                            {/* Item header */}
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-800">
                                        {item.product.name}
                                    </h3>
                                    {/* Modificadores */}
                                    {item.selectedModifiers.length > 0 && (
                                        <div className="mt-1 space-y-1">
                                            {item.selectedModifiers.map(({ modifier }, idx) => (
                                                <div
                                                    key={idx}
                                                    className="text-xs text-gray-600 flex items-center gap-1"
                                                >
                                                    <span>+</span>
                                                    <span>{modifier.name}</span>
                                                    <span className="text-orange-600 ml-auto">
                                                        Bs. {modifier.price.toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => onRemoveItem(index)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Cantidad y subtotal */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() =>
                                            onUpdateQuantity(index, item.quantity - 1)
                                        }
                                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-8 text-center font-semibold">
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() =>
                                            onUpdateQuantity(index, item.quantity + 1)
                                        }
                                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="font-bold text-orange-600">
                                    Bs. {item.subtotal.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer: Totales y acciones */}
            {items.length > 0 && (
                <div className="border-t border-gray-200 bg-white p-4 space-y-3">
                    {/* Subtotal */}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-semibold">Bs. {subtotal.toFixed(2)}</span>
                    </div>

                    {/* Descuento */}
                    {discount ? (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-green-600">
                                Descuento (
                                {discount.type === 'PERCENTAGE'
                                    ? `${discount.value}%`
                                    : `Bs. ${discount.value}`}
                                ):
                            </span>
                            <span className="font-semibold text-green-600">
                                -Bs. {discountAmount.toFixed(2)}
                            </span>
                        </div>
                    ) : (
                        <button
                            onClick={onApplyDiscount}
                            className="w-full text-sm text-orange-600 hover:text-orange-700 underline text-left"
                        >
                            Aplicar descuento
                        </button>
                    )}

                    {/* Total */}
                    <div className="flex items-center justify-between text-lg font-bold border-t pt-3">
                        <span>Total:</span>
                        <span className="text-orange-600">Bs. {total.toFixed(2)}</span>
                    </div>

                    {/* Botón de pago */}
                    <button
                        onClick={onCheckout}
                        className="w-full py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition"
                    >
                        Procesar Pago
                    </button>
                </div>
            )}
        </div>
    );
}
