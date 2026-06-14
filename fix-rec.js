const fs = require('fs');
let c = fs.readFileSync('src/app/factory/receiving/page.tsx', 'utf-8');
c = c.replace(/\\s*<\\/div>\\s*<\\/div>\\s*\\);\\s*\\}\\s*$/, '\n            </div>\n        </div>\n    );\n}');
fs.writeFileSync('src/app/factory/receiving/page.tsx', c);
console.log('fixed');
