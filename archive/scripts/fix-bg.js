const fs = require('fs');

const files = [
    'src/app/factory/materials/page.tsx',
    'src/app/factory/receiving/page.tsx'
];

const bgInjection = `<div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E\\")", backgroundSize: '56px 100px' }} />
            </div>`;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');

    // Make sure we haven't already injected it
    if (!content.includes('radial-gradient')) {
        content = content.replace(
            /<div className="min-h-screen bg-white\/5(?: p-6 md:p-8)?">/,
            `<div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            ${bgInjection}
            <div className="relative z-10 h-full w-full">`
        );
        
        // Find the LAST );
        const lastParen = content.lastIndexOf(');');
        if (lastParen > -1) {
            content = content.substring(0, lastParen) + '</div>\n        ' + content.substring(lastParen);
        }
    }

    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Fixed bg and div for ${file}`);
}
