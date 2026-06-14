const fs = require('fs');

const file = 'src/app/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Update descriptions
content = content.replace(
    /description: 'Registrá pagos a proveedores, servicios y otros gastos operativos\.',/g,
    "description: 'Registrá y controla los pagos a proveedores, servicios, sueldos y otros gastos operativos.',"
);

content = content.replace(
    /description: 'Gestión de recetas, órdenes de producción y kardex de movimientos\.',/g,
    "description: 'Central de operaciones: Gestiona recetas, materia prima, recepciones y despachos internos.',"
);

// Center the grid items
content = content.replace(
    /<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">/,
    '<div className="flex flex-wrap justify-center gap-5">\n                    {/* Adjust widths manually to match original grid but centered */}'
);

content = content.replace(
    /className="group relative rounded-2xl p-6 transition-all duration-200 hover:-translate-y-1"/,
    'className="group relative rounded-2xl p-6 transition-all duration-200 hover:-translate-y-1 w-full sm:w-[calc(50%-1.25rem)] lg:w-[calc(33.333%-1.25rem)]"'
);


fs.writeFileSync(file, content, 'utf-8');
console.log('Fixed main dashboard');
