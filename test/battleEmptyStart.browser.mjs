import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
const useWebKit=process.argv.includes('--webkit');
const server=await preview({preview:{host:'127.0.0.1',port:useWebKit?5213:5212,strictPort:true}});
const browser=await (useWebKit?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
const storage=new Uint8Array(33744);
[1,4,7,25].forEach((species,pid)=>storage.set(makePokemon({species,pid,experience:560}),4+pid*80));
const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
const mons=identifyPokemon(loadStoredSave({getItem:()=>encoded}).collection.records).map(toBattlePokemon).filter(Boolean);
const roles=Object.fromEntries(mons.map(mon=>[mon.identity,'Frontier']));
const teams=[{id:'saved',name:'Team 1',ids:mons.map(mon=>mon.identity)}];
const oldGold=battleReducer(createBattleState(),{type:'opponentTrainer',key:'Anabel Gold'}).opponentSpecies;
const rules={facility:'Tower',format:'Doubles',levelMode:'open',openLevel:85};
const errors=[];
try {
 for(const width of [320,375,390,430,1440]) {
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500,serviceWorkers:'block'});
  // Seed before any application code executes, modeling an existing installation.
  await context.addInitScript(({encoded,roles,teams,oldGold,rules})=>{
   if(localStorage.getItem('test-seeded'))return;
   localStorage.setItem('test-seeded','true');
   localStorage.setItem('emerald-companion-2.save.v1',encoded);
   localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify(roles));
   localStorage.setItem('emerald-companion-2.battle-teams.v1',JSON.stringify(teams));
   localStorage.setItem('emerald-companion-2.opponent-species.v1',JSON.stringify(oldGold));
   localStorage.setItem('emerald-companion-2.battle-rules.v1',JSON.stringify(rules));
  },{encoded,roles,teams,oldGold,rules});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();};
  const player=page.getByRole('region',{name:'My Team',exact:true});
  const opponent=page.getByRole('region',{name:'Opponent Team',exact:true});
  const mySlots=player.locator('.battle-compact-slot'), otherSlots=opponent.locator('.battle-compact-slot');
  const empty=async()=>{
   assert.equal(await mySlots.count(),4);assert.equal(await otherSlots.count(),4);
   assert.equal(await mySlots.locator('img').count(),0);assert.equal(await otherSlots.locator('img').count(),0);
   assert.equal(await opponent.locator('.battle-opponent-name').innerText(),'Opponent');
   assert.equal(await opponent.locator('.battle-compact-trainer').count(),0);
   assert.equal(await page.locator('.battle-matchup-title').innerText(),'Matchup');
   const stored=await page.evaluate(()=>({teams:JSON.parse(localStorage.getItem('emerald-companion-2.battle-teams.v1')),rules:JSON.parse(localStorage.getItem('emerald-companion-2.battle-rules.v1'))}));
   assert.deepEqual(stored,{teams,rules});
  };
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);await navigate('Battle');await empty();
  await navigate('Home');await navigate('Battle');await empty();
  await mySlots.nth(0).click();await page.getByRole('button',{name:'Load Team 1',exact:true}).click();
  await mySlots.locator('img').nth(3).waitFor();
  await opponent.locator('.battle-opponent-trigger').click();
  const trainerPopup=page.getByRole('dialog',{name:'Select opponent trainer'});
  await trainerPopup.getByRole('searchbox').fill('BRADY');
  await trainerPopup.getByRole('button',{name:'Select trainer BRADY',exact:true}).click();
  await otherSlots.nth(0).click();
  await page.getByRole('dialog',{name:'Select opponent Pokémon'}).locator('.battle-opponent-result').first().click();
  await otherSlots.locator('img').waitFor();
  await navigate('Home');await navigate('Battle');
  assert.equal(await mySlots.locator('img').count(),4);assert.equal(await otherSlots.locator('img').count(),1);
  assert.equal(await opponent.locator('.battle-opponent-name').innerText(),'BRADY');
  await page.reload();await navigate('Battle');await empty();
  // Individual picks are still manual and also reset on the next app load.
  await mySlots.nth(1).click();
  await page.locator(`[data-pokemon-id="${mons[0].identity}"]`).click();
  await otherSlots.nth(2).click();
  const speciesPopup=page.getByRole('dialog',{name:'Select opponent Pokémon'});
  await speciesPopup.getByRole('searchbox').fill('Pikachu');
  await speciesPopup.getByRole('button',{name:'Select Pokémon Pikachu',exact:true}).click();
  await mySlots.locator('img').waitFor();await otherSlots.locator('img').waitFor();
  await navigate('Home');await navigate('Battle');
  assert.equal(await mySlots.locator('img').count(),1);assert.equal(await otherSlots.locator('img').count(),1);
  await page.reload();await navigate('Battle');await empty();
  await context.close();console.log(`PASS ${width}px: ignores legacy Gold storage, blank startup/reload, no navigation autofill, manual selections remain functional, presets and rules retained.`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
