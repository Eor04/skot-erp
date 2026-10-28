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

walkDir(inventoryDir, (filePath) => {
    if (!filePath.endsWith('.tsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // We will find all <option> tags and force className="bg-gray-900 text-white"
    // Handle options that already have a className
    content = content.replace(/<option([^>]*)className="([^"]+)"([^>]*)>/g, (match, before, className, after) => {
        let newClass = className.replace(/text-white\/90/g, 'text-white').replace(/text-white/g, ''); // remove existing text-white variations to avoid duplicates
        newClass = `bg-gray-900 text-white ${newClass}`.trim();
        return `<option${before}className="${newClass}"${after}>`;
    });

    // Handle options without className
    content = content.replace(/<option([^>]*)>/g, (match, attrs) => {
        if (!match.includes('className=')) {
            return `<option${attrs} className="bg-gray-900 text-white">`;
        }
        return match;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed options in ${filePath}`);
    }
});
