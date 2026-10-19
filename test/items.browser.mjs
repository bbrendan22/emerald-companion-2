import {assetPath} from './helpers/browserPaths.js';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {itemResources,machineResources} from '../src/resources/items/data/itemResources.js';
import {itemNames,moveNames} from '../src/resources/items/data/emeraldData.js';
import {moveResources} from '../src/resources/items/data/moveResources.js';
import {itemCategories,itemCategory,battleGroups,utilityGroups,berryGroups,miscGroups} from '../src/resources/items/utils/itemCategories.js';
import {itemAcquisition,itemAcquisitionEntries} from '../src/resources/items/data/itemAcquisition.js';
import {machineIconIds} from '../src/resources/items/data/itemIcons.js';
import {machineItemPrices} from '../src/resources/items/data/itemShopData.js';
import {pokeBallCatchRates} from '../src/resources/items/data/pokeBallCatchRates.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
const items=[...Object.entries(itemResources).map(([id,item])=>({id,...item,name:itemNames[id]??item.name})).sort((a,b)=>a.name.localeCompare(b.name)).filter(i=>i.pocket!=='TM_HM'),...machineResources.map(m=>({...itemResources[machineIconIds[m.code]],...m,id:machineIconIds[m.code],price:machineItemPrices[machineIconIds[m.code]],name:moveNames[m.moveId],machine:true}))];
const categories=[...itemCategories,'Berries'];
const colors={Ruby:'#b52d43',R:'#b52d43',Sapphire:'#245cbb',S:'#245cbb',Emerald:'#08755d',E:'#08755d',FireRed:'#c44a1b',FR:'#c44a1b',LeafGreen:'#438022',LG:'#438022',Colosseum:'#6552a3',Colo:'#6552a3',XD:'#903a9b','Pokémon Box':'#956b16'};
const rgb=hex=>`rgb(${[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')})`;
const seenColors=new Set();
try{
 const page=await browser.newPage({viewport:{width:375,height:844},hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__itemsScroll=[];for(const name of ['scrollTo','scrollBy','scroll']){const original=window[name];window[name]=function(...args){window.__itemsScroll.push(name);return original.apply(this,args)}}const original=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(...args){window.__itemsScroll.push('scrollIntoView');return original.apply(this,args)}});
 await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Resources',exact:true}).click();await page.evaluate(()=>window.__itemsScroll=[]);
 const home=page.locator('.resources-section:has(#resources-items-heading)');
 const app=page.locator('.resource-items-page').first(),rows=app.locator('.resource-item-groups .resource-item-main'),search=page.getByRole('searchbox',{name:'Search items',exact:true});
 const button=id=>app.locator(`button[data-item-id="${id}"]`);
 let currentCategory;
 const dialog=page.getByRole('dialog');
 const closeDetails=async()=>{await dialog.locator('.resource-item-main').tap();};
 const overflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const checkColors=async()=>{
  for(const span of await app.locator('span[style]').all()){const text=await span.innerText();assert.ok(colors[text],text);assert.equal(await span.evaluate(e=>getComputedStyle(e).color),rgb(colors[text]));assert.equal(await span.locator('xpath=ancestor::*[contains(@class,"resource-item-source-heading")]').count(),1);seenColors.add(text);}
  assert.equal(await app.locator('button[style],h3[style],img[style],.resource-item-source-note[style]').count(),0);
 };
 const checkSources=async item=>{
  const panel=app.locator(`#item-sources-${item.id}`),data=itemAcquisition[item.id],expected=itemAcquisitionEntries(item.id).filter(e=>!(Number(item.id)>=153&&Number(item.id)<=158&&/game\s*corner/i.test(e.location)));
  assert.equal(await app.locator('.resource-inline-learners').count(),1);
  assert.deepEqual(await panel.locator('.resource-item-source').evaluateAll(nodes=>nodes.map(n=>{const p=[...n.querySelectorAll(':scope > p')];return {game:n.querySelector('.resource-item-source-heading > span:first-child').textContent,availability:n.querySelector('.resource-item-source-heading > span:last-child').textContent,location:p[0].textContent,method:p[1].textContent,...(p[2]?{requirement:p[2].textContent}:{})}})),expected.map(e=>({game:e.game,availability:e.availability==='Once per pickup'?'Once per save':e.availability,location:e.location,method:e.method,...(e.requirement?{requirement:e.requirement}:{})})));
  assert.deepEqual(await panel.locator('.resource-item-acquisition-note').allTextContents(),data.note?[data.note]:[]);
  assert.deepEqual(await panel.locator('.resource-item-secondary').allTextContents(),pokeBallCatchRates[item.id]?[`Catch rate · ${pokeBallCatchRates[item.id]}`]:[]);
  {
   assert.equal(await dialog.count(),1);
   assert.equal(await app.locator('.resource-item-groups .resource-inline-learners').count(),0);
   assert.equal(await dialog.locator('.resource-item-main').innerText(),await button(item.id).innerText());
   assert.deepEqual(await dialog.locator('.resource-item-main img').getAttribute('src'),assetPath(`/items/${item.id}.png`));
   assert.equal(await dialog.locator('button,a').count(),0);
   assert.deepEqual(await dialog.evaluate(e=>{const s=getComputedStyle(e);return [s.borderTopWidth,s.outlineStyle];}),['0px','none']);
  }
  await checkColors();
 };
 async function checkCategory(category,allSources=false){
  const expected=items.filter(i=>itemCategory(i)===category),defs={Battle:battleGroups,Utility:utilityGroups,Berries:berryGroups,'Misc.':miscGroups}[category];
  if(category==='Berries')assert.equal(await page.getByRole('tab').count(),0);
  else {assert.equal(await page.getByRole('tab',{name:category,exact:true}).getAttribute('aria-selected'),'true');assert.deepEqual(await app.getByRole('tab').allTextContents(),itemCategories);}
  assert.equal(await app.locator('.resource-list-heading').innerText(),category==='Berries'?'Berries':'Useful Items');
  assert.equal(await app.locator('.resource-list-heading > span').count(),0);
  const expectedGroups=category==='TMs/HMs'?['TMs','HMs']:defs?Object.keys(defs):[];
  assert.deepEqual(await app.locator('.resource-item-groups > section > h3').allTextContents(),expectedGroups);
  const ordered=category==='TMs/HMs'||!defs?expected:Object.values(defs).flatMap(ids=>expected.filter(i=>ids.includes(Number(i.id))));
  assert.deepEqual(await rows.locator('strong').allTextContents(),ordered.map(i=>i.machine?`${i.code} · ${i.name}`:i.name));
  assert.deepEqual(await rows.locator('small').allTextContents(),ordered.map(i=>i.machine?moveResources[i.moveId].description:i.description));
  await rows.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>{i.loading='eager';return i.decode()})));
  assert.deepEqual(await rows.locator('img').evaluateAll(imgs=>imgs.map(i=>i.getAttribute('src'))),ordered.map(i=>assetPath(`/items/${i.id}.png`)));
  for(const item of ordered){
   assert.equal(await button(item.id).locator('aside').count(),0);
   assert.doesNotMatch(await button(item.id).innerText(),/Buy ₽|Sell ₽|\d+ BP/);
   if(allSources){await button(item.id).click();await checkSources(item);await closeDetails(item.id);}
  }
  await overflow();
 }
 async function openCategory(category){
  currentCategory=category;
  await home.getByRole('link',{name:category==='Berries'?'Berries':'Useful Items',exact:true}).click();
  if(category!=='Berries'){
   assert.equal(await page.getByRole('tab',{name:'Battle',exact:true}).getAttribute('aria-selected'),'true');
   if(category!=='Battle')await page.getByRole('tab',{name:category,exact:true}).click();
  }
 }
 assert.deepEqual(await home.getByRole('link').allTextContents(),['Useful Items','Berries']);
 assert.deepEqual(itemCategories,['Battle','Utility','TMs/HMs','Misc.']);
 assert.deepEqual(Object.keys(battleGroups),['Battle Items','Type Boosters']);
 assert.deepEqual(Object.keys(utilityGroups),['Training','Valuables','Vitamins']);
 assert.equal(await page.evaluate(()=>localStorage.length),0);
 for(const [i,category]of categories.entries()){await openCategory(category);await checkCategory(category,true);assert.equal(await page.locator('.header .brand span').innerText(),'Emerald Companion');assert.equal(await app.getByRole('button',{name:/Back/}).count(),0);await page.getByRole('button',{name:'Back to Resources',exact:true}).click();}
 for(const width of [320,375,390,430,1280]){
  await page.setViewportSize({width,height:844});
  for(const [i,category]of categories.entries()){
   await openCategory(category);await checkCategory(category);
   const first=items.filter(i=>itemCategory(i)===category)[0];
   const visuals=()=>button(first.id).evaluate(e=>{const c=getComputedStyle(e);return [c.backgroundColor,c.color,c.borderColor,c.boxShadow,c.outlineStyle,c.transform]});
   await button(first.id).blur();await page.mouse.move(0,0);const normal=await visuals();
   await button(first.id).tap();await checkSources(first);await closeDetails(first.id);
   assert.deepEqual(await visuals(),normal);assert.equal(await button(first.id).evaluate(e=>e===document.activeElement),false);
   await button(first.id).focus();await page.keyboard.press('Enter');await checkSources(first);
   await page.keyboard.press('Escape');assert.equal(await button(first.id).evaluate(e=>e===document.activeElement&&e.matches(':focus-visible')),true);
   assert.equal(await app.locator('.resource-inline-learners').count(),0);
   await button(first.id).click();await closeDetails(first.id);
   const other=items.filter(i=>itemCategory(i)===category)[1];await button(other.id).click();await checkSources(other);await closeDetails(other.id);
   const state=await search.evaluate(e=>{e.blur();const s=getComputedStyle(e.parentElement);return [s.backgroundColor,s.borderColor,s.boxShadow]});await search.click();assert.deepEqual(await search.evaluate(e=>{const s=getComputedStyle(e.parentElement);return [s.backgroundColor,s.borderColor,s.boxShadow]}),state);
   await search.fill('  no-such-item  ');assert.equal(await app.locator('.resource-list-heading').innerText(),category==='Berries'?'Berries':'Useful Items');assert.equal(await rows.count(),0);assert.equal(await app.locator('.resource-empty').innerText(),'No results.');
   const query=category==='TMs/HMs'?'  tm26  ':first.name.toUpperCase();await search.fill(query);assert.ok(await rows.count()>0);assert.equal(await app.locator('.resource-list-heading').innerText(),category==='Berries'?'Berries':'Useful Items');assert.ok((await rows.allTextContents()).every(text=>text.toLowerCase().includes(query.trim().toLowerCase())));await search.fill('');
   // Capture each category with the same verified details open; no custom scrolling.
   const selected=category==='Battle'?200:category==='Utility'?197:category==='Berries'?168:category==='TMs/HMs'?314:94;
   await search.fill(category==='TMs/HMs'?'TM26':itemNames[selected]);await button(selected).click();await checkSources(items.find(i=>Number(i.id)===selected));await page.evaluate(()=>document.activeElement?.blur());await page.screenshot({path:`/private/tmp/items-${i}-${width}.png`});await overflow();await closeDetails(selected);
   await page.getByRole('button',{name:'Back to Resources',exact:true}).click();
  }
 }
 await openCategory('Battle');await search.fill('over');assert.equal(await rows.count(),0);await search.fill('left');assert.deepEqual(await rows.locator('strong').allTextContents(),['Leftovers']);await search.fill('');await button(200).click();await page.keyboard.press('Escape');await search.fill('left');await page.getByRole('tab',{name:'Utility',exact:true}).click();assert.equal(await search.inputValue(),'left');await page.getByRole('tab',{name:'Battle',exact:true}).click();assert.equal(await dialog.count(),0);await button(200).click();await checkSources(items.find(i=>Number(i.id)===200));await closeDetails(200);
 await page.getByRole('button',{name:'Back to Resources',exact:true}).click();await openCategory('Berries');await search.fill('itrus');assert.equal(await rows.count(),0);await search.fill('  SIT  ');assert.deepEqual(await rows.locator('strong').allTextContents(),['Sitrus Berry']);await search.fill('berry');assert.equal(await rows.count(),23);await search.fill('');await button(133).click();await closeDetails();
 assert.deepEqual(await app.locator('.resource-item-groups > section > h3').allTextContents(),['Stat Boost','Recovery','EV']);
 for(const id of [143,144,145,146,147])assert.equal(await button(id).count(),0);
 assert.deepEqual(await page.evaluate(()=>window.__itemsScroll),[]);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>localStorage.length),0);
 for(const game of ['Emerald','Ruby','Sapphire','FireRed','LeafGreen','Colosseum','XD'])assert.ok(seenColors.has(game),game);
 console.log('Useful Items passed: two homepage links, 138 entries and every displayed source, exact names/descriptions/group order/icons/no row prices/catch rates/notes, text-only game colors, category/search parity, item and Berry popups and keyboard controls, static header/Back, no-save operation; 320/375/390/430/1280px without overflow or new scroll calls.');
}finally{await browser.close();}
