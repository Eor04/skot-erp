/**
 * HOOK PARA VENTAS AÇAÍ
 *
 * Soporta:
 * - Sabor único o MIXTO (múltiples sabores en el mismo bowl)
 * - Venta de extras/bebidas SOLAS sin bowl (sin balanza)
 * - Precio del bowl = peso total × precio/kg promedio de los sabores
 */

'use client';

import { useState, useCallback } from 'react';

export interface Product {
    id: string;
    name: string;
    type: string;
    price?: number;
    pricePerKg?: number;
}

export interface ExtraItem {
    id: string;
    product: Product;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export interface AcaiCart {
    /** ¿Modo mixto activado? */
    isMixto: boolean;
    /** Sabores seleccionados (1 en normal, N en mixto) */
    flavors: { product: Product; pricePerKg: number }[];
    /** Extras/bebidas */
    extras: ExtraItem[];
    /** Peso total del bowl desde la balanza (en kg) */
    totalWeight: number;
    /** ¿Peso confirmado por el cajero? */
    weightConfirmed: boolean;
    /** Precio/kg efectivo (único o promedio en mixto) */
    effectivePricePerKg: number;
    /** Subtotal del bowl: totalWeight × effectivePricePerKg */
    bowlSubtotal: number;
    /** Subtotal de extras */
    extrasSubtotal: number;
    /** Total de la venta */
    total: number;
}

const EMPTY_CART: AcaiCart = {
    isMixto: false,
    flavors: [],
    extras: [],
    totalWeight: 0,
    weightConfirmed: false,
    effectivePricePerKg: 0,
    bowlSubtotal: 0,
    extrasSubtotal: 0,
    total: 0,
};

function recalc(cart: AcaiCart): AcaiCart {
    // Precio efectivo: promedio de los sabores seleccionados
    const effectivePricePerKg =
        cart.flavors.length > 0
            ? Math.round(
                  (cart.flavors.reduce((s, f) => s + f.pricePerKg, 0) / cart.flavors.length) * 100
              ) / 100
            : 0;

    const bowlSubtotal =
        cart.weightConfirmed && cart.flavors.length > 0
            ? Math.round(cart.totalWeight * effectivePricePerKg * 100) / 100
            : 0;

    const extrasSubtotal =
        Math.round(cart.extras.reduce((s, e) => s + e.subtotal, 0) * 100) / 100;

    return { ...cart, effectivePricePerKg, bowlSubtotal, extrasSubtotal, total: bowlSubtotal + extrasSubtotal };
}

export function useAcaiSale(_branchId: string, _userId: string) {
    const [cart, setCart] = useState<AcaiCart>(EMPTY_CART);

    /** Cambiar entre modo normal y mixto */
    const setMixtoMode = useCallback((mixto: boolean) => {
        setCart(prev => recalc({ ...prev, isMixto: mixto, flavors: [], totalWeight: 0, weightConfirmed: false }));
    }, []);

    /** Seleccionar sabor único (modo normal): reemplaza el anterior */
    const setFlavor = useCallback((product: Product, pricePerKg: number) => {
        setCart(prev =>
            recalc({
                ...prev,
                isMixto: false,
                flavors: [{ product, pricePerKg }],
                totalWeight: 0,
                weightConfirmed: false,
            })
        );
    }, []);

    /** Alternar sabor en modo mixto */
    const toggleFlavor = useCallback((product: Product, pricePerKg: number) => {
        setCart(prev => {
            const exists = prev.flavors.some(f => f.product.id === product.id);
            const flavors = exists
                ? prev.flavors.filter(f => f.product.id !== product.id)
                : [...prev.flavors, { product, pricePerKg }];
            return recalc({ ...prev, flavors, totalWeight: 0, weightConfirmed: false });
        });
    }, []);

    /** Confirmar peso de la balanza */
    const confirmWeight = useCallback((weight: number) => {
        setCart(prev => recalc({ ...prev, totalWeight: weight, weightConfirmed: true }));
    }, []);

    /** Resetear peso */
    const resetWeight = useCallback(() => {
        setCart(prev => recalc({ ...prev, totalWeight: 0, weightConfirmed: false }));
    }, []);

    /** Agregar extra (acumula si ya existe) */
    const addExtra = useCallback((product: Product, quantity: number = 1) => {
        if (!product.price || product.price <= 0) return;
        setCart(prev => {
            const idx = prev.extras.findIndex(e => e.product.id === product.id);
            const extras =
                idx >= 0
                    ? prev.extras.map((e, i) =>
                          i === idx
                              ? { ...e, quantity: e.quantity + quantity, subtotal: (e.quantity + quantity) * e.unitPrice }
                              : e
                      )
                    : [
                          ...prev.extras,
                          {
                              id: crypto.randomUUID(),
                              product,
                              quantity,
                              unitPrice: product.price!,
                              subtotal: quantity * product.price!,
                          },
                      ];
            return recalc({ ...prev, extras });
        });
    }, []);

    /** Decrementar extra */
    const decrementExtra = useCallback((id: string) => {
        setCart(prev => {
            const extras = prev.extras
                .map(e => e.id === id ? { ...e, quantity: e.quantity - 1, subtotal: (e.quantity - 1) * e.unitPrice } : e)
                .filter(e => e.quantity > 0);
            return recalc({ ...prev, extras });
        });
    }, []);

    /** Eliminar extra */
    const removeExtra = useCallback((id: string) => {
        setCart(prev => recalc({ ...prev, extras: prev.extras.filter(e => e.id !== id) }));
    }, []);

    /** Limpiar todo */
    const clearCart = useCallback(() => setCart(EMPTY_CART), []);

    return {
        cart,
        setMixtoMode,
        setFlavor,
        toggleFlavor,
        confirmWeight,
        resetWeight,
        addExtra,
        decrementExtra,
        removeExtra,
        clearCart,
    };
}
