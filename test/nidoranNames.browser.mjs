import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import PokemonName from '../src/ui/components/PokemonName.js';
import {makeSave, makePokemon} from './fixtures/synthetic.js';
const require=createRequire(import.meta.url), {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine=process.env.NIDORAN_BROWSER || 'chromium';
const browser=await (engine === 'webkit' ? webkit : chromium).launch({headless:true,...(engine === 'chromium' ? {executablePath:process.env.CHROME_EXECUTABLE} : {})});
const url=process.env.BATTLE_URL || 'http://127.0.0.1:5173/';
const storage=new Uint8Array(33744);
[29,32,1].forEach((species,index)=>storage.set(makePokemon({species,pid:index}),4+80*index));
const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
const errors=[];
try {
 for (const width of [320,375,390,430]) {
  const context=await browser.newContext({...(engine === 'webkit' ? devices['iPhone 13'] : {}),viewport:{width,height:844}}), page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  await page.evaluate(encoded=>{localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier','0:1:0':'Frontier'}));},encoded);
  await page.reload();
  const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();};
  const back=async()=>page.getByRole('button',{name:'Back to Resources',exact:true}).click();
  const check=async (scope, minimum=1)=>{
   const names=scope.locator('.pokemon-species-name');
   assert.ok(await names.count()>=minimum);
   const correct=await names.evaluateAll(nodes=>nodes.every(n=>{
    const symbol=n.querySelector('.pokemon-species-symbol'), style=getComputedStyle(n), glyph=getComputedStyle(symbol);
    const nameRange=document.createRange();nameRange.selectNodeContents(n.firstChild);
    const marker=document.createElement('span');
    marker.style.cssText='display:inline-block;width:0;height:0;margin:0;padding:0;border:0;vertical-align:baseline';
    n.insertBefore(marker,symbol);
    const baseline=marker.getBoundingClientRect().top;
    const left=nameRange.getBoundingClientRect(), right=symbol.getBoundingClientRect();
    marker.remove();
    return /^Nidoran[♀♂][\uFE0E\uFE0F]?$/i.test(n.textContent)
      && style.whiteSpace==='nowrap' && style.overflowWrap==='normal' && style.display==='inline' && glyph.display==='inline-block'
      && glyph.fontSize===style.fontSize && glyph.fontWeight===style.fontWeight && glyph.color===style.color
      && Math.abs(right.bottom-baseline)<.5
      && Math.abs(right.height-.75*parseFloat(style.fontSize))<.1
      && Math.abs(left.right-right.left)<.5
      && symbol.querySelector('svg')?.getAttribute('aria-hidden')==='true';
   }));
   assert.equal(correct,true,JSON.stringify(await names.evaluateAll(ns=>ns.map(n=>{const g=n.lastChild,s=getComputedStyle(n),t=getComputedStyle(g),r=document.createRange();r.selectNodeContents(n.firstChild);return {text:n.textContent,display:s.display,glyphDisplay:t.display,space:s.whiteSpace,wrap:s.overflowWrap,font:s.font,glyphFont:t.font,top:t.top,rects:n.getClientRects().length,gap:g.getBoundingClientRect().left-r.getBoundingClientRect().right};}))));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  };
  await navigate('Resources');
  await page.getByRole('searchbox',{name:'Search Pokémon, moves and abilities',exact:true}).fill('nidoran');
  await check(page.locator('.resources-results'),2);
  await page.getByRole('link',{name:'Pokémon Database',exact:true}).click();
  const catalog=page.getByRole('searchbox',{name:'Search Pokémon Database',exact:true});
  await catalog.fill('nidoran');await check(page.locator('.resources-catalog'),2);
  assert.deepEqual(await page.locator('.resources-pokedex-name').allTextContents(),['Nidoran♀','Nidoran♂']);
  for (const [dex,name] of [[29,'Nidoran♀'],[32,'Nidoran♂']]) {
   await catalog.fill(name);assert.equal(await page.locator('.resources-pokedex-row').count(),1);
   await page.locator(`#resources-entry-pokemon-${dex} a`).click();
   assert.equal(await page.locator('#species-profile-title').innerText(),name);
   assert.equal(await page.getByRole('heading',{name:new RegExp(`^Nidoran\\s*${name.slice(7)}$`)}).count(),1);
   await check(page.locator('.species-profile'));
   await page.screenshot({path:`/private/tmp/${engine}-nidoran-profile-${dex}-${width}.png`,fullPage:false});
   await page.getByRole('button',{name:'Back to National Pokédex',exact:true}).click();
  }
  await back();
  await page.getByRole('link',{name:'Pokémon Sets',exact:true}).click();
  await page.getByRole('searchbox',{name:'Search Pokémon Sets',exact:true}).fill('nidoran');
  await check(page.locator('.frontier-sets'),2);
  assert.deepEqual(await page.locator('.frontier-set-name strong').allTextContents(),['Nidoran♂ 1','Nidoran♀ 1']);
  await page.screenshot({path:`/private/tmp/${engine}-nidoran-frontier-${width}.png`,fullPage:false});
  await back();await page.getByRole('link',{name:'Trainers',exact:true}).click();
  await page.getByRole('searchbox',{name:'Search Frontier Trainers',exact:true}).fill('MANUEL Rich Boy');
  await page.locator('.frontier-trainer-toggle').click();await check(page.locator('.frontier-trainer-details'),2);
  await page.locator('.frontier-trainer-details').screenshot({path:`/private/tmp/${engine}-nidoran-trainer-grid-${width}.png`});
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(),0);
  await back();
  for (const label of ['IV Calculator','Stat Calculator']) {
   await page.getByRole('link',{name:label,exact:true}).click();
   for (const name of ['Nidoran♀','Nidoran♂']) {
    await page.getByRole('searchbox',{name:'Search Pokémon',exact:true}).fill(name);
    const suggestions=page.locator(label==='IV Calculator'?'.iv-suggestions':'.sc-suggestions');
    await check(suggestions);
    assert.equal(await suggestions.locator('button').innerText(),name);
   }
   await back();
  }
  await page.getByRole('link',{name:'Moves',exact:true}).click();
  await page.getByRole('searchbox',{name:'Search Moves',exact:true}).fill('Toxic');
  await page.getByRole('button',{name:'Toxic',exact:true}).click();await check(page.getByRole('dialog').locator('.resources-move-learners'),2);
  await page.getByRole('dialog').locator('.resources-move-heading').click();
  await back();await page.getByRole('link',{name:'Abilities',exact:true}).click();
  await page.getByRole('searchbox',{name:'Search Abilities',exact:true}).fill('Poison Point');
  await page.getByRole('button',{name:'Poison Point',exact:true}).click();await check(page.locator('.resources-move-learners'),2);
  await page.keyboard.press('Escape');
  await navigate('My Pokémon');
  await page.getByRole('searchbox',{name:'Search Pokémon',exact:true}).fill('nidoran');
  await check(page.locator('.pokemon-grid'),2);
  for (const name of ['Nidoran♀','Nidoran♂']) {
   await page.locator('.pokemon-card').filter({hasText:name}).click();await page.keyboard.press('Escape');
   assert.equal(await page.getByRole('dialog').count(),0);
   await check(page.locator('.pokemon-grid'),2);
  }
  await navigate('Battle');await page.getByRole('tab',{name:'Teams',exact:true}).click();
  await check(page.locator('.battle-frontier-hub'),2);
  await page.getByRole('button',{name:'Add Team',exact:true}).click();
  const dialog=page.getByRole('dialog');await check(dialog.locator('.battle-team-picker'),2);
  await dialog.locator('.battle-team-picker button').first().click();await check(dialog.locator('.battle-team-editor-slots'));
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('tab',{name:'Sets',exact:true}).click();
  await page.getByRole('searchbox',{name:'Search Pokémon sets',exact:true}).fill('nidoran');
  await check(page.locator('.battle-set-results'),2);
  await page.screenshot({path:`/private/tmp/${engine}-nidoran-battle-sets-${width}.png`,fullPage:false});
  await page.getByRole('button',{name:'Select Nidoran♂ 1',exact:true}).click();
  await check(page.locator('.battle-matchup-identity'),2);
  await page.screenshot({path:`/private/tmp/${engine}-nidoran-battle-${width}.png`,fullPage:false});
  await navigate('Trainer');await page.locator('.trainer-team-slot').first().click();
  const showcase=page.getByRole('dialog');await showcase.getByRole('searchbox',{name:'Search Pokémon',exact:true}).fill('nidoran');
  await check(showcase,2);await showcase.getByRole('button',{name:'Cancel',exact:true}).click();
  // Exercise the actual inherited CSS at several sizes/weights, with unchanged controls.
  const fixtures=[8,10,12,16,20,28].map(size=>`<div style="font-size:${size}px;font-weight:${size<16?400:650};margin-bottom:10px"><div>${size}px · Before</div><div>Nidoran♂ Nidoran♀</div><div>Corrected</div><div>${renderToStaticMarkup(React.createElement(PokemonName,null,'Nidoran♂ Nidoran♀'))}</div><div class="unchanged">Bulbasaur ♂</div></div>`).join('');
  const sample=await context.newPage();await sample.goto(url);
  await sample.evaluate(({fixtures,width})=>{
   document.body.innerHTML=`<div id="name-fixtures" style="width:${width}px;padding:12px;background:#17191c;color:#f3f4f6">${fixtures}</div>`;
  },{fixtures,width});
  const names=sample.locator('.pokemon-species-name');
  assert.equal(await names.count(),12);
  assert.equal(await sample.locator('.unchanged .pokemon-species-name').count(),0);
  assert.equal(await names.evaluateAll(ns=>ns.every(n=>{
   const s=getComputedStyle(n),g=getComputedStyle(n.querySelector('.pokemon-species-symbol')),p=getComputedStyle(n.parentElement);
   return s.fontSize===p.fontSize&&s.fontWeight===p.fontWeight&&g.fontSize===s.fontSize&&g.fontWeight===s.fontWeight&&n.getBoundingClientRect().height<1.6*parseFloat(s.fontSize);
  })),true);
  await sample.locator('#name-fixtures').screenshot({path:`/private/tmp/${engine}-nidoran-font-sizes-${width}.png`});
  await context.close();
 }
 assert.deepEqual(errors,[]);
 console.log(engine + ' Nidoran names passed: both canonical genders in Resources search/Dex/profiles, Frontier sets/trainers, move and ability learners, calculator suggestions, My Pokémon/profiles and separate gender metadata, Battle picker/slots/sets/matchup; inherited 8–28px typography, atomic names, no added spaces or overflow at 320/375/390/430px.');
}finally{await browser.close();}
