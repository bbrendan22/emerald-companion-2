import {assetPath} from './helpers/browserPaths.js';
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
    assert.equal(await panel.locator('img').evaluateAll((imgs,base)=>imgs.every(i=>i.naturalWidth>0&&i.getAttribute('src')===`${base}pokemon/emerald/normal/${i.parentElement.dataset.dex}.png`),assetPath('/')),true);
    assert.equal(await panel.locator('li').evaluateAll(ns=>ns.every(n=>getComputedStyle(n).cursor!=='pointer'&&getComputedStyle(n).backgroundColor==='rgba(0, 0, 0, 0)')),true);
  };
  assert.equal(await page.evaluate(()=>localStorage.length),0);
  const entries=catalogEntries('abilities');
  await page.evaluate(()=>{window.__abilityScroll=[];for(const method of ['scrollTo','scrollBy','scroll']){const original=window[method];window[method]=function(...args){window.__abilityScroll.push(method);return original.apply(this,args)}}});
  assert.deepEqual(await rows.locator('strong').allTextContents(),entries.map(e=>e.name));
  assert.deepEqual(await rows.locator('.resources-ability-description').allTextContents(),entries.map(e=>abilityDescription(e.id)));
  const dialog=page.getByRole('dialog');
  const close=()=>page.keyboard.press('Escape');
  assert.equal(await search.getAttribute('placeholder'),'Search');
  // Preserve exhaustive data and sprite checks for all canonical abilities.
  for(const entry of entries){
    await search.fill(entry.name);await toggle(entry.name).click();await checkPanel(entry.id);
    assert.equal(await dialog.getAttribute('aria-label'),entry.name);
    assert.equal(await dialog.locator('.resources-ability-description').innerText(),abilityDescription(entry.id));
    await close();
  }
  for(const width of [320,375,390,430,1280]){
    await page.setViewportSize({width,height:844});await search.fill('');
    assert.equal(await rows.count(),77);assert.equal(await panel.count(),0);
    for(const [query,expected] of [['intim',['Intimidate']],['swift',['Swift Swim']],['swim',[]],['  LEV  ',['Levitate']]]){
      await search.fill(query);assert.deepEqual(await rows.locator('strong').allTextContents(),expected);
    }
    const appearance=()=>search.evaluate(e=>[e,e.parentElement].map(n=>{const s=getComputedStyle(n);return [s.borderColor,s.backgroundColor,s.boxShadow,s.outlineStyle]}));
    await search.blur();await page.mouse.move(0,0);const searchStyle=await appearance();await search.hover();assert.deepEqual(await appearance(),searchStyle);await search.click();assert.deepEqual(await appearance(),searchStyle);
    await search.fill('');
    const visuals=()=>rows.evaluateAll(ns=>ns.map(n=>[n,n.querySelector('button')].map(e=>{const s=getComputedStyle(e);return [s.backgroundColor,s.borderColor,s.boxShadow,s.outlineStyle]})));
    await toggle('Swift Swim').scrollIntoViewIfNeeded();
    const y=await page.evaluate(()=>scrollY),normal=await visuals();
    const bounds=await rows.evaluateAll(ns=>ns.map(n=>[n.offsetTop,n.offsetHeight]));
    await toggle('Swift Swim').tap();await checkPanel(33);
    assert.deepEqual(await visuals(),normal);
    assert.equal(await panel.locator('ul').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),width<700?4:8);
    assert.equal(await dialog.locator('button').count(),0);
    const box=await dialog.locator('.resources-move-dialog').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=844);
    await dialog.locator('img').first().tap();assert.equal(await dialog.count(),0);
    assert.equal(await page.evaluate(()=>scrollY),y);assert.deepEqual(await visuals(),normal);
    assert.deepEqual(await rows.evaluateAll(ns=>ns.map(n=>[n.offsetTop,n.offsetHeight])),bounds);
    await search.fill('Levitate');await toggle('Levitate').focus();await page.keyboard.press('Enter');await checkPanel(26);
    await close();assert.equal(await toggle('Levitate').evaluate(e=>e===document.activeElement&&e.matches(':focus-visible')),true);
    await search.fill('');await page.setViewportSize({width,height:width>=700?220:400});
    await toggle('Chlorophyll').click();await checkPanel(34);
    await page.waitForTimeout(100);
    if(width<700){
      const touch=await page.context().newCDPSession(page);
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:Math.round(width/2),y:300}]});
      for(const y of [260,220,180,140,100]){await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:Math.round(width/2),y}]});await page.waitForTimeout(30);}
      await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
    } else {await dialog.hover();await page.mouse.wheel(0,150);}
    await page.waitForTimeout(700);assert.equal(await dialog.count(),1);assert.ok(await dialog.locator('.resources-move-dialog').evaluate(e=>e.scrollTop>0));
    await page.mouse.move(width/2,120);await page.mouse.down();await page.mouse.move(width/2,80);await page.mouse.move(width/2,120);await page.mouse.up();assert.equal(await dialog.count(),1);
    await page.mouse.down();await dialog.locator('.resources-move-dialog').evaluate(e=>{e.scrollTop=0});await page.waitForTimeout(100);await page.mouse.up();assert.equal(await dialog.count(),1);
    await page.mouse.click(2,2);assert.equal(await dialog.count(),0);
    await page.setViewportSize({width,height:844});
    await search.fill('Compound Eyes');await toggle('Compound Eyes').click();await overflow();
    await page.screenshot({path:`/private/tmp/abilities-${width}.png`});await close();
    await search.fill('Cacophony');await toggle('Cacophony').click();assert.equal(await panel.innerText(),'No Pokémon have this ability in Emerald.');await close();
    await search.fill('no-such-name');assert.equal(await rows.count(),0);assert.equal(await page.getByRole('status').innerText(),'No results.');
    await page.getByRole('button',{name:'Clear search',exact:true}).click();assert.equal(await rows.count(),77);await overflow();
  }
  assert.deepEqual(await page.evaluate(()=>window.__abilityScroll),[]);
  await page.getByRole('button',{name:'Back to Resources',exact:true}).click();
  const homeSearch=page.getByRole('searchbox',{name:'Search Pokémon, moves and abilities',exact:true});await homeSearch.fill('Overgrow');await page.locator('.resources-results a').filter({hasText:'Overgrow'}).click();
  assert.equal(await search.inputValue(),'Overgrow');assert.equal(await rows.count(),1);await toggle('Overgrow').click();await checkPanel(65);await close();await page.getByRole('button',{name:'Back to Resources',exact:true}).click();assert.equal(await homeSearch.inputValue(),'Overgrow');
  assert.equal(await page.evaluate(()=>localStorage.length),0);assert.deepEqual(errors,[]);
  console.log('Abilities popups passed: 77 canonical descriptions and mappings, prefix search, empty Cacophony, tap/scroll/Escape dismissal, unchanged row styles/geometry and list position, decoded sprites in Dex order, keyboard focus, unchanged search colors and no-save operation; 320/375/390/430/1280px without horizontal overflow.');
} finally {await browser.close();}
