const fs = require('fs');
let c = fs.readFileSync('src/app/admin/sales/page.tsx', 'utf8');

c = c.replace(/<tr key=\{\`\$\{sale\.id\}-detail\`\} className="bg-indigo-50\/50">[\s\S]*?<\/tr>/, `<tr key={\`\${sale.id}-detail\`} className="bg-black/40 shadow-inner border-y border-white/10">
    <td colSpan={6} className="px-6 py-5">
        <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="h-4 w-4 text-indigo-400" />
            <h4 className="text-sm font-bold text-white/90">Detalle de los productos</h4>
        </div>
        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-3 max-w-md">
            {sale.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-sm py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-white/80 font-medium">{item.product.name} <span className="text-indigo-400 text-xs ml-1">x{item.quantity}</span></span>
                    <span className="font-bold text-white/90">Bs. {item.subtotal.toFixed(2)}</span>
                </div>
            ))}
            {sale.discounts.length > 0 && (
                <div className="flex justify-between items-center text-sm py-1.5 border-t border-red-500/20 mt-1 pt-2">
                    <span className="text-red-400 font-medium">Descuento ({sale.discounts[0].value}{sale.discounts[0].type === 'PERCENTAGE' ? '%' : ' Bs.'})</span>
                    <span className="font-bold text-red-400">-</span>
                </div>
            )}
        </div>
    </td>
</tr>`);

c = c.replace(/N Venta/g, 'Nro Venta');
c = c.replace(/N Venta/g, 'Nro Venta');
c = c.replace(/Mtodo/g, 'Método');
c = c.replace(/Mtodo/g, 'Método');
c = c.replace(/Perodo/g, 'Período');
c = c.replace(/Perodo/g, 'Período');

fs.writeFileSync('src/app/admin/sales/page.tsx', c, 'utf8');
