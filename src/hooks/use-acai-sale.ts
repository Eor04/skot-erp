/**
 * HOOK PARA MANEJO DE VENTAS ACAI
 * 
 * Gestiona el carrito de compra para el POS de Acai:
 * - Base (bowl/copa) opcional precio fijo
 * - Toppings por peso
 * - Extras fijos (bebidas, extras)
 * - Cálculo de totales
 * - Integración con offline sync
 */

'use client';

import { useState, useCallback } from 'react';
import { useSyncQueue } from '@/hooks/use-sync-queue';
import { useNetworkStatus } from '@/hooks/use-network-status';

// Tipos de productos
export interface Product {
    id: string;
    name: string;
    type: 'ACAI_BASE' | 'ACAI_TOPPING' | 'BEVERAGE';
    price?: number;      // Precio fijo
    pricePerKg?: number; // Precio por kg para toppings
}

// Items en el carrito
export interface BaseItem {
    id: string;
    product: Product;
    price: number;
}

export interface ToppingItem {
    id: string;
    product: Product;
    weight: number;       // kg
    pricePerKg: number;
    subtotal: number;     // weight × pricePerKg
}

export interface ExtraItem {
    id: string;
    product: Product;
    quantity: number;
    unitPrice: number;
    subtotal: number;     // quantity × unitPrice
}

// Estado del carrito
export interface AcaiCart {
    base: BaseItem | null;
    toppings: ToppingItem[];
    extras: ExtraItem[];
    total: number;
}

// Método de pago
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'MIXED';

/**
 * Hook para gestionar ventas de Acai
 */
