/**
 * COMPONENTE CALCULADORA DE TOPPINGS
 * 
 * Lista visual de toppings agregados con pesos y precios
 */

'use client';

import styles from './toppings-calculator.module.css';

export interface ToppingItem {
    id: string;
    productId: string;
    name: string;
    weight: number;         // kg
    pricePerKg: number;     // Precio por kg
    subtotal: number;       // peso × pricePerKg
}

export interface ToppingsCalculatorProps {
    items: ToppingItem[];
    onRemoveItem: (itemId: string) => void;
    currency?: string;
}

export function ToppingsCalculator({
    items,
    onRemoveItem,
    currency = 'S/'
}: ToppingsCalculatorProps) {

    // Calcular total
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    // Si no hay items, mostrar estado vacío
    if (items.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Toppings Agregados</h3>
                </div>

                <div className={styles.empty}>
                    <span className={styles.emptyIcon}>🥣</span>
                    <p>Aún no has agregado toppings</p>
                    <p className={styles.emptyHint}>Usa la balanza para pesar y agregar</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <h3 className={styles.title}>Toppings Agregados</h3>
                <span className={styles.count}>{items.length} item{items.length > 1 ? 's' : ''}</span>
            </div>

            {/* Lista de items */}
            <div className={styles.itemsList}>
                {items.map((item) => (
                    <div key={item.id} className={styles.item}>
                        {/* Info del topping */}
                        <div className={styles.itemInfo}>
                            <div className={styles.itemName}>{item.name}</div>
                            <div className={styles.itemDetails}>
                                {(item.weight * 1000).toFixed(0)}g × {currency}{item.pricePerKg.toFixed(2)}/kg
                            </div>
                        </div>

                        {/* Subtotal */}
                        <div className={styles.itemPrice}>
                            {currency}{item.subtotal.toFixed(2)}
                        </div>

                        {/* Botón eliminar */}
                        <button
                            onClick={() => onRemoveItem(item.id)}
                            className={styles.removeButton}
                            title="Eliminar"
                            aria-label={`Eliminar ${item.name}`}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            {/* Total */}
            <div className={styles.total}>
                <span className={styles.totalLabel}>TOTAL TOPPINGS:</span>
                <span className={styles.totalAmount}>{currency}{total.toFixed(2)}</span>
            </div>
        </div>
    );
}
