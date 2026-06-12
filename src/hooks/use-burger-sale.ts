/**
 * Hook personalizado para manejar ventas de hamburguesas (POS)
 */

import { useState, useCallback } from 'react';
import { Product, ProductModifier } from '@prisma/client';

// Tipo extendido para items del carrito
export interface CartItem {
    product: Product;
    quantity: number;
    selectedModifiers: Array<{
        modifier: ProductModifier;
        quantity: number;
    }>;
    subtotal: number;
}

// Tipo para descuento
export interface DiscountInfo {
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    authorizedBy?: string; // ID del usuario que autorizó
}

// Hook de ventas de hamburguesas
export function useBurgerSale(branchId: string) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [discount, setDiscount] = useState<DiscountInfo | null>(null);

    // Agregar producto al carrito
    const addToCart = useCallback((product: Product, modifiers: ProductModifier[] = []) => {
        setCart((prev) => {
            const currentTotalQty = prev.filter(i => i.product.id === product.id).reduce((s, i) => s + i.quantity, 0);
            const maxStock = (product as any).currentStock ?? Infinity;

            if (currentTotalQty >= maxStock) {
                return prev; // Stop adding
            }

            // Verificar si el producto ya existe con los mismos modificadores
            const existingIndex = prev.findIndex((item) => {
                if (item.product.id !== product.id) return false;
                if (item.selectedModifiers.length !== modifiers.length) return false;

                // Comparar modificadores
                const modifierIds = item.selectedModifiers.map((m) => m.modifier.id).sort();
                const newModifierIds = modifiers.map((m) => m.id).sort();
                return JSON.stringify(modifierIds) === JSON.stringify(newModifierIds);
            });

            if (existingIndex !== -1) {
                // Incrementar cantidad
                const updated = [...prev];
                updated[existingIndex].quantity += 1;
                updated[existingIndex].subtotal = calculateItemSubtotal(updated[existingIndex]);
                return updated;
            }

            // Agregar nuevo item
            const newItem: CartItem = {
                product,
                quantity: 1,
                selectedModifiers: modifiers.map((mod) => ({ modifier: mod, quantity: 1 })),
                subtotal: 0,
            };
            newItem.subtotal = calculateItemSubtotal(newItem);
            return [...prev, newItem];
        });
    }, []);

    // Remover item del carrito
    const removeFromCart = useCallback((index: number) => {
        setCart((prev) => prev.filter((_, i) => i !== index));
    }, []);

    // Actualizar cantidad de un item
    const updateQuantity = useCallback((index: number, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(index);
            return;
        }

        setCart((prev) => {
            const item = prev[index];
            const otherItemsQty = prev.filter((i, idx) => idx !== index && i.product.id === item.product.id).reduce((s, i) => s + i.quantity, 0);
            const maxStock = (item.product as any).currentStock ?? Infinity;

            let finalQty = quantity;
            if (otherItemsQty + quantity > maxStock) {
                finalQty = maxStock - otherItemsQty;
            }
            if (finalQty <= 0) return prev;

            const updated = [...prev];
            updated[index].quantity = finalQty;
            updated[index].subtotal = calculateItemSubtotal(updated[index]);
            return updated;
        });
    }, [removeFromCart]);

    // Limpiar carrito
    const clearCart = useCallback(() => {
        setCart([]);
        setDiscount(null);
    }, []);

    // Aplicar descuento
    const applyDiscount = useCallback((discountInfo: DiscountInfo | null) => {
        setDiscount(discountInfo);
    }, []);

    // Calcular subtotal de un item (precio + modificadores) * cantidad
    const calculateItemSubtotal = (item: CartItem): number => {
        const basePrice =
            (item.product as any).customPrice || // Precio personalizado por sucursal
            0; // Fallback

        const modifiersPrice = item.selectedModifiers.reduce(
            (sum, { modifier, quantity }) => sum + modifier.price * quantity,
            0
        );

        return (basePrice + modifiersPrice) * item.quantity;
    };

    // Calcular total del carrito
    const calculateTotal = useCallback(() => {
        const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

        if (!discount) return subtotal;

        if (discount.type === 'PERCENTAGE') {
            return subtotal * (1 - discount.value / 100);
        }

        return subtotal - discount.value;
    }, [cart, discount]);

    // Calcular subtotal sin descuento
    const calculateSubtotal = useCallback(() => {
        return cart.reduce((sum, item) => sum + item.subtotal, 0);
    }, [cart]);

    // Calcular el monto del descuento
    const calculateDiscountAmount = useCallback(() => {
        if (!discount) return 0;

        const subtotal = calculateSubtotal();

        if (discount.type === 'PERCENTAGE') {
            return subtotal * (discount.value / 100);
        }

        return discount.value;
    }, [discount, calculateSubtotal]);

    // Verificar si se requiere autorización (>15%)
    const requiresAuthorization = useCallback((discountValue: number, type: 'PERCENTAGE' | 'FIXED') => {
        if (type === 'PERCENTAGE') {
            return discountValue > 15;
        }

        const subtotal = calculateSubtotal();
        const discountPercentage = (discountValue / subtotal) * 100;
        return discountPercentage > 15;
    }, [calculateSubtotal]);

    return {
        cart,
        discount,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        applyDiscount,
        calculateTotal,
        calculateSubtotal,
        calculateDiscountAmount,
        requiresAuthorization,
    };
}
