const fs = require('fs');
const path = require('path');

const inventoryDir = path.join(__dirname, 'src/app/inventory');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

walkDir(inventoryDir, (filePath) => {
    if (!filePath.endsWith('.tsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace Link to /factory
    const linkFactoryRegex = /<Link\s+href="\/factory"\s+className="([^"]+)">\s*<ArrowLeft[^>]*>\s*Volver a Fábrica\s*<\/Link>/gs;
    content = content.replace(linkFactoryRegex, (match, className) => {
        return `<button onClick={() => window.history.back()} className="${className}"><ArrowLeft className="h-4 w-4" /> Volver atrás</button>`;
    });

    // Replace Link to /
    const linkRootRegex = /<Link\s+href="\/"\s+className="([^"]+)">\s*<ArrowLeft[^>]*>\s*Volver al dashboard\s*<\/Link>/gs;
    content = content.replace(linkRootRegex, (match, className) => {
        return `<button onClick={() => window.history.back()} className="${className}"><ArrowLeft className="h-4 w-4" /> Volver atrás</button>`;
    });

    // Replace Link to /inventory
    const linkInvRegex = /<Link\s+href="\/inventory"\s+className="([^"]+)">\s*<ArrowLeft[^>]*>\s*Volver al inventario\s*<\/Link>/gs;
    content = content.replace(linkInvRegex, (match, className) => {
        return `<button onClick={() => window.history.back()} className="${className}"><ArrowLeft className="h-4 w-4" /> Volver atrás</button>`;
    });

    // Fix select elements 
    const selectRegex = /<select([^>]+)className="([^"]+)"([^>]*)>/g;
    content = content.replace(selectRegex, (match, before, className, after) => {
        let newClass = className;
        if (!newClass.includes('bg-[#1a0508]') && !newClass.includes('bg-slate-900')) {
            newClass = newClass.replace(/bg-white\/[0-9\/]+/g, '').trim();
            newClass = `bg-[#1a0508] text-white ${newClass}`;
        }
        return `<select${before}className="${newClass}"${after}>`;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed ${filePath}`);
    }
});
