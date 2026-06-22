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

    // 1. Fix back buttons on single lines safely
    content = content.replace(/<Link\s+href="\/factory"\s+className="([^"]+)">/g, (match, className) => {
        return `<button onClick={() => window.history.back()} className="${className}">`;
    });
    content = content.replace(/<Link\s+href="\/"\s+className="([^"]+)">\s*<ArrowLeft[^>]*>\s*Volver al dashboard\s*<\/Link>/g, (match, className) => {
        return `<button onClick={() => window.history.back()} className="${className}"><ArrowLeft className="h-4 w-4" /> Volver atrás</button>`;
    });

    // Handle multi-line <Link href="/factory" ...>\n  <ArrowLeft ... /> Volver a Fábrica\n</Link>
    const linkLinesRegex = /<Link\s+href="\/factory"\s+className="([^"]+)">(.*?)\s*Volver a Fábrica\s*<\/Link>/gs;
    content = content.replace(linkLinesRegex, (match, className, iconPart) => {
        return `<button onClick={() => window.history.back()} className="${className}">${iconPart} Volver atrás\n                        </button>`;
    });

    // Handle Volver al inventario
    const linkLinesRegex2 = /<Link\s+href="\/inventory"\s+className="([^"]+)">(.*?)\s*Volver al inventario\s*<\/Link>/gs;
    content = content.replace(linkLinesRegex2, (match, className, iconPart) => {
        return `<button onClick={() => window.history.back()} className="${className}">${iconPart} Volver atrás\n                        </button>`;
    });

    // 2. Fix select elements styling safely
    // Replace <select className="... bg-white/5/5/5 ..." or similar with bg-[#1a0508] text-white
    const selectRegex = /<select([^>]*?)className="([^"]+)"([^>]*)>/g;
    content = content.replace(selectRegex, (match, before, className, after) => {
        let newClass = className;
        if (!newClass.includes('bg-[#1a0508]') && !newClass.includes('bg-slate-900')) {
            newClass = newClass.replace(/bg-white\/\d+(?:\/\d+)*(?:\/\d+)?/g, ''); // remove background classes like bg-white/5/5/5
            newClass = `bg-[#1a0508] text-white ${newClass}`.replace(/\s+/g, ' ').trim();
        }
        return `<select${before}className="${newClass}"${after}>`;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        filesChanged++;
        console.log(`Fixed ${filePath}`);
    }
});

console.log(`Done. Changed ${filesChanged} files in inventory module.`);
