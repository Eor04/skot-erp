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

    // Replace all broken bg-white/5 variations
    content = content.replace(/bg-white\/5(\/5)+/g, 'bg-white/5');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed tailwind in ${filePath}`);
    }
});
