/**
 * Utilidad para exportar datos a CSV
 */

type ExportColumn& lt; T & gt; = {
    header: string;
    accessor: keyof T | ((item: T) => any);
    formatter ?: (value: any) => string;
};

/**
 * Convertir array de objetos a CSV
 * @param data Array de datos a exportar
 * @param columns Configuración de columnas
 * @param filename Nombre del archivo (sin extensión)
 */
export function exportToCSV& lt; T & gt; (
    data: T[],
    columns: ExportColumn & lt; T&gt;[],
    filename: string
): void {
    // Generar headers
    const headers = columns.map((col) => col.header).join(',');

    // Generar filas
    const rows = data.map((item) => {
        return columns
            .map((col) => {
                let value: any;

                // Obtener valor
                if (typeof col.accessor === 'function') {
                    value = col.accessor(item);
                } else {
                    value = item[col.accessor];
                }

                // Aplicar formatter si existe
                if (col.formatter) {
                    value = col.formatter(value);
                }

                // Escapar valores con comas o comillas
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }

                return value ?? '';
            })
            .join(',');
    });

    // Combinar headers y rows
    const csv = [headers, ...rows].join('\n');

    // Crear Blob y descargar
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Formatters comunes
 */
export const Formatters = {
    // Formato de fecha: DD/MM/YYYY HH:mm
    date: (date: Date | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    },

    // Formato de fecha corta: DD/MM/YYYY
    dateShort: (date: Date | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    },

    // Formato de moneda: $1,234.56
    currency: (value: number) => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN',
        }).format(value);
    },

    // Formato de número: 1,234.56
    number: (value: number, decimals: number = 2) => {
        return value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    // Booleano a Sí/No
    boolean: (value: boolean) => (value ? 'Sí' : 'No'),
};
