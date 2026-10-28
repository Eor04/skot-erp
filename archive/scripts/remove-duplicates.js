const fs = require('fs');

const files = [
    'src/app/factory/materials/page.tsx',
    'src/app/factory/production/page.tsx',
    'src/app/factory/production/new/page.tsx',
    'src/app/factory/recipes/page.tsx',
    'src/app/factory/recipes/new/page.tsx',
];

const targetStr = '<Link href="/factory" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2"><ArrowLeft className="h-4 w-4" /> Volver a Fábrica</Link>';

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    // Using a regex to catch any whitespace (spaces/tabs) before the link, up to the newline.
    const regex = new RegExp(`^[ \\t]*` + targetStr.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\$&') + `\\r?\\n`, 'gm');
    
    const initialLength = content.length;
    content = content.replace(regex, '');
    
    if (content.length !== initialLength) {
        fs.writeFileSync(file, content, 'utf-8');
        console.log(`Removed duplicate links in ${file}`);
    } else {
        console.log(`No duplicate links found in ${file}`);
    }
});
