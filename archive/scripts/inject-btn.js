const fs = require('fs');

const file = 'src/app/factory/recipes/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
    "import { FileText, ArrowLeft, RefreshCw } from 'lucide-react';",
    "import { FileText, ArrowLeft, RefreshCw, Plus } from 'lucide-react';"
);

content = content.replace(
    /<button onClick={fetchRecipes} className="flex items-center gap-2 border border-white\/10 bg-white\/5 border border-white\/10 backdrop-blur-md px-3 py-2 rounded-xl text-sm font-medium text-white\/70 hover:bg-white\/5 transition-colors">\s*<RefreshCw className=\{`h-4 w-4 \$\{loading \? 'animate-spin' : ''\}`\} \/> Actualizar\s*<\/button>/,
    `<div className="flex gap-3 items-center">
                        <button onClick={fetchRecipes} className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-md px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 transition-colors">
                            <RefreshCw className={\`h-4 w-4 \${loading ? 'animate-spin' : ''}\`} /> Actualizar
                        </button>
                        <Link href="/factory/recipes/new" className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-purple-500/20 transition">
                            <Plus className="h-4 w-4" /> Nueva Receta
                        </Link>
                    </div>`
);

fs.writeFileSync(file, content);
console.log('Button injected successfully');
