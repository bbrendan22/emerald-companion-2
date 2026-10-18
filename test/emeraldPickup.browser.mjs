import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {emeraldPickupBands, aggregatePickupItems, pickupPercent, pickupBandLabel} from '../src/resources/charts/emeraldPickup.js';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
  const page = await browser.newPage({viewport:{width:375,height:800}}), errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5189');
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await page.getByRole('button',{name:'Resources',exact:true}).click();
  const link = page.getByRole('link',{name:'Emerald Pickup Table',exact:true});
  const bounds = await link.boundingBox();
  const textWidth = await link.evaluate(x=>{const r=document.createRange();r.selectNodeContents(x);return r.getBoundingClientRect().width;});
  assert.ok(Math.abs(bounds.width-textWidth)<2);
  const row = await link.locator('..').boundingBox();
  await page.mouse.click(row.x+row.width-5,row.y+row.height/2);
  assert.equal(await page.locator('.emerald-pickup').count(),0);
  await page.evaluate(()=>{
    window.__pickupScroll=[];
    for(const key of ['scroll','scrollTo','scrollBy']) {
      const original=window[key];window[key]=function(...args){window.__pickupScroll.push(key);return original.apply(this,args);};
    }
    const original=Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView=function(...args){window.__pickupScroll.push('scrollIntoView');return original.apply(this,args);};
  });
  await link.click();
  const root=page.locator('.emerald-pickup'), select=root.getByRole('combobox',{name:'Level range',exact:true});
  assert.equal(await select.inputValue(),'0');
  assert.deepEqual(await select.locator('option').allTextContents(),emeraldPickupBands.map(pickupBandLabel));
  assert.equal(await root.locator('select').count(),1);
  assert.equal(await root.locator('button, a, input').count(),0);
  assert.deepEqual(await root.locator('thead th').allTextContents(),['Sprite','Item Name','Per Pickup','Per Battle']);
  for(const width of [320,375,390,430,1280]) {
    await page.setViewportSize({width,height:800});
    for(const [index,band] of emeraldPickupBands.entries()) {
      await select.selectOption(String(index));
      const expected=aggregatePickupItems(band.items);
      assert.deepEqual(await root.locator('tbody th').allTextContents(),expected.map(row=>row.name));
      const values=await root.locator('tbody tr').evaluateAll(xs=>xs.map(x=>[...x.querySelectorAll('td')].slice(1).map(x=>x.textContent)));
      assert.deepEqual(values,expected.map(row=>[pickupPercent(row.perPickup),pickupPercent(row.perBattle)]));
      const icons=root.locator('tbody img');
      await icons.evaluateAll(xs=>Promise.all(xs.map(x=>x.decode())));
      assert.deepEqual(await icons.evaluateAll(xs=>xs.map(x=>x.getAttribute('src'))),expected.map(row=>row.icon));
      assert.ok(await icons.evaluateAll(xs=>xs.every(x=>x.naturalWidth>0)));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.ok(await root.locator('th, td').evaluateAll(xs=>xs.every(x=>x.scrollWidth<=x.clientWidth+1)));
      assert.ok(await root.locator('tbody td:nth-child(n+3)').evaluateAll(xs=>xs.every(x=>getComputedStyle(x).textAlign==='right')));
    }
    await select.selectOption('0');
    await page.screenshot({path:`/private/tmp/emerald-pickup-${width}.png`,fullPage:true});
  }
  await page.getByRole('button',{name:'Back to Resources',exact:true}).click();
  await link.waitFor();
  assert.equal(await root.count(),0);
  assert.deepEqual(await page.evaluate(()=>window.__pickupScroll),[]);
  assert.deepEqual(errors,[]);
  console.log('Emerald Pickup: all ten dropdown brackets, default, names, decoded sprites, exact odds, text-only navigation, Back, no scroll calls, 320/375/390/430/1280px without overflow passed.');
} finally {await browser.close();}
