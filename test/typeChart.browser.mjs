import {assetPath} from './helpers/browserPaths.js';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {typeChartTypes, typeChartRows, typeChartName} from '../src/resources/charts/typeChart.js';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_EXECUTABLE});
try {
  const page = await browser.newPage({viewport: {width: 375, height: 800}}), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5190');
  await page.getByRole('button', {name: 'Open navigation', exact: true}).click();
  await page.getByRole('button', {name: 'Resources', exact: true}).click();
  const link = page.getByRole('link', {name: 'Type Chart', exact: true});
  const bounds = await link.boundingBox();
  const textWidth = await link.evaluate(x => {const r = document.createRange(); r.selectNodeContents(x); return r.getBoundingClientRect().width;});
  assert.ok(Math.abs(bounds.width - textWidth) < 2);
  const row = await link.locator('..').boundingBox();
  await page.mouse.click(row.x + row.width - 5, row.y + row.height / 2);
  assert.equal(await page.locator('.type-chart').count(), 0);
  await page.evaluate(() => {
    window.__chartScrollCalls = [];
    for (const key of ['scroll','scrollTo','scrollBy']) {
      const original = window[key];
      window[key] = function(...args) {window.__chartScrollCalls.push(key); return original.apply(this,args);};
    }
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function(...args) {window.__chartScrollCalls.push('scrollIntoView'); return original.apply(this,args);};
  });
  await link.click();
  const root = page.locator('.type-chart');
  assert.equal(await root.locator('tbody tr').count(), 17);
  assert.equal(await root.locator('tbody td').count(), 289);
  assert.deepEqual(await root.locator('thead th').evaluateAll(xs => xs.map(x => x.getAttribute('aria-label'))), typeChartTypes.map(type => `${typeChartName(type)} defending`));
  assert.deepEqual(await root.locator('tbody th').evaluateAll(xs => xs.map(x => x.getAttribute('aria-label'))), typeChartTypes.map(type => `${typeChartName(type)} attacking`));
  assert.deepEqual(await root.locator('tbody td').allTextContents(), typeChartRows.flatMap(row => row.cells.map(cell => cell.label)));
  assert.ok(await root.locator('td[data-multiplier="1"]').evaluateAll(xs => xs.every(x => x.textContent === '' && getComputedStyle(x).backgroundColor === 'rgba(0, 0, 0, 0)')));
  assert.ok(await root.locator('tbody td').evaluateAll(xs => xs.every(x => getComputedStyle(x).backgroundColor === 'rgba(0, 0, 0, 0)')), 'All matchup cells must remain unshaded');
  assert.equal(await root.locator('button, a, input, select').count(), 0);
  const icons = root.locator('img');
  assert.equal(await icons.count(), 34);
  await icons.evaluateAll(xs => Promise.all(xs.map(x => x.decode())));
  assert.ok(await icons.evaluateAll(xs => xs.every(x => x.naturalWidth > 0)));
  assert.deepEqual(await root.locator('thead img').evaluateAll(xs => xs.map(x => x.getAttribute('src'))), typeChartTypes.map(type => assetPath(`/types/icons/${type}.png`)));
  assert.deepEqual(await root.locator('tbody img').evaluateAll(xs => xs.map(x => x.getAttribute('src'))), typeChartTypes.map(type => assetPath(`/types/icons/${type}.png`)));
  for (const width of [320, 375, 390, 430, 1280]) {
    await page.setViewportSize({width, height: 800});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const table = await root.locator('table').boundingBox();
    assert.ok(table.x >= 0 && table.x + table.width <= width && table.y + table.height <= 800);
    const dimensions = await root.locator('tbody td').evaluateAll(xs => xs.map(x => {
      const r = x.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(x);
      const text = range.getBoundingClientRect();
      return {width:r.width,height:r.height,fits:!x.textContent || text.left>=r.left && text.right<=r.right && text.top>=r.top && text.bottom<=r.bottom};
    }));
    assert.ok(dimensions.every(x => Math.abs(x.width-x.height) < 1.1 && x.fits));
    assert.ok(Math.max(...dimensions.map(x => x.width)) - Math.min(...dimensions.map(x => x.width)) < 1);
    await page.screenshot({path: `/private/tmp/type-chart-${width}.png`, fullPage: true});
  }
  await page.getByRole('button', {name: 'Back to Resources', exact: true}).click();
  await link.waitFor();
  assert.equal(await root.count(), 0);
  assert.deepEqual(await page.evaluate(() => window.__chartScrollCalls), []);
  assert.deepEqual(errors, []);
  console.log('Type Chart: all 289 cells, axis order/orientation, blank neutrals, 34 decoded icons, square cells/full chart at 320/375/390/430/1280px, text-only link, Back and no scroll calls passed.');
} finally {await browser.close();}
