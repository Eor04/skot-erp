const fs = require('fs');

const replacements = [
    {
        file: 'src/app/factory/receiving/page.tsx',
        search: /<Link href="\/factory\/materials" className="text-sm text-white\/60 hover:text-white\/80 flex items-center gap-1 mb-1">\s*<ArrowLeft className="h-4 w-4" \/> Materia Prima\s*<\/Link>/g,
        replace: `<Link href="/factory" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-1">
                        <ArrowLeft className="h-4 w-4" /> Volver a Fábrica
                    </Link>`
    },
    {
        file: 'src/app/inventory/transfers/page.tsx',
        search: /<Link href="\/inventory" className="text-sm text-white\/60 hover:text-white\/80 flex items-center gap-1 mb-2">\s*<ArrowLeft className="h-4 w-4" \/> Volver a Inventario\s*<\/Link>/g,
        replace: `<Link href="/factory" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver a Fábrica
                        </Link>`
    },
    {
        file: 'src/app/inventory/adjustments/page.tsx',
        search: /<Link href="\/inventory" className="text-sm text-white\/60 hover:text-white\/80 flex items-center gap-1 mb-2">\s*<ArrowLeft className="h-4 w-4" \/> Volver a Inventario\s*<\/Link>/g,
        replace: `<Link href="/factory" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Volver a Fábrica
                    </Link>`
    },
    {
        file: 'src/app/inventory/kardex/page.tsx',
        search: /<Link href="\/inventory" className="text-sm text-white\/60 hover:text-white\/80 flex items-center gap-1 mb-2">\s*<ArrowLeft className="h-4 w-4" \/> Volver a Inventario\s*<\/Link>/g,
        replace: `<Link href="/factory" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver a Fábrica
                        </Link>`
    },
    {
        file: 'src/app/inventory/internal-orders/page.tsx',
        search: /<Link href="\/inventory" className="text-sm text-white\/60 hover:text-white\/80 flex items-center gap-1 mb-2">\s*<ArrowLeft className="h-4 w-4" \/> Volver a Inventario\s*<\/Link>/g,
        replace: `<Link href="/factory" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver a Fábrica
                        </Link>`
    }
];

replacements.forEach(({ file, search, replace }) => {
    try {
        let content = fs.readFileSync(file, 'utf-8');
        content = content.replace(search, replace);
        fs.writeFileSync(file, content, 'utf-8');
        console.log(`Fixed back link in ${file}`);
    } catch (e) {
        console.error(`Error processing ${file}: ${e.message}`);
    }
});
