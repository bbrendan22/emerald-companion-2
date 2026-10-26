import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium, webkit} from 'playwright';
import {createServer} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {speciesByName} from '../src/battle/reference.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';

const useWebKit=process.argv.includes('--webkit');
// Test-only observation of the real page/hook -> popup -> candidate -> core path.
const server=await createServer({server:{host:'127.0.0.1',port:useWebKit ? 5253 : 5252,strictPort:true,hmr:false},plugins:[{
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
const specs=[['Smeargle',0,[57,153,311,85]],['Golduck',1,[57,0,0,0]],['Golduck',0,[57,0,0,0]],['Plusle',0,[85,0,0,0]],['Minun',0,[85,0,0,0]],['Rayquaza',0,[85,0,0,0]]];
const storage=new Uint8Array(33744);
specs.forEach(([name,ability,moveIds],pid)=>storage.set(makePokemon({species:speciesByName.get(name.toLowerCase()).internalSpeciesId,pid,
 experience:125000,heldItemId:0,moveIds,ivWord:(0x3fffffff|(ability?0x80000000:0))>>>0}),4+pid*80));
const trainer=new Uint8Array(3884);trainer.set([187,188,255]);trainer[8]=1;
const encoded=Buffer.from(makeSave({blocks:{storage,saveBlock2:trainer}})).toString('base64');
const snapshot=loadStoredSave({getItem:()=>encoded});
const mons=identifyPokemon(snapshot.collection.records).map(toBattlePokemon).filter(Boolean);
assert.equal(mons.length,specs.length);
assert.deepEqual(mons.map(mon=>mon.ability),['Own Tempo','Cloud Nine','Damp','Plus','Minus','Air Lock']);
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
 const player=page.getByRole('group',{name:'My matchup Pokémon',exact:true});
 await mine[0].selectOption(mons[0].identity);await mine[1].selectOption(mons[1].identity);
 await page.getByRole('combobox',{name:'Select Trainer',exact:true}).selectOption('Expert (M):ALEXAS');
 await enemy[0].selectOption({label:'Aerodactyl'});await enemy[1].selectOption({label:'Aggron'});
 const view=async(side,slot)=>{
  const button=page.locator(`[aria-label="${side==='player'?'My':'Opponent'} matchup Pokémon"] .battle-sprite-switch`);
  if(!(await button.getAttribute('aria-label')).includes(`Slot ${slot+1}`))await button.tap();
 };
 await view('player',0);await view('opponent',0);
 await page.getByLabel('Battle weather',{exact:true}).selectOption('rain');
 const close=async()=>{await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog'));};
 const open=async name=>{
  const before=await page.evaluate(()=>window.__evaluationCount??0);
  await player.getByRole('button',{name:`Move information: ${name}`,exact:true}).tap();
  await page.waitForFunction(count=>window.__evaluationCount>count,before);
 };
 const maxima=()=>page.evaluate(()=>window.__battlefieldEvaluation.evaluations[0].abilityDamage.scenarios.map(s=>s.result?.max));
 const changePartner=async index=>{
  const before=await page.evaluate(()=>window.__evaluationCount);
  await page.evaluate(identity=>window.__battlefieldHook.dispatch({type:'selectDoublesPlayer',slot:1,identity,pool:window.__fieldTestRecords}),mons[index].identity);
  await page.waitForFunction(count=>window.__evaluationCount>count,before);
 };
 // Records are obtained from the actual imported save, not a replacement engine model.
 await page.evaluate(mons=>{window.__fieldTestRecords=mons;},mons);
 await open('Surf');const suppressed=await maxima();
 await changePartner(4);const wet=await maxima();assert.ok(wet[0]>suppressed[0]);
 assert.equal(await page.evaluate(()=>window.__battlefieldHook.state.field.weather),'rain');
 await changePartner(5);assert.deepEqual(await maxima(),suppressed);
 await close();await open('Weather Ball');
 assert.ok(await page.evaluate(()=>window.__battlefieldEvaluation.evaluations[0].abilityDamage.scenarios.every(s=>s.moveMetadata.type==='NORMAL'&&s.moveMetadata.power===50)));
 await close();
 await mine[1].selectOption(mons[2].identity);await view('player',0);await open('Explosion');
 assert.ok(await page.evaluate(()=>window.__battlefieldEvaluation.evaluations[0].abilityDamage.scenarios.every(s=>s.result.outcome==='blocked'&&s.result.reason==='damp')));
 assert.match(await page.locator('dialog').innerText(),/Prevented by Damp/);
 await close();await view('player',1);await page.getByLabel('Player current HP',{exact:true}).fill('0');await view('player',0);
 await open('Explosion');assert.match(await page.locator('dialog').innerText(),/Prevented by Damp/);
 await changePartner(4);assert.ok((await maxima())[0]>0);assert.doesNotMatch(await page.locator('dialog').innerText(),/Prevented by Damp/);
 await close();
 await mine[0].selectOption(mons[3].identity);await view('player',0);
 const boosted=Math.floor(mons[3].stats.spAttack*3/2);
 await page.waitForFunction(value=>document.querySelector('[aria-label="My matchup Pokémon"] [data-stat="spAttack"] dd')?.dataset.value===String(value),boosted);
 await open('Thunderbolt');const plus=await maxima();
 await changePartner(1);const ordinary=await maxima();assert.ok(plus[0]>ordinary[0]);await close();
 assert.equal(await player.locator('[data-stat="spAttack"] dd').getAttribute('data-value'),String(mons[3].stats.spAttack));
 // A canonical opponent Set still leaves legitimate Golduck ability uncertainty.
 await page.getByRole('combobox',{name:'Select Trainer',exact:true}).selectOption('Cooltrainer (M):KAYDEN');
 await enemy[0].selectOption({label:'Aerodactyl'});await enemy[1].selectOption({label:'Golduck'});
 await mine[0].selectOption(mons[0].identity);await mine[1].selectOption(mons[4].identity);await view('player',0);await view('opponent',0);
 await open('Explosion');const text=await page.locator('dialog').innerText();
 assert.match(text,/Golduck: Damp/);assert.match(text,/Golduck: Cloud Nine/);assert.match(text,/Prevented by Damp/);
 assert.equal(await page.locator('[aria-label="Opponent set Slot 2"]').count(),1,'this trainer has one canonical Golduck set');
 assert.equal(await page.evaluate(()=>window.__battlefieldEvaluation.battleContext.battlefield.enemy[1].pokemon.abilityOptions.status),'uncertain');
 await close();await view('opponent',1);
 await page.getByRole('combobox',{name:'Opponent ability',exact:true}).selectOption('Cloud Nine');await view('opponent',0);
 await open('Explosion');assert.doesNotMatch(await page.locator('dialog').innerText(),/Prevented by Damp/);assert.ok((await maxima())[0]>0);
 await close();
 await page.getByRole('combobox',{name:'Select Trainer',exact:true}).selectOption('Expert (M):ALEXAS');
 await enemy[0].selectOption({label:'Aerodactyl'});await enemy[1].selectOption({label:'Aggron'});
 await mine[1].selectOption(mons[1].identity);await view('player',0);await view('opponent',0);await open('Surf');
 const before=await page.evaluate(()=>window.__evaluationCount);
 const otherSet=await page.locator('[aria-label="Select opponent set Slot 2"]').evaluate(el=>[...el.options].find(option=>option.value!==el.value).value);
 const damageBefore=await maxima();
 await page.evaluate(setId=>window.__battlefieldHook.dispatch({type:'selectOpponentSet',slot:1,setId}),otherSet);
 await page.waitForFunction(count=>window.__evaluationCount>count,before);
 assert.equal(await page.evaluate(()=>window.__battlefieldEvaluation.battleContext.battlefield.enemy[1].pokemon.setId),otherSet);
 assert.equal(await page.evaluate(()=>window.__battlefieldEvaluation.battleContext.battlefield.enemy[1].pokemon.abilityOptions.status),'uncertain');
 assert.deepEqual(await maxima(),damageBefore);
 for(const width of [320,390]) {
  await page.setViewportSize({width,height:844});
  assert.ok(await page.locator('dialog .battle-move-dialog').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;}));
  assert.equal(await page.evaluate(()=>visualViewport.scale),1);
 }
 await mkdir('artifacts/doubles-field-abilities',{recursive:true});await page.screenshot({path:'artifacts/doubles-field-abilities/popup.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS actual Battle page/popup: hidden weather suppression, Air Lock, Damp/fainted Damp, Plus/Minus stat/damage updates, unknown opponent branches, canonical Set refresh and observed ability refinement.');
 await context.close();
} finally {await browser.close();await server.close();}
