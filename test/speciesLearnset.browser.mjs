import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mergedLevelLearnset} from '../src/resources/learnset/utils/gameLearnsets.js';
import {internalIdForDex} from '../src/resources/learnset/data/pokemonMeta.js';
import {moveNames} from '../src/resources/learnset/data/emeraldData.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try{
 const page=await browser.newPage({viewport:{width:375,height:850}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__learnsetScroll=[];for(const name of ['scrollTo','scrollBy','scroll']){const original=window[name];window[name]=function(...args){window.__learnsetScroll.push(name);return original.apply(this,args);};}const original=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(...args){window.__learnsetScroll.push('scrollIntoView');return original.apply(this,args);};});
 await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Resources',exact:true}).click();await page.getByRole('link',{name:'Pokémon Database',exact:true}).click();
 const search=page.getByRole('searchbox',{name:'Search Pokémon Database',exact:true});
 const open=async dex=>{await search.fill(`#${String(dex).padStart(3,'0')}`);await page.locator('.resources-species-entry').click();};
 const checkHeader=async()=>assert.equal(await page.locator('.header .brand span').innerText(),'Emerald Companion');
 const colors={Ruby:'#b52d43',R:'#b52d43',Sapphire:'#245cbb',S:'#245cbb',Emerald:'#08755d',E:'#08755d',FireRed:'#c44a1b',FR:'#c44a1b',LeafGreen:'#438022',LG:'#438022',Colosseum:'#6552a3',Colo:'#6552a3',XD:'#903a9b','Pokémon Box':'#956b16'},seen=new Set();
 const rgb=hex=>`rgb(${[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')})`;
 for(let dex=1;dex<=386;dex++){
  await open(dex);await page.getByRole('tab',{name:'Learnset',exact:true}).click();const groups=page.locator('.species-learnset > details');
  assert.equal(await groups.count(),5);assert.equal(await page.locator('.species-learnset > details[open]').count(),0);
  assert.deepEqual(await groups.locator(':scope > summary').allTextContents().then(labels=>labels.map(label=>label.split(' · ')[0])),['Level-up moves','TMs / HMs','Move tutors','Egg moves','Special moves']);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await checkHeader();
  await page.getByRole('button',{name:'Back to National Pokédex',exact:true}).click();assert.equal(await search.inputValue(),`#${String(dex).padStart(3,'0')}`);
 }
 for(const width of [320,375,390,430,1280]){
  await page.setViewportSize({width,height:850});
  for(const dex of [4,26,129,132,151,172,201,202,235,249,386]){
   await open(dex);const identity=await page.locator('.species-identity').innerHTML();await page.evaluate(()=>{window.__learnsetScroll=[];});
   await page.getByRole('tab',{name:'Locations',exact:true}).click();await page.keyboard.press('ArrowRight');assert.equal(await page.getByRole('tab',{name:'Learnset',exact:true}).getAttribute('aria-selected'),'true');
   const panel=page.locator('.species-learnset'),groups=panel.locator(':scope > details');
   for(const group of await groups.all()){
    const summary=group.locator(':scope > summary');
    const appearance=await summary.evaluate(e=>{const c=getComputedStyle(e);return {color:c.color,background:c.backgroundColor,padding:c.padding,font:c.font,borderWidth:c.borderBottomWidth,marker:getComputedStyle(e,'::marker').color};});
    assert.equal(await summary.evaluate(e=>getComputedStyle(e).borderBottomColor),'rgba(255, 255, 255, 0.043)');
    await summary.click();assert.equal(await summary.evaluate(e=>getComputedStyle(e).borderBottomColor),'rgba(244, 180, 0, 0.333)');
    assert.deepEqual(await summary.evaluate(e=>{const c=getComputedStyle(e);return {color:c.color,background:c.backgroundColor,padding:c.padding,font:c.font,borderWidth:c.borderBottomWidth,marker:getComputedStyle(e,'::marker').color};}),appearance);
    await summary.click();assert.equal(await summary.evaluate(e=>getComputedStyle(e).borderBottomColor),'rgba(255, 255, 255, 0.043)');await summary.click();
   }assert.equal(await panel.locator(':scope > details[open]').count(),5);
   await groups.first().locator(':scope > summary').click();assert.equal(await panel.locator(':scope > details[open]').count(),4);await groups.first().locator(':scope > summary').click();
   assert.deepEqual(await groups.first().locator('.resource-learnset-heading > strong').allTextContents(),mergedLevelLearnset(internalIdForDex(dex)).map(row=>moveNames[row.move]));
   assert.equal(await page.locator('.species-identity').innerHTML(),identity);await checkHeader();
   for(const token of await panel.locator('span[style]').all()){const text=await token.innerText();assert.ok(colors[text],text);assert.equal(await token.evaluate(e=>getComputedStyle(e).color),rgb(colors[text]));seen.add(text);}
   assert.equal(await panel.locator('summary [style], .resource-learnset-heading [style], .resource-learnset-description [style]').count(),0);
   assert.equal(await panel.locator('summary').first().evaluate(e=>getComputedStyle(e).borderBottomColor),'rgba(244, 180, 0, 0.333)');
   await panel.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));assert.ok(await panel.locator('img').evaluateAll(images=>images.every(image=>image.naturalWidth>0 && image.getAttribute('src').startsWith('/types/icons/') && image.alt.endsWith(' type'))));
   if(dex===172)assert.match(await panel.innerText(),/Volt Tackle[\s\S]*Either parent holds a Light Ball/);
   if(dex===132)assert.match(await groups.nth(1).innerText(),/No compatible TMs or HMs/);
   if(dex===4)assert.match(await panel.innerText(),/Varies/);
   if(dex===386)for(const move of ['Superpower','Counter','ExtremeSpeed'])assert.ok((await groups.first().locator('.resource-learnset-heading > strong').allTextContents()).includes(move));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(await page.evaluate(()=>window.__learnsetScroll),[]);
   if([4,132,172,386].includes(dex)){await page.getByRole('tab',{name:'Learnset',exact:true}).focus();await page.screenshot({path:`/private/tmp/resources-learnset-${width}-${dex}.png`});}
   if(dex===4){await page.getByRole('tab',{name:'Overview',exact:true}).click();await page.getByRole('button',{name:'View Charmeleon profile',exact:true}).click();await page.getByRole('tab',{name:'Learnset',exact:true}).click();assert.equal(await page.getByRole('heading',{level:1}).innerText(),'Charmeleon');await groups.first().locator(':scope > summary').click();assert.deepEqual(await groups.first().locator('.resource-learnset-heading > strong').allTextContents(),mergedLevelLearnset(internalIdForDex(5)).map(row=>moveNames[row.move]));await checkHeader();}
   await page.getByRole('tab',{name:'Locations',exact:true}).click();assert.equal(await page.locator('.species-locations > details[open]').count(),0);
   await page.getByRole('button',{name:'Back to National Pokédex',exact:true}).click();assert.equal(await search.inputValue(),`#${String(dex).padStart(3,'0')}`);
  }
 }
 for(const token of ['R','S','E','FR','LG','Colo','XD','Pokémon Box'])assert.ok(seen.has(token),`Missing game-color coverage ${token}`);
 assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>localStorage.length),0);
 console.log('Learnset passed: all 386 rendered; five native groups, source-order rows, exact game-name-only colors, local icons, empty/unusual/special cases, species switching, static header/Back, unchanged Locations, keyboard; 320/375/390/430/1280px, no overflow or new scroll calls.');
}finally{await browser.close();}
