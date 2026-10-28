// Ejecutar desde la raíz: node --env-file=.env scripts/functional/api.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
const f=JSON.parse(fs.readFileSync('.local/test-db/functional-fixtures.json','utf8'));
const results=[], cookies={};
const B=Object.fromEntries(Object.entries(f.branches).map(([k,v])=>[k,v.id]));
const P=Object.fromEntries(Object.entries(f.products).map(([k,v])=>[k,v.id]));
async function test(name,fn){try{await fn();results.push({name,status:'PASS'});console.log('PASS',name);}catch(e){results.push({name,status:'FAIL',detail:e.message});console.log('FAIL',name, e.message);}}
async function req(route,user,method='GET',body){
 const r=await fetch(f.baseURL+route,{method,redirect:'manual',headers:{...(cookies[user]?{cookie:cookies[user]}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 const text=await r.text();let data;try{data=JSON.parse(text);}catch{data={};}
 return {status:r.status,data,headers:r.headers};
}
function status(r,wanted){assert.equal(r.status,wanted,`HTTP esperado ${wanted}; recibido ${r.status}. ${r.data.error||''}`);}
async function stock(branch,key){return (await p.inventory.findUniqueOrThrow({where:{branchId_productId:{branchId:B[branch],productId:P[key]}}})).currentStock;}
function sale(branch,key,qty,price,extra={}){return {branchId:B[branch],userId:f.users[branch==='acai'?'acai':'cashier'].id,paymentMethod:'CASH',items:[{productId:P[key],quantity:qty,unitPrice:price,subtotal:qty*price}],...extra};}
(async()=>{
 const db=new URL(process.env.DATABASE_URL);assert.equal(db.hostname,'127.0.0.1');assert.equal(db.port,'55432');assert.equal(db.pathname,'/skot_erp_test');
 assert.equal(new URL(f.baseURL).hostname,'127.0.0.1');
 const login=(email,password)=>req('/api/auth/login',null,'POST',{email,password});
 await test('AUTH: API sin sesión devuelve 401',async()=>status(await req('/api/admin/users'),401));
 await test('AUTH: página privada redirige al login',async()=>{const r=await req('/inventory');status(r,307);assert.match(r.headers.get('location'),/\/login/);});
 await test('AUTH: campos vacíos devuelven 400',async()=>status(await login('',''),400));
 await test('AUTH: contraseña incorrecta devuelve 401',async()=>status(await login(f.users.admin.email,'incorrecta'),401));
 await test('AUTH: usuario inactivo no puede ingresar',async()=>status(await login(f.users.inactive.email,f.users.inactive.password),401));
 for(const key of ['admin','manager','cashier','acai','warehouse'])await test(`AUTH: login ${key}`,async()=>{const u=f.users[key],r=await login(u.email,u.password);status(r,200);assert.equal(r.data.user.role,u.role);const c=r.headers.get('set-cookie');assert.match(c,/HttpOnly/i);cookies[key]=c.split(';')[0];});
 await test('AUTH: normaliza mayúsculas y espacios del email',async()=>status(await login(` ${f.users.admin.email.toUpperCase()} `,f.users.admin.password),200));
 await test('AUTH: sesión contiene solo sucursal del cajero',async()=>{const r=await req('/api/auth/me','cashier');status(r,200);assert.deepEqual(r.data.user.branchIds,[B.burger]);});
 await test('ROLES: cajero no accede a usuarios',async()=>status(await req('/api/admin/users','cashier'),403));
 await test('ROLES: gerente no accede a usuarios',async()=>status(await req('/api/admin/users','manager'),403));
 await test('ROLES: cajero no accede a fábrica',async()=>status(await req('/api/factory/recipes','cashier'),403));
 await test('ROLES: almacén accede a fábrica',async()=>status(await req('/api/factory/recipes','warehouse'),200));
 await test('ROLES: cajero no crea productos',async()=>status(await req('/api/admin/products','cashier','POST',{}),403));
 await test('ROLES: almacén no puede vender',async()=>status(await req('/api/pos/sale','warehouse','POST',{branchId:B.factory,userId:f.users.warehouse.id,paymentMethod:'CASH',items:[{productId:P.raw,quantity:1,unitPrice:1,subtotal:1}]}),403));
 await test('SUCURSALES: cajero no lee catálogo Açaí ajeno',async()=>status(await req(`/api/pos/products?branchId=${B.acai}&type=ACAI`,'cashier'),403));
 await test('CATÁLOGO: precios, stock y filtro Burger',async()=>{const r=await req(`/api/pos/products?branchId=${B.burger}&type=BURGER`,'cashier');status(r,200);assert.equal(r.data.data.find(x=>x.id===P.burger).price,20);assert(!r.data.data.some(x=>x.id===P.acai));});
 await test('CATÁLOGO: precio por kg Açaí',async()=>{const r=await req(`/api/pos/products?branchId=${B.acai}&type=ACAI`,'acai');status(r,200);assert.equal(r.data.data.find(x=>x.id===P.acai).pricePerKg,60);});
 let session;
 await test('CAJA: inicialmente cerrada',async()=>{const r=await req(`/api/cash-close/open?branchId=${B.burger}`,'cashier');status(r,200);assert.equal(r.data.isOpen,false);});
 await test('CAJA: apertura con Bs. 100',async()=>{const r=await req('/api/cash-close/open','cashier','POST',{branchId:B.burger,userId:f.users.cashier.id,openingAmount:100});status(r,201);session=r.data.data;assert.equal(session.openingAmount,100);});
 await test('CAJA: rechaza doble apertura',async()=>status(await req('/api/cash-close/open','cashier','POST',{branchId:B.burger,userId:f.users.cashier.id,openingAmount:100}),400));
 await test('VENTA: 2 burgers, total Bs. 40, descuento stock y kardex',async()=>{const before=await stock('burger','burger');const r=await req('/api/pos/sale','cashier','POST',sale('burger','burger',2,20));status(r,201);assert.equal(r.data.data.totalAmount,40);assert.equal(await stock('burger','burger'),before-2);assert.equal(await p.stockMovement.count({where:{saleId:r.data.data.id}}),1);});
 await test('VENTA: stock insuficiente no crea venta',async()=>{const count=await p.sale.count(),before=await stock('burger','burger');status(await req('/api/pos/sale','cashier','POST',sale('burger','burger',10000,20)),400);assert.equal(await p.sale.count(),count);assert.equal(await stock('burger','burger'),before);});
 await test('VENTA: faltan datos, responde 400',async()=>status(await req('/api/pos/sale','cashier','POST',{}),400));
 await test('GASTOS: efectivo Bs. 5',async()=>{status(await req('/api/expenses','cashier','POST',{branchId:B.burger,description:'PRUEBA gasto',amount:5,category:'OTRO',paymentMethod:'CASH',registeredBy:f.users.cashier.id}),201);});
 await test('CAJA: cierre calcula Bs. 135 y diferencia cero',async()=>{assert(session,'Apertura necesaria');const r=await req('/api/cash-close','cashier','POST',{sessionId:session.id,branchId:B.burger,userId:f.users.cashier.id,actualCash:135});status(r,201);assert.equal(r.data.data.expectedCash,135);assert.equal(r.data.data.difference,0);assert.equal(r.data.data.sessionStatus,'CLOSED');});
 await test('VENTA ACAI: medio kg total Bs. 30 y stock -0,5',async()=>{await req('/api/cash-close/open','acai','POST',{branchId:B.acai,userId:f.users.acai.id,openingAmount:0});const before=await stock('acai','acai');const r=await req('/api/pos/sale','acai','POST',sale('acai','acai',0.5,60));status(r,201);assert.equal(r.data.data.totalAmount,30);assert.equal(await stock('acai','acai'),before-0.5);});
 await test('RECEPCIÓN: entrada de 10 kg y kardex',async()=>{const before=await stock('factory','raw');const r=await req('/api/inventory/receiving','warehouse','POST',{branchId:B.factory,supplier:'Proveedor PRUEBA',invoiceRef:`QA-${Date.now()}`,receivedBy:f.users.warehouse.id,items:[{productId:P.raw,quantity:10}]});status(r,201);assert.equal(await stock('factory','raw'),before+10);assert.equal(r.data.data.length,1);});
 await test('AJUSTE: salida manual de 2 kg',async()=>{const before=await stock('factory','raw');status(await req('/api/inventory/adjustments','warehouse','POST',{branchId:B.factory,productId:P.raw,type:'SALIDA',quantity:2,reason:'PRUEBA',createdBy:f.users.warehouse.id}),201);assert.equal(await stock('factory','raw'),before-2);});
 await test('AJUSTE: permite corregir existencias a cero',async()=>{const before=await stock('other','drink');try{status(await req('/api/inventory/adjustments','admin','POST',{branchId:B.other,productId:P.drink,type:'AJUSTE',quantity:0,reason:'PRUEBA cero',createdBy:f.users.admin.id}),201);assert.equal(await stock('other','drink'),0);}finally{await p.inventory.update({where:{branchId_productId:{branchId:B.other,productId:P.drink}},data:{currentStock:before}});}});
 await test('MERMA: baja de 1 kg',async()=>{const before=await stock('factory','raw');status(await req('/api/inventory/merma','warehouse','POST',{branchId:B.factory,productId:P.raw,quantity:1,reason:'OTRO',description:'PRUEBA',registeredBy:f.users.warehouse.id}),201);assert.equal(await stock('factory','raw'),before-1);});
 let order;
 await test('FÁBRICA: programa producción de 4 kg',async()=>{const r=await req('/api/factory/production','warehouse','POST',{branchId:B.factory,recipeId:f.recipe.id,plannedYield:4,createdBy:f.users.warehouse.id});status(r,201);order=r.data.data;assert.equal(order.status,'SCHEDULED');});
 await test('FÁBRICA: completa y consume 6 kg, produce 4 kg',async()=>{assert(order);const raw=await stock('factory','raw'),out=await stock('factory','prepared');const r=await req(`/api/factory/production/${order.id}/complete`,'warehouse','POST',{actualYield:4,completedBy:f.users.warehouse.id});status(r,200);assert.equal(await stock('factory','raw'),raw-6);assert.equal(await stock('factory','prepared'),out+4);});
 await test('FÁBRICA: rechaza completar dos veces',async()=>{assert(order);status(await req(`/api/factory/production/${order.id}/complete`,'warehouse','POST',{actualYield:4,completedBy:f.users.warehouse.id}),400);});
 let transfer,transferFrom,transferTo;
 await test('TRANSFERENCIA: crea y aprueba envío de 5 kg',async()=>{transferFrom=await stock('factory','raw');transferTo=await stock('burger','raw');const r=await req('/api/inventory/transfers','admin','POST',{fromBranchId:B.factory,toBranchId:B.burger,requestedBy:f.users.admin.id,items:[{productId:P.raw,requestedQty:5}]});status(r,201);transfer=r.data.data;status(await req(`/api/inventory/transfers/${transfer.id}/approve`,'admin','PATCH',{approvedBy:f.users.admin.id}),200);});
 await test('TRANSFERENCIA: recepción conserva total entre sucursales',async()=>{assert(transfer);status(await req(`/api/inventory/transfers/${transfer.id}/receive`,'admin','PATCH',{receivedBy:f.users.admin.id}),200);assert.equal(await stock('burger','raw'),transferTo+5);assert.equal(await stock('factory','raw'),transferFrom-5,'No se descontó el origen');});
 await test('TRANSFERENCIA: rechaza recibir dos veces',async()=>{assert(transfer);status(await req(`/api/inventory/transfers/${transfer.id}/receive`,'admin','PATCH',{}),400);});
 let purchase;
 await test('COMPRAS: crea pedido de 4 unidades',async()=>{const r=await req('/api/admin/purchase-orders','admin','POST',{branchId:B.other,userId:f.users.admin.id,supplier:'Proveedor PRUEBA',items:[{productId:P.drink,quantity:4,unitCost:2}]});status(r,201);purchase=r.data.data;assert.equal(purchase.totalAmount,8);});
 await test('COMPRAS: recibe y suma 4 unidades',async()=>{assert(purchase);const before=await stock('other','drink');status(await req(`/api/admin/purchase-orders/${purchase.id}`,'admin','PATCH',{status:'RECEIVED'}),200);assert.equal(await stock('other','drink'),before+4);});
 await test('COMPRAS: recibir dos veces no duplica existencias',async()=>{assert(purchase);const before=await stock('other','drink');await req(`/api/admin/purchase-orders/${purchase.id}`,'admin','PATCH',{status:'RECEIVED'});assert.equal(await stock('other','drink'),before,'La segunda recepción aumentó existencias');});
 for(const route of ['/api/admin/sales','/api/admin/reports/cashiers','/api/admin/reports/shifts','/api/admin/expenses','/api/factory/summary',`/api/inventory/kardex?branchId=${B.factory}`,`/api/inventory/stock?branchId=${B.factory}`])await test(`CONSULTA: ${route.split('?')[0]}`,async()=>{const r=await req(route,'admin');status(r,200);assert.equal(r.data.success,true);});
 await test('OFFLINE: reenvío del mismo offlineId no duplica venta',async()=>{const offlineId=`QA-OFF-${Date.now()}`;const body=sale('acai','acai',0.1,60,{offlineId,createdAt:new Date().toISOString()});const count=await p.sale.count();status(await req('/api/pos/sale','acai','POST',body),201);const second=await req('/api/pos/sale','acai','POST',body);assert([200,201,409].includes(second.status));assert.equal(await p.sale.count(),count+1,'El mismo offlineId generó dos ventas');});
 await test('AUTH: logout borra cookie',async()=>{const r=await req('/api/auth/logout','cashier','POST',{});status(r,200);assert.match(r.headers.get('set-cookie'),/Max-Age=0/i);});
 fs.writeFileSync('.local/test-db/functional-api-results.json',JSON.stringify({date:new Date().toISOString(),baseURL:f.baseURL,results},null,2));
 console.log(`TOTAL: ${results.length}, PASS: ${results.filter(x=>x.status==='PASS').length}, FAIL: ${results.filter(x=>x.status==='FAIL').length}`);
 if(results.some(x=>x.status==='FAIL'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>p.$disconnect());
