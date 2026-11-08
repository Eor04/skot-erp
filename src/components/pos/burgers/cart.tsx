'use client';

import { useState } from 'react';
import { Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import { CartItem, DiscountInfo } from '@/hooks/use-burger-sale';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

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

export default function Cart({ items, discount, onUpdateQuantity, onRemoveItem, onApplyDiscount, onClearCart, onCheckout, subtotal, discountAmount, total }: CartProps) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const checkout = () => { setMobileOpen(false); onCheckout(); };
    const content = (compact: boolean) => <>
        <div className="flex items-center justify-between gap-2 border-b border-line-subtle p-4">
            <div><h2 id={compact ? 'burger-mobile-order-title' : undefined} className="flex items-center gap-2 text-lg font-semibold"><ShoppingCart size={19} aria-hidden="true" /> Pedido actual</h2><p className="text-sm text-muted">{items.length} {items.length === 1 ? 'producto' : 'productos'}</p></div>
            <div className="flex items-center gap-1">{items.length > 0 && <Button variant="quiet" onClick={onClearCart} className="text-sm">Limpiar</Button>}{compact && <button type="button" onClick={() => setMobileOpen(false)} aria-label="Cerrar resumen del pedido" className="grid h-12 w-12 place-items-center rounded-lg text-muted hover:bg-canvas"><X size={20} aria-hidden="true" /></button>}</div>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {items.length === 0 ? <p className="py-8 text-center text-muted">Agregá un producto para comenzar el pedido.</p> : items.map((item, index) => {
                const base = (item.product as typeof item.product & { customPrice?: number }).customPrice || 0;
                return <article key={`${item.product.id}-${index}`} className="rounded-lg border border-line-subtle bg-surface p-3">
                    <div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><h3 className="break-words font-semibold leading-snug">{item.product.name}</h3><p className="mt-1 text-sm text-muted tabular-nums">Base Bs. {base.toFixed(2)}</p></div>
                        <button type="button" onClick={() => onRemoveItem(index)} aria-label={`Eliminar ${item.product.name}`} className="grid h-12 w-12 shrink-0 place-items-center rounded-lg text-danger hover:bg-[var(--status-error-bg)]"><Trash2 size={18} /></button>
                    </div>
                    {item.selectedModifiers.length > 0 && <ul className="mt-2 space-y-1 text-sm text-muted">{item.selectedModifiers.map(({ modifier, quantity }, modIndex) => <li key={`${modifier.id}-${modIndex}`} className="flex justify-between gap-2"><span className="break-words">+ {modifier.name}{quantity > 1 ? ` × ${quantity}` : ''}</span><span className="shrink-0 tabular-nums">Bs. {(modifier.price * quantity).toFixed(2)}</span></li>)}</ul>}
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-line-subtle pt-3"><div className="flex items-center gap-1">
                        <button type="button" onClick={() => onUpdateQuantity(index, item.quantity - 1)} aria-label={`Disminuir cantidad de ${item.product.name}`} className="grid h-12 w-12 place-items-center rounded-lg border border-line text-brand hover:bg-canvas"><Minus size={18} /></button>
                        <span className="w-9 text-center font-semibold tabular-nums" aria-label={`Cantidad ${item.quantity}`}>{item.quantity}</span>
                        <button type="button" onClick={() => onUpdateQuantity(index, item.quantity + 1)} aria-label={`Aumentar cantidad de ${item.product.name}`} className="grid h-12 w-12 place-items-center rounded-lg border border-line text-brand hover:bg-canvas"><Plus size={18} /></button>
                    </div><strong className="shrink-0 tabular-nums">Bs. {item.subtotal.toFixed(2)}</strong></div>
                </article>;
            })}
        </div>
        <div className="shrink-0 space-y-2 border-t border-line-subtle bg-surface p-4">
            <div className="flex justify-between text-sm text-muted"><span>Subtotal</span><span className="tabular-nums">Bs. {subtotal.toFixed(2)}</span></div>
            {discount ? <div className="flex justify-between text-sm text-success"><span>Descuento ({discount.type === 'PERCENTAGE' ? `${discount.value}%` : `Bs. ${discount.value}`})</span><span className="tabular-nums">− Bs. {discountAmount.toFixed(2)}</span></div> : items.length > 0 && <Button variant="quiet" onClick={onApplyDiscount} className="px-0 text-sm">Aplicar descuento</Button>}
            <div className="flex items-center justify-between border-t border-line-subtle pt-3"><span className="font-semibold">Total</span><strong className="skot-display text-2xl font-semibold tabular-nums text-brand">Bs. {total.toFixed(2)}</strong></div>
            <Button size="touch" disabled={items.length === 0} onClick={checkout} className="w-full">Cobrar</Button>
        </div>
    </>;

    return <>
        <aside className="hidden h-full min-h-0 flex-col border-l border-line-subtle bg-surface lg:flex" aria-label="Resumen del pedido">{content(false)}</aside>
        <div className="skot-mobile-dock fixed inset-x-0 bottom-0 z-30 flex min-h-20 items-center gap-2 border-t border-line-subtle bg-surface px-4 py-2 lg:hidden">
            <button type="button" onClick={() => setMobileOpen(true)} className="min-h-12 min-w-0 flex-1 text-left" aria-label={`Revisar pedido, ${items.length} productos, total Bs. ${total.toFixed(2)}`}>
                <strong className="block truncate font-display tabular-nums">Bs. {total.toFixed(2)}</strong><span className="text-sm text-brand underline">Revisar pedido · {items.length}</span>
            </button>
            <Button size="touch" disabled={items.length === 0} onClick={checkout}>Cobrar</Button>
        </div>
        <Dialog open={mobileOpen} onClose={() => setMobileOpen(false)} labelledBy="burger-mobile-order-title" className="skot-order-sheet lg:hidden">
            <div className="flex max-h-[min(85dvh,760px)] min-h-0 flex-col">{content(true)}</div>
        </Dialog>
    </>;
}
