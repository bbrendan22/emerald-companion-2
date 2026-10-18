import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {catalogEntries} from '../src/resources/search.js';
import {abilityDescription,abilityPokemon} from '../src/resources/abilities/abilities.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
  const page=await browser.newPage({viewport:{width:375,height:844},hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Resources',exact:true}).click();
  await page.getByRole('link',{name:'Abilities',exact:true}).click();
  const search=page.getByRole('searchbox',{name:'Search Abilities',exact:true}),rows=page.locator('#resources-abilities .resources-move-row');
  const panel=page.locator('[id^="resources-ability-pokemon-"]'), toggle=name=>page.getByRole('button',{name,exact:true});
  const overflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const checkPanel=async id=>{
    assert.equal(await panel.count(),1);
    assert.deepEqual(await panel.locator('li').evaluateAll(ns=>ns.map(n=>({dex:Number(n.dataset.dex),name:n.querySelector('span').textContent}))),abilityPokemon(id));
    assert.equal(await panel.locator('a,button,[tabindex]').count(),0);
    await panel.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>{i.loading='eager';return i.decode()})));
    assert.equal(await panel.locator('img').evaluateAll(imgs=>imgs.every(i=>i.naturalWidth>0&&i.getAttribute('src')===`/pokemon/emerald/normal/${i.parentElement.dataset.dex}.png`)),true);
    assert.equal(await panel.locator('li').evaluateAll(ns=>ns.every(n=>getComputedStyle(n).cursor!=='pointer'&&getComputedStyle(n).backgroundColor==='rgba(0, 0, 0, 0)')),true);
  };
  assert.equal(await page.evaluate(()=>localStorage.length),0);
  const entries=catalogEntries('abilities');
  assert.deepEqual(await rows.locator('strong').allTextContents(),entries.map(e=>e.name));
  assert.deepEqual(await rows.locator('.resources-ability-description').allTextContents(),entries.map(e=>abilityDescription(e.id)));
  // Exercise all 77 mappings in the actual page, including the unused ability.
  for(const entry of entries){await search.fill(entry.name);await toggle(entry.name).click();await checkPanel(entry.id);}
  for(const width of [320,375,390,430,1280]){
    await page.setViewportSize({width,height:844});await search.fill('');
    assert.equal(await rows.count(),77);assert.equal(await panel.count(),0);assert.equal(await page.locator('.resources-learner-grid img').count(),0);
    assert.equal(await page.getByRole('status').innerText(),'');
    assert.equal(await page.locator('.header .brand span').innerText(),'Emerald Companion');
    assert.equal(await page.locator('main').getByRole('button',{name:'Back to Resources',exact:true}).count(),0);
    const appearance=()=>search.evaluate(e=>[e,e.parentElement].map(n=>{const s=getComputedStyle(n);return [s.borderColor,s.backgroundColor,s.boxShadow,s.outlineStyle]}));
    await search.blur();await page.mouse.move(0,0);const normal=await appearance();await search.hover();assert.deepEqual(await appearance(),normal);await search.click();assert.deepEqual(await appearance(),normal);await page.keyboard.type('  OVER  ');assert.deepEqual(await appearance(),normal);
    assert.deepEqual(await rows.locator('strong').allTextContents(),['Overgrow']);await search.fill('a');assert.deepEqual(await rows.locator('strong').allTextContents(),catalogEntries('abilities','a').map(e=>e.name));
    await search.fill('');
    await page.evaluate(()=>{window.__abilityScroll=[];for(const method of ['scrollTo','scrollBy','scroll']){const original=window[method];window[method]=function(...args){window.__abilityScroll.push(method);return original.apply(this,args)}}const original=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(...args){window.__abilityScroll.push('scrollIntoView');return original.apply(this,args)}});
    await toggle('Overgrow').click();await checkPanel(65);await toggle('Overgrow').click();assert.equal(await panel.count(),0);
    await toggle('Overgrow').click();await toggle('Blaze').click();await checkPanel(66);assert.equal(await toggle('Overgrow').getAttribute('aria-expanded'),'false');
    await search.fill('Levitate');await toggle('Levitate').focus();await page.keyboard.press('Enter');await checkPanel(26);
    const control=toggle('Levitate'),style=()=>control.evaluate(e=>{const s=getComputedStyle(e);return [s.color,s.backgroundColor,s.boxShadow]});await control.blur();await page.mouse.move(0,0);const defaultStyle=await style();await control.hover();assert.deepEqual(await style(),defaultStyle);await page.mouse.down();assert.deepEqual(await style(),defaultStyle);await page.mouse.move(0,0);await page.mouse.up();
    assert.equal(await panel.locator('ul').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),width<700?4:8);
    await panel.locator('[data-dex="94"] img').click();assert.equal(await page.locator('.species-profile').count(),0);assert.equal(await panel.count(),1);
    await page.evaluate(()=>document.activeElement?.blur());await page.screenshot({path:`/private/tmp/abilities-${width}.png`});await overflow();
    await toggle('Levitate').focus();await page.keyboard.press('Space');assert.equal(await panel.count(),0);
    await search.fill('Cacophony');await toggle('Cacophony').click();assert.equal(await panel.innerText(),'No Pokémon have this ability in Emerald.');
    await search.fill('no-such-name');assert.equal(await rows.count(),0);assert.equal(await panel.count(),0);assert.equal(await page.getByRole('status').innerText(),'No results.');
    await page.getByRole('button',{name:'Clear search',exact:true}).click();assert.equal(await rows.count(),77);await overflow();
    assert.deepEqual(await page.evaluate(()=>window.__abilityScroll),[]);
  }
  await page.getByRole('button',{name:'Back to Resources',exact:true}).click();
  const homeSearch=page.getByRole('searchbox',{name:'Search Pokémon, moves and abilities',exact:true});await homeSearch.fill('Overgrow');await page.locator('.resources-results a').filter({hasText:'Overgrow'}).click();
  assert.equal(await search.inputValue(),'Overgrow');assert.equal(await rows.count(),1);await toggle('Overgrow').click();await checkPanel(65);await page.getByRole('button',{name:'Back to Resources',exact:true}).click();assert.equal(await homeSearch.inputValue(),'Overgrow');
  assert.equal(await page.evaluate(()=>localStorage.length),0);assert.deepEqual(errors,[]);
  console.log('Abilities passed: 77 canonical descriptions and all mappings, A–Z and partial search, no counts, empty Cacophony, one expanded entry and keyboard controls, decoded Dex sprites and display-only grids, unchanged search colors, header Back/home search, no-save operation and no new scroll calls; 320/375/390/430/1280px without horizontal overflow.');
} finally {await browser.close();}
