import fs from 'fs';
import path from 'path';

function walk(dir: string, callback: (file: string) => void) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walk(dirPath, callback);
        } else if (dirPath.endsWith('.tsx')) {
            callback(dirPath);
        }
    });
}

async function main() {
    walk('src', (file) => {
        const content = fs.readFileSync(file, 'utf8');
        const newContent = content.replace(/placeholder="0\.00"/g, 'placeholder=""').replace(/placeholder="0"/g, 'placeholder=""');
        if (content !== newContent) {
            fs.writeFileSync(file, newContent, 'utf8');
            console.log(`Updated ${file}`);
        }
    });
}
main();
