import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {fields,hiddenPowerTypes,recommendedIVs,liveHiddenPower} from '../src/resources/calculators/hiddenPowerCalculator.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5189');
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Resources',exact:true}).click();
 await page.getByRole('link',{name:'Hidden Power Calculator',exact:true}).click();
 const root=page.locator('.hp-calculator'), result=root.getByRole('status'), dropdown=root.getByLabel('Find IVs by Type');
 assert.equal(await result.innerText(),'');
 assert.equal(await page.locator('.header .brand span').innerText(),'Emerald Companion');
 const draft=Object.fromEntries(fields.map(([k])=>[k,'']));
 for(const [key,label] of fields) {
  draft[key]='31';await root.getByLabel(`${label} IV`,{exact:true}).fill('31');
  const expected=liveHiddenPower(draft),text=await result.innerText();
  assert.ok(text.includes(expected.type));assert.ok(text.includes(`${expected.power} power`));assert.equal(text.includes('Preview'),false);
 }
 await root.getByLabel('HP IV',{exact:true}).fill('32');assert.equal(await result.innerText(),'');assert.equal(await root.getByLabel('HP IV',{exact:true}).getAttribute('aria-invalid'),'true');await root.getByRole('alert').waitFor();
 await root.getByLabel('HP IV',{exact:true}).fill('31');assert.equal(await root.getByRole('alert').count(),0);
 assert.deepEqual(await dropdown.locator('option').evaluateAll(o=>o.map(x=>x.value)),['',...hiddenPowerTypes]);
 const manual=await root.locator('input').evaluateAll(inputs=>inputs.map(i=>i.value));
 for(const type of hiddenPowerTypes) {
  await dropdown.selectOption(type);
  assert.deepEqual(await root.locator('.hp-reference dd').allTextContents(),fields.map(([k])=>String(recommendedIVs[type][k])));
  assert.deepEqual(await root.locator('input').evaluateAll(inputs=>inputs.map(i=>i.value)),manual);
  assert.ok((await result.innerText()).includes('Dark'));
 }
 for(const width of [320,375,390,430]) {
  await page.setViewportSize({width,height:850});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const selector of ['.hp-stat-row input','.hp-reference dd']) {
   const boxes=await root.locator(selector).evaluateAll(elements=>elements.map(e=>{const r=e.getBoundingClientRect();return {y:r.y,width:r.width};}));
   assert.equal(boxes.length,6);assert.ok(boxes.every(b=>b.y===boxes[0].y && b.width>25));
  }
  await page.screenshot({path:`/private/tmp/hidden-power-${width}.png`,fullPage:true});
 }
 await root.getByRole('button',{name:'Reset',exact:true}).click();
 assert.deepEqual(await root.locator('input').evaluateAll(inputs=>inputs.map(i=>i.value)),['','','','','','']);assert.equal(await dropdown.inputValue(),'');assert.equal(await result.innerText(),'');assert.equal(await root.locator('.hp-reference').count(),0);
 await root.getByLabel('Spe IV',{exact:true}).fill('1');assert.ok((await result.innerText()).includes('Flying'));assert.equal((await result.innerText()).includes('Preview'),false);
 await page.getByRole('button',{name:'Back to Resources',exact:true}).click();await page.getByRole('link',{name:'Hidden Power Calculator',exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('Hidden Power browser checks passed, including all 16 types and 320/375/390/430px.');
} finally {await browser.close();}
