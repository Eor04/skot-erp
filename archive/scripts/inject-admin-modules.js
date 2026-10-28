const fs = require('fs');

const file = 'src/app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add Cierres de Caja
const cashCloseItem = `
            {
                href: '/admin/cash-closes',
                icon: ClipboardList,
                title: 'Cierres de Caja',
                description: 'Historial de cierres de caja por sucursal y usuario',
                color: 'slate',
            },`;

if (!content.includes('/admin/cash-closes')) {
    content = content.replace(
        /\{\n\s+href: '\/admin\/expenses',\n\s+icon: Receipt,/,
        cashCloseItem.trim() + '\n            {\n                href: \'/admin/expenses\',\n                icon: Receipt,'
    );
}

// Add Kardex
const kardexItem = `
            {
                href: '/inventory/kardex',
                icon: ArrowLeftRight,
                title: 'Kardex de Movimientos',
                description: 'Registro histórico de entradas, salidas y ajustes de stock',
                color: 'cyan',
            },`;

if (!content.includes('/inventory/kardex')) {
    content = content.replace(
        /\{\n\s+href: '\/inventory',\n\s+icon: Warehouse,/,
        kardexItem.trim() + '\n            {\n                href: \'/inventory\',\n                icon: Warehouse,'
    );
}

fs.writeFileSync(file, content, 'utf8');
console.log('Admin dashboard updated.');
