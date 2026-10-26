import assert from 'node:assert/strict';
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
const server=await createServer({server:{host:'127.0.0.1',port:useWebKit ? 5273 : 5272,strictPort:true,hmr:false},plugins:[{
 name:'observe-battlefield-pipeline',transform(code,id) {
  if(id.endsWith('/src/ui/useBattleState.js'))return code.replace('return {state, dispatch, records, roleError, frontierPool};',
   'window.__battlefieldHook={state,dispatch}; return {state, dispatch, records, roleError, frontierPool};');
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
 await mine[0].selectOption(mons[0].identity);
 await page.getByRole('combobox',{name:'Select Trainer',exact:true}).selectOption('Expert (M):ALEXAS');
 await enemy[0].selectOption({label:'Aggron'});
 const set=page.getByRole('combobox',{name:'Select opponent set Slot 1',exact:true});
 await set.selectOption('Aggron 3');
 const close=async()=>{await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog'));};
 const open=async()=>{
  const before=await page.evaluate(()=>window.__evaluationCount??0);
  await page.getByRole('group',{name:'Opponent matchup Pokémon',exact:true}).getByRole('button',{name:'Move information: Thunder',exact:true}).tap();
  await page.waitForFunction(count=>window.__evaluationCount>count,before);
 };
 const checkSwellow=async()=>{
  const text=await page.locator('dialog').innerText();
  assert.doesNotMatch(text,/Lightning Rod targeting is uncertain|Damage unavailable/);assert.match(text,/Target: Swellow/);
  return page.evaluate(()=>window.__battlefieldEvaluation.evaluations[0].abilityDamage.scenarios.map(s=>{
   if(s.target.name!=='Swellow'||s.availability!=='available'||s.result.max<=0)throw Error('Expected ordinary Thunder against Swellow');
   return s.result.rolls;
  }));
 };
 await open();const original=await checkSwellow();
 assert.ok(await page.evaluate(()=>{
  const f=window.__battlefieldEvaluation.battleContext.battlefield;return f.player[1]===null&&f.enemy[1]===null;
 }));
 await close();await mine[1].selectOption(mons[1].identity);await open();assert.deepEqual(await checkSwellow(),original);await close();
 // View switching follows the selected defender; Swampert's immunity is typing.
 await page.locator('[aria-label="My matchup Pokémon"] .battle-sprite-switch').tap();await open();
 assert.ok(await page.evaluate(()=>window.__battlefieldEvaluation.evaluations[0].abilityDamage.scenarios.every(s=>s.target.name==='Swampert'&&s.result.max===0)));
 await close();await page.locator('[aria-label="My matchup Pokémon"] .battle-sprite-switch').tap();
 await mine[1].selectOption('');await enemy[1].selectOption({label:'Aerodactyl'});
 await open();assert.deepEqual(await checkSwellow(),original);
 const before=await page.evaluate(()=>window.__evaluationCount);
 const otherSet=await page.locator('[aria-label="Select opponent set Slot 2"]').evaluate(el=>[...el.options].find(o=>o.value!==el.value).value);
 await page.evaluate(setId=>window.__battlefieldHook.dispatch({type:'selectOpponentSet',slot:1,setId}),otherSet);
 await page.waitForFunction(count=>window.__evaluationCount>count,before);assert.deepEqual(await checkSwellow(),original);await close();
 await enemy[1].selectOption('');await mine[1].selectOption(mons[2].identity);await open();
 assert.match(await page.locator('dialog').innerText(),/Lightning Rod redirects to Manectric/);
 assert.ok(await page.evaluate(()=>window.__battlefieldEvaluation.evaluations[0].abilityDamage.scenarios.every(s=>s.target.name==='Manectric'&&s.result.max>0)));await close();
 await mine[1].selectOption(mons[3].identity);await open();assert.match(await page.locator('dialog').innerText(),/Lightning Rod targeting is uncertain/);await close();
 // HP zero is a populated/fainted record, not an empty slot.
 await mine[1].selectOption(mons[2].identity);await page.locator('[aria-label="My matchup Pokémon"] .battle-sprite-switch').tap();
 await page.getByLabel('Player current HP',{exact:true}).fill('0');await page.locator('[aria-label="My matchup Pokémon"] .battle-sprite-switch').tap();
 await open();assert.match(await page.locator('dialog').innerText(),/slot is fainted/);await close();
 await mine[1].selectOption('');await open();assert.deepEqual(await checkSwellow(),original);await close();
 await mine[1].selectOption(mons[1].identity);await page.locator('[aria-label="My matchup Pokémon"] .battle-sprite-switch').tap();
 await page.getByLabel('Player current HP',{exact:true}).fill('0');await page.locator('[aria-label="My matchup Pokémon"] .battle-sprite-switch').tap();
 await open();assert.deepEqual(await checkSwellow(),original);await close();await mine[1].selectOption('');
 await set.selectOption('Aggron 4');await set.selectOption('Aggron 3');await open();assert.deepEqual(await checkSwellow(),original);
 for(const width of [320,390]) {
  await page.setViewportSize({width,height:844});
  assert.ok(await page.locator('dialog .battle-move-dialog').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;}));
 }
 await mkdir('artifacts/lightning-rod-empty-slot',{recursive:true});await page.screenshot({path:'artifacts/lightning-rod-empty-slot/thunder.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS exact Swellow/Aggron Set 3 Thunder popup: empty permutations, known/unknown holders, fainted versus removed slots, view/Set switching and mobile layout.');
 await context.close();
} finally {await browser.close();await server.close();}
