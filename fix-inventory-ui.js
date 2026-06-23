const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

const inventoryDir = path.join(__dirname, 'src/app/inventory');

let filesChanged = 0;

walkDir(inventoryDir, (filePath) => {
    if (!filePath.endsWith('.tsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Fix back buttons
    // Replace <Link href="/factory"...> or <Link href="/" ...> with <button onClick={() => window.history.back()} ...>
    // Example: <Link href="/factory" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-1">
    //            <ArrowLeft className="h-4 w-4" /> Volver a Fábrica
    //          </Link>
    
    // Find <Link href="/factory" or <Link href="/" with Volver
    const linkRegex = /<Link\s+href="[^"]*"(.*?<ArrowLeft[^>]*>.*?Volver[^<]*)<\/Link>/gs;
    content = content.replace(linkRegex, (match, p1) => {
        if (match.includes('Volver atrás') && match.includes('<button')) return match; // already fixed
        // Extract className from the original Link
        const classMatch = match.match(/className="([^"]+)"/);
        const className = classMatch ? classMatch[1] : 'text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-1';
        return `<button onClick={() => window.history.back()} className="${className}"><ArrowLeft className="h-4 w-4" /> Volver atrás</button>`;
    });

    const linkRegex2 = /<Link\s+href="[^"]*"\s+className="([^"]+)"\s*>\s*<ArrowLeft[^>]*>\s*Volver[^<]*<\/Link>/g;
    content = content.replace(linkRegex2, (match, className) => {
        return `<button onClick={() => window.history.back()} className="${className}"><ArrowLeft className="h-4 w-4" /> Volver atrás</button>`;
    });

    // 2. Fix select elements
    // Add bg-[#1a0508] to select elements, and remove text-white/90 or similar from <option> tags
    const selectRegex = /<select([^>]*)>/g;
    content = content.replace(selectRegex, (match, attrs) => {
        let newAttrs = attrs;
        if (!newAttrs.includes('bg-[#1a0508]') && !newAttrs.includes('bg-slate-900')) {
            // Find className and inject bg-[#1a0508] text-white
            if (newAttrs.includes('className="')) {
                newAttrs = newAttrs.replace('className="', 'className="bg-[#1a0508] text-white ');
                // remove conflicting backgrounds
                newAttrs = newAttrs.replace(/bg-white\/[0-9\/]+/g, '');
            } else {
                newAttrs += ' className="bg-[#1a0508] text-white"';
            }
        }
        return `<select${newAttrs}>`;
    });

    // Clean up options so they don't have text-white/90 which forces white text on white bg in standard OS dropdowns
    // But since the select has bg-[#1a0508], the OS might render dark bg. Just in case, it's safe to let them inherit or use standard.
    // We already fixed the select bg, so text-white/90 is actually FINE if the dropdown bg is dark.
    // Wait, on windows, if we apply bg to select, the dropdown is dark. So text-white is correct.
    // Just to be safe, we replace text-white/90 with just text-white or remove it.
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        filesChanged++;
        console.log(`Fixed ${filePath}`);
    }
});

console.log(`Done. Changed ${filesChanged} files in inventory module.`);
