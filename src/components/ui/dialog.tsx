'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export function Dialog({ open, onClose, labelledBy, children, className = '' }: {
    open: boolean;
    onClose: () => void;
    labelledBy: string;
    children: ReactNode;
    className?: string;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const returnFocus = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        if (open && !node.open) {
            returnFocus.current = document.activeElement as HTMLElement;
            node.showModal();
            requestAnimationFrame(() => node.querySelector<HTMLElement>('[data-autofocus], button, input')?.focus());
        } else if (!open && node.open) {
            node.close();
            returnFocus.current?.focus();
        }
    }, [open]);

    return (
        <dialog ref={ref} aria-labelledby={labelledBy} onCancel={event => { event.preventDefault(); onClose(); }}
            onClose={() => { if (open) onClose(); returnFocus.current?.focus(); }}
            className={`m-auto w-[calc(100%-2rem)] max-w-lg max-h-[min(90dvh,800px)] overflow-auto rounded-xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/60 ${className}`}>
            {children}
        </dialog>
    );
}
