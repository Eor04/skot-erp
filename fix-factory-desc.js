const fs = require('fs');

const file = 'src/app/factory/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Update descriptions directly in the map
content = content.replace(
    /desc: 'Ingreso de proveedores',/g,
    "desc: 'Registrá y controlá la entrada de mercadería de proveedores externos',/g"
);
// wait, using regex replace without /g is safer for precise string replacement
content = content.replace(
    "desc: 'Ingreso de proveedores',",
    "desc: 'Registrá y controlá la entrada de mercadería desde tus proveedores',"
);

content = content.replace(
    "desc: 'Gestión de producción',",
    "desc: 'Consultá y gestioná el estado de todas las órdenes en curso o completadas',"
);

content = content.replace(
    "desc: 'Crear orden de producción',",
    "desc: 'Iniciá una nueva tanda de producción calculando automáticamente la merma',"
);

content = content.replace(
    "desc: 'Fórmulas y materiales',",
    "desc: 'Administrá las recetas (BOM) y los rendimientos esperados por producto',"
);

content = content.replace(
    "desc: 'Stock de ingredientes',",
    "desc: 'Verificá existencias, puntos de reorden y alertas de escasez',"
);

content = content.replace(
    "desc: 'Enviar a sucursales',",
    "desc: 'Gestioná el envío de productos terminados o ingredientes hacia los locales',"
);

content = content.replace(
    "desc: 'Despachar pedidos',",
    "desc: 'Aprobá y despachá las solicitudes de stock realizadas por las sucursales',"
);

content = content.replace(
    "desc: 'Historial de movimientos',",
    "desc: 'Auditoría completa de todas las entradas, salidas y transferencias',"
);

content = content.replace(
    "desc: 'Corrección manual',",
    "desc: 'Registrá mermas, vencimientos o ajustá diferencias en el inventario',"
);

fs.writeFileSync(file, content, 'utf-8');
console.log('Fixed descriptions in factory dashboard');
