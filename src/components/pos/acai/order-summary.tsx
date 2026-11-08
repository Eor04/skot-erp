'use client';

import { useState } from 'react';
import { Minus, Plus, ShoppingCart, Trash2, Printer, X } from 'lucide-react';
import type { AcaiCart, Product } from '@/hooks/use-acai-sale';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';

export interface AcaiOrderSummaryProps {
    cart: AcaiCart;
    hasBowl: boolean;
    canCheckout: boolean;
    step: 'sabor' | 'balanza' | 'extras';
    confirmEnabled: boolean;
    onConfirmWeight: () => void;
    onCheckout: () => void;
    onClear: () => void;
    onDecrementExtra: (id: string) => void;
    onAddExtra: (product: Product, quantity: number) => void;
    onRemoveExtra: (id: string) => void;
    onReprint?: () => void;
}

export function AcaiOrderSummary({ cart, hasBowl, canCheckout, step, confirmEnabled, onConfirmWeight, onCheckout, onClear, onDecrementExtra, onAddExtra, onRemoveExtra, onReprint }: AcaiOrderSummaryProps) {
    const [open, setOpen] = useState(false);
    const checkout = () => { setOpen(false); onCheckout(); };
    const content = (sheet: boolean) => <>
        <div className="flex items-center justify-between gap-2 border-b border-line-subtle p-4"><div><h2 id={sheet ? 'acai-order-sheet-title' : undefined} className="flex items-center gap-2 text-lg font-semibold"><ShoppingCart size={19} aria-hidden="true" /> Pedido actual</h2><p className="text-sm text-muted">{cart.flavors.length} sabor{cart.flavors.length === 1 ? '' : 'es'} · {cart.extras.length} extra{cart.extras.length === 1 ? '' : 's'}</p></div>{sheet && <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar resumen del pedido" className="grid h-12 w-12 shrink-0 place-items-center rounded-lg text-muted hover:bg-canvas"><X size={20} aria-hidden="true" /></button>}</div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {cart.flavors.length > 0 ? <div className="rounded-lg border border-line-subtle p-3"><p className="mb-1 text-xs font-semibold text-muted">{cart.isMixto ? 'Sabores mixtos' : 'Sabor'}</p>{cart.flavors.map(flavor => <p key={flavor.product.id} className="break-words font-semibold">{flavor.product.name}</p>)}{cart.isMixto && cart.flavors.length > 1 && <p className="mt-1 text-sm text-muted tabular-nums">Promedio Bs. {cart.effectivePricePerKg.toFixed(2)}/kg</p>}</div> : <p className="rounded-lg border border-dashed border-line p-3 text-sm text-muted">Sin bowl · solo extras</p>}
            {hasBowl && <div className="rounded-lg border border-line-subtle p-3">{cart.weightConfirmed ? <><StatusBadge tone="success">Peso confirmado</StatusBadge><p className="mt-2 font-semibold tabular-nums">{cart.totalWeight.toFixed(3)} kg</p><p className="font-semibold tabular-nums text-brand">Bs. {cart.bowlSubtotal.toFixed(2)}</p></> : <StatusBadge tone="warning">Peso pendiente de confirmar</StatusBadge>}</div>}
            {cart.extras.map(extra => <article key={extra.id} className="rounded-lg border border-line-subtle p-3"><div className="flex justify-between gap-2"><div className="min-w-0"><h3 className="break-words font-semibold">{extra.product.name}</h3><p className="text-sm text-muted tabular-nums">{extra.quantity} × Bs. {extra.unitPrice.toFixed(2)}</p></div><strong className="shrink-0 tabular-nums">Bs. {extra.subtotal.toFixed(2)}</strong></div><div className="mt-2 flex justify-end gap-1 border-t border-line-subtle pt-2"><button type="button" onClick={() => onDecrementExtra(extra.id)} aria-label={`Disminuir ${extra.product.name}`} className="grid h-12 w-12 place-items-center rounded-lg border border-line text-brand"><Minus size={18} /></button><button type="button" onClick={() => onAddExtra(extra.product, 1)} disabled={extra.quantity >= extra.product.currentStock!} aria-label={`Aumentar ${extra.product.name}`} className="grid h-12 w-12 place-items-center rounded-lg border border-line text-brand disabled:opacity-50"><Plus size={18} /></button><button type="button" onClick={() => onRemoveExtra(extra.id)} aria-label={`Eliminar ${extra.product.name}`} className="grid h-12 w-12 place-items-center rounded-lg text-danger"><Trash2 size={18} /></button></div></article>)}
            {cart.flavors.length === 0 && cart.extras.length === 0 && <p className="py-6 text-center text-muted">Seleccioná un sabor o agregá extras.</p>}
        </div>
        <div className="shrink-0 space-y-3 border-t border-line-subtle bg-surface p-4"><div className="flex items-center justify-between"><span className="font-semibold">Total</span><strong className="font-display text-2xl font-semibold tabular-nums text-brand">Bs. {cart.total.toFixed(2)}</strong></div>{canCheckout && <Button size="touch" onClick={checkout} className="w-full">Cobrar</Button>}<Button variant="secondary" onClick={onClear} disabled={cart.total <= 0} className="w-full">Limpiar pedido</Button>{onReprint && <Button variant="quiet" onClick={onReprint} className="w-full"><Printer size={18} /> Reimprimir última comanda</Button>}</div>
    </>;

    return <>
        <aside className="hidden h-full min-h-0 flex-col border-l border-line-subtle bg-surface lg:flex" aria-label="Resumen del pedido">{content(false)}</aside>
        <div className="skot-mobile-dock fixed inset-x-0 bottom-0 z-30 flex min-h-20 items-center gap-2 border-t border-line-subtle bg-surface px-4 py-2 lg:hidden"><button type="button" onClick={() => setOpen(true)} className="min-h-12 min-w-0 flex-1 text-left" aria-label={`Revisar pedido. Total Bs. ${cart.total.toFixed(2)}`}><strong className="block truncate font-display tabular-nums">{hasBowl && !cart.weightConfirmed ? 'Peso pendiente' : `Bs. ${cart.total.toFixed(2)}`}</strong><span className="text-sm text-brand underline">Revisar pedido</span></button>{canCheckout ? <Button size="touch" onClick={checkout}>Cobrar</Button> : step === 'balanza' ? <Button size="touch" onClick={onConfirmWeight} disabled={!confirmEnabled}>Confirmar peso</Button> : <span className="text-sm font-semibold text-muted">{step === 'sabor' ? 'Elegí un sabor' : 'Agregá extras'}</span>}</div>
        <Dialog open={open} onClose={() => setOpen(false)} labelledBy="acai-order-sheet-title" className="skot-order-sheet lg:hidden"><div className="flex max-h-[min(85dvh,760px)] min-h-0 flex-col">{content(true)}</div></Dialog>
    </>;
}
