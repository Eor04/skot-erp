const fs = require('fs');

const filePath = 'src/app/(pos)/cash-close/page.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const replacements = {
    'text-gray-900': 'text-white',
    'text-gray-800': 'text-white/90',
    'text-gray-700': 'text-white/80',
    'text-gray-600': 'text-white/70',
    'text-gray-500': 'text-white/60',
    'text-gray-400': 'text-white/40',
    'bg-white\\b': 'bg-white/5',
    'bg-gray-50\\b': 'bg-white/5',
    'bg-slate-50\\b': 'bg-white/5',
    'border-gray-100': 'border-white/10',
    'border-gray-200': 'border-white/20',
    'border-slate-100': 'border-white/10',
    'divide-gray-50': 'divide-white/10',
    'bg-green-50\\b': 'bg-green-500/10',
    'border-green-200': 'border-green-500/30',
    'text-green-800': 'text-green-400',
    'bg-blue-50\\b': 'bg-blue-500/10',
    'border-blue-200': 'border-blue-500/30',
    'text-blue-800': 'text-blue-400',
    'bg-purple-50\\b': 'bg-purple-500/10',
    'border-purple-200': 'border-purple-500/30',
    'text-purple-800': 'text-purple-400',
    'bg-orange-50\\b': 'bg-orange-500/10',
    'border-orange-200': 'border-orange-500/30',
    'text-orange-800': 'text-orange-400',
    'bg-red-50\\b': 'bg-red-500/10',
    'bg-red-50/40': 'bg-red-500/10',
    'border-red-100': 'border-red-500/30',
    'bg-indigo-50\\b': 'bg-indigo-500/10',
    'text-indigo-800': 'text-indigo-400',
    'border-indigo-100': 'border-indigo-500/30',
    'hover:bg-gray-50': 'hover:bg-white/10',
    'hover:text-gray-700': 'hover:text-white',
    'text-slate-600': 'text-white/60',
    'bg-green-100': 'bg-green-500/20',
};

for (const [old, newVal] of Object.entries(replacements)) {
    const regex = new RegExp(old, 'g');
    content = content.replace(regex, newVal);
}

// Add the background style object before the component return
if (!content.includes('const BG_STYLE')) {
    content = content.replace(
        'export default function CashClosePage() {',
        `const BG_STYLE = {
    background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)',
};

export default function CashClosePage() {`
    );
}

// Structural replacements
content = content.replace(
    '<div className="min-h-screen bg-white/5 p-6">',
    `<div className="min-h-screen relative overflow-hidden p-6" style={BG_STYLE}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: \`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")\`,
                        backgroundSize: '56px 100px',
                    }} />
            </div>
            <div className="relative z-10 max-w-5xl mx-auto">`
);

// Fix loading screen
content = content.replace(
    '<div className="flex items-center justify-center min-h-screen bg-white/5">',
    '<div className="flex items-center justify-center min-h-screen" style={BG_STYLE}>'
);

content = content.replace(
    '<div className="max-w-5xl mx-auto">',
    '' // Remove the original inner wrapper because we moved it into the z-10 div
);

if (content.includes('</CashGate>\\r\\n    );\\r\\n}')) {
    content = content.replace('</CashGate>\r\n    );\r\n}', '</div>\r\n        </CashGate>\r\n    );\r\n}');
} else if (content.includes('</CashGate>\n    );\n}')) {
    content = content.replace('</CashGate>\n    );\n}', '</div>\n        </CashGate>\n    );\n}');
} else {
    // If CashGate doesn't exist, we might have to append it to the last div
    const lastDivIdx = content.lastIndexOf('</div>');
    content = content.substring(0, lastDivIdx) + '</div>\n' + content.substring(lastDivIdx);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done');
