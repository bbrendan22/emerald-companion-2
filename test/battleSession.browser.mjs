import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
import {createBattleState} from '../src/battle/battleState.js';

// Observe the real App-owned hook in this test server only, including state
// that has no visible controls while the encounter is empty.
const server=await createServer({base:'/',server:{host:'127.0.0.1',port:0,hmr:false},plugins:[{
 name:'battle-session-state-probe',enforce:'pre',transform(code,id){
  if(!id.endsWith('/src/ui/useBattleState.js'))return;
  const anchor='  return {state, dispatch, records, roleError, frontierPool};';
  assert.ok(code.includes(anchor));
  return code.replace(anchor,'  globalThis.battleSessionProbe=state;\n'+anchor);
 }
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const page=await context.newPage();page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const storage=new Uint8Array(33744);
 [1,4,7].forEach((species,pid)=>storage.set(makePokemon({species,pid,experience:117360}),4+pid*80));
 const trainer=new Uint8Array(3884);trainer.set([187,188,255]);trainer[8]=1;
 const encoded=Buffer.from(makeSave({blocks:{storage,saveBlock2:trainer}})).toString('base64');
 const snapshot=loadStoredSave({getItem:()=>encoded});
 const mons=identifyPokemon(snapshot.collection.records).map(toBattlePokemon).filter(Boolean);
 const permanent={
  'emerald-companion-2.save.v1':encoded,
  'emerald-companion-2.roles.v1':JSON.stringify(Object.fromEntries(mons.map(mon=>[mon.identity,'Frontier']))),
  'emerald-companion-2.battle-teams.v1':JSON.stringify([{id:'keep',name:'Team 1',ids:mons.map(mon=>mon.identity)}]),
  'emerald-companion-2.session-test.preferences':JSON.stringify({keep:true}),
  'emerald-companion-2.battle-rules.v1':JSON.stringify({facility:'Tower',format:'Doubles',levelMode:'open',openLevel:78}),
  'emerald-companion-2.battle-round.v1':'"4"',
 };
 await page.goto(server.resolvedUrls.local[0]);
 await page.evaluate(entries=>{for(const [key,value] of Object.entries(entries))localStorage.setItem(key,value);},permanent);
 const saved=()=>page.evaluate(()=>globalThis.battleSessionProbe);
 const preserved=()=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(permanent));
 const navigate=async name=>{
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await page.getByRole('button',{name,exact:true}).click();
 };
 const clean=async()=>{
  await page.waitForFunction(()=>Boolean(globalThis.battleSessionProbe));
  assert.deepEqual(await saved(),createBattleState(),'every temporary state field starts clean');
  await navigate('Battle');
  assert.equal(await page.getByRole('combobox',{name:'Select my Pokémon',exact:true}).inputValue(),'');
  assert.equal(await page.getByRole('combobox',{name:'Select Trainer',exact:true}).inputValue(),'');
  const enemy=page.getByRole('combobox',{name:'Select opponent Pokémon',exact:true});
  assert.equal(await enemy.inputValue(),'');assert.equal(await enemy.isDisabled(),true);
  assert.equal(await page.getByRole('combobox',{name:'Select opponent set',exact:true}).count(),0);
  assert.equal(await page.getByRole('region',{name:'Observations',exact:true}).count(),0);
  assert.equal(await page.getByRole('spinbutton').count(),0,'no stale HP controls');
  assert.equal(await page.locator('.battle-matchup-sprite').count(),0,'no placeholder Pokémon');
  assert.deepEqual(await saved(),createBattleState(),'collection reconciliation never auto-selects a team');
  assert.deepEqual(await preserved(),permanent);
  assert.ok(await page.getByRole('region',{name:'My Pokémon',exact:true}).innerText().then(text=>text.includes('AB')),'imported trainer name remains available');
 };
 await page.reload();await clean();
 for(const format of ['Singles','Doubles']) {
  await page.getByRole('combobox',{name:'Format',exact:true}).selectOption(format);
  const doubles=format==='Doubles';
  const own=slot=>page.getByRole('combobox',{name:doubles?`Select my Pokémon Slot ${slot+1}`:'Select my Pokémon',exact:true});
  const enemy=slot=>page.getByRole('combobox',{name:doubles?`Select opponent Pokémon Slot ${slot+1}`:'Select opponent Pokémon',exact:true});
  const sets=slot=>page.getByRole('combobox',{name:doubles?`Select opponent set Slot ${slot+1}`:'Select opponent set',exact:true});
  await own(0).selectOption(mons[0].identity);
  if(doubles)await own(1).selectOption(mons[1].identity);
  await page.getByRole('combobox',{name:'Select Trainer',exact:true}).selectOption(doubles?'Expert (M):ALEXAS':'Cooltrainer (M):VINCE');
  const options=await enemy(0).locator('option').evaluateAll(options=>options.map(o=>o.value).filter(Boolean));
  await enemy(0).selectOption(doubles?options[0]:{label:'Gardevoir'});
  if(doubles)await enemy(1).selectOption(options[1]);
  for(let slot=0;slot<(doubles?2:1);slot++) {
   await sets(slot).selectOption(await sets(slot).locator('option').last().getAttribute('value'));
   assert.ok(await sets(slot).inputValue(),'opponent set remains selectable');
  }
  assert.equal(await page.getByRole('spinbutton',{name:'Player current HP'}).inputValue(),String(mons[0].stats.hp));
  const opponentHp=page.getByRole('spinbutton',{name:'Opponent current HP'});
  if(await opponentHp.inputValue())assert.equal(await opponentHp.inputValue(),await opponentHp.getAttribute('max'),'opponent starts at its full known HP');
  else assert.equal(await opponentHp.getAttribute('placeholder'),'Full','uncertain opponent HP retains the full range');
  assert.equal(await page.getByRole('combobox',{name:'Battle weather',exact:true}).inputValue(),'none');
  assert.equal(await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).isChecked(),false);
  assert.equal(await page.getByRole('combobox',{name:'Player status',exact:true}).inputValue(),'none');
  assert.equal(await page.getByRole('combobox',{name:'Player Atk stage',exact:true}).inputValue(),'0');
  await page.getByRole('combobox',{name:'Battle weather',exact:true}).selectOption('rain');
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).check();
  await page.getByRole('spinbutton',{name:'Player current HP'}).fill('23');
  await page.getByRole('combobox',{name:'Player status',exact:true}).selectOption('burn');
  await page.getByRole('combobox',{name:'Player Atk stage',exact:true}).selectOption('2');
  await page.getByRole('checkbox',{name:'Player Reflect',exact:true}).check();
  if(doubles)await page.getByRole('checkbox',{name:'Player Helping Hand Active',exact:true}).check();
  if(!doubles) {
   for(const name of ['Add observed move','Observed held item']) {
    const control=page.getByRole('combobox',{name,exact:true});
    await control.selectOption(await control.locator('option').nth(1).getAttribute('value'));
   }
   assert.ok(Object.keys((await saved()).opponentObservations).length,'encounter observations populated');
  }
  const before=await saved();
  for(const destination of ['Home','Collection']) {
   await navigate(destination);await navigate('Battle');
   assert.deepEqual(await saved(),before,'navigation preserves all encounter state');
  }
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.keyboard.press('Escape');
  assert.deepEqual(await saved(),before,'popup dismissal preserves encounter state');
  assert.deepEqual(await preserved(),permanent);
  await page.reload();await clean();
  console.log(`PASS ${format}: normal selections, full HP, modifiers/observations, navigation retention, clean reload and permanent data preservation`);
 }
 assert.deepEqual(errors,[]);
} finally {await browser?.close();await server.close();}
