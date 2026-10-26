import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium, webkit} from 'playwright';
import {createServer} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';

const useWebKit=process.argv.includes('--webkit');
// Test-only observation of the real page/hook -> popup -> candidate -> core path.
const server=await createServer({server:{host:'127.0.0.1',port:useWebKit ? 5243 : 5242,strictPort:true,hmr:false},plugins:[{
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
const species=[1,1,4,25,7,16,19,21,23,27,29,32,35,37,39,41,43,46,48,50,133];
const storage=new Uint8Array(33744);
species.forEach((species,pid)=>storage.set(makePokemon({species,pid,experience:pid<2 ? 117360 : pid===2 ? 272535 : 560}),4+pid*80));
const trainer=new Uint8Array(3884);trainer.set([187,188,255]);trainer[8]=1;
const encoded=Buffer.from(makeSave({blocks:{storage,saveBlock2:trainer}})).toString('base64');
const snapshot=loadStoredSave({getItem:()=>encoded});
const mons=identifyPokemon(snapshot.collection.records).map(toBattlePokemon).filter(Boolean);
assert.equal(mons.length,species.length);
assert.deepEqual(mons.slice(0,3).map(mon=>mon.level),[50,50,65]);
const roles=Object.fromEntries(mons.slice(0,-1).map(mon=>[mon.identity,'Frontier']));
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
 await mine[0].selectOption(mons[0].identity);await mine[1].selectOption(mons[2].identity);
 await page.getByRole('combobox',{name:'Select Trainer',exact:true}).selectOption('Expert (M):ALEXAS');
 await enemy[0].selectOption({label:'Aerodactyl'});await enemy[1].selectOption({label:'Aggron'});
 await page.getByRole('combobox',{name:'Select opponent set Slot 1',exact:true}).selectOption('Aerodactyl 4');
 await page.getByRole('combobox',{name:'Select opponent set Slot 2',exact:true}).selectOption('Aggron 2');
 const view=async(side,slot)=>{
  const button=page.locator(`[aria-label="${side==='player'?'My':'Opponent'} matchup Pokémon"] .battle-sprite-switch`);
  if(!(await button.getAttribute('aria-label')).includes(`Slot ${slot+1}`))await button.tap();
 };
 const close=async()=>{await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog'));};
 const open=async(side='My')=>{
  const before=await page.evaluate(()=>window.__evaluationCount??0);
  await page.getByRole('group',{name:`${side} matchup Pokémon`,exact:true}).getByRole('button',{name:/Move information:/}).first().tap();
  await page.waitForFunction(before=>(window.__evaluationCount??0)>before,before);
 };
 for(const player of [0,1])for(const opponent of [0,1]) {
  await view('player',player);await view('opponent',opponent);await open();
  const data=await page.evaluate(()=>{
   const e=window.__battlefieldEvaluation,f=e.battleContext.battlefield;
   return {players:f.player.map(s=>s.pokemon.identity),sets:f.enemy.map(s=>s.pokemon.setId),viewed:f.viewed,
    attacking:f.attacking,defending:f.defending,coreViewed:window.__coreBattlefield.viewed,
    pair:[e.evaluations[0].attacker.identity,e.evaluations[0].opponent.setId]};
  });
  assert.deepEqual(data.players,[mons[0].identity,mons[2].identity]);
  assert.deepEqual(data.sets,['Aerodactyl 4','Aggron 2']);assert.deepEqual(data.viewed,{player,opponent});
  assert.deepEqual(data.coreViewed,data.viewed);assert.deepEqual(data.attacking,{side:'player',slot:player});
  assert.deepEqual(data.defending,{side:'enemy',slot:opponent});
  assert.deepEqual(data.pair,[[mons[0].identity,mons[2].identity][player],['Aerodactyl 4','Aggron 2'][opponent]]);
  await close();
 }
 await view('player',0);await view('opponent',0);await open();
 const before=await page.evaluate(()=>({count:window.__evaluationCount,viewed:window.__battlefieldEvaluation.battleContext.battlefield.viewed}));
 const damageBefore=await page.locator('dialog .battle-basic-damage').innerText();
 // The native modal blocks background UI. Test-only dispatch goes through the
 // actual hook/reducer and checks memo invalidation while the popup stays open.
 await page.evaluate(()=>window.__battlefieldHook.dispatch({type:'selectOpponentSet',slot:1,setId:'Aggron 4'}));
 await page.waitForFunction(count=>window.__evaluationCount>count&&window.__battlefieldEvaluation.battleContext.battlefield.enemy[1].selectedSetId==='Aggron 4',before.count);
 assert.deepEqual(await page.evaluate(()=>window.__battlefieldEvaluation.battleContext.battlefield.viewed),before.viewed);
 assert.equal(await page.evaluate(()=>window.__coreBattlefield.enemy[1].pokemon.setId),'Aggron 4');
 assert.equal(await page.locator('dialog .battle-basic-damage').innerText(),damageBefore);
 for(const width of [320,390]) {
  await page.setViewportSize({width,height:844});
  assert.ok(await page.locator('dialog .battle-move-dialog').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;}));
  assert.equal(await page.evaluate(()=>visualViewport.scale),1);
 }
 await mkdir('artifacts/battlefield-context',{recursive:true});
 await page.screenshot({path:'artifacts/battlefield-context/popup.png'});
 await close();
 await view('opponent',1);await page.getByLabel('Opponent current HP',{exact:true}).fill('0');
 await view('opponent',0);await open();
 assert.deepEqual(await page.evaluate(()=>{
  const e=window.__battlefieldEvaluation;return [e.battleContext.defenderSideAlive,e.battleContext.battlefield.enemy[1].liveness,e.battleContext.battlefield.enemy[1].pokemon.currentHp];
 }),[1,'fainted',0]);
 await close();
 await open('Opponent');
 assert.equal(await page.evaluate(()=>window.__battlefieldEvaluation.battleContext.battlefield.attacking.side),'enemy');
 await close();assert.deepEqual(errors,[]);
 console.log('PASS actual Battle page -> popup -> candidates -> core: four pairings, independent sets, hidden-set memo invalidation, fainted teammate and mobile layout.');
 await context.close();
} finally {await browser.close();await server.close();}
