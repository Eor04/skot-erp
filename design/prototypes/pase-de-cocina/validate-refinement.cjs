/* Validación aislada de la maqueta. Ejecutar desde la raíz: node design/prototypes/pase-de-cocina/validate-refinement.cjs */
const { chromium } = require('../../../node_modules/@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const root = __dirname;
const out = path.join(root, 'previews', 'refined');
fs.mkdirSync(out, { recursive: true });

const scenarios = [
  ['dashboard', 'dashboard.html', true],
  ['burger', 'burger.html', true],
  ['burger-combos', 'burger.html?view=combos', false],
  ['burger-extras', 'burger.html?view=extras', false],
  ['burger-long', 'burger.html?order=long', false],
  ['burger-large-catalog', 'burger.html?catalog=large', false],
  ['burger-selected', 'burger.html?selected=1', false],
  ['burger-disabled', 'burger.html?disabled=1', false],
  ['acai-waiting', 'acai.html?state=waiting', false],
  ['acai-stable', 'acai.html', true],
  ['acai-extras', 'acai.html?state=extras', true],
  ['acai-long', 'acai.html?state=extras&order=long', false]
];
const widths = [375, 768, 1024, 1440];
const results = [];
const failures = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [name, url, main] of scenarios) {
      for (const width of widths) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const [file, query] = url.split('?');
        await page.goto(pathToFileURL(path.join(root, file)).href + (query ? `?${query}` : ''));
        await page.evaluate(() => document.fonts.ready);
        const data = await page.evaluate(() => {
          const visible = el => {
            const box = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
          };
          const buttons = [...document.querySelectorAll('.add-button,.qty-button,.mobile-checkout .button,.mobile-order-trigger,.scale-actions .button')].filter(visible);
          const tiny = buttons.filter(el => { const b = el.getBoundingClientRect(); return b.width < 48 || b.height < 48; }).map(el => el.outerHTML.slice(0, 90));
          const dock = [...document.querySelectorAll('.mobile-checkout')].find(visible);
          return {
            docWidth: document.documentElement.scrollWidth,
            viewport: innerWidth,
            tiny,
            dockVisible: !!dock && visible(dock),
            fonts: [document.fonts.check('16px Lexend'), document.fonts.check('16px "Source Sans 3"')],
            bodyHeight: document.body.scrollHeight
          };
        });
        if (data.docWidth > width + 1) failures.push(`${name}/${width}: desbordamiento horizontal ${data.docWidth}`);
        if (data.tiny.length) failures.push(`${name}/${width}: objetivos frecuentes <48px ${data.tiny.join(',')}`);
        if (errors.length) failures.push(`${name}/${width}: errores JS ${errors.join(',')}`);
        if (!data.fonts.every(Boolean)) failures.push(`${name}/${width}: fuentes no cargadas`);
        if (name !== 'dashboard' && width <= 900 && !data.dockVisible) failures.push(`${name}/${width}: barra inferior ausente`);
        if (name === 'burger-combos' || name === 'burger-extras' || name === 'burger-large-catalog') {
          const count = await page.locator('.catalog-grid:visible .product-card:visible').count();
          const expected = name === 'burger-large-catalog' ? 20 : 3;
          if (count !== expected) failures.push(`${name}/${width}: ${count} productos, esperaba ${expected}`);
        }
        if (name === 'burger-selected' && !(await page.locator('.catalog-grid.products-only .product-card.is-selected').count())) failures.push(`${name}/${width}: estado seleccionado ausente`);
        if (name === 'burger-disabled' && !(await page.locator('.catalog-grid.products-only .product-card.is-disabled .add-button').isDisabled())) failures.push(`${name}/${width}: estado inhabilitado ausente`);
        if (name === 'acai-waiting' && !(await page.locator('.scale-actions button').isDisabled())) failures.push(`${name}/${width}: confirmar peso habilitado sin lectura`);
        if (name === 'acai-stable' && !(await page.locator('.scale-actions a.primary').count())) failures.push(`${name}/${width}: falta confirmar peso`);
        if (name === 'acai-extras' && !(await page.locator('.pos-layout > .ticket .ticket-footer button.extras-only').isEnabled())) failures.push(`${name}/${width}: cobro no disponible tras confirmar`);
        if (name !== 'dashboard' && width >= 1024 && ['burger-long','acai-long'].includes(name)) {
          const scroll = await page.evaluate(() => {
            const lines = document.querySelector('.pos-layout > .ticket .ticket-lines');
            const footer = document.querySelector('.pos-layout > .ticket .ticket-footer').getBoundingClientRect();
            return { overflowing: lines.scrollHeight > lines.clientHeight, footerBottom: footer.bottom };
          });
          if (!scroll.overflowing || scroll.footerBottom > 900) failures.push(`${name}/${width}: pedido extenso no conserva total y cobro`);
        }
        if ((main || (width === 1440 && name !== 'dashboard') || (width === 375 && ['acai-waiting','burger-long','acai-long','burger-combos','burger-extras','burger-selected','burger-disabled'].includes(name)))) {
          await page.screenshot({ path: path.join(out, `${name}-${width}${width === 375 ? '-viewport' : ''}.png`), fullPage: width !== 375 });
        }
        if (name === 'dashboard') {
          const metrics = await page.locator('.metric-band .metric').count();
          const alerts = await page.locator('#alertas .alert-item').count();
          if (metrics !== 4 || alerts !== 2) failures.push(`dashboard/${width}: KPI o alertas incompletos`);
          const nav = width <= 900 ? page.locator('.mobile-quicknav a[href="#alertas"]') : page.locator('.sidebar .side-link[href="#alertas"]');
          await nav.click();
          if (!(await page.evaluate(() => location.hash === '#alertas'))) failures.push(`dashboard/${width}: navegación a alertas falla`);
        }
        if (name !== 'dashboard' && width <= 900) {
          const focusTarget = name.startsWith('burger') ? page.locator('.catalog-grid:visible .add-button:visible:not(:disabled)').last() : page.locator('.acai-foot .button:visible').first();
          if (await focusTarget.count()) {
            await focusTarget.scrollIntoViewIfNeeded();
            await focusTarget.focus();
            const focusVisible = await focusTarget.evaluate(el => {
              const box = el.getBoundingClientRect();
              const dock = [...document.querySelectorAll('.mobile-checkout')].find(node => getComputedStyle(node).display !== 'none');
              return box.top >= 0 && box.bottom <= dock.getBoundingClientRect().top;
            });
            if (!focusVisible) failures.push(`${name}/${width}: foco cubierto por barra inferior`);
          }
          const trigger = page.locator('.mobile-order-trigger:visible').first();
          await trigger.click();
          const sheet = page.locator('#order-sheet');
          if (!(await sheet.evaluate(el => el.open))) failures.push(`${name}/${width}: resumen no abre`);
          if (name === 'acai-extras') {
            const visiblePay = await sheet.locator('.ticket-footer .button.primary.large:visible').count();
            if (visiblePay !== 1) failures.push(`${name}/${width}: ${visiblePay} acciones de cobro en resumen`);
          }
          if (['burger-long','acai-long'].includes(name) && width === 375) {
            const scrollable = await sheet.locator('.sheet-content').evaluate(el => el.scrollHeight > el.clientHeight);
            if (!scrollable) failures.push(`${name}/${width}: resumen extenso no desplaza`);
            await sheet.locator('.ticket-footer .button.primary.large:visible').scrollIntoViewIfNeeded();
          }
          const active = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
          if (active !== 'Cerrar resumen') failures.push(`${name}/${width}: foco no entra en resumen`);
          if (main && width === 375) await page.screenshot({ path: path.join(out, `${name}-${width}-sheet.png`) });
          await page.keyboard.press('Escape');
          if (await sheet.evaluate(el => el.open)) failures.push(`${name}/${width}: Escape no cierra resumen`);
          const returned = await trigger.evaluate(el => el === document.activeElement);
          if (!returned) failures.push(`${name}/${width}: foco no retorna al disparador`);
        }
        results.push({ scenario: name, width, ...data, errors });
        await page.close();
      }
    }
    for (const width of [375, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(pathToFileURL(path.join(root, 'burger.html')).href + '?view=modifier');
      const dialog = page.locator('#modifier-dialog');
      if (!(await dialog.evaluate(el => el.open))) failures.push(`modifier/${width}: diálogo no abre`);
      const initial = await page.locator('#modifier-total').textContent();
      await dialog.getByText('Tocino', { exact: true }).click();
      const updated = await page.locator('#modifier-total').textContent();
      if (initial !== 'Bs. 47,00' || updated !== 'Bs. 54,00') failures.push(`modifier/${width}: total incorrecto ${initial} -> ${updated}`);
      await page.screenshot({ path: path.join(out, `burger-modifier-${width}${width === 375 ? '-viewport' : ''}.png`) });
      await page.keyboard.press('Escape');
      if (await dialog.evaluate(el => el.open)) failures.push(`modifier/${width}: Escape no cierra`);
      await page.close();
    }
    {
      const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
      await page.goto(pathToFileURL(path.join(root, 'burger.html')).href);
      await page.getByRole('button', { name: 'Bebidas', exact: true }).click();
      if (await page.locator('.catalog-grid.products-only .product-card:visible').count() !== 1) failures.push('burger/categoría Bebidas: filtro incorrecto');
      await page.getByRole('button', { name: 'Todos', exact: true }).click();
      if (await page.locator('.catalog-grid.products-only .product-card:visible').count() !== 6) failures.push('burger/categoría Todos: filtro incorrecto');
      await page.close();
    }
    for (const width of [375, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
      const imagesReady = await page.locator('.gallery-card img').evaluateAll(images => images.length === 3 && images.every(image => image.complete && image.naturalWidth > 0));
      if (!imagesReady) failures.push(`galería/${width}: capturas no cargadas`);
      const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      if (docWidth > width + 1) failures.push(`galería/${width}: desbordamiento horizontal`);
      await page.screenshot({ path: path.join(out, `gallery-${width}${width === 375 ? '-viewport' : ''}.png`), fullPage: width !== 375 });
      await page.close();
    }
    fs.writeFileSync(path.join(root, 'validation-results.json'), JSON.stringify({ date: new Date().toISOString(), cases: results.length + 4, failures, results }, null, 2));
    console.log(JSON.stringify({ cases: results.length + 4, screenshots: fs.readdirSync(out).length, failures }, null, 2));
    if (failures.length) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
