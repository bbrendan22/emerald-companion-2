import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium, webkit} from 'playwright';
import {createServer} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';

const useWebKit=process.argv.includes('--webkit');
const server=await createServer({server:{host:'127.0.0.1',port:useWebKit ? 5233 : 5232,strictPort:true,hmr:false}});
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
 const options=await enemy[0].locator('option').evaluateAll(els=>els.map(el=>el.value).filter(Boolean));
 await enemy[0].selectOption(options[0]);
 const checkCount=async(label,value)=>{
  await page.waitForFunction(([label,value])=>document.querySelector(`output[aria-label="${label} active Pokémon"]`)?.textContent===String(value),[label,value]);
 };
 await checkCount('My Side',1);await checkCount('Opponent Side',1);
 assert.equal(await page.getByRole('combobox',{name:'My Side active Pokémon',exact:true}).count(),0);
 await mine[1].selectOption(mons[2].identity);await enemy[1].selectOption(options[1]);
 await checkCount('My Side',2);await checkCount('Opponent Side',2);
 const view=async(side,slot)=>{
  const button=page.locator(`[aria-label="${side==='player'?'My':'Opponent'} matchup Pokémon"] .battle-sprite-switch`);
  if(!(await button.getAttribute('aria-label')).includes(`Slot ${slot+1}`))await button.tap();
 };
 await view('player',0);await page.getByLabel('Player current HP',{exact:true}).fill('0');
 await checkCount('My Side',1);
 await view('player',1);await page.getByLabel('Player current HP',{exact:true}).fill('40');
 await view('opponent',0);await page.getByLabel('Opponent current HP',{exact:true}).fill('30');
 await view('opponent',1);await page.getByLabel('Opponent current HP',{exact:true}).fill('0');
 await checkCount('Opponent Side',1);
 for(const player of [0,1])for(const opponent of [0,1]) {
  await view('player',player);await view('opponent',opponent);
  assert.equal(await page.getByLabel('Player current HP',{exact:true}).inputValue(),player===0?'0':'40');
  assert.equal(await page.getByLabel('Opponent current HP',{exact:true}).inputValue(),opponent===0?'30':'0');
  await checkCount('My Side',1);await checkCount('Opponent Side',1);
 }
 await view('player',0);
 const ownHp=page.getByLabel('Player current HP',{exact:true});
 assert.equal(await ownHp.getAttribute('min'),'0');
 await ownHp.fill('');await ownHp.blur();await checkCount('My Side',2);
 await ownHp.fill('0');await checkCount('My Side',1);
 await mine[0].selectOption(mons[3].identity);await checkCount('My Side',2);
 await view('player',1);assert.equal(await ownHp.inputValue(),'40');
 await enemy[1].selectOption(options[2]);await checkCount('Opponent Side',2);
 await view('opponent',0);assert.equal(await page.getByLabel('Opponent current HP',{exact:true}).inputValue(),'30');
 await mine[1].selectOption('');await checkCount('My Side',1);
 for(const width of [320,390]) {
  await page.setViewportSize({width,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }
 await mkdir('artifacts/battlefield-liveness',{recursive:true});
 await page.screenshot({path:'artifacts/battlefield-liveness/mobile.png',fullPage:true});
 await changeFormat('Singles');
 await page.getByRole('combobox',{name:'Select my Pokémon',exact:true}).selectOption(mons[0].identity);
 await page.getByRole('combobox',{name:'Select Trainer',exact:true}).selectOption('Expert (M):ALEXAS');
 await page.getByRole('combobox',{name:'Select opponent Pokémon',exact:true}).selectOption(options[0]);
 await ownHp.fill('0');assert.equal(await ownHp.inputValue(),'0');
 assert.equal(await page.getByRole('group',{name:'Active Pokémon',exact:true}).count(),0);
 console.log('PASS mobile slot liveness: zero/default HP, four independent slots, automatic counts, replacement/removal, Singles and narrow layout.');
 await context.close();
} finally {await browser.close();await server.close();}
