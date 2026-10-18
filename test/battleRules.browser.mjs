import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try{
 const context=await browser.newContext({viewport:{width:375,height:800},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5174');
 const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();};
 const tab=async name=>page.getByRole('tab',{name,exact:true}).click();
 await navigate('Battle');await tab('Rules');
 assert.equal(await page.getByRole('combobox',{name:'Battle facility'}).inputValue(),'Tower');
 for(const selector of ['option[value="Dome"]','option[value="Factory"]','option[value="Doubles"]'])assert.equal(await page.locator(`.battle-rules ${selector}`).evaluate(option=>option.disabled),true);
 assert.match(await page.locator('.battle-rules-ivs').innerText(),/31 IVs \(assumed\)/);
 await page.getByRole('button',{name:'Open Level',exact:true}).click();
 const level=page.getByRole('combobox',{name:'Open Level',exact:true});assert.equal(await level.inputValue(),'60');assert.equal(await level.locator('option').count(),41);
 await level.selectOption('73');await page.getByRole('button',{name:'Level 50',exact:true}).click();await page.getByRole('button',{name:'Open Level',exact:true}).click();assert.equal(await level.inputValue(),'73');
 await tab('Sets');await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill('Sunkern');assert.equal(await page.locator('[data-set-id="Sunkern 1"] dd').first().innerText(),'195');
 await tab('Rules');await page.getByRole('button',{name:'Level 50',exact:true}).click();await tab('Sets');assert.equal(await page.locator('[data-set-id="Sunkern 1"] dd').first().innerText(),'137');
 await tab('Trainers');const search=page.getByRole('searchbox',{name:'Search trainers'});await search.fill('Brady');await page.locator('.battle-trainer-result').click();await tab('Rules');assert.match(await page.locator('.battle-rules-ivs').innerText(),/3 IVs/);assert.match(await page.locator('.battle-rules-ivs').innerText(),/BRADY/);
 for(const [symbol,value] of [['Silver',24],['Gold',31]]){await tab('Trainers');await search.fill(`Anabel ${symbol}`);await page.locator('.battle-trainer-result').click();await tab('Rules');assert.match(await page.locator('.battle-rules-ivs').innerText(),new RegExp(`${value} IVs`));assert.match(await page.locator('.battle-rules-ivs').innerText(),new RegExp(`Anabel · ${symbol}`));}
 await page.getByRole('button',{name:'Open Level',exact:true}).click();assert.equal(await level.inputValue(),'73');await navigate('Trainer');await navigate('Battle');assert.equal(await level.inputValue(),'73');
 for(const width of [320,375,430]){
  await page.setViewportSize({width,height:700});
  const ivBox=await page.locator('.battle-rules-ivs').boundingBox();
  const levelBox=await page.locator('.battle-rules-open-level').boundingBox();
  assert.ok(levelBox.x>=ivBox.x+ivBox.width);
  await page.getByRole('button',{name:'Level 50',exact:true}).click();
  const fixedBox=await page.locator('.battle-rules-ivs').boundingBox();
  assert.equal(fixedBox.x,ivBox.x);assert.equal(fixedBox.y,ivBox.y);assert.equal(fixedBox.width,ivBox.width);
  assert.equal(await level.count(),0);
  await page.getByRole('button',{name:'Open Level',exact:true}).click();
  assert.equal(await level.inputValue(),'73');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`/private/tmp/battle-rules-${width}.png`});
 }
 assert.deepEqual(errors,[]);console.log('Rules browser checks passed: disabled future options, Open Level default/range/retention, live stat recalculation, trainer/Brain/fallback IVs, main navigation retention, 320/375/430px fit and no page errors.');
}finally{await browser.close();}
