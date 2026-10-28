const fs = require('fs');
const path = require('path');

const inventoryDir = path.join(__dirname, '../..', 'src/app/inventory');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

const targetReplacement1 = `                    <Link href="/factory" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Volver a Fábrica
                        </Link>`;
const targetReplacement2 = `<Link href="/factory" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Volver a Fábrica
                    </Link>`;
const targetReplacement3 = `<Link href="/factory" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-1">
                            <ArrowLeft className="h-4 w-4" /> Volver a Fábrica
                        </Link>`;

const buttonReplacement = (mb) => `<button onClick={() => window.history.back()} className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 ${mb}">
                            <ArrowLeft className="h-4 w-4" /> Volver atrás
                        </button>`;

walkDir(inventoryDir, (filePath) => {
    if (!filePath.endsWith('.tsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Fix back buttons based on specific string matches
    content = content.replace(targetReplacement1, buttonReplacement('mb-2'));
    content = content.replace(targetReplacement2, buttonReplacement('mb-2'));
    content = content.replace(targetReplacement3, buttonReplacement('mb-1'));

    // Fix specific select elements 
    // They usually look like: <select value={...} onChange={...} className="... bg-white/5 ...">
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
