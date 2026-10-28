const fs = require('fs');

const file = 'src/app/inventory/kardex/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// 1. Root wrapper
const backgroundReplacement = `<div className="min-h-screen relative overflow-hidden p-6 md:p-8" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: \`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")\`, backgroundSize: '56px 100px' }} />
            </div>`;

content = content.replace(/<div className="min-h-screen bg-gray-50 p-6 md:p-8">/g, backgroundReplacement);

// 2. Add relative z-10
content = content.replace(/<div className="max-w-7xl mx-auto space-y-6">/g, '<div className="relative z-10 max-w-7xl mx-auto space-y-6">');

// 3. Class replacements
content = content.replace(/\bbg-white\b/g, 'bg-white/5 border border-white/10 backdrop-blur-md');
content = content.replace(/\bbg-gray-50\b/g, 'bg-white/5');
content = content.replace(/\bbg-gray-100\b/g, 'bg-white/10');

// Text colors
content = content.replace(/\btext-gray-900\b/g, 'text-white/90');
content = content.replace(/\btext-gray-800\b/g, 'text-white/90');
content = content.replace(/\btext-gray-700\b/g, 'text-white/80');
content = content.replace(/\btext-gray-600\b/g, 'text-white/70');
content = content.replace(/\btext-gray-500\b/g, 'text-white/60');
content = content.replace(/\btext-gray-400\b/g, 'text-white/40');

// Border colors
content = content.replace(/\bborder-gray-100\b/g, 'border-white/10');
content = content.replace(/\bborder-gray-200\b/g, 'border-white/10');
content = content.replace(/\bborder-gray-300\b/g, 'border-white/20');
content = content.replace(/\bborder-gray-400\b/g, 'border-white/30');

// Hovers
content = content.replace(/\bhover:bg-gray-50\b/g, 'hover:bg-white/5');
content = content.replace(/\bhover:text-gray-700\b/g, 'hover:text-white/80');
content = content.replace(/\bhover:text-gray-600\b/g, 'hover:text-white/80');
content = content.replace(/\bhover:text-gray-900\b/g, 'hover:text-white');

// Replace the Link with a router.back() button
content = content.replace(
    /<Link href="\/inventory" className="text-sm text-white\/60 hover:text-white\/80 flex items-center gap-1 mb-2">[\s\S]*?<\/Link>/,
    `<button onClick={() => window.history.back()} className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">\n                            <ArrowLeft className="h-4 w-4" /> Volver atrás\n                        </button>`
);

fs.writeFileSync(file, content, 'utf-8');
console.log('Restored dark theme to Kardex and fixed back button.');
