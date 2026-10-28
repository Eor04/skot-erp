const fs = require('fs');

const file = 'src/app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. apply-dark-theme logic for page.tsx
const backgroundReplacement = `<div className="min-h-screen relative overflow-hidden p-4 md:p-8" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: \`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")\`, backgroundSize: '56px 100px' }} />
            </div>`;

content = content.replace(/<div className="min-h-screen bg-gray-50 p-8">/g, backgroundReplacement);
content = content.replace(/<div className="max-w-5xl mx-auto">/g, '<div className="relative z-10 max-w-6xl mx-auto space-y-6">');
content = content.replace(/\bbg-white\b/g, 'bg-white/5 border border-white/10 backdrop-blur-md');
content = content.replace(/\bbg-gray-50\b/g, 'bg-white/5');
content = content.replace(/\bbg-gray-100\b/g, 'bg-white/10');
content = content.replace(/\btext-gray-900\b/g, 'text-white/90');
content = content.replace(/\btext-gray-800\b/g, 'text-white/90');
content = content.replace(/\btext-gray-700\b/g, 'text-white/80');
content = content.replace(/\btext-gray-600\b/g, 'text-white/70');
content = content.replace(/\btext-gray-500\b/g, 'text-white/60');
content = content.replace(/\btext-gray-400\b/g, 'text-white/40');
content = content.replace(/\bborder-gray-100\b/g, 'border-white/10');
content = content.replace(/\bborder-gray-200\b/g, 'border-white/10');
content = content.replace(/\bborder-gray-300\b/g, 'border-white/20');
content = content.replace(/\bborder-gray-400\b/g, 'border-white/30');
content = content.replace(/\bhover:bg-gray-50\b/g, 'hover:bg-white/5');
content = content.replace(/\bhover:text-gray-700\b/g, 'hover:text-white/80');
content = content.replace(/\bhover:text-gray-600\b/g, 'hover:text-white/80');
content = content.replace(/\bhover:text-gray-900\b/g, 'hover:text-white');

// 2. fix-colormap logic
content = content.replace(/colorMap: Record<string, string> = {[\s\S]*?};/, `colorMap: Record<string, string> = {
    blue:    'border-blue-500 text-blue-400 bg-blue-500/20',
    green:   'border-green-500 text-green-400 bg-green-500/20',
    orange:  'border-orange-500 text-orange-400 bg-orange-500/20',
    indigo:  'border-indigo-500 text-indigo-400 bg-indigo-500/20',
    purple:  'border-purple-500 text-purple-400 bg-purple-500/20',
    emerald: 'border-emerald-500 text-emerald-400 bg-emerald-500/20',
    red:     'border-red-500 text-red-400 bg-red-500/20',
    slate:   'border-slate-500 text-slate-400 bg-slate-500/20',
    violet:  'border-violet-500 text-violet-400 bg-violet-500/20',
    amber:   'border-amber-500 text-amber-400 bg-amber-500/20',
    teal:    'border-teal-500 text-teal-400 bg-teal-500/20',
    rose:    'border-rose-500 text-rose-400 bg-rose-500/20',
    cyan:    'border-cyan-500 text-cyan-400 bg-cyan-500/20',
    gray:    'border-white/30 text-white/70 bg-white/5',
};`);

// 3. Inject Kardex
const inventoryItem = `
            {
                href: '/inventory',
                icon: Warehouse,
                title: 'Gestión de Inventario',
                description: 'Stock, transferencias, kardex y ajustes multi-sucursal',
                color: 'cyan',
            },`;

const kardexItem = `
            {
                href: '/inventory/kardex',
                icon: ArrowLeftRight,
                title: 'Kardex de Movimientos',
                description: 'Registro histórico de entradas, salidas y ajustes de stock',
                color: 'cyan',
            },`;

if (!content.includes('/inventory/kardex')) {
    content = content.replace(inventoryItem, kardexItem + inventoryItem);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed admin dashboard');
