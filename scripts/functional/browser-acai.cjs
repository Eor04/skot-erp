// Prueba completa de venta por peso con balanza simulada.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/tmp/skot-erp-functional-tools/node_modules/playwright');
const {PrismaClient}=require('@prisma/client');
const fs=require('node:fs');const assert=require('node:assert/strict');
const f=JSON.parse(fs.readFileSync('.local/test-db/functional-fixtures.json','utf8'));
const prisma=new PrismaClient();let browser;
const result={name:'UI Açaí: venta completa con peso simulado, total y stock verificados'};
(async()=>{
 const db=new URL(process.env.DATABASE_URL);assert.equal(db.hostname,'127.0.0.1');assert.equal(db.port,'55432');assert.equal(db.pathname,'/skot_erp_test');
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({baseURL:'http://localhost:3100',viewport:{width:1440,height:1000},serviceWorkers:'block'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Peso bruto 1,4 kg y señal estable para repetir el mismo escenario.
 await page.addInitScript(()=>{Math.random=()=>0.6;});
 await page.goto('/login');await page.locator('input[type=email]').fill(f.users.acai.email);await page.locator('input[type=password]').fill(f.users.acai.password);
 await page.getByRole('button',{name:'Ingresar',exact:true}).click();await page.waitForURL(u=>u.pathname!=='/login');
 await page.goto('/acai');await page.getByRole('button',{name:/PRUEBA acai/}).click();
 await page.getByTitle('Conectar por cable USB (Web Serial)').click();
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Confirmar peso')&&!b.disabled));
 await page.getByRole('button',{name:'Confirmar peso',exact:true}).click();
 await page.getByRole('button',{name:/Cobrar —/}).click();await page.locator('input[type=number]').last().fill('1000');
 const where={branchId_productId:{branchId:f.branches.acai.id,productId:f.products.acai.id}};
 const before=await prisma.inventory.findUniqueOrThrow({where});
 const wait=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/pos/sale'&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Confirmar pago',exact:true}).click();const response=await wait;assert.equal(response.status(),201);
 const data=await response.json();const sale=await prisma.sale.findUniqueOrThrow({where:{id:data.data.id},include:{items:true}});
 assert.equal(sale.totalAmount,75);assert.equal(sale.items[0].quantity,1.25);assert.equal(sale.items[0].unitPrice,60);
 const after=await prisma.inventory.findUniqueOrThrow({where});assert(Math.abs(after.currentStock-(before.currentStock-1.25))<1e-9);
 assert.deepEqual(errors,[]);await page.screenshot({path:'.local/test-db/browser/acai-venta.png',fullPage:true});
 result.status='PASS';console.log('PASS',result.name);
})().catch(e=>{result.status='FAIL';result.detail=e.message;console.error('FAIL',result.name,e.message);process.exitCode=1;}).finally(async()=>{fs.writeFileSync('.local/test-db/functional-acai-results.json',JSON.stringify({date:new Date().toISOString(),results:[result]},null,2));if(browser)await browser.close();await prisma.$disconnect();});
