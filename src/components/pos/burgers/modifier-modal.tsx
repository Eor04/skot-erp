'use client';

import { useState } from 'react';
import type { ProductModifier } from '@prisma/client';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ModifierModalProps {
    isOpen: boolean;
    onClose: () => void;
    productName: string;
    basePrice: number;
    availableModifiers: ProductModifier[];
    onConfirm: (selectedModifiers: ProductModifier[]) => void;
}

export default function ModifierModal({ isOpen, onClose, productName, basePrice, availableModifiers, onConfirm }: ModifierModalProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const close = () => { setSelectedIds(new Set()); onClose(); };
    const toggle = (id: string) => setSelectedIds(previous => {
        const next = new Set(previous);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const additional = availableModifiers.reduce((total, modifier) => total + (selectedIds.has(modifier.id) ? modifier.price : 0), 0);
    const confirm = () => {
        onConfirm(availableModifiers.filter(modifier => selectedIds.has(modifier.id)));
        setSelectedIds(new Set());
    };

    return <Dialog open={isOpen} onClose={close} labelledBy="burger-modifier-title">
        <div className="border-b border-line-subtle p-5"><h2 id="burger-modifier-title" className="text-xl font-semibold">Personalizar {productName}</h2><p className="mt-1 text-sm text-muted">Precio base: <span className="tabular-nums">Bs. {basePrice.toFixed(2)}</span></p></div>
        <div className="max-h-[50dvh] space-y-2 overflow-y-auto p-5">
            {availableModifiers.length === 0 ? <p className="text-muted">No hay modificadores disponibles para este producto.</p> : availableModifiers.map(modifier => <label key={modifier.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-line-subtle p-3 hover:bg-canvas">
                <input type="checkbox" checked={selectedIds.has(modifier.id)} onChange={() => toggle(modifier.id)} className="h-5 w-5 accent-brand" />
                <span className="min-w-0 flex-1"><strong className="block break-words">{modifier.name}</strong>{modifier.description && <span className="block text-sm text-muted">{modifier.description}</span>}</span>
                <span className="shrink-0 font-semibold tabular-nums text-brand">+ Bs. {modifier.price.toFixed(2)}</span>
            </label>)}
        </div>
        <div className="space-y-3 border-t border-line-subtle bg-canvas p-5"><div className="flex justify-between text-sm text-muted"><span>Modificadores</span><span className="tabular-nums">+ Bs. {additional.toFixed(2)}</span></div><div className="flex justify-between font-semibold"><span>Total por unidad</span><span className="font-display text-xl tabular-nums text-brand">Bs. {(basePrice + additional).toFixed(2)}</span></div><div className="flex gap-2"><Button variant="secondary" onClick={close} className="flex-1">Cancelar</Button><Button onClick={confirm} className="flex-1">Agregar al pedido</Button></div></div>
    </Dialog>;
}
