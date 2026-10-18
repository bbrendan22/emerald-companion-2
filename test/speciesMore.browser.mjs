import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {speciesMore} from '../src/resources/speciesMore.js';
const require=createRequire(import.meta.url), {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
 const page=await browser.newPage({viewport:{width:375,height:800}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(() => {
  window.__moreScrollCalls=[];
  for (const name of ['scrollTo','scrollBy','scroll']) {const original=window[name]; window[name]=function(...args){window.__moreScrollCalls.push(name);return original.apply(this,args);};}
  const original=Element.prototype.scrollIntoView; Element.prototype.scrollIntoView=function(...args){window.__moreScrollCalls.push('scrollIntoView');return original.apply(this,args);};
 });
 await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5173');
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();
 await page.getByRole('button',{name:'Resources',exact:true}).click();
 await page.getByRole('link',{name:'Pokémon Database',exact:true}).click();
 const search=page.getByRole('searchbox',{name:'Search Pokémon Database',exact:true});
 for(let dex=1;dex<=386;dex++) {
  await search.fill(`#${String(dex).padStart(3,'0')}`); await page.locator('.resources-species-entry').click();
  await page.evaluate(()=>{window.__moreScrollCalls=[];});
  await page.getByRole('tab',{name:'More',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>window.__moreScrollCalls),[]);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(await page.locator('.species-more dt').allTextContents(),speciesMore(dex).map(r=>r[0]));
  assert.deepEqual(await page.locator('.species-more dd').allTextContents(),speciesMore(dex).map(r=>r[1]));
  await page.getByRole('button',{name:'Back to National Pokédex',exact:true}).click();
  assert.equal(await search.inputValue(),`#${String(dex).padStart(3,'0')}`);
 }
 for(const width of [320,375,390,430,1280]) {
  await page.setViewportSize({width,height:800}); await search.fill('#082'); await page.locator('.resources-species-entry').click();
  const identity=await page.locator('.species-identity').innerHTML();
  await page.getByRole('tab',{name:'Overview',exact:true}).focus(); await page.keyboard.press('End');
  assert.equal(await page.getByRole('tab',{name:'More',exact:true}).getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('.species-identity').innerHTML(),identity);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`/private/tmp/resources-more-${width}.png`,fullPage:true});
  await page.getByRole('tab',{name:'Overview',exact:true}).click(); await page.getByRole('button',{name:'View Magnemite profile',exact:true}).click();
  await page.getByRole('tab',{name:'More',exact:true}).click();
  assert.deepEqual(await page.locator('.species-more dd').allTextContents(),speciesMore(81).map(r=>r[1]));
  await page.getByRole('button',{name:'Back to National Pokédex',exact:true}).click(); assert.equal(await search.inputValue(),'#082');
 }
 assert.deepEqual(errors,[]);console.log('More: all 386 rendered; verified fields, species switching, keyboard, Back/filter retention, no-save, 320/375/390/430/1280px no overflow.');
} finally {await browser.close();}
