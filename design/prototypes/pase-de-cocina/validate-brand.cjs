/* Variante cromática de Fase 3: capturas y verificaciones de lectura. */
const { chromium } = require('../../../node_modules/@playwright/test');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const out = path.join(root, 'previews', 'brand');
fs.mkdirSync(out, { recursive: true });
const scenarios = [
  ['dashboard', 'dashboard.html', '#54294F'],
  ['burger', 'burger.html', '#A6262B'],
  ['burger-combos', 'burger.html?view=combos', '#A6262B'],
  ['acai-waiting', 'acai.html?state=waiting', '#632A62'],
  ['acai-stable', 'acai.html', '#632A62'],
  ['acai-extras', 'acai.html?state=extras', '#632A62']
];
const widths = [375, 768, 1024, 1440];
const failures = [];
const results = [];
const luminance = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  .reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
const contrast = (a, b) => {
  const x = luminance(a), y = luminance(b);
  return +((Math.max(x, y) + .05) / (Math.min(x, y) + .05)).toFixed(2);
};
const colorPairs = {
  burgerAction: contrast('#FFFFFF', '#A6262B'),
  acaiAction: contrast('#FFFFFF', '#632A62'),
  adminAction: contrast('#FFFFFF', '#54294F'),
  textBackground: contrast('#2D2528', '#F4F2F0'),
  mutedSurface: contrast('#5D5358', '#FFFFFF'),
  darkTextGold: contrast('#2D2528', '#E1B528')
};
for (const [name, value] of Object.entries(colorPairs)) if (value < 4.5) failures.push(`contraste ${name}: ${value}:1`);

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [name, route, expected] of scenarios) {
      for (const width of widths) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const [file, query] = route.split('?');
        const url = pathToFileURL(path.join(root, file));
        url.search = (query ? query + '&' : '') + 'palette=brand';
        await page.goto(url.href);
        await page.locator('html.palette-brand').waitFor();
        await page.evaluate(() => document.fonts.ready);
        const info = await page.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          primary: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim().toUpperCase(),
          fontDisplay: document.fonts.check('600 16px Lexend'),
          fontText: document.fonts.check('400 16px "Source Sans 3"')
        }));
        if (info.width > width + 1) failures.push(`${name}/${width}: desbordamiento ${info.width}`);
        if (info.primary !== expected || !info.fontDisplay || !info.fontText) failures.push(`${name}/${width}: tokens o fuentes incorrectos`);
        if (errors.length) failures.push(`${name}/${width}: ${errors.join(', ')}`);
        if (width === 375 || width === 1440 || (width === 768 && ['burger','acai-stable'].includes(name)) || (width === 1024 && name === 'dashboard')) {
          await page.screenshot({ path: path.join(out, `${name}-${width}${width === 375 ? '-viewport' : ''}.png`), fullPage: width !== 375 });
        }
        if (width === 375 && ['burger','acai-extras'].includes(name)) {
          await page.locator('.mobile-order-trigger:visible').click();
          if (!(await page.locator('#order-sheet').evaluate(el => el.open))) failures.push(`${name}/${width}: resumen no abre`);
          await page.screenshot({ path: path.join(out, `${name}-375-sheet.png`) });
          await page.keyboard.press('Escape');
          if (await page.locator('#order-sheet').evaluate(el => el.open)) failures.push(`${name}/${width}: Escape no cierra`);
        }
        if (width === 1440 && ['burger', 'acai-extras'].includes(name)) {
          const action = page.locator('.ticket-footer .button.primary:visible').first();
          await action.hover();
          await page.waitForTimeout(200);
          const hoverColor = await action.evaluate(el => getComputedStyle(el).backgroundColor);
          if (hoverColor === 'rgb(22, 75, 61)' || hoverColor === 'rgb(30, 90, 72)') failures.push(`${name}/${width}: hover conserva verde anterior`);
        }
        results.push({ name, width, ...info, errors });
        await page.close();
      }
    }
    for (const width of [375, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const url = pathToFileURL(path.join(root, 'burger.html'));
      url.search = 'view=modifier&palette=brand';
      await page.goto(url.href);
      await page.locator('html.palette-brand').waitFor();
      if (!(await page.locator('#modifier-dialog').evaluate(el => el.open))) failures.push(`modifier/${width}: diálogo no abre`);
      await page.screenshot({ path: path.join(out, `burger-modifier-${width}${width === 375 ? '-viewport' : ''}.png`) });
      await page.close();
    }
    for (const width of [375, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(pathToFileURL(path.join(root, 'index-brand.html')).href);
      const images = await page.locator('.gallery-card img').evaluateAll(list => list.length === 3 && list.every(image => image.complete && image.naturalWidth > 0));
      if (!images) failures.push(`galería/${width}: imágenes ausentes`);
      await page.screenshot({ path: path.join(out, `gallery-${width}${width === 375 ? '-viewport' : ''}.png`), fullPage: width !== 375 });
      await page.close();
    }
    fs.writeFileSync(path.join(root, 'validation-brand.json'), JSON.stringify({ date: new Date().toISOString(), cases: results.length + 4, colorPairs, failures, results }, null, 2));
    console.log(JSON.stringify({ cases: results.length + 4, screenshots: fs.readdirSync(out).length, colorPairs, failures }, null, 2));
    if (failures.length) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
