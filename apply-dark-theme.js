const fs = require('fs');
const path = require('path');

const ADMIN_DIR = path.join(__dirname, 'src', 'app', 'admin');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const backgroundReplacement = `<div className="min-h-screen relative overflow-hidden p-4 md:p-8" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: \`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")\`, backgroundSize: '56px 100px' }} />
            </div>`;

function applyDarkTheme(file) {
    if (!file.endsWith('.tsx')) return;
    
    let content = fs.readFileSync(file, 'utf-8');
    let originalLength = content.length;

    // 1. Root wrapper
    content = content.replace(/<div className="min-h-screen bg-gray-50 p-8">/g, backgroundReplacement);
    content = content.replace(/<div className="min-h-screen bg-gray-50 p-4 md:p-8">/g, backgroundReplacement);
    content = content.replace(/<div className="min-h-screen bg-gray-50">/g, backgroundReplacement.replace('p-4 md:p-8', ''));
    
    // 2. Add relative z-10 to the inner container
    content = content.replace(/<div className="max-w-(3xl|4xl|5xl|6xl|7xl) mx-auto/g, '<div className="relative z-10 max-w-$1 mx-auto');

    // 3. Class replacements
    content = content.replace(/\bbg-white\b/g, 'bg-white/5 border border-white/10 backdrop-blur-md');
    // For inputs that had bg-white, sometimes we want bg-white/5, let's just do global.
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

    // Inputs (focus rings usually use blue or purple, which is fine in dark theme, but we might want them slightly transparent)
    
    if (content.length !== originalLength) {
        fs.writeFileSync(file, content, 'utf-8');
        console.log(`Updated ${file}`);
    }
}

walkDir(ADMIN_DIR, applyDarkTheme);
console.log('Done!');
