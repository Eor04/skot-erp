import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { PrismaClient, ProductType, BranchType } from '@prisma/client';

type Row = { sku:string; grupo:string; imagen:string; linea:string; nombre:string; cantidad:string; unidad:string; origen_unidad:string; tipo:string; categoria:string; uso:string; observaciones:string };
const prisma = new PrismaClient();
const file = path.resolve(process.cwd(), 'docs/inventario-inicial-2026-11-11.csv');
const parsed = Papa.parse<Row>(fs.readFileSync(file, 'utf8'), {header:true,skipEmptyLines:true});
if (parsed.errors.length) throw new Error(JSON.stringify(parsed.errors));
const rows = parsed.data;
if (rows.length!==83 || new Set(rows.map(r=>r.sku)).size!==83) throw new Error('El manifiesto no contiene 83 SKU únicos');
const enumTypes = new Set(Object.values(ProductType));
for (const r of rows) if (!r.sku || !r.nombre || !r.unidad || !enumTypes.has(r.tipo as ProductType) || !Number.isFinite(Number(r.cantidad)) || Number(r.cantidad)<0) throw new Error(`Fila inválida: ${r.sku}`);

async function main() {
 const apply = process.argv.includes('--apply');
 const summary = await prisma.$transaction(async tx => {
  await tx.$executeRaw`DO $$ BEGIN PERFORM pg_advisory_xact_lock(2026111112); END $$;`;
  const admin = await tx.user.findUnique({where:{email:'admin@skot.com'}});
  if (!admin || admin.role!=='ADMIN' || !admin.active) throw new Error('No se encontró el administrador activo esperado');
  const ensureBranch = async (name:string,type:BranchType) => {
   const found = await tx.branch.findMany({where:{name,deletedAt:null}});
   if(found.some(b=>b.type!==type) || found.length>1) throw new Error(`Conflicto de sucursal: ${name}`);
   if(found[0]) return found[0];
   if(!apply) return {id:`SIM-${type}`,name,type,active:true};
   return tx.branch.create({data:{name,type,active:true}});
  };
  const factory = await ensureBranch('fabrica',BranchType.FABRICA);
  const burger = await ensureBranch('Skot Burger - 27 de mayo',BranchType.HAMBURGUESAS);
  const actions:any[]=[];
  for(const r of rows){
   const quantity=Number(r.cantidad), reference=`INI-FOTOS-20261111:${r.sku}`;
   const current=await tx.product.findUnique({where:{sku:r.sku}});
   if(current && (current.unit!==r.unidad || current.name!==r.nombre)) throw new Error(`Conflicto en catálogo para ${r.sku}`);
   if(current && current.type!==r.tipo) {
    if(!apply) throw new Error(`Reclasificación prevista ${r.sku}: ${current.type} -> ${r.tipo}`);
    await tx.product.update({where:{id:current.id},data:{type:r.tipo as ProductType,category:r.categoria,description:`Grupo ${r.grupo}; uso ${r.uso}; foto ${r.imagen}, línea ${r.linea}; unidad ${r.origen_unidad}. ${r.observaciones}`}});
   }
   const product=current ?? (apply ? await tx.product.create({data:{name:r.nombre,sku:r.sku,type:r.tipo as ProductType,unit:r.unidad,category:r.categoria,active:true,consumptionMode:'STOCK',description:`Grupo ${r.grupo}; uso ${r.uso}; foto ${r.imagen}, línea ${r.linea}; unidad ${r.origen_unidad}. ${r.observaciones}`}}) : null);
   const productId=product?.id ?? `SIM-${r.sku}`;
   if(!apply){actions.push({sku:r.sku,quantity,unit:r.unidad,type:r.tipo});continue;}
   const inv=await tx.inventory.findUnique({where:{branchId_productId:{branchId:factory.id,productId:productId}}});
   const movement=await tx.stockMovement.findFirst({where:{reference,branchId:factory.id,productId}});
   if(movement){if(movement.quantity!==quantity||movement.newStock!==quantity) throw new Error(`Movimiento inicial incompatible ${r.sku}`);actions.push({sku:r.sku,status:'ya cargado'});continue;}
   if(inv && quantity===0 && inv.currentStock===0) { actions.push({sku:r.sku,status:'cero ya cargado'}); continue; }
   if(inv) throw new Error(`Existe inventario previo sin referencia inicial para ${r.sku}; requiere conciliación`);
   const created=await tx.inventory.create({data:{branchId:factory.id,productId,currentStock:quantity,minStock:0,status:'AVAILABLE'}});
   if(quantity>0) await tx.stockMovement.create({data:{branchId:factory.id,productId,inventoryId:created.id,type:'ENTRADA',quantity,previousStock:0,newStock:quantity,reference,createdBy:admin.id,notes:`Saldo inicial desde fotografía ${r.imagen}, línea ${r.linea}; ${r.grupo}; unidad ${r.origen_unidad}. ${r.observaciones}`}});
   actions.push({sku:r.sku,status:'creado',quantity});
  }
  return {apply,factory:factory.id,burger:burger.id,total:rows.length,positive:rows.filter(r=>Number(r.cantidad)>0).length,zero:rows.filter(r=>Number(r.cantidad)===0).length,actions};
 },{timeout:120000,maxWait:30000});
 console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{console.error(e instanceof Error?e.message:e);process.exitCode=1}).finally(()=>prisma.$disconnect());