export function useAcaiSale(branchId: string, userId: string) {
    // Estado del carrito
    const [cart, setCart] = useState<AcaiCart>({
        base: null,
        toppings: [],
        extras: [],
        total: 0
    });

    // Hooks de sincronización
    const { addToQueue } = useSyncQueue();
    const isOnline = useNetworkStatus();

    /**
     * Calcular total del carrito
     */
    const calculateTotal = useCallback((currentCart: AcaiCart): number => {
        let total = 0;

        // Base
        if (currentCart.base) {
            total += currentCart.base.price;
        }

        // Toppings
        total += currentCart.toppings.reduce((sum, item) => sum + item.subtotal, 0);

        // Extras
        total += currentCart.extras.reduce((sum, item) => sum + item.subtotal, 0);

        return total;
    }, []);

    /**
     * Establecer base del bowl/copa
     */
    const setBase = useCallback((product: Product) => {
        if (product.type !== 'ACAI_BASE') {
            throw new Error('El producto no es una base de Acai');
        }

        // Precio 0 está permitido (puede no estar configurado aún)
        if (product.price === undefined || product.price === null) {
            console.warn('[useAcaiSale] Producto base sin precio, usando 0');
        }

        const baseItem: BaseItem = {
            id: crypto.randomUUID(),
            product,
            price: product.price ?? 0,
        };

        setCart(prev => {
            const updated = { ...prev, base: baseItem };
            return { ...updated, total: calculateTotal(updated) };
        });
    }, [calculateTotal]);

    /**
     * Agregar topping por peso
     */
    const addTopping = useCallback((
        product: Product,
        weight: number,
        pricePerKg: number
    ) => {
        if (product.type !== 'ACAI_TOPPING') {
            throw new Error('El producto no es un topping de Acai');
        }

        if (weight <= 0) {
            throw new Error('El peso debe ser mayor a 0');
        }

        if (pricePerKg <= 0) {
            throw new Error('El precio por kg debe ser mayor a 0');
        }

        const toppingItem: ToppingItem = {
            id: crypto.randomUUID(),
            product,
            weight,
            pricePerKg,
            subtotal: weight * pricePerKg
        };

        setCart(prev => {
            const updated = {
                ...prev,
                toppings: [...prev.toppings, toppingItem]
            };
            return { ...updated, total: calculateTotal(updated) };
        });
    }, [calculateTotal]);

    /**
     * Agregar extra (bebida u otro producto fijo)
     */
    const addExtra = useCallback((product: Product, quantity: number = 1) => {
        if (!product.price || product.price <= 0) {
            throw new Error('El producto extra debe tener un precio válido');
        }

        if (quantity <= 0) {
            throw new Error('La cantidad debe ser mayor a 0');
        }

        // Buscar si ya existe el mismo producto
        const existingIndex = cart.extras.findIndex(e => e.product.id === product.id);

        setCart(prev => {
            let updatedExtras: ExtraItem[];

            if (existingIndex >= 0) {
                // Incrementar cantidad si ya existe
                updatedExtras = prev.extras.map((item, idx) => {
                    if (idx === existingIndex) {
                        const newQuantity = item.quantity + quantity;
                        return {
                            ...item,
                            quantity: newQuantity,
                            subtotal: newQuantity * item.unitPrice
                        };
                    }
                    return item;
                });
            } else {
                // Agregar nuevo
                const extraItem: ExtraItem = {
                    id: crypto.randomUUID(),
                    product,
                    quantity,
                    unitPrice: product.price!,
                    subtotal: quantity * product.price!
                };
                updatedExtras = [...prev.extras, extraItem];
            }

            const updated = { ...prev, extras: updatedExtras };
            return { ...updated, total: calculateTotal(updated) };
        });
    }, [cart.extras, calculateTotal]);

    /**
     * Eliminar item del carrito
     */
    const removeItem = useCallback((itemId: string, itemType: 'base' | 'topping' | 'extra') => {
        setCart(prev => {
            let updated = { ...prev };

            switch (itemType) {
                case 'base':
                    updated.base = null;
                    break;
                case 'topping':
                    updated.toppings = prev.toppings.filter(t => t.id !== itemId);
                    break;
                case 'extra':
                    updated.extras = prev.extras.filter(e => e.id !== itemId);
                    break;
            }

            return { ...updated, total: calculateTotal(updated) };
        });
    }, [calculateTotal]);

    /**
     * Limpiar carrito
     */
    const clearCart = useCallback(() => {
        setCart({
            base: null,
            toppings: [],
            extras: [],
            total: 0
        });
    }, []);

    /**
     * Procesar venta
     */
    const processSale = useCallback(async (paymentMethod: PaymentMethod) => {
        // Validar que hay items en el carrito
        if (cart.total <= 0) {
            throw new Error('El carrito está vacío');
        }

        // Crear payload de venta
        const salePayload = {
            branchId,
            userId,
            totalAmount: cart.total,
            paymentMethod,
            items: [
                // Base
                ...(cart.base ? [{
                    productId: cart.base.product.id,
                    quantity: 1,
                    unitPrice: cart.base.price,
                    subtotal: cart.base.price,
                    discount: 0
                }] : []),

                // Toppings
                ...cart.toppings.map(t => ({
                    productId: t.product.id,
                    quantity: t.weight,  // Guardar peso como quantity
                    unitPrice: t.pricePerKg,
                    subtotal: t.subtotal,
                    discount: 0
                })),

                // Extras
                ...cart.extras.map(e => ({
                    productId: e.product.id,
                    quantity: e.quantity,
                    unitPrice: e.unitPrice,
                    subtotal: e.subtotal,
                    discount: 0
                }))
            ],
            createdAt: new Date().toISOString()
        };

        try {
            if (isOnline) {
                // TODO: Implementar llamada a API cuando esté disponible
                // const response = await fetch('/api/sales', {
                //   method: 'POST',
                //   headers: { 'Content-Type': 'application/json' },
                //   body: JSON.stringify(salePayload)
                // });
                // const sale = await response.json();

                console.log('Venta procesada (API pendiente):', salePayload);

            } else {
                // Modo offline: agregar a cola de sincronización
                await addToQueue({
                    id: crypto.randomUUID(),
                    type: 'SALE',
                    payload: salePayload,
                    priority: 1 // Alta prioridad para ventas
                });

                console.log('Venta guardada offline:', salePayload);
            }

            // Limpiar carrito después de procesar
            clearCart();

            return {
                success: true,
                offline: !isOnline,
                saleNumber: `ACAI-${branchId}-${Date.now()}` // Temporal
            };

        } catch (error) {
            console.error('Error al procesar venta:', error);
            throw error;
        }
    }, [cart, branchId, userId, isOnline, addToQueue, clearCart]);

    return {
        // Estado
        cart,

        // Acciones
        setBase,
        addTopping,
        addExtra,
        removeItem,
        clearCart,
        processSale
    };
}
