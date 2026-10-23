import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
const useWebKit=process.argv.includes('--webkit');
const server=await preview({preview:{host:'127.0.0.1',port:useWebKit?5211:5210,strictPort:true}});
const browser=await (useWebKit?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
const storage=new Uint8Array(33744);
[1,1,4,7,25].forEach((species,pid)=>storage.set(makePokemon({species,pid,experience:560}),4+pid*80));
const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
const mons=identifyPokemon(loadStoredSave({getItem:()=>encoded}).collection.records).map(toBattlePokemon).filter(Boolean);
const roles=Object.fromEntries(mons.map(mon=>[mon.identity,'Frontier']));
const presets=[{id:'invalid',name:'Team 1',ids:mons.slice(0,3).map(mon=>mon.identity)},
{id:'valid',name:'Team 2',ids:[0,2,3].map(i=>mons[i].identity)},
{id:'invalid-double',name:'Team 3',ids:[0,1,2,3].map(i=>mons[i].identity)}];
const errors=[];
try {
 for(const width of [320,375,390,430,1440]) {
  const touch=width<500, context=await browser.newContext({viewport:{width,height:844},isMobile:touch,hasTouch:touch,serviceWorkers:'block'});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
  await page.evaluate(({encoded,roles,presets})=>{
   localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify(roles));
   localStorage.setItem('emerald-companion-2.battle-teams.v1',JSON.stringify(presets));
  },{encoded,roles,presets});
  await page.reload();await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();
  const activate=async el=>touch?el.tap():el.click();
  const player=page.getByRole('region',{name:'My Team',exact:true}), opponent=page.getByRole('region',{name:'Opponent Team',exact:true});
  const mySlots=player.locator('.battle-compact-slot'), otherSlots=opponent.locator('.battle-compact-slot');
  const popup=page.getByRole('dialog',{name:'My Team selection'}), otherPopup=page.getByRole('dialog',{name:'Select opponent Pokémon'});
  const row=i=>popup.locator(`[data-pokemon-id="${mons[i].identity}"]`);
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('emerald-companion-2.battle-teams.v1')));
  const appearance=el=>el.evaluate(el=>({opacity:getComputedStyle(el).opacity,filter:getComputedStyle(el).filter,background:getComputedStyle(el).backgroundColor}));
  await activate(mySlots.nth(0));
  assert.ok(await popup.getByRole('button',{name:'Load Team 1',exact:true}).isDisabled());
  assert.match(await popup.getByRole('button',{name:'Load Team 1',exact:true}).getAttribute('title'),/different species/);
  await activate(row(0));await activate(mySlots.nth(1));
  assert.ok(await row(0).isDisabled());assert.ok(await row(1).isDisabled());assert.ok(await row(2).isEnabled());
  const disabledAppearance=await appearance(row(1));assert.equal(disabledAppearance.opacity,'0.4');
  await row(1).evaluate(el=>el.click());assert.equal(await mySlots.locator('img').count(),1);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(450);
  if(touch){await mySlots.nth(0).tap();await mySlots.nth(0).tap();}else await mySlots.nth(0).dblclick();
  await page.waitForTimeout(450);await activate(mySlots.nth(0));assert.ok(await row(1).isEnabled());
  await activate(popup.getByRole('button',{name:'Create team',exact:true}));
  // Multiple events in one JS turn exercise queued selection updates, not just disabled DOM.
  await popup.evaluate(el=>{const rows=el.querySelectorAll('.battle-picker-pokemon');for(const i of [0,1,2,3])rows[i].click();});
  assert.equal(await popup.getByRole('status').innerText(),'3/4 selected');
  assert.ok(await row(1).isDisabled());assert.equal(await row(1).getAttribute('aria-pressed'),'false');
  assert.deepEqual(await appearance(row(1)),disabledAppearance);
  assert.ok(await row(0).isEnabled(),'selected individual can still be deselected');
  await activate(row(0));assert.ok(await row(1).isEnabled());
  await activate(row(1));assert.ok(await row(0).isDisabled());
  await activate(popup.getByRole('button',{name:'Save',exact:true}));
  assert.deepEqual((await saved())[0],presets[0]);assert.deepEqual((await saved())[2],presets[2]);
  assert.deepEqual((await saved()).at(-1).ids,[mons[2].identity,mons[3].identity,mons[1].identity]);
  await page.keyboard.press('Escape');
  // Species can be shared across sides, but never twice within the opponent lineup.
  await activate(mySlots.nth(0));await activate(row(0));
  await activate(otherSlots.nth(0));const search=otherPopup.getByRole('searchbox');
  await search.fill('Bulbasaur');await activate(otherPopup.getByRole('button',{name:'Select Pokémon Bulbasaur',exact:true}));
  await activate(otherSlots.nth(1));await search.fill('Bulbasaur');
  const bulb=otherPopup.getByRole('button',{name:'Select Pokémon Bulbasaur',exact:true});
  assert.ok(await bulb.isDisabled());assert.deepEqual(await appearance(bulb),disabledAppearance);
  await bulb.evaluate(el=>el.click());assert.equal(await otherSlots.locator('img').count(),1);
  await search.fill('');const names=await otherPopup.locator('.battle-opponent-result span').allTextContents();
  assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b)));assert.ok(names.includes('Bulbasaur'));
  await page.keyboard.press('Escape');await page.waitForTimeout(450);
  if(touch){await otherSlots.nth(0).tap();await otherSlots.nth(0).tap();}else await otherSlots.nth(0).dblclick();
  await page.waitForTimeout(450);await activate(otherSlots.nth(1));await search.fill('Bulbasaur');assert.ok(await bulb.isEnabled());
  await page.keyboard.press('Escape');
  // Invalid old presets also stay accessible in Remove mode, for either format.
  await activate(mySlots.nth(1));await activate(popup.getByRole('button',{name:'Remove team',exact:true}));
  assert.ok(await popup.getByRole('button',{name:'Remove Team 1',exact:true}).isEnabled());
  assert.ok(await popup.getByRole('button',{name:'Remove Team 3',exact:true}).isEnabled());
  await page.keyboard.press('Escape');await activate(page.getByRole('button',{name:'Battle Rules',exact:true}));
  await page.getByRole('dialog',{name:'Battle Rules'}).getByLabel('Battle Type').selectOption('Doubles');await page.keyboard.press('Escape');
  await activate(mySlots.nth(3));assert.ok(await popup.getByRole('button',{name:'Load Team 3',exact:true}).isDisabled());
  await activate(popup.getByRole('button',{name:'Create team',exact:true}));
  for(const i of [0,2,3,4])await activate(row(i));
  assert.equal(await popup.getByRole('status').innerText(),'4/4 selected');assert.ok(await row(1).isDisabled());
  await activate(popup.getByRole('button',{name:'Save',exact:true}));assert.equal((await saved()).at(-1).ids.length,4);
  assert.deepEqual((await saved())[0],presets[0]);assert.deepEqual((await saved())[2],presets[2]);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.battle-matchup-title').innerText(),'Matchup');
  await context.close();console.log(`PASS ${width}px: species disabling/re-enabling, matching gray styling, independent sides, batched selection guards, Singles/Doubles saves, invalid preset preservation/removal access.`);
 }
 assert.deepEqual(errors,[]);
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
