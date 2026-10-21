import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {makeSave} from './fixtures/synthetic.js';
import {homeDirectory} from '../src/resources/homeSearch.js';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE || (process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined)});
try {
 const page=await browser.newPage({viewport:{width:375,height:600},hasTouch:true,isMobile:true});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BROWSER_URL || 'http://127.0.0.1:5173/');
 await page.evaluate(encoded=>localStorage.setItem('emerald-companion-2.save.v1',encoded),Buffer.from(makeSave()).toString('base64')); await page.reload();
 const toggle=page.getByRole('button',{name:'Filter directory',exact:true});
 const popup=page.getByRole('dialog',{name:'Directory filters'});
 const geometry=()=>page.locator('.home-layout').evaluate(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height];});
 for (const width of [320,375,390,430]) {
  await page.setViewportSize({width,height:600});
  const master=page.getByRole('searchbox',{name:'Search Resources',exact:true});
  await master.fill('bulb');
  const masterClear=await page.getByRole('button',{name:'Clear search',exact:true}).boundingBox();
  const masterRow=await page.locator('.home-search-field').boundingBox();
  assert.ok(Math.abs(masterClear.x+masterClear.width-masterRow.x-masterRow.width)<1,'Master clear stays at far right');
  await page.getByRole('button',{name:'Clear search',exact:true}).tap();
  for(const [category,title,filters,query] of [
   ['pokemon','Pokédex',{type:'poison',generation:'1'},'bulb'],
   ['moves','Moves',{type:'ELECTRIC',category:'Special'},'thun'],
   ['items','Useful Items',{category:'Utility'},'rare'],
   ['berries','Berries',{group:'Recovery'},'oran'],
  ]) {
   await page.getByRole('link',{name:title,exact:true}).tap();
   const search=page.getByRole('searchbox',{name:`Search ${title}`,exact:true});
   const list=page.getByRole('region',{name:`${title} directory`,exact:true});
   const before=await geometry(); const rows=await list.locator('button').first().boundingBox();
   for (const [key,value] of Object.entries(filters)) {
    await toggle.tap(); await popup.waitFor();
    if (category === 'items') assert.equal(await popup.getByRole('combobox').count(),1,'Useful Items has only Category');
    assert.equal(await popup.locator('select:focus').count(),0,'opening popup does not focus a dropdown');
    assert.equal(await toggle.locator('i').count(),0,'no active-filter dot');
    const iconBox=await toggle.boundingBox();
    const closeBox=await page.getByRole('button',{name:'Close directory',exact:true}).boundingBox();
    assert.ok(Math.abs(iconBox.x+iconBox.width/2-closeBox.x-closeBox.width/2)<1,'filter aligns with directory close');
    const box=await popup.boundingBox(); assert.ok(box.x>=0 && box.x+box.width<=width && box.y+box.height<=600,'popup stays in viewport');
    assert.deepEqual(await geometry(),before);assert.equal((await list.locator('button').first().boundingBox()).height,rows.height);
    await popup.getByRole('combobox',{name:key[0].toUpperCase()+key.slice(1),exact:true}).selectOption(value);
    assert.equal(await popup.count(),0);
   }
   assert.equal(await toggle.getAttribute('data-active'),'true');
   assert.equal(await toggle.evaluate(e=>getComputedStyle(e).color),await page.locator('.home-resources-title').evaluate(e=>getComputedStyle(e).color),'active icon matches Resources gold');
   await search.fill(query); assert.equal(await list.locator('button').count(),homeDirectory(category,query,filters).results.length);
   const clearBox=await page.getByRole('button',{name:'Clear search',exact:true}).boundingBox();
   const filterBox=await toggle.boundingBox();
   assert.ok(clearBox.x+clearBox.width<filterBox.x,'clear sits immediately left of filter');
   assert.ok(Math.abs(clearBox.y+clearBox.height/2-filterBox.y-filterBox.height/2)<1,'icons are vertically centered together');
   await toggle.tap(); assert.equal(await search.inputValue(),query,'query after opening'); await page.locator('.home-resources-title').tap(); assert.equal(await search.inputValue(),query,'query after outside');assert.equal(await popup.count(),0);assert.equal(await toggle.getAttribute('data-active'),'true');
   await toggle.tap(); assert.equal(await search.inputValue(),query,'query after reopening'); await page.keyboard.press('Escape');assert.equal(await popup.count(),0);
   await toggle.tap();await popup.getByRole('button',{name:'Clear Filters',exact:true}).tap();
   assert.equal(await toggle.getAttribute('data-active'),'false');assert.equal(await search.inputValue(),query);
   assert.equal(await toggle.evaluate(e=>getComputedStyle(e).color),'rgb(181, 187, 197)','cleared icon returns to neutral');
   assert.equal(await list.locator('button').count(),homeDirectory(category,query).results.length);
   await toggle.tap();await popup.getByRole('combobox').first().selectOption({index:1});
   await page.getByRole('button',{name:'Close directory',exact:true}).tap();
   await page.getByRole('link',{name:title,exact:true}).tap();assert.equal(await toggle.getAttribute('data-active'),'false');
   assert.equal(await list.locator('button').count(),homeDirectory(category).results.length);
   await page.getByRole('button',{name:'Close directory',exact:true}).tap();assert.equal(await toggle.count(),0);
  }
  await page.getByRole('link',{name:'Abilities',exact:true}).tap();assert.equal(await toggle.count(),0);
  await page.getByRole('button',{name:'Close directory',exact:true}).tap();
 }
 await page.screenshot({path:'/private/tmp/emerald-directory-filters-home.png'});
 await page.getByRole('link',{name:'Pokédex',exact:true}).tap();await toggle.tap();
 await page.screenshot({path:'/private/tmp/emerald-directory-filters-popup.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS: filters/search, clear, outside/Escape dismissal, reset, unchanged row/layout geometry, viewport containment at 320/375/390/430px.');
} finally {await browser.close();}
