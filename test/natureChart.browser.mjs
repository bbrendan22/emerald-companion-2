import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {natureChartRows} from '../src/resources/charts/natureChart.js';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_EXECUTABLE});
try {
  const page = await browser.newPage({viewport: {width: 375, height: 800}}), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5189');
  await page.getByRole('button', {name: 'Open navigation', exact: true}).click();
  await page.getByRole('button', {name: 'Resources', exact: true}).click();
  const link = page.getByRole('link', {name: 'Nature Chart', exact: true});
  const bounds = await link.boundingBox();
  const textWidth = await link.evaluate(x => {const r = document.createRange(); r.selectNodeContents(x); return r.getBoundingClientRect().width;});
  assert.ok(Math.abs(bounds.width - textWidth) < 2);
  const row = await link.locator('..').boundingBox();
  await page.mouse.click(row.x + row.width - 5, row.y + row.height / 2);
  assert.equal(await page.locator('.nature-chart').count(), 0);
  await link.click();
  const root = page.locator('.nature-chart');
  assert.deepEqual(await root.locator('tbody td').allTextContents(), natureChartRows.flatMap(row => row.cells.map(cell => cell.name)));
  assert.deepEqual(await root.locator('.nature-chart-neutral').allTextContents(), ['Hardy','Docile','Bashful','Quirky','Serious']);
  assert.equal(await root.locator('button, a, input, select').count(), 0);
  for (const width of [320, 375, 390, 430, 1280]) {
    await page.setViewportSize({width, height: 800});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.ok(await root.locator('table').evaluate(x => x.getBoundingClientRect().width < 560));
    assert.ok(await root.locator('tbody td').evaluateAll(xs => xs.every(x => {
      const r = document.createRange(); r.selectNodeContents(x);
      const text = r.getBoundingClientRect(), cell = x.getBoundingClientRect();
      return text.left >= cell.left && text.right <= cell.right && parseFloat(getComputedStyle(x).fontSize) >= 10;
    })));
    await page.screenshot({path: `/private/tmp/nature-chart-${width}.png`, fullPage: true});
  }
  await page.getByRole('button', {name: 'Back to Resources', exact: true}).click();
  await link.waitFor();
  assert.equal(await root.count(), 0);
  assert.deepEqual(errors, []);
  console.log('Nature Chart checks passed at 320, 375, 390, 430 and 1280px.');
} finally { await browser.close(); }
