import assert from 'node:assert/strict';
import {pairMaxima} from './fixtures/doublesNumericalCases.js';
import {mkdir} from 'node:fs/promises';
import {chromium, webkit} from 'playwright';
import {createServer} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {expForLevel} from '../src/save/stats.js';
import {speciesByName} from '../src/battle/reference.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';

const useWebKit=process.argv.includes('--webkit');
// Test-only observation of the real page/hook -> popup -> candidate -> core path.
const server=await createServer({server:{host:'127.0.0.1',port:useWebKit ? 5283 : 5282,strictPort:true,hmr:false},plugins:[{
 name:'observe-battlefield-pipeline',transform(code,id) {
  if(id.endsWith('/src/ui/useBattleState.js'))return ("import {numericalPlayerData} from '/test/fixtures/doublesNumericalCases.js';\nimport {battleMove as fixtureMove} from '/src/battle/reference.js';\nconst fixtureRecords=numericalPlayerData.map(mon=>({...mon,moves:['Surf','Rock Slide','Earthquake'].map(fixtureMove)}));\n"+code).replace('return {state, dispatch, records, roleError, frontierPool};',
   'window.__battlefieldHook={state,dispatch}; return {state, dispatch, records:fixtureRecords, roleError, frontierPool:fixtureRecords};');
  if(id.endsWith('/src/battle/frontierCandidateDamage.js'))return code.replace(
   'return {construction,direction,move,condition,hitCount,weather,critical,battleContext,evaluations};',
   'const evaluation={construction,direction,move,condition,hitCount,weather,critical,battleContext,evaluations}; window.__battlefieldEvaluation=evaluation; window.__evaluationCount=(window.__evaluationCount??0)+1; return evaluation;');
  if(id.endsWith('/src/battle/coreDamage.js'))return code.replace(
   "export function calculateCoreDamage(move,attacker,defender,weather='none',critical=false,battleContext={}) {",
   "export function calculateCoreDamage(move,attacker,defender,weather='none',critical=false,battleContext={}) { if(battleContext.battlefield)window.__coreBattlefield=battleContext.battlefield;");
 }
}]});
await server.listen();

