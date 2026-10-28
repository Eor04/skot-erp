const fs = require('fs');

const file = 'src/app/factory/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
    "desc: 'Ingreso de proveedores',",
    "desc: 'Registrá la entrada de mercadería de proveedores',"
);

content = content.replace(
    "desc: 'Gestión de producción',",
    "desc: 'Consultá y gestioná las órdenes en curso o terminadas',"
);

content = content.replace(
    "desc: 'Crear orden de producción',",
    "desc: 'Iniciá una nueva tanda calculando merma automáticamente',"
);

content = content.replace(
    "desc: 'Fórmulas y materiales',",
    "desc: 'Administrá las recetas (BOM) y rendimientos esperados',"
);

content = content.replace(
    "desc: 'Stock de ingredientes',",
    "desc: 'Verificá existencias, puntos de reorden y escasez',"
);

content = content.replace(
    "desc: 'Enviar a sucursales',",
    "desc: 'Gestioná envíos de productos hacia los locales',"
);

content = content.replace(
    "desc: 'Despachar pedidos',",
    "desc: 'Aprobá y despachá solicitudes de las sucursales',"
);

content = content.replace(
    "desc: 'Historial de movimientos',",
    "desc: 'Auditoría de entradas, salidas y transferencias',"
);

content = content.replace(
    "desc: 'Corrección manual',",
    "desc: 'Registrá mermas o ajustá diferencias en el inventario',"
);

fs.writeFileSync(file, content, 'utf-8');
console.log('Fixed descriptions');
