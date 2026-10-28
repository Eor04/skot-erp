const fs = require('fs');

const file = 'src/app/inventory/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Cashier view header
content = content.replace(
    /<div>\s*<div className="flex items-center gap-2 text-sm text-white\/60 mb-1">\s*<Package className="h-4 w-4" \/>/,
    '<div>\n                        <Link href="/" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2"><ArrowLeft className="h-4 w-4" /> Volver al dashboard</Link>\n                        <div className="flex items-center gap-2 text-sm text-white/60 mb-1">\n                            <Package className="h-4 w-4" />'
);

// Admin view header
content = content.replace(
    /<div className="mb-8">\s*<h1 className="text-3xl font-bold text-white\/90 flex items-center gap-3">/,
    '<div className="mb-8">\n                    <Link href="/" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2 mt-4"><ArrowLeft className="h-4 w-4" /> Volver al dashboard</Link>\n                    <h1 className="text-3xl font-bold text-white/90 flex items-center gap-3">'
);

// Factory view header
content = content.replace(
    /<div className="max-w-6xl mx-auto">\s*<div className="flex items-center gap-2 text-sm text-white\/60 mb-1">\s*<Factory className="h-4 w-4" \/>/,
    '<div className="max-w-6xl mx-auto">\n                    <Link href="/" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2 mt-4"><ArrowLeft className="h-4 w-4" /> Volver al dashboard</Link>\n                    <div className="flex items-center gap-2 text-sm text-white/60 mb-1">\n                        <Factory className="h-4 w-4" />'
);

fs.writeFileSync(file, content, 'utf-8');
console.log('Fixed headers successfully with regex!');
