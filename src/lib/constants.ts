/**
 * Constantes globales de localización del sistema Skot ERP
 * Cambiar aquí afecta toda la aplicación.
 */

/** Símbolo de moneda */
export const CURRENCY = 'Bs.';

/** Formatea un número con el símbolo de moneda */
export function money(amount: number): string {
    return `${CURRENCY} ${amount.toFixed(2)}`;
}

/** Tipos de producto — valor en DB → etiqueta en español para la UI */
export const PRODUCT_TYPE_LABELS: Record<string, string> = {
    ACAI_BASE: 'Base Açaí',
    ACAI_TOPPING: 'Topping Açaí',
    BURGER: 'Hamburguesa',
    BURGER_EXTRA: 'Extra / Porción',
    BEVERAGE: 'Bebida',
    RAW_MATERIAL: 'Materia Prima',
    PACKAGING: 'Empaque',
    COMBO: 'Combo',
};

/** Colores de badge por tipo de producto */
export const PRODUCT_TYPE_COLORS: Record<string, string> = {
    ACAI_BASE: 'bg-purple-100 text-purple-700',
    ACAI_TOPPING: 'bg-pink-100 text-pink-700',
    BURGER: 'bg-orange-100 text-orange-700',
    BURGER_EXTRA: 'bg-amber-100 text-amber-700',
    BEVERAGE: 'bg-blue-100 text-blue-700',
    RAW_MATERIAL: 'bg-gray-100 text-gray-700',
    PACKAGING: 'bg-teal-100 text-teal-700',
    COMBO: 'bg-indigo-100 text-indigo-700',
};

/** Tipos que aparecen en el POS (vendibles al cliente) */
export const SELLABLE_TYPES = ['ACAI_BASE', 'ACAI_TOPPING', 'BURGER', 'BURGER_EXTRA', 'BEVERAGE', 'COMBO'];

/** Tipos de movimiento de stock — en español */
export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
    ENTRADA: 'Entrada',
    SALIDA: 'Salida',
    AJUSTE: 'Ajuste',
    MERMA: 'Merma',
    PRODUCTION: 'Producción',
    TRANSFER_IN: 'Transferencia Entrada',
    TRANSFER_OUT: 'Transferencia Salida',
    INVENTARIO_FISICO: 'Inventario Físico',
};

/** Estados de transferencia */
export const TRANSFER_STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pendiente',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
    CANCELLED: 'Cancelado',
    IN_TRANSIT: 'En tránsito',
    RECEIVED: 'Recibido',
};

/** Roles de usuario → etiqueta */
export const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Administrador',
    MANAGER: 'Encargado',
    CASHIER: 'Cajero',
    WAREHOUSE: 'Almacén / Fábrica',
};

/** Métodos de pago */
export const PAYMENT_LABELS: Record<string, string> = {
    CASH: 'Efectivo',
    CARD: 'Tarjeta',
    TRANSFER: 'Transferencia',
    MIXED: 'Mixto',
    QR: 'QR',
};
