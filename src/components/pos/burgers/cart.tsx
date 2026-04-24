'use client';

import { CartItem, DiscountInfo } from '@/hooks/use-burger-sale';
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';

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
    items, discount,
    onUpdateQuantity, onRemoveItem, onApplyDiscount, onClearCart, onCheckout,
    subtotal, discountAmount, total,
}: CartProps) {
    return (
        <div className="flex flex-col h-full bg-gray-50 border-l border-gray-200">

            {/* Header — negro con letras blancas */}
            <div className="px-4 py-3 bg-black text-white">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Pedido Actual
                    </h2>
                    {items.length > 0 && (
                        <button
                            onClick={onClearCart}
                            className="text-sm text-white/70 hover:text-white underline transition"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
                <div className="text-sm text-white/60 mt-0.5">
                    {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
                </div>
            </div>

            {/* Lista de ítems */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <ShoppingCart className="w-16 h-16 mb-3 opacity-20" />
                        <p className="text-sm">Carrito vacío</p>
                        <p className="text-xs mt-1 text-gray-300">Tocá un producto para agregarlo</p>
                    </div>
                ) : (
                    items.map((item, index) => (
                        <div key={index} className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">

                            {/* Nombre + eliminar */}
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-800 text-sm leading-tight">
                                        {item.product.name}
                                    </h3>
                                    {/* Modificadores seleccionados */}
                                    {item.selectedModifiers.length > 0 && (
                                        <div className="mt-1 space-y-0.5">
                                            {item.selectedModifiers.map(({ modifier }, idx) => (
                                                <div key={idx} className="text-xs text-gray-500 flex items-center gap-1">
                                                    <span className="text-red-500 font-bold">+</span>
                                                    <span>{modifier.name}</span>
                                                    <span className="text-red-500 font-semibold ml-auto">
                                                        Bs. {modifier.price.toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => onRemoveItem(index)}
                                    className="text-red-400 hover:text-red-600 p-1 ml-1 transition flex-shrink-0"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Cantidad y subtotal */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                                        className="w-7 h-7 rounded-lg bg-black text-white hover:bg-gray-800 flex items-center justify-center transition"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                                    <button
                                        onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                                        className="w-7 h-7 rounded-lg bg-black text-white hover:bg-gray-800 flex items-center justify-center transition"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="font-black text-red-600 text-sm">
                                    Bs. {item.subtotal.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer: totales y pago */}
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
                                Descuento ({discount.type === 'PERCENTAGE' ? `${discount.value}%` : `Bs. ${discount.value}`}):
                            </span>
                            <span className="font-semibold text-green-600">-Bs. {discountAmount.toFixed(2)}</span>
                        </div>
                    ) : (
                        <button
                            onClick={onApplyDiscount}
                            className="w-full text-sm text-red-600 hover:text-red-700 underline text-left transition"
                        >
                            Aplicar descuento
                        </button>
                    )}

                    {/* Total */}
                    <div className="flex items-center justify-between text-xl font-black border-t pt-3">
                        <span>Total:</span>
                        <span className="text-red-600">Bs. {total.toFixed(2)}</span>
                    </div>

                    {/* Botón cobrar — amarillo con letra negra (colores del logo) */}
                    <button
                        onClick={onCheckout}
                        className="w-full py-3.5 bg-yellow-400 text-black rounded-xl font-black text-lg hover:bg-yellow-300 transition shadow-lg shadow-yellow-200"
                    >
                        🍔 Procesar Pago — Bs. {total.toFixed(2)}
                    </button>
                </div>
            )}
        </div>
    );
}
