import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium, webkit} from 'playwright';
import {createServer} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {calculateHiddenPower} from '../src/battle/hiddenPower.js';
import {speciesByName} from '../src/battle/reference.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';

const useWebKit=process.argv.includes('--webkit');
// Test-only observation of the real page/hook -> popup -> candidate -> core path.
const server=await createServer({server:{host:'127.0.0.1',port:useWebKit ? 5263 : 5262,strictPort:true,hmr:false},plugins:[{
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
const specs=[['Smeargle',0,[85,86,237,268]],['Manectric',1,[85,0,0,0]],['Blastoise',0,[85,0,0,0]]];
const storage=new Uint8Array(33744);
specs.forEach(([name,ability,moveIds],pid)=>storage.set(makePokemon({species:speciesByName.get(name.toLowerCase()).internalSpeciesId,pid,
 experience:125000,heldItemId:0,moveIds,ivWord:((0x3fffffff&~(1<<20))|(ability?0x80000000:0))>>>0}),4+pid*80));
const trainer=new Uint8Array(3884);trainer.set([187,188,255]);trainer[8]=1;
const encoded=Buffer.from(makeSave({blocks:{storage,saveBlock2:trainer}})).toString('base64');
const snapshot=loadStoredSave({getItem:()=>encoded});
const mons=identifyPokemon(snapshot.collection.records).map(toBattlePokemon).filter(Boolean);
assert.equal(mons.length,specs.length);
assert.deepEqual(mons.map(mon=>mon.ability),['Own Tempo','Lightning Rod','Torrent']);
assert.equal(calculateHiddenPower(mons[0].ivs).type,'Electric');
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





 await page.evaluate(records=>{window.__fieldTestRecords=records;},mons);
 await changeFormat('Doubles');
 const mine=[1,2].map(n=>page.getByRole('combobox',{name:`Select my Pokémon Slot ${n}`,exact:true}));
 const enemy=[1,2].map(n=>page.getByRole('combobox',{name:`Select opponent Pokémon Slot ${n}`,exact:true}));
 await mine[0].selectOption(mons[0].identity);await mine[1].selectOption(mons[1].identity);
 await page.getByRole('combobox',{name:'Select Trainer',exact:true}).selectOption('Expert (M):ALEXAS');
 await enemy[0].selectOption({label:'Aerodactyl'});await enemy[1].selectOption({label:'Rhydon'});
 const view=async(side,slot)=>{
  const button=page.locator(`[aria-label="${side==='player'?'My':'Opponent'} matchup Pokémon"] .battle-sprite-switch`);
  if(!(await button.getAttribute('aria-label')).includes(`Slot ${slot+1}`))await button.tap();
 };
 const close=async()=>{await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog'));};
 const open=async(name='Thunderbolt',side='My')=>{
  const before=await page.evaluate(()=>window.__evaluationCount??0);
  await page.getByRole('group',{name:`${side} matchup Pokémon`,exact:true}).getByRole('button',{name:`Move information: ${name}`,exact:true}).tap();
  await page.waitForFunction(count=>window.__evaluationCount>count,before);
 };
 await view('opponent',1);await page.getByRole('combobox',{name:'Opponent ability',exact:true}).selectOption('Lightning Rod');
 for(const player of [0,1])for(const opponent of [0,1]) {
  await view('player',player);await view('opponent',opponent);await open();
  assert.ok(await page.evaluate(()=>window.__battlefieldEvaluation.evaluations[0].abilityDamage.scenarios.every(s=>s.target.side==='enemy'&&s.target.slot===1&&s.target.name==='Rhydon'&&s.result.max===0)));
  assert.match(await page.locator('dialog').innerText(),opponent===0?/Lightning Rod redirects to Rhydon/:/Target: Rhydon/);
  await close();
 }
 await view('player',0);await view('opponent',0);await open('Thunder Wave');
 assert.match(await page.locator('dialog').innerText(),/Lightning Rod redirects to Rhydon/);
 assert.equal(await page.locator('dialog .battle-core-damage-percent,.battle-core-damage-ko').count(),0);await close();
 await open('Charge');assert.doesNotMatch(await page.locator('dialog').innerText(),/Lightning Rod redirects/);await close();
 await open('Hidden Power');
 assert.ok(await page.evaluate(()=>window.__battlefieldEvaluation.evaluations[0].abilityDamage.scenarios.every(s=>!s.target&&s.moveMetadata.type==='ELECTRIC'&&s.result.max>0)));
 await close();await view('opponent',1);await page.getByRole('combobox',{name:'Opponent ability',exact:true}).selectOption('');await view('opponent',0);
 await open();let text=await page.locator('dialog').innerText();
 assert.match(text,/Selected target: Aerodactyl/);assert.match(text,/Lightning Rod → Rhydon/);
 assert.match(text,/Target: Aerodactyl/);assert.match(text,/redirects to Rhydon/);
 const before=await page.evaluate(()=>window.__evaluationCount);
 const otherSet=await page.locator('[aria-label="Select opponent set Slot 2"]').evaluate(el=>[...el.options].find(o=>o.value!==el.value).value);
 await page.evaluate(setId=>window.__battlefieldHook.dispatch({type:'selectOpponentSet',slot:1,setId}),otherSet);
 await page.waitForFunction(count=>window.__evaluationCount>count,before);
 assert.ok(await page.evaluate(setId=>window.__battlefieldEvaluation.evaluations[0].abilityDamage.scenarios.filter(s=>s.target.status==='redirected').every(s=>s.target.pokemon.setId===setId),otherSet));
 for(const width of [320,390]) {
  await page.setViewportSize({width,height:844});
  assert.ok(await page.locator('dialog .battle-move-dialog').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&el.scrollWidth<=el.clientWidth+1;}));
  assert.equal(await page.evaluate(()=>visualViewport.scale),1);
 }
 await mkdir('artifacts/lightning-rod',{recursive:true});await page.screenshot({path:'artifacts/lightning-rod/uncertain.png'});
 await close();await view('opponent',1);await page.getByRole('combobox',{name:'Opponent ability',exact:true}).selectOption('Rock Head');await view('opponent',0);
 await open();assert.ok(await page.evaluate(()=>window.__battlefieldEvaluation.evaluations[0].abilityDamage.scenarios.every(s=>s.target.status==='selected'&&s.result.max>0)));await close();
 await view('opponent',1);await page.getByRole('combobox',{name:'Opponent ability',exact:true}).selectOption('Lightning Rod');
 await page.getByLabel('Opponent current HP',{exact:true}).fill('0');await view('opponent',0);await open();
 assert.match(await page.locator('dialog').innerText(),/slot is fainted; redirected damage is unavailable/);
 assert.equal(await page.locator('dialog .battle-core-damage-hp,.battle-core-damage-percent,.battle-core-damage-ko').count(),0);await close();
 await enemy[1].selectOption('');await open();assert.match(await page.locator('dialog').innerText(),/Target: Aerodactyl/);
 assert.doesNotMatch(await page.locator('dialog').innerText(),/Lightning Rod targeting is uncertain/);await close();
 // Reverse direction: a saved Electric Lightning Rod holder takes ordinary
 // resisted damage. No modern immunity or Special Attack activation is added.
 await enemy[0].selectOption({label:'Regice'});await enemy[1].selectOption({label:'Aggron'});
 await page.getByRole('combobox',{name:'Select opponent set Slot 1',exact:true}).selectOption('Regice 1');
 await view('opponent',0);await view('player',0);await open('Thunderbolt','Opponent');
 assert.match(await page.locator('dialog').innerText(),/redirects to Manectric .*Player Slot 2/);
 assert.ok(await page.evaluate(()=>window.__battlefieldEvaluation.evaluations[0].abilityDamage.scenarios.every(s=>s.target.pokemon.identity===window.__fieldTestRecords[1].identity&&s.result.max>0)));
 await close();
 assert.deepEqual(errors,[]);
 console.log('PASS Battle page/popup Lightning Rod: four viewed pairs, status/Hidden Power exclusions, unknown ability rows, unviewed Sets, fainted/empty guards, reverse actual-target damage and mobile layout.');
 await context.close();
} finally {await browser.close();await server.close();}
