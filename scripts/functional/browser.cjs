// PLAYWRIGHT_MODULE puede apuntar a una instalación externa, sin añadir dependencias al proyecto.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/tmp/skot-erp-functional-tools/node_modules/playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {PrismaClient}=require('@prisma/client');
const prisma=new PrismaClient();
const f=JSON.parse(fs.readFileSync('.local/test-db/functional-fixtures.json','utf8'));
// Next.js utiliza localhost en las redirecciones locales; mantener el mismo origen para las cookies.
f.baseURL='http://localhost:3100';
const output='.local/test-db/browser';fs.mkdirSync(output,{recursive:true});
const results=[];let browser;
async function test(name,fn){try{await fn();results.push({name,status:'PASS'});console.log('PASS',name);}catch(e){results.push({name,status:'FAIL',detail:e.message});console.log('FAIL',name,e.message.slice(0,700));}}
const sessions={};
async function login(key){
 const ctx=await browser.newContext({baseURL:f.baseURL,viewport:{width:1440,height:1000},serviceWorkers:'block'});
 const page=await ctx.newPage();const errors=[],responses=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400 && new URL(r.url()).origin===f.baseURL)responses.push({url:new URL(r.url()).pathname,status:r.status()});});
 await page.goto('/login');await page.locator('input[type=email]').fill(f.users[key].email);await page.locator('input[type=password]').fill(f.users[key].password);
 await page.getByRole('button',{name:'Ingresar',exact:true}).click();
 await page.waitForURL(u=>u.pathname!=='/login',{timeout:12000});
 await page.waitForLoadState('networkidle');
 sessions[key]={ctx,page,errors,responses};return sessions[key];
}
async function visit(key,route){
 const s=sessions[key];assert(s,'El login debe completarse');const n=s.errors.length,m=s.responses.length;
 const r=await s.page.goto(route);assert.equal(r.status(),200);await s.page.waitForLoadState('networkidle');
 assert.equal(new URL(s.page.url()).pathname,route,'Redirección inesperada');
 const body=await s.page.locator('body').innerText();assert(body.length>30,'Pantalla vacía');assert(!/Application error|Internal Server Error/.test(body));
 assert.deepEqual(s.errors.slice(n),[],'Errores JavaScript en pantalla');
 assert.deepEqual(s.responses.slice(m),[],'Solicitudes fallidas en pantalla');
}
(async()=>{
 const db=new URL(process.env.DATABASE_URL);assert.equal(db.hostname,'127.0.0.1');assert.equal(db.port,'55432');assert.equal(db.pathname,'/skot_erp_test');
 assert.equal(new URL(f.baseURL).hostname,'localhost');
 browser=await chromium.launch({headless:true});
 await test('UI: credenciales incorrectas muestran mensaje',async()=>{const ctx=await browser.newContext({baseURL:f.baseURL,serviceWorkers:'block'});try{const pg=await ctx.newPage();await pg.goto('/login');await pg.locator('input[type=email]').fill(f.users.admin.email);await pg.locator('input[type=password]').fill('incorrecta');await pg.getByRole('button',{name:'Ingresar',exact:true}).click();await pg.getByText('Credenciales incorrectas').waitFor();assert.equal(new URL(pg.url()).pathname,'/login');}finally{await ctx.close();}});
 for(const key of ['admin','manager','cashier','acai','warehouse'])await test(`UI: login y dashboard ${key}`,async()=>{const s=await login(key);assert.deepEqual(s.errors,[]);await s.page.screenshot({path:`${output}/dashboard-${key}.png`,fullPage:true});});
 for(const route of ['/admin','/admin/users','/admin/branches','/admin/products','/admin/branch-products','/admin/combos','/admin/modifiers','/admin/scale-config','/admin/expenses','/admin/purchase-orders','/admin/sales','/admin/cash-closes','/admin/analytics','/admin/reports','/admin/alerts','/inventory','/inventory/stock','/inventory/adjustments','/inventory/merma','/inventory/mermas','/inventory/transfers','/inventory/transfers/request','/inventory/internal-orders','/inventory/kardex','/inventory/movements','/inventory/suggestions','/factory','/factory/materials','/factory/receiving','/factory/recipes','/factory/recipes/new','/factory/production','/factory/production/new','/expenses','/profile'])await test(`UI admin: ${route}`,()=>visit('admin',route));
 for(const route of ['/factory','/factory/materials','/factory/receiving','/factory/recipes','/factory/production','/factory/production/new'])await test(`UI almacén: ${route}`,()=>visit('warehouse',route));
 await test('UI permisos: cajero redirigido fuera de administración',async()=>{const s=sessions.cashier;assert(s);await s.page.goto('/admin');assert.equal(new URL(s.page.url()).pathname,'/');assert.equal(new URL(s.page.url()).searchParams.get('forbidden'),'1');});
 await test('UI Burger: venta completa con caja abierta',async()=>{
  const s=sessions.cashier;assert(s);const pg=s.page;
  await pg.goto('/burgers');await pg.waitForLoadState('networkidle');
  if(await pg.getByText('POS Bloqueado',{exact:true}).isVisible()){await pg.locator('input[type=number]').fill('100');await pg.getByRole('button',{name:'Abrir Caja y Comenzar'}).click();}
  await pg.getByTitle('Agregar al carrito').filter({hasText:'PRUEBA burger'}).click();
  await pg.getByRole('button',{name:/Procesar Pago/}).click();
  await pg.locator('input[type=number]').last().fill('20');
  const wait=pg.waitForResponse(r=>new URL(r.url()).pathname==='/api/pos/sale' && r.request().method()==='POST');
  await pg.getByRole('button',{name:'Confirmar Pago',exact:true}).click();const response=await wait;assert.equal(response.status(),201);
  const data=await response.json();const sale=await prisma.sale.findUniqueOrThrow({where:{id:data.data.id},include:{items:true}});assert.equal(sale.totalAmount,20);assert.equal(sale.items[0].productId,f.products.burger.id);await pg.screenshot({path:`${output}/burger-venta.png`,fullPage:true});
 });
 await test('UI Açaí: conecta balanza simulada y confirma peso',async()=>{
  const s=sessions.acai;assert(s);const pg=s.page;await pg.addInitScript(()=>{Math.random=()=>0.6;});
  await pg.goto('/acai');await pg.getByRole('button',{name:/PRUEBA acai/}).click();
  await pg.getByTitle('Conectar por cable USB (Web Serial)').click();
  const confirm=pg.getByRole('button',{name:'Confirmar peso',exact:true});await confirm.waitFor();
  await pg.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Confirmar peso')&&!b.disabled));
  await confirm.click();assert(await pg.getByRole('button',{name:/Cobrar/i}).first().isVisible());
  await pg.screenshot({path:`${output}/acai-peso.png`,fullPage:true});
 });
 await test('UI: configuración IP persistida se restaura sin error de hidratación',async()=>{const s=sessions.acai;assert(s);await s.page.evaluate(()=>localStorage.setItem('skot_scale_ip','192.168.1.123'));const start=s.errors.length;await s.page.reload();await s.page.waitForLoadState('networkidle');await s.page.getByTitle('Configurar IP de la balanza').click();assert(await s.page.locator('input').filter({visible:true}).count()>=1);assert.equal(await s.page.locator('input').evaluateAll(inputs=>inputs.some(i=>i.value==='192.168.1.123')),true);assert.deepEqual(s.errors.slice(start),[]);});
 fs.writeFileSync('.local/test-db/functional-browser-results.json',JSON.stringify({date:new Date().toISOString(),browser:await browser.version(),results},null,2));
 console.log(`TOTAL: ${results.length}, PASS: ${results.filter(x=>x.status==='PASS').length}, FAIL: ${results.filter(x=>x.status==='FAIL').length}`);
 if(results.some(x=>x.status==='FAIL'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();await prisma.$disconnect();});
