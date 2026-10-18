import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {groupMoveCoverage,coverageMultipliers,coverageRoster} from '../src/resources/coverage/moveCoverage.js';
import {GEN3_TYPE_DISPLAY_ORDER} from '../src/pokemon/typeDisplayOrder.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
 const page=await browser.newPage({viewport:{width:375,height:850},isMobile:true,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5189');
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Resources',exact:true}).click();await page.getByRole('link',{name:'Move Coverage',exact:true}).click();
 const root=page.locator('.move-coverage'),types=root.locator('.resource-coverage-types button');
 const button=type=>root.getByRole('button',{name:type,exact:true});
 const toggle=async type=>{const box=await button(type).boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);};
 const check=async (selected,mode='all')=>{
  const expected=groupMoveCoverage(selected,mode);
  assert.deepEqual(await root.locator('.resource-coverage-totals strong').allTextContents(),coverageMultipliers.map(m=>String(expected.get(m).length)));
  const sections=root.locator('.resource-coverage-results section');assert.equal(await sections.count(),selected.length?6:0);
  if(selected.length)for(const [i,m] of coverageMultipliers.entries())assert.deepEqual(await sections.nth(i).locator('.resource-coverage-pokemon img').evaluateAll(xs=>xs.map(x=>x.alt)),expected.get(m).map(p=>p.name));
  assert.ok((await root.locator('.resource-coverage-note').innerText()).includes(`${coverageRoster(mode).length} Pokémon`));
 };
 assert.equal(await page.evaluate(()=>localStorage.length),0);assert.equal(await page.locator('.header .brand span').innerText(),'Emerald Companion');
 assert.deepEqual(await types.evaluateAll(xs=>xs.map(x=>x.dataset.type)),GEN3_TYPE_DISPLAY_ORDER.map(t=>t.toUpperCase()));
 await root.locator('.resource-coverage-types img').evaluateAll(xs=>Promise.all(xs.map(x=>x.decode())));
 assert.ok(await root.locator('.resource-coverage-types img').evaluateAll(xs=>xs.every(x=>x.complete && x.naturalWidth>0)));
 await check([]);assert.equal(await button('Clear types').count(),0);
 for(const [type,immune,ordinary,ordinaryMultiplier] of [['Ground','Gengar','Rhydon',2],['Fire','Flareon','Arcanine',0.5],['Water','Vaporeon','Quagsire',1],['Electric','Jolteon','Lanturn',1],['Ice','Shedinja','Bulbasaur',2]]) {
  await toggle(type);await check([type.toUpperCase()]);
  const sections=root.locator('.resource-coverage-results section');
  assert.equal(await sections.nth(0).locator(`.resource-coverage-pokemon > div[title="${immune}"]`).count(),1);
  assert.equal(await sections.nth(coverageMultipliers.indexOf(ordinaryMultiplier)).locator(`.resource-coverage-pokemon > div[title="${ordinary}"]`).count(),1);
  await button('Clear types').click();
 }

 await toggle('Electric');await check(['ELECTRIC']);await toggle('Ice');await check(['ELECTRIC','ICE']);
 for(const [name,mode] of [['Fully evolved','fully'],['Frontier','frontier'],['All Pokémon','all']]) {await button(name).click();await check(['ELECTRIC','ICE'],mode);}
 await button('Clear types').click();await check([]);await toggle('Fire');await check(['FIRE']);await toggle('Fire');await check([]);
 // Keyboard activation toggles once. A dragged/cancelled pointer does not toggle.
 await button('Normal').focus();await page.keyboard.press('Space');await check(['NORMAL']);await page.keyboard.press('Enter');await check([]);
 await button('Normal').dispatchEvent('pointerdown',{pointerId:7,clientX:0,clientY:0});await button('Normal').dispatchEvent('pointerup',{pointerId:7,clientX:20,clientY:0});await check([]);
 await button('Normal').dispatchEvent('pointerdown',{pointerId:8,clientX:0,clientY:0});await button('Normal').dispatchEvent('pointercancel',{pointerId:8});await button('Normal').dispatchEvent('pointerup',{pointerId:8,clientX:0,clientY:0});await check([]);
 for(const width of [320,375,390,430,1280]) {
  await page.setViewportSize({width,height:850});
  await button('All Pokémon').click();await toggle('Electric');await toggle('Ice');await check(['ELECTRIC','ICE']);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.ok(await root.evaluate(el=>[el,...el.querySelectorAll('div,section')].every(x=>!['fixed','sticky'].includes(getComputedStyle(x).position) && !['auto','scroll','hidden','clip'].includes(getComputedStyle(x).overflowY))));
  const appearance=()=>button('Fire').evaluate(el=>{const c=getComputedStyle(el);return [c.color,c.backgroundColor,c.boxShadow,c.transform];});
  const normal=await appearance();await button('Fire').hover();assert.deepEqual(await appearance(),normal);
  await page.screenshot({path:`/private/tmp/move-coverage-${width}.png`,fullPage:false});
  await button('Clear types').click();await check([]);
 }
 // All local Pokémon sprite URLs decode without requiring save data.
 assert.ok(await page.evaluate(async()=>{const images=await Promise.all(Array.from({length:386},(_,i)=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img.naturalWidth>0);img.onerror=()=>resolve(false);img.src=`/pokemon/emerald/normal/${i+1}.png`;})));return images.every(Boolean);}));
 await toggle('Ghost');await button('Fully evolved').click();await button('Clear types').click();assert.equal(await button('Fully evolved').getAttribute('aria-pressed'),'true');await check([],'fully');
 await page.getByRole('button',{name:'Back to Resources',exact:true}).click();await page.getByRole('link',{name:'Move Coverage',exact:true}).click();await check([]);assert.equal(await button('All Pokémon').getAttribute('aria-pressed'),'true');
 assert.deepEqual(errors,[]);console.log('Move Coverage browser checks passed: touch, keyboard, drag/cancel, all filters, clear, exact groups, local assets, Back/no-save, 320/375/390/430/1280px without overflow or custom scrolling.');
} finally {await browser.close();}