const browser=useWebKit ? await webkit.launch({headless:true}) : await chromium.launch({headless:true,channel:'chrome'});
const specs=[['Swellow',0],['Swampert',0],['Manectric',1],['Gardevoir',1]];
const storage=new Uint8Array(33744);
specs.forEach(([name,ability],pid)=>{
 const species=speciesByName.get(name.toLowerCase());
 storage.set(makePokemon({species:species.internalSpeciesId,pid,experience:expForLevel(50,species.growthRate),heldItemId:0,
  ivWord:(0x3fffffff|(ability?0x80000000:0))>>>0}),4+pid*80);
});
const trainer=new Uint8Array(3884);trainer.set([187,188,255]);trainer[8]=1;
const encoded=Buffer.from(makeSave({blocks:{storage,saveBlock2:trainer}})).toString('base64');
const snapshot=loadStoredSave({getItem:()=>encoded});
const mons=identifyPokemon(snapshot.collection.records).map(toBattlePokemon).filter(Boolean);
assert.equal(mons.length,specs.length);
assert.deepEqual(mons.map(mon=>mon.ability),['Guts','Torrent','Lightning Rod','Trace']);
assert.ok(mons.every(mon=>mon.level===50));
const roles=Object.fromEntries(mons.map(mon=>[mon.identity,'Frontier']));
try {
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
 await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
 await page.evaluate(({encoded,roles})=>{
  localStorage.setItem('emerald-companion-2.save.v1',encoded);
  localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify(roles));
 },{encoded,roles});
 await page.reload();
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();
 await page.getByRole('button',{name:'Battle',exact:true}).click();

 const changeFormat=async format=>{
  await page.getByRole('button',{name:'Battle Rules',exact:true}).click();
  await page.getByRole('dialog',{name:'Battle Rules',exact:true}).getByLabel('Battle Type').selectOption(format);
  await page.keyboard.press('Escape');
 };






 await changeFormat('Doubles');
 const mine=[1,2].map(n=>page.getByRole('combobox',{name:`Select my Pokémon Slot ${n}`,exact:true}));
 const enemy=[1,2].map(n=>page.getByRole('combobox',{name:`Select opponent Pokémon Slot ${n}`,exact:true}));
 await mine[0].selectOption('swampert');await mine[1].selectOption('snorlax');
 await page.getByRole('combobox',{name:'Select Trainer',exact:true}).selectOption('Expert (M):ALEXAS');
 await enemy[0].selectOption({label:'Aggron'});await enemy[1].selectOption({label:'Aerodactyl'});
 await page.getByRole('combobox',{name:'Select opponent set Slot 1',exact:true}).selectOption('Aggron 3');
 await page.getByRole('combobox',{name:'Select opponent set Slot 2',exact:true}).selectOption('Aerodactyl 4');
 let player=0,opponent=0,count=0;
 for(const pair of pairMaxima){
  if(player!==pair.player){await page.locator('[aria-label="My matchup Pokémon"] .battle-sprite-switch').tap();player=pair.player;}
  if(opponent!==pair.opponent){await page.locator('[aria-label="Opponent matchup Pokémon"] .battle-sprite-switch').tap();opponent=pair.opponent;}
  for(const direction of ['player','enemy'])for(const [move,max] of Object.entries(direction==='player'?pair.attacks:pair.incoming)){
   const group=direction==='player'?'My matchup Pokémon':'Opponent matchup Pokémon';
   const before=await page.evaluate(()=>window.__evaluationCount??0);
   await page.getByRole('group',{name:group,exact:true}).getByRole('button',{name:`Move information: ${move}`,exact:true}).tap();
   await page.waitForFunction(before=>window.__evaluationCount>before,before);
   const actual=await page.evaluate(()=>window.__battlefieldEvaluation.evaluations.map(e=>({id:e.setId,rolls:e.abilityDamage.scenarios.map(s=>s.result.rolls)})));
   assert.equal(actual.length,1);assert.equal(actual[0].id,pair.opponent?'Aerodactyl 4':'Aggron 3');
   for(const rolls of actual[0].rolls)assert.deepEqual(rolls,Array.from({length:16},(_,i)=>Math.floor(max*(85+i)/100)),`${group} ${move}`);
   assert.doesNotMatch(await page.locator('dialog').innerText(),/Damage unavailable/);
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog'));count++;
  }
 }
 assert.equal(count,24);
 // Return to Swampert/Aggron and exercise real side-screen, critical and HP inputs.
 await page.locator('[aria-label="My matchup Pokémon"] .battle-sprite-switch').tap();
 await page.locator('[aria-label="Opponent matchup Pokémon"] .battle-sprite-switch').tap();
 const surf=async max=>{
  const before=await page.evaluate(()=>window.__evaluationCount);
  await page.getByRole('group',{name:'My matchup Pokémon',exact:true}).getByRole('button',{name:'Move information: Surf',exact:true}).tap();
  await page.waitForFunction(before=>window.__evaluationCount>before,before);
  const values=await page.evaluate(()=>window.__battlefieldEvaluation.evaluations[0].abilityDamage.scenarios.map(s=>s.result.rolls));
  for(const rolls of values)assert.deepEqual(rolls,Array.from({length:16},(_,i)=>Math.floor(max*(85+i)/100)));
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog'));
 };
 await page.getByLabel('Opponent Light Screen',{exact:true}).check();await surf(62);
 await page.getByLabel('Critical Hit',{exact:true}).check();await surf(180);
 await page.getByLabel('Critical Hit',{exact:true}).uncheck();
 await page.locator('[aria-label="Opponent matchup Pokémon"] .battle-sprite-switch').tap();
 await page.getByLabel('Opponent current HP',{exact:true}).fill('0');
 await page.locator('[aria-label="Opponent matchup Pokémon"] .battle-sprite-switch').tap();await surf(90);
 await page.getByLabel('Opponent Light Screen',{exact:true}).uncheck();await surf(176);
 await enemy[1].selectOption('');await surf(176);
 await enemy[1].selectOption({label:'Aerodactyl'});
 await page.getByRole('combobox',{name:'Select opponent set Slot 2',exact:true}).selectOption('Aerodactyl 4');
 await page.getByLabel('Add observed move',{exact:true}).selectOption('Surf');await surf(90);
 // A native modal blocks background selectors: dispatch through the actual hook
 // while open to verify dependency invalidation without adding product controls.
 await page.getByRole('group',{name:'My matchup Pokémon',exact:true}).getByRole('button',{name:'Move information: Surf',exact:true}).tap();
 const before=await page.evaluate(()=>window.__evaluationCount);
 await page.evaluate(()=>window.__battlefieldHook.dispatch({type:'selectOpponentSet',slot:1,setId:'Aerodactyl 3'}));
 await page.waitForFunction(before=>window.__evaluationCount>before,before);
 assert.equal(await page.evaluate(()=>window.__battlefieldEvaluation.battleContext.battlefield.enemy[1].selectedSetId),'Aerodactyl 3');
 assert.equal(await page.evaluate(()=>window.__battlefieldHook.state.opponentObservations[0].moves[0]),'Surf');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog'));

 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 console.log(`PASS: ${count} numerical Battle popup cases, all four pairings, both directions (${useWebKit?'mobile WebKit':'Chromium'})`);
 await context.close();
}finally{await browser.close();await server.close();}
