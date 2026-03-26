/**
 * Utilidades de exportación CSV y PDF para Skot ERP
 * Usa jsPDF + jspdf-autotable y papaparse
 */

// ──────────────────────────────────────────────────────────
// CSV
// ──────────────────────────────────────────────────────────

/**
 * Descargar un array de objetos como archivo CSV
 * @param rows  Array de filas (objetos planos)
 * @param filename  Nombre sin extensión
 */
export function downloadCSV(rows: Record<string, any>[], filename: string): void {
    if (rows.length === 0) return;

    // Cabeceras a partir de las keys del primer objeto
    const headers = Object.keys(rows[0]);

    const escape = (v: any): string => {
        const s = v == null ? '' : String(v);
        // Envolver en comillas si contiene comas, comillas o saltos de línea
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };

    const csvContent =
        '\uFEFF' + // BOM para Excel en Windows
        [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `${filename}.csv`);
}

// ──────────────────────────────────────────────────────────
// PDF
// ──────────────────────────────────────────────────────────

export interface PdfColumn {
    header: string;
    dataKey: string;
}

export interface PdfOptions {
    title: string;
    subtitle?: string;
    columns: PdfColumn[];
    rows: Record<string, any>[];
    filename: string;
    orientation?: 'portrait' | 'landscape';
}

/**
 * Generar y descargar un PDF con tabla usando jsPDF + autotable
 */
export async function downloadPDF(opts: PdfOptions): Promise<void> {
    // Dynamic import — evita que rompa en SSR
    const { default: jsPDF } = await import('jspdf');
    // jspdf-autotable v5 usa applyPlugin para inyectar el método en el doc
    const { applyPlugin } = await import('jspdf-autotable');

    const doc = new jsPDF({
        orientation: opts.orientation || 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    // Aplicar el plugin para obtener el método autoTable en el doc
    applyPlugin(doc);

    const pageWidth = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('es-PE', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    // Header del documento
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(opts.title, pageWidth / 2, 18, { align: 'center' });

    if (opts.subtitle) {
        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(opts.subtitle, pageWidth / 2, 25, { align: 'center' });
    }

    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(`Generado: ${today}  |  Skot ERP`, pageWidth / 2, 31, { align: 'center' });

    // Línea separadora
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 34, pageWidth - 14, 34);

    // Tabla — el plugin inyecta .autoTable() en el doc
    (doc as any).autoTable({
        startY: 38,
        head: [opts.columns.map(c => c.header)],
        body: opts.rows.map(row => opts.columns.map(c => row[c.dataKey] ?? '')),
        headStyles: {
            fillColor: [99, 102, 241], // indigo-500
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9,
        },
        bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        margin: { left: 14, right: 14 },
    });

    // Número de página en footer
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(180, 180, 180);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    }

    doc.save(`${opts.filename}.pdf`);
}

// ──────────────────────────────────────────────────────────
// Helpers de formato
// ──────────────────────────────────────────────────────────

export const fmt = {
    currency: (v: number) => `Bs. ${Number(v).toFixed(2)}`,
    date: (d: string | Date) => new Date(d).toLocaleString('es-PE'),
    dateShort: (d: string | Date) => new Date(d).toLocaleDateString('es-PE'),
    paymentMethod: (m: string) =>
        ({ CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', MIXED: 'Mixto' }[m] ?? m),
};

// ──────────────────────────────────────────────────────────
// Util interno
// ──────────────────────────────────────────────────────────
function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
