const fs = require('fs');
let content = fs.readFileSync('src/app/(pos)/cash-close/page.tsx', 'utf-8');

// Fix EOF
content = content.replace(/<\/div>[\s\r\n]+<\/div>[\s\r\n]+\);[\s\r\n]+\}/g, '</div>\n    );\n}');

// Fix TS string comparison
content = content.replace(/value=\{form.openingAmount === 0 \? '' : form.openingAmount\}/g, "value={form.openingAmount === '0' ? '' : form.openingAmount}");
content = content.replace(/value=\{form.actualCash === 0 \? '' : form.actualCash\}/g, "value={form.actualCash === '0' ? '' : form.actualCash}");

fs.writeFileSync('src/app/(pos)/cash-close/page.tsx', content, 'utf-8');
console.log('Fixed EOF and TS errors');
