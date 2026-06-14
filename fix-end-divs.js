const fs = require('fs');

const files = [
    'src/app/factory/production/page.tsx',
    'src/app/factory/production/new/page.tsx',
    'src/app/factory/recipes/page.tsx'
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');

    // we need to insert </div> before );\n} at the very end
    const match = content.match(/(\s*)\);\n\s*\}\s*$/);
    if (match) {
        content = content.replace(/(\s*)\);\n\s*\}\s*$/, '\n        </div>\n$1);\n}');
        fs.writeFileSync(file, content, 'utf-8');
        console.log(`Fixed ${file}`);
    } else {
        console.log(`Could not find end of file for ${file}`);
    }
}
