const fs = require('fs');

const file = 'src/app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(/bg-(blue|green|orange|indigo|purple|emerald|red|slate|violet|amber|teal|rose|cyan)-50\b/g, 'bg-$1-500/20');
content = content.replace(/text-(blue|green|orange|indigo|purple|emerald|red|slate|violet|amber|teal|rose|cyan)-600/g, 'text-$1-400');

fs.writeFileSync(file, content, 'utf-8');
console.log('Fixed colorMap!');
