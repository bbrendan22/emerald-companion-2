import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5189');
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Resources',exact:true}).click();
 await page.getByRole('link',{name:'IV Calculator',exact:true}).click();
 const root=page.locator('.iv-calculator'), search=page.getByRole('searchbox',{name:'Search Pokémon',exact:true});
 assert.equal(await search.getAttribute('placeholder'),'Search');
 assert.equal(await root.getByRole('heading',{name:'Observed stats',exact:true}).count(),0);
 assert.equal(await root.getByLabel('Nature',{exact:true}).locator('option').first().innerText(),'Nature');
 assert.equal(await root.getByLabel('Level',{exact:true}).locator('option').first().innerText(),'Level');
 assert.equal(await page.locator('.header .brand span').innerText(),'Emerald Companion');
 assert.equal(await page.locator('.iv-selectors select').nth(0).inputValue(),'');
 assert.equal(await page.locator('.iv-selectors select').nth(1).locator('option').count(),101);
 await search.focus();assert.equal(await root.locator('.iv-suggestions button').count(),0);
 for(const [query,name] of [['char','Charmander'],['charmel','Charmeleon'],['chari','Charizard'],['king','Kingler'],['saur','Bulbasaur']]) {
  const outputLabels=root.locator('tbody th');
 await root.getByLabel('Nature',{exact:true}).selectOption('Adamant');
 assert.equal(await outputLabels.nth(1).evaluate(x=>getComputedStyle(x).color),'rgb(139, 200, 166)');
 assert.equal(await outputLabels.nth(3).evaluate(x=>getComputedStyle(x).color),'rgb(237, 132, 147)');
 for(const neutral of ['Hardy','Docile','Serious','Bashful','Quirky','']) {
  await root.getByLabel('Nature',{exact:true}).selectOption(neutral);
  assert.ok((await outputLabels.evaluateAll(xs=>xs.map(x=>getComputedStyle(x).color))).every(color=>color==='rgb(227, 230, 235)'));
 }
 await search.fill(query);assert.deepEqual(await root.locator('.iv-suggestions button').allTextContents(),[name]);
 }
 await search.fill('no such pokemon');assert.equal(await root.locator('.iv-suggestions').count(),0);
 await search.fill('Bulb');await page.getByRole('button',{name:'Bulbasaur',exact:true}).click();
 assert.equal(await search.inputValue(),'Bulbasaur');
 assert.equal(await root.locator('tbody tr').first().locator('td').nth(0).innerText(),'45');
 assert.equal(await root.locator('tbody tr').first().locator('td').nth(1).innerText(),'—');
 await root.getByLabel('Level',{exact:true}).selectOption('50');
 assert.equal(await root.locator('tbody tr').first().locator('td').nth(1).innerText(),'105–120');
 await root.getByLabel('HP observed stat',{exact:true}).fill('120');
 assert.equal(await root.locator('tbody tr').first().locator('td').nth(2).innerText(),'30–31');
 await root.getByLabel('Enter EVs',{exact:true}).check();
 await root.getByLabel('HP EVs',{exact:true}).fill('256');await page.getByRole('alert').waitFor();
 await root.getByLabel('Enter EVs',{exact:true}).uncheck();assert.equal(await page.getByRole('alert').count(),0);
 await root.getByLabel('Enter EVs',{exact:true}).check();await root.getByLabel('HP EVs',{exact:true}).fill('4');
 for(const width of [320,375,390,430,1280]) {
  await page.setViewportSize({width,height:850});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const searchBox=await search.boundingBox(), natureBox=await root.getByLabel('Nature',{exact:true}).boundingBox(), levelBox=await root.getByLabel('Level',{exact:true}).boundingBox();
  assert.equal(searchBox.y,natureBox.y);assert.equal(natureBox.y,levelBox.y);assert.equal(searchBox.height,natureBox.height);assert.equal(natureBox.height,levelBox.height);assert.ok(searchBox.width/natureBox.width>1.5);assert.ok(Math.abs(searchBox.width/(searchBox.width+natureBox.width+levelBox.width)-.5)<.02);
  const aligned=await root.locator('.iv-input-row input').evaluateAll(inputs=>inputs.map(i=>i.getBoundingClientRect().x));
  assert.deepEqual(aligned.slice(0,6),aligned.slice(6));
  assert.ok((await root.locator('tbody tr').first().boundingBox()).height<34);
  for(const row of await root.locator('.iv-input-row').all()) {
   const boxes=await row.locator('input').evaluateAll(inputs=>inputs.map(i=>{const b=i.getBoundingClientRect();return {y:b.y,width:b.width};}));
   assert.equal(boxes.length,6);assert.ok(boxes.every(b=>b.y===boxes[0].y && b.width>25));
  }
  await page.screenshot({path:`/private/tmp/iv-calculator-row-${width}.png`,fullPage:true});
 }
 await search.fill('Shedinja');await search.press('Tab');await page.getByRole('button',{name:'Shedinja',exact:true}).focus();await page.keyboard.press('Enter');await root.getByLabel('HP observed stat',{exact:true}).fill('1');
 assert.equal(await root.locator('tbody tr').first().locator('td').nth(2).innerText(),'Cannot determine from HP');
 await root.getByRole('button',{name:'Reset',exact:true}).click();
 assert.equal(await search.inputValue(),'');
 assert.equal(await root.getByLabel('Nature',{exact:true}).inputValue(),'');
 assert.equal(await root.getByLabel('Level',{exact:true}).inputValue(),'');
 assert.equal(await root.getByLabel('Enter EVs',{exact:true}).isChecked(),false);
 assert.deepEqual(await root.locator('.iv-input-row input').evaluateAll(inputs=>inputs.map(i=>i.value)),['','','','','','']);
 assert.ok((await root.locator('tbody td').allTextContents()).every(value=>value==='—'));
 assert.equal(await root.locator('.iv-suggestions').count(),0);
 await root.getByLabel('Enter EVs',{exact:true}).check();
 assert.deepEqual(await root.locator('.iv-input-row').nth(1).locator('input').evaluateAll(inputs=>inputs.map(i=>i.value)),['0','0','0','0','0','0']);
 await page.getByRole('button',{name:'Back to Resources',exact:true}).click();await page.getByRole('link',{name:'IV Calculator',exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('IV Calculator browser checks passed at 320, 375, 390, 430 and 1280px');
} finally {await browser.close();}
