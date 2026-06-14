const fs = require('fs');

const filePath = 'src/app/expenses/page.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace(
    /className=\"w-full border border-white\/20 rounded-xl px-3 py-2\.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300\"/g,
    'className="w-full bg-white/5 text-white border border-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"'
);
content = content.replace(
    /<option value=\"\">-- Seleccioná una sucursal --<\/option>/g,
    '<option value="" className="text-gray-900">-- Seleccioná una sucursal --</option>'
);
content = content.replace(
    /<option key=\{b\.id\} value=\{b\.id\}>\{b\.name\} \(\{b\.type\}\)<\/option>/g,
    '<option key={b.id} value={b.id} className="text-gray-900">{b.name} ({b.type})</option>'
);
content = content.replace(
    /bg-white rounded-2xl border border-gray-100 text-white\/40/g,
    'bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-white/40'
);
content = content.replace(
    /text-gray-900/g,
    'text-white/90'
);

fs.writeFileSync(filePath, content, 'utf-8');
