export interface ComandaItem {
    name: string;
    quantity: number;
    unit?: string;
    details?: string[];
}

export interface Comanda {
    saleNumber: string;
    createdAt: Date;
    area: 'Hamburguesas' | 'Açaí';
    customerName?: string;
    offline: boolean;
    items: ComandaItem[];
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));

export function renderComanda(comanda: Comanda): string {
    const date = comanda.createdAt.toLocaleString('es-BO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const lines = comanda.items.map(item => `
        <section class="item">
            <div class="item-main"><strong>${escapeHtml(String(item.quantity))}${item.unit ? ` ${escapeHtml(item.unit)}` : ' ×'}</strong><strong>${escapeHtml(item.name)}</strong></div>
            ${(item.details || []).map(detail => `<div class="detail">${escapeHtml(detail)}</div>`).join('')}
        </section>`).join('');

    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Comanda ${escapeHtml(comanda.saleNumber)}</title>
        <style>
            @page { margin: 2mm; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: #fff; color: #000; }
            body { width: 54mm; font: 12px/1.35 Arial, sans-serif; }
            h1 { font-size: 16px; line-height: 1.2; text-align: center; margin: 0 0 3mm; }
            .meta { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2mm 0; margin-bottom: 2mm; }
            .meta div { margin: 1mm 0; overflow-wrap: anywhere; }
            .status { font-weight: 700; }
            .item { padding: 2mm 0; border-bottom: 1px dashed #000; break-inside: avoid; }
            .item-main { display: grid; grid-template-columns: 10mm 1fr; gap: 1mm; font-size: 14px; overflow-wrap: anywhere; }
            .detail { padding-left: 11mm; margin-top: 1mm; overflow-wrap: anywhere; }
            .footer { text-align: center; margin-top: 3mm; font-weight: 700; }
        </style></head><body>
        <h1>COMANDA<br>${escapeHtml(comanda.area)}</h1>
        <div class="meta"><div><strong>Venta:</strong> ${escapeHtml(comanda.saleNumber)}</div>
        <div><strong>Fecha:</strong> ${escapeHtml(date)}</div>
        ${comanda.customerName ? `<div><strong>Cliente:</strong> ${escapeHtml(comanda.customerName)}</div>` : ''}
        <div class="status">${comanda.offline ? 'COBRADO · PENDIENTE DE SINCRONIZACIÓN' : 'COBRADO'}</div></div>
        ${lines}<div class="footer">FIN DE COMANDA</div>
    </body></html>`;
}

/** Abre el diálogo de impresión del navegador para una comanda ya cobrada. */
export function printComanda(comanda: Comanda, onError?: () => void): void {
    try {
        const frame = document.createElement('iframe');
        frame.title = `Imprimir comanda ${comanda.saleNumber}`;
        frame.setAttribute('aria-hidden', 'true');
        frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
        const cleanupTimer = window.setTimeout(() => frame.remove(), 300000);
        const cleanup = () => { window.clearTimeout(cleanupTimer); frame.remove(); };
        frame.onload = () => {
            const printWindow = frame.contentWindow;
            if (!printWindow) { cleanup(); onError?.(); return; }
            printWindow.addEventListener('afterprint', cleanup, { once: true });
            try {
                printWindow.focus();
                printWindow.print();
            } catch (error) {
                cleanup();
                console.error('No se pudo abrir la impresión de la comanda', error);
                onError?.();
            }
        };
        frame.srcdoc = renderComanda(comanda);
        document.body.appendChild(frame);
    } catch (error) {
        console.error('No se pudo preparar la comanda', error);
        onError?.();
    }
}
