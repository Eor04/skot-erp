const fs = require('fs');
let c = fs.readFileSync('src/app/admin/sales/page.tsx', 'utf8');

c = c.replace(/N Venta/g, 'Nro Venta');
c = c.replace(/Mtodo/g, 'Método');
c = c.replace(/Perodo/g, 'Período');
c = c.replace(/vendedor/g, 'vendedor...');
c = c.replace(/Generando/g, 'Generando...');
c = c.replace(/  /g, ' - ');

fs.writeFileSync('src/app/admin/sales/page.tsx', c, 'utf8');
