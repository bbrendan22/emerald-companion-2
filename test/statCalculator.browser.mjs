import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {natures} from '../src/resources/calculators/statCalculator.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5189');
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Resources',exact:true}).click();await page.getByRole('link',{name:'Stat Calculator',exact:true}).click();
 const root=page.locator('.stat-calculator'),search=root.getByRole('searchbox'),nature=root.getByLabel('Nature',{exact:true}),level=root.getByLabel('Level',{exact:true}),results=root.locator('.sc-stat-row strong');
 const values=()=>results.allTextContents();const defaults=Array(12).fill('');
 assert.deepEqual(await root.locator('.sc-input-row input').evaluateAll(xs=>xs.map(x=>x.value)),defaults);
 assert.deepEqual(await values(),Array(6).fill('—'));assert.equal(await root.locator('.sc-input-row').count(),2);assert.equal(await root.getByRole('checkbox').count(),0);
 assert.deepEqual(await nature.locator('option').allTextContents(),['Nature',...natures]);assert.equal(await level.locator('option').count(),101);
 assert.deepEqual(await root.locator('.sc-input-row input').evaluateAll(xs=>xs.map(x=>x.placeholder)),['31','31','31','31','31','31','0','0','0','0','0','0']);
 const outputLabels=root.locator('.sc-stat-row > span');
 await root.getByLabel('Nature',{exact:true}).selectOption('Adamant');
 assert.equal(await outputLabels.nth(1).evaluate(x=>getComputedStyle(x).color),'rgb(139, 200, 166)');
 assert.equal(await outputLabels.nth(3).evaluate(x=>getComputedStyle(x).color),'rgb(237, 132, 147)');
 for(const neutral of ['Hardy','Docile','Serious','Bashful','Quirky','']) {
  await root.getByLabel('Nature',{exact:true}).selectOption(neutral);
  assert.ok((await outputLabels.evaluateAll(xs=>xs.map(x=>getComputedStyle(x).color))).every(color=>color==='rgb(227, 230, 235)'));
 }
 await root.getByLabel('HP IVs',{exact:true}).focus();await page.keyboard.type('20');assert.equal(await root.getByLabel('HP IVs',{exact:true}).inputValue(),'20');
 await root.getByLabel('HP EVs',{exact:true}).focus();await page.keyboard.type('4');assert.equal(await root.getByLabel('HP EVs',{exact:true}).inputValue(),'4');
 await root.getByRole('button',{name:'Reset',exact:true}).click();
 await search.fill('char');assert.deepEqual(await root.locator('.sc-suggestions button').allTextContents(),['Charmander']);
 await search.fill('Bulbasaur');await root.getByRole('button',{name:'Bulbasaur',exact:true}).click();await level.selectOption('50');assert.deepEqual(await values(),['120','69','69','85','85','65']);
 await nature.selectOption('Adamant');assert.deepEqual(await values(),['120','75','69','76','85','65']);
 await root.getByLabel('Attack IVs',{exact:true}).fill('');assert.equal((await values())[1],'75');assert.equal((await values())[0],'120');
 await root.getByLabel('Attack IVs',{exact:true}).fill('32');assert.equal(await root.getByLabel('Attack IVs',{exact:true}).getAttribute('aria-invalid'),'true');await root.getByLabel('Attack IVs',{exact:true}).fill('31');
 await root.getByLabel('HP EVs',{exact:true}).fill('255');await root.getByLabel('Attack EVs',{exact:true}).fill('255');await root.getByLabel('Speed EVs',{exact:true}).fill('1');assert.deepEqual(await values(),Array(6).fill('—'));assert.ok((await root.getByRole('alert').innerText()).includes('510'));
 await root.getByLabel('Speed EVs',{exact:true}).fill('0');assert.equal(await root.getByRole('alert').count(),0);
 for(const width of [320,375,390,430]) {
  await page.setViewportSize({width,height:850});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const boxes=await root.locator('.sc-selectors > *').evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return {y:r.y,height:r.height,width:r.width};}));assert.ok(boxes.every(b=>b.y===boxes[0].y && b.height===boxes[0].height));assert.ok(boxes[0].width>boxes[1].width && boxes[1].width>boxes[2].width);
  const inputs=await root.locator('.sc-input-row input').evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y};}));assert.deepEqual(inputs.slice(0,6).map(b=>b.x),inputs.slice(6).map(b=>b.x));assert.ok(inputs.slice(0,6).every(b=>b.y===inputs[0].y));
  assert.equal(await root.locator('.sc-stat-track span').first().evaluate(x=>getComputedStyle(x).backgroundColor),'rgb(237, 132, 147)');
  await page.screenshot({path:`/private/tmp/stat-calculator-${width}.png`,fullPage:true});
 }
 await root.getByLabel('HP EVs',{exact:true}).fill('0');
 for(const [species,expected] of [['Shedinja','1'],['Deoxys','125']]) {await search.fill(species);await root.getByRole('button',{name:species,exact:true}).click();assert.equal((await values())[0],expected);}
 await root.getByRole('button',{name:'Reset',exact:true}).click();assert.equal(await search.inputValue(),'');assert.equal(await nature.inputValue(),'');assert.equal(await level.inputValue(),'');assert.deepEqual(await values(),Array(6).fill('—'));assert.deepEqual(await root.locator('.sc-input-row input').evaluateAll(xs=>xs.map(x=>x.value)),defaults);assert.equal(await root.locator('.sc-suggestions').count(),0);
 await page.getByRole('button',{name:'Back to Resources',exact:true}).click();await page.getByRole('link',{name:'Stat Calculator',exact:true}).waitFor();assert.deepEqual(errors,[]);console.log('Stat Calculator browser checks passed at 320, 375, 390 and 430px.');
} finally {await browser.close();}
