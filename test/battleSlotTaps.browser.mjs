import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
import {towerSpecies} from '../src/battle/opponentSpecies.js';
const mobileEngine=process.argv.includes('--webkit');
const server=await preview({preview:{host:'127.0.0.1',port:mobileEngine?5209:5208,strictPort:true}});
const browser=await (mobileEngine?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
const storage=new Uint8Array(33744);
[1,4,7].forEach((species,pid)=>storage.set(makePokemon({species,pid,experience:560}),4+pid*80));
const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
const mons=identifyPokemon(loadStoredSave({getItem:()=>encoded}).collection.records).map(toBattlePokemon).filter(Boolean);
const teams=[{id:'fixture',name:'Team 1',ids:mons.map(mon=>mon.identity)}];
const roles=Object.fromEntries(mons.map(mon=>[mon.identity,'Frontier']));
const errors=[];
try {
 for(const width of [320,375,390,430,1440]) {
  const touch=width<500;
  const context=await browser.newContext({viewport:{width,height:844},hasTouch:touch,isMobile:touch,serviceWorkers:'block'});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
  await page.evaluate(({encoded,roles,teams,opponents})=>{
   localStorage.setItem('emerald-companion-2.save.v1',encoded);
   localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify(roles));
   localStorage.setItem('emerald-companion-2.battle-teams.v1',JSON.stringify(teams));
   localStorage.setItem('emerald-companion-2.opponent-species.v1',JSON.stringify(opponents));
  },{encoded,roles,teams,opponents:towerSpecies.slice(0,3).map(mon=>mon.id)});
  await page.reload();await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();
  const player=page.getByRole('region',{name:'My Team',exact:true});
  await player.locator('.battle-compact-slot').first().click();
  await page.getByRole('button',{name:'Load Team 1',exact:true}).click();
  for(const [slot,mon] of towerSpecies.slice(0,3).entries()) {
   await page.getByRole('region',{name:'Opponent Team',exact:true}).locator('.battle-compact-slot').nth(slot).click();
   const picker=page.getByRole('dialog',{name:'Select opponent Pokémon'});
   await picker.getByRole('searchbox').fill(mon.name);
   await picker.getByRole('button',{name:`Select Pokémon ${mon.name}`,exact:true}).click();
  }
  for(const name of ['My Team','Opponent Team']) {
   const row=page.getByRole('region',{name,exact:true}).locator('.battle-compact-slots');
   const slots=row.locator('button');
   const snapshot=()=>slots.evaluateAll(els=>els.map(el=>el.querySelector('img')?.getAttribute('src')??null));
   await row.locator('img').nth(2).waitFor();
   const before=await snapshot();assert.ok(before.every(Boolean),`${name}: fixture loads three Pokémon`);
   const scale=await page.evaluate(()=>visualViewport.scale);
   // Adjacent inner edges are close enough to trigger Safari's tap retargeting.
   const boxes=await slots.evaluateAll(els=>els.map(el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};}));
   for(const order of [[0,1],[1,0],[1,2],[2,1],[0,2]]) {
    await page.waitForTimeout(400);
    for(let n=0;n<order.length;n++) {
     const i=order[n], other=order[1-n], b=boxes[i];
     const x=other>i?b.x+b.width-2:b.x+2, y=b.y+b.height/2;
     if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
    }
    assert.deepEqual(await snapshot(),before,`${name}: rapid ${order} taps must not remove either sprite`);
   }
   if(touch) {
    // Explicitly model even a stray Safari dblclick on the preceding sprite.
    await row.evaluate(el=>{
     const buttons=el.querySelectorAll('button');
     for(const index of [0,1]) {
      const button=buttons[index],b=button.getBoundingClientRect();
      const t={identifier:index,clientX:index===0?b.right-2:b.left+2,clientY:b.y+b.height/2};
      const start=new Event('touchstart',{bubbles:true,cancelable:true});
      Object.defineProperties(start,{touches:{value:[t]},changedTouches:{value:[t]}});button.dispatchEvent(start);
      const end=new Event('touchend',{bubbles:true,cancelable:true});
      Object.defineProperties(end,{touches:{value:[]},changedTouches:{value:[t]}});
      if(button.dispatchEvent(end))buttons[0].click();
     }
     buttons[0].dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true}));
    });
    assert.deepEqual(await snapshot(),before,`${name}: synthetic retargeted double-click ignored`);
   }
   await page.waitForTimeout(450);
   if(touch){await slots.nth(1).tap();await slots.nth(1).tap();}else await slots.nth(1).dblclick();
   assert.deepEqual(await snapshot(),[before[0],null,before[2]],`${name}: intentional same-slot double tap removes only that Pokémon`);
   assert.equal(await page.getByRole('dialog').count(),0,'clearing gesture cannot reopen a picker');
   assert.equal(await page.evaluate(()=>visualViewport.scale),scale);
   assert.equal(await page.evaluate(()=>getSelection().toString()),'');
   await page.waitForTimeout(450);
   if(touch)await slots.nth(1).tap();else await slots.nth(1).click();
   assert.equal(await page.getByRole('dialog').count(),1,'empty slot still opens its picker');
   await page.keyboard.press('Escape');
  }
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('emerald-companion-2.battle-teams.v1'))),teams);
  await context.close();console.log(`PASS ${width}px: both team rows preserve adjacent/skip rapid taps, ignore touch-generated double-clicks, remove only deliberate same-slot double taps, and retain empty-slot pickers.`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
