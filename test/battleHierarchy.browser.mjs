import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
const useWebKit=process.argv.includes('--webkit');
const server=await preview({preview:{host:'127.0.0.1',port:useWebKit?5221:5220,strictPort:true}});
const browser=await(useWebKit?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
const storage=new Uint8Array(33744);[1,4,7].forEach((species,pid)=>storage.set(makePokemon({species,pid,experience:560}),4+pid*80));
const trainer=new Uint8Array(3884);trainer.set([187,188,255]);
const encoded=Buffer.from(makeSave({blocks:{storage,saveBlock2:trainer}})).toString('base64');
const mons=identifyPokemon(loadStoredSave({getItem:()=>encoded}).collection.records).map(toBattlePokemon).filter(Boolean);
const roles=Object.fromEntries(mons.map(mon=>[mon.identity,'Frontier']));
const teams=[{id:'one',name:'Team 1',ids:mons.map(mon=>mon.identity)}];
const errors=[];
try{
 await mkdir('artifacts/battle-hierarchy',{recursive:true});
 for(const width of [320,375,390,430,1440]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500,serviceWorkers:'block'});
  await context.addInitScript(({encoded,roles,teams})=>{
   localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify(roles));
   localStorage.setItem('emerald-companion-2.battle-teams.v1',JSON.stringify(teams));
  },{encoded,roles,teams});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  const tap=async el=>width<500?el.tap():el.click();
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();
  const right=page.locator('.battle-foundation > .home-resources');
  assert.deepEqual(await right.locator('.battle-section-heading').allTextContents(),['Battle Rules▾','Teams','Possible Sets']);
  const styles=await right.locator('.battle-section-heading').evaluateAll(els=>els.map(el=>{
   const s=getComputedStyle(el), b=el.getBoundingClientRect();return {size:s.fontSize,weight:s.fontWeight,color:s.color,line:s.lineHeight,x:b.x};
  }));
  assert.ok(styles.every((s,index)=>s.size==='13px'&&s.weight==='600'&&s.color===(index===0?'rgb(255, 216, 92)':'rgb(181, 187, 197)')&&s.line===styles[0].line&&s.x===styles[0].x));
  const spacing=await right.evaluate(el=>{
   const rect=node=>node.getBoundingClientRect();
   const teams=el.querySelector('.battle-teams-section'), grid=teams.querySelector('.battle-compact-teams');
   const parts=[...grid.children].map(rect), sets=el.querySelector('.battle-possible-sets');
   return {gap:getComputedStyle(el).gap,content:rect(grid).y-rect(teams.querySelector('h2')).bottom,
    teamGap:parts[1].y-parts[0].bottom,sectionGap:rect(sets).y-rect(teams).bottom,
    listGap:rect(sets.querySelector('.battle-possible-set-list')).y-rect(sets.querySelector('h2')).bottom};
  });
  assert.deepEqual(spacing,{gap:'12px',content:8,teamGap:8,sectionGap:12,listGap:8});
  assert.ok(await right.locator('.battle-compact-teams h3').evaluateAll(els=>els.every(el=>getComputedStyle(el).fontSize==='12px'&&getComputedStyle(el).fontWeight==='400'&&getComputedStyle(el).color==='rgb(181, 187, 197)'&&el.getBoundingClientRect().height===48)));
  const player=page.getByRole('region',{name:'My Team',exact:true}),opponent=page.getByRole('region',{name:'Opponent Team',exact:true});
  await tap(player.locator('.battle-compact-slot').first());await tap(page.getByRole('button',{name:'Load Team 1',exact:true}));
  await tap(opponent.locator('.battle-opponent-trigger'));const trainers=page.getByRole('dialog',{name:'Select opponent trainer'});
  await trainers.getByRole('searchbox').fill('Anabel');await tap(trainers.getByRole('button',{name:'Select trainer Anabel Gold',exact:true}));
  await opponent.locator('.battle-compact-slot img').nth(2).waitFor();await player.locator('.battle-compact-slot img').nth(2).waitFor();
  assert.ok(await right.locator('.battle-compact-trainer').evaluateAll(imgs=>imgs.length===2&&imgs.every(img=>{const r=img.getBoundingClientRect();return r.width===36&&r.height===48;})));
  assert.ok(await right.locator('.battle-compact-slot img').evaluateAll(imgs=>imgs.every(img=>{const r=img.getBoundingClientRect();return r.width<=32&&r.height===32;})));
  await tap(player.locator('.battle-compact-slot').first());await tap(opponent.locator('.battle-compact-slot').first());
  const sets=page.getByRole('region',{name:'Possible Sets',exact:true});await tap(sets.locator('.battle-possible-set-list button').first());
  assert.equal(await page.getByRole('dialog').count(),1);await page.keyboard.press('Escape');
  await tap(page.getByRole('button',{name:'Battle Rules',exact:true}));
  assert.equal(await page.getByRole('dialog',{name:'Battle Rules'}).count(),1);await page.keyboard.press('Escape');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`artifacts/battle-hierarchy/${useWebKit?'webkit':'chrome'}-${width}.png`,fullPage:true});
  await context.close();console.log(`PASS ${width}px: existing typography tokens, three aligned main headings, subordinate trainer names, compact 8/12px spacing, fixed sprite sizes and working team/trainer/rules/set popups.`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
