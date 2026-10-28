const fs = require('fs');

// 1. Update src/app/page.tsx
const pageFile = 'src/app/page.tsx';
let pageContent = fs.readFileSync(pageFile, 'utf-8');

// For POS Açaí
pageContent = pageContent.replace(
    /showWhen: \(role: string, types: string\[\]\) =>\s*\['ADMIN', 'MANAGER'\]\.includes\(role\) \|\| \(role === 'CASHIER' && types\.includes\('ACAI'\)\)/,
    "showWhen: (role: string, types: string[]) =>\n            ['MANAGER'].includes(role) || (role === 'CASHIER' && types.includes('ACAI'))"
);

// For POS Burgers
pageContent = pageContent.replace(
    /showWhen: \(role: string, types: string\[\]\) =>\s*\['ADMIN', 'MANAGER'\]\.includes\(role\) \|\| \(role === 'CASHIER' && types\.includes\('HAMBURGUESAS'\)\)/,
    "showWhen: (role: string, types: string[]) =>\n            ['MANAGER'].includes(role) || (role === 'CASHIER' && types.includes('HAMBURGUESAS'))"
);

// For Cash Close
pageContent = pageContent.replace(
    /href: '\/cash-close'[\s\S]*?showWhen: \(role: string\) => \['ADMIN', 'MANAGER', 'CASHIER'\]\.includes\(role\)/,
    match => match.replace("['ADMIN', 'MANAGER', 'CASHIER']", "['MANAGER', 'CASHIER']")
);

// For Inventory (because inventory is centralized in admin dashboard)
pageContent = pageContent.replace(
    /href: '\/inventory'[\s\S]*?showWhen: \(role: string\) => \['ADMIN', 'MANAGER', 'CASHIER'\]\.includes\(role\)/,
    match => match.replace("['ADMIN', 'MANAGER', 'CASHIER']", "['MANAGER', 'CASHIER']")
);

fs.writeFileSync(pageFile, pageContent, 'utf-8');
console.log('Updated src/app/page.tsx');

// 2. Update src/app/admin/page.tsx
const adminFile = 'src/app/admin/page.tsx';
let adminContent = fs.readFileSync(adminFile, 'utf-8');

// Remove Cash Closes section
const cashCloseRegex = /\s*\{\s*href:\s*'\/admin\/cash-closes',[\s\S]*?color:\s*'slate',\s*\},/;
adminContent = adminContent.replace(cashCloseRegex, '');

fs.writeFileSync(adminFile, adminContent, 'utf-8');
console.log('Updated src/app/admin/page.tsx');

