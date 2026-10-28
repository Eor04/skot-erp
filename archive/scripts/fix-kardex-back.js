const fs = require('fs');
const file = 'src/app/inventory/kardex/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /<Link href="\/factory" className="text-sm text-white\/60 hover:text-white\/80 flex items-center gap-1 mb-2">\s*<ArrowLeft className="h-4 w-4" \/> Volver a Fábrica\s*<\/Link>/g,
    `<button onClick={() => window.history.back()} className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">\n                            <ArrowLeft className="h-4 w-4" /> Volver atrás\n                        </button>`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed back button in Kardex.');
