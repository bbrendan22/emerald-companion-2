import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium, webkit} from 'playwright';
import {createServer} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';

const useWebKit=process.argv.includes('--webkit');
const server=await createServer({server:{host:'127.0.0.1',port:useWebKit ? 5213 : 5212,strictPort:true,hmr:false}});
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
 const singles=await page.locator('.battle-single-selection').innerHTML();
 await changeFormat('Doubles');
 const mine=[1,2].map(n=>page.getByRole('combobox',{name:`Select my Pokémon Slot ${n}`,exact:true}));
 const enemy=[1,2].map(n=>page.getByRole('combobox',{name:`Select opponent Pokémon Slot ${n}`,exact:true}));
 const sets=[1,2].map(n=>page.getByRole('combobox',{name:`Select opponent set Slot ${n}`,exact:true}));
 const trainers=page.getByRole('combobox',{name:'Select Trainer',exact:true});
 for(const select of [...mine,...enemy])assert.equal(await select.inputValue(),'');
 await mine[0].selectOption(mons[0].identity);
 await mine[1].selectOption(mons[1].identity);
 assert.equal(await mine[0].inputValue(),mons[0].identity);
 assert.equal(await mine[1].inputValue(),mons[1].identity);
 await page.waitForFunction(identity=>document.querySelector('[aria-label="Select my Pokémon Slot 2"]').querySelector(`option[value="${identity}"]`).disabled,mons[0].identity);
 await trainers.selectOption('Expert (M):ALEXAS');
 for(const select of enemy)assert.equal(await select.inputValue(),'');
 const options=await enemy[0].locator('option').evaluateAll(options=>options.map(o=>o.value).filter(Boolean));
 await enemy[0].selectOption(options[0]);await enemy[1].selectOption(options[1]);
 const first=await sets[0].inputValue();
 const secondLast=await sets[1].locator('option').last().getAttribute('value');
 await sets[1].selectOption(secondLast);
 assert.equal(await sets[0].inputValue(),first);
 assert.equal(await sets[1].inputValue(),secondLast);
 await sets[0].selectOption(await sets[0].locator('option').last().getAttribute('value'));
 assert.equal(await sets[1].inputValue(),secondLast);
 await mine[0].selectOption(mons[2].identity);
 assert.equal(await mine[1].inputValue(),mons[1].identity);
 await enemy[0].selectOption(options[2]);
 assert.equal(await enemy[1].inputValue(),options[1]);assert.equal(await sets[1].inputValue(),secondLast);
 for(const width of [320,375,390]) {
  await page.setViewportSize({width,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const rows=await page.locator('.battle-doubles-selection select.battle-pokemon-select').evaluateAll(selects=>selects.map(el=>{
   const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el};
  }));
  for(const r of rows){assert.ok(r.width>0);assert.ok(r.right<=width+1);assert.ok(r.hit,JSON.stringify(r));}
  assert.ok(Math.abs(rows[0].y-rows[2].y)<1);
  assert.ok(Math.abs(rows[1].y-rows[4].y)<1);
  assert.ok(rows[2].right<=rows[3].x+1);assert.ok(rows[4].right<=rows[5].x+1);
 }
 await mkdir('artifacts/battle-doubles-selection',{recursive:true});
 await page.screenshot({path:`artifacts/battle-doubles-selection/${useWebKit?'webkit':'chrome'}-320.png`,fullPage:true});
 await mine[0].selectOption('');await enemy[0].selectOption('');
 assert.equal(await mine[1].inputValue(),mons[1].identity);
 assert.equal(await enemy[1].inputValue(),options[1]);assert.equal(await sets[1].inputValue(),secondLast);
 assert.equal(await page.locator('.battle-active-artwork button').count(),0);
 await changeFormat('Singles');
 assert.equal(await page.locator('.battle-single-selection').innerHTML(),singles);
 await changeFormat('Doubles');
 for(const select of [...mine,...enemy])assert.equal(await select.inputValue(),'');
 console.log(`Doubles selectors passed (${useWebKit?'WebKit':'Chrome'}): independent slots/sets, duplicates, clearing, reset, Singles markup, mobile bounds and native hit targets.`);
 await context.close();
} finally {await browser.close();await server.close();}
