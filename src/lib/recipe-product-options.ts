type RecipeProduct = { type: string; category?: string | null };

// La categoría del catálogo puede ser más precisa que el tipo histórico:
// PACKAGING y BURGER_EXTRA se han guardado anteriormente como RAW_MATERIAL.
export function isRawMaterial(product: RecipeProduct): boolean {
    const category = product.category?.trim().toUpperCase();
    if (category === 'RAW_MATERIAL') return true;
    if (product.type === 'SUPPLY') return false;
    if (category && ['ACAI_BASE', 'ACAI_TOPPING', 'BURGER', 'BURGER_EXTRA', 'BEVERAGE', 'PACKAGING', 'SUPPLY'].includes(category)) return false;
    return product.type === 'RAW_MATERIAL';
}
