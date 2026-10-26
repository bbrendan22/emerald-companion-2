import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
const useWebKit=process.argv.includes('--webkit');
const server=await preview({preview:{host:'127.0.0.1',port:useWebKit?5245:5244,strictPort:true}});
const browser=await(useWebKit?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
const storage=new Uint8Array(33744);
[{species:143,ivWord:3221225471,moveIds:[58,89,53,57]},{species:94},{species:142}].forEach((options,pid)=>storage.set(makePokemon({...options,pid}),4+pid*80));
const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
const mons=identifyPokemon(loadStoredSave({getItem:()=>encoded}).collection.records).map(toBattlePokemon).filter(Boolean);
const roles=Object.fromEntries(mons.map(mon=>[mon.identity,'Frontier']));
try {
 await mkdir('artifacts/type-chart-indicators',{recursive:true});
 for(const width of [320,375,430,1440]) {
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500,serviceWorkers:'block'});
  await context.addInitScript(({encoded,roles})=>{localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify(roles));},{encoded,roles});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  const tap=async el=>width<500?el.tap():el.click();
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();
  const mine=page.getByRole('region',{name:'My Team',exact:true}).locator('.battle-compact-slot');
  const slots=page.getByRole('region',{name:'Opponent Team',exact:true}).locator('.battle-compact-slot');
  const player=page.getByRole('group',{name:'My matchup Pokémon',exact:true}),enemy=page.getByRole('group',{name:'Opponent matchup Pokémon',exact:true});
  const ownEffect=index=>player.locator('.battle-active-move-effectiveness').nth(index);
  const otherEffect=index=>enemy.locator('.battle-active-move-effectiveness').nth(index);
  for(const [slot,mon]of mons.entries()) {await tap(mine.nth(slot));await tap(page.getByRole('dialog',{name:'My Team selection'}).locator(`[data-pokemon-id="${mon.identity}"]`));}
  for(const [slot,name]of ['Snorlax','Gengar','Kingdra'].entries()) {
   await tap(slots.nth(slot));const popup=page.getByRole('dialog',{name:'Select opponent Pokémon'});await popup.getByRole('searchbox').fill(name);await tap(popup.getByRole('button',{name:`Select Pokémon ${name}`,exact:true}));
  }
  await tap(mine.nth(0));await tap(slots.nth(0));
  assert.equal(await player.locator('.battle-active-ability').innerText(),'Thick Fat');
  assert.equal(await ownEffect(0).innerText(),'1×','Ice against Snorlax ignores Thick Fat / Immunity');
  await enemy.getByRole('combobox',{name:'Opponent move 1',exact:true}).selectOption('Earthquake');
  await tap(mine.nth(1));assert.equal(await otherEffect(0).innerText(),'0×','opponent Ground against known Levitate Gengar is immune');
  assert.equal(await ownEffect(2).innerText(),'—','status move shows a dash');
  await tap(mine.nth(2));assert.equal(await otherEffect(0).innerText(),'0×','opponent Ground against a Flying type remains immune');
  await tap(mine.nth(0));await tap(slots.nth(1));
  assert.equal(await ownEffect(1).innerText(),'0×','player Ground against sole-ability Levitate Gengar is immune');
  await enemy.getByRole('combobox',{name:'Opponent move 1',exact:true}).selectOption('Ice Punch');
  assert.equal(await otherEffect(0).innerText(),'1×','opponent Ice against actual Thick Fat Snorlax remains neutral');
  await tap(slots.nth(2));assert.equal(await ownEffect(2).innerText(),'0.25×','dual type quarter resistance retains leading zero');
  for(const [name,expected]of [['Vaporeon','0×'],['Quagsire','1×']]) {
   await page.waitForTimeout(450);
   if(width<500){await slots.nth(0).tap();await slots.nth(0).tap();}else await slots.nth(0).dblclick();
   await page.waitForTimeout(450);await tap(slots.nth(0));
   const popup=page.getByRole('dialog',{name:'Select opponent Pokémon'});
   await popup.getByRole('searchbox').fill(name);await tap(popup.getByRole('button',{name:`Select Pokémon ${name}`,exact:true}));
   await page.waitForTimeout(450);await tap(slots.nth(0));
   assert.equal(await ownEffect(3).innerText(),expected,`Surf vs ${name} applies only guaranteed immunity`);
  }
  assert.ok(await page.locator('.battle-active-move-effectiveness').evaluateAll(cells=>cells.every(cell=>cell.scrollWidth<=cell.clientWidth)),'all full-format multipliers fit');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`artifacts/type-chart-indicators/${useWebKit?'webkit':'chrome'}-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS guaranteed immunity indicators ${width}px: both directions apply Levitate, ignore Thick Fat, distinguish Water Absorb certainty and respect Flying immunity, show status dashes and full 0.25× formatting.`);
 }
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
