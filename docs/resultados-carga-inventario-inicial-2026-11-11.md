# Resultados de carga de inventario inicial

Fecha de aplicación: 11 de noviembre de 2026. Destino: base Neon configurada en el proyecto (`neondb`, esquema `public`). No se incluyen credenciales.

## Ubicaciones creadas

| ID | Sucursal | Tipo | Estado |
| --- | --- | --- | --- |
| `cmwcov6cd0001cgkaisssh1xv` | fabrica | FABRICA | Activa |
| `cmwcov6sd0002cgka10j4actz` | Skot Burger - 27 de mayo | HAMBURGUESAS | Activa |

La sucursal de hamburguesas quedó sin inventario inicial. Las 83 existencias están en `fabrica`.

## Conteo verificado

| Tipo | Productos | Stock positivo | Stock cero |
| --- | ---: | ---: | ---: |
| ACAI_TOPPING | 39 | 39 | 0 |
| RAW_MATERIAL | 18 | 14 | 4 |
| BEVERAGE | 4 | 0 | 4 |
| SUPPLY | 22 | 20 | 2 |
| Total | 83 | 73 | 10 |

Se crearon 73 movimientos `ENTRADA` con referencia individual `INI-FOTOS-20261111:<SKU>`. Los diez productos con cantidad cero tienen registro de inventario sin movimiento de stock vacío. No se crearon precios, asignaciones `BranchProduct`, recetas, ventas, usuarios ni transferencias. La cuenta activa `admin@skot.com` y su contraseña permanecen intactas.

Ejemplos conciliados: leche en polvo 59 bolsas; carne Junior 210 unidades; carne clásica 430 unidades; tomate 20 kg; lechuga 15 unidades; papa 360 porciones; hojas para bandeja/papas 10.000; hojas para envolver hamburguesas 5.000; vasos 1.500 (12 oz), 1.000 (16 oz), 400 (1 kilo), 100 (250 ml), 300 (400 ml), 500 (500 ml); las tapas quedaron como SKU separados con sus cantidades de la hoja.

La hoja nueva de plásticos aportó 17 productos. La foto adicional de papel higiénico y vasos repetía artículos de la primera hoja y no volvió a sumarse.

## Esquema y aplicación

Se aplicó `20261111120000_add_supply_product_type` y se regeneró Prisma. `SUPPLY` quedó disponible para 22 suministros; está fuera de la lista de tipos vendibles y se rechaza en la validación de precios de venta. El editor de catálogo conserva por separado el tipo del producto y su subcategoría. Se añadieron etiquetas a las vistas de fábrica, inventario, recepción y administración.

Unidades inferidas como caja, paquete, envase, rollo, hoja y unidad se conservaron según el manifiesto; no se inventaron equivalencias de peso o volumen.

## Verificación

- Simulación del importador: 83 SKU únicos, 73 cantidades positivas y 10 ceros.
- Aplicación: 83 productos e inventarios de fábrica, 73 movimientos iniciales y dos sucursales activas.
- Consulta posterior de Neon: conteos por tipo y sucursal coinciden con el manifiesto; no hay inventario asignado a la sucursal de 27 de mayo.
- `npx tsc --noEmit --incremental false`: aprobado.
- Build de Next.js (`npm run build`): aprobado.

Se compararon las 83 filas del CSV con SKU, unidad, tipo, categoría, existencia y movimiento inicial; todas coinciden. Se confirmó que no hay inventario en 27 de mayo ni asignaciones BranchProduct.

Los suministros están en fábrica para distribución. La sucursal aún no tiene asignados productos, precios, receta ni existencias para venta.
