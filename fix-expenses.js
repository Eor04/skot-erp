const fs = require('fs');

const file = 'src/app/expenses/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

const bgReplacement = `<div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: \`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")\`, backgroundSize: '56px 100px' }} />
            </div>
            <div className="relative z-10">`;

content = content.replace(
    /<div className="min-h-screen bg-slate-950 relative overflow-hidden">\s*<div className="absolute top-\[-10%\] left-\[-10%\] w-\[40%\] h-\[40%\] rounded-full bg-rose-600\/20 blur-\[120px\] pointer-events-none" \/>\s*<div className="absolute bottom-\[-10%\] right-\[-10%\] w-\[40%\] h-\[40%\] rounded-full bg-purple-600\/20 blur-\[120px\] pointer-events-none" \/>\s*<div className="relative z-10">/,
    bgReplacement
);

content = content.replace(
    /<Link href="\/" className="text-sm text-white\/60 hover:text-white\/80 flex items-center gap-1 mb-2">\s*<ArrowLeft className="h-4 w-4" \/> Inicio\s*<\/Link>/g,
    '<Link href="/" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">\n                            <ArrowLeft className="h-4 w-4" /> Volver al dashboard\n                        </Link>'
);

fs.writeFileSync(file, content, 'utf-8');
console.log('Fixed expenses page!');
