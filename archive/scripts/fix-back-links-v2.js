const fs = require('fs');

const files = [
    'src/app/inventory/transfers/page.tsx',
    'src/app/inventory/adjustments/page.tsx',
    'src/app/inventory/kardex/page.tsx',
    'src/app/inventory/internal-orders/page.tsx',
    'src/app/inventory/movements/page.tsx',
    'src/app/inventory/suggestions/page.tsx',
    'src/app/inventory/merma/page.tsx',
    'src/app/inventory/stock/page.tsx'
];

files.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf-8');
        
        // This regex specifically targets the "Back to Inventory" link at the top
        // It matches <Link href="/inventory" ...><ArrowLeft ... /> Inventario</Link>
        // and changes it to <Link href="/factory" ...><ArrowLeft ... /> Fábrica</Link>
        
        const initialLength = content.length;
        
        content = content.replace(
            /<Link href="\/inventory"([^>]*)>\s*<ArrowLeft([^>]*)>\s*Inventario\s*<\/Link>/g,
            `<Link href="/factory"$1>\n                            <ArrowLeft$2> Volver a Fábrica\n                        </Link>`
        );
        
        // Also catching the case where it might be Volver a Inventario
        content = content.replace(
            /<Link href="\/inventory"([^>]*)>\s*<ArrowLeft([^>]*)>\s*Volver a Inventario\s*<\/Link>/g,
            `<Link href="/factory"$1>\n                            <ArrowLeft$2> Volver a Fábrica\n                        </Link>`
        );

        if (content.length !== initialLength || content.includes('/factory')) {
            fs.writeFileSync(file, content, 'utf-8');
            console.log(`Updated link in ${file}`);
        }
    } catch (e) {
        console.error(`Error processing ${file}: ${e.message}`);
    }
});
