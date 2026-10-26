import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium, webkit} from 'playwright';
import {createServer} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';

const useWebKit=process.argv.includes('--webkit');
const server=await createServer({server:{host:'127.0.0.1',port:useWebKit ? 5203 : 5202,strictPort:true,hmr:false}});
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
 const player=page.getByRole('region',{name:'My Pokémon',exact:true});
 const opponent=page.getByRole('region',{name:'Opponent',exact:true});
 const mine=player.getByRole('combobox',{name:'Select my Pokémon'});
 const enemy=opponent.getByRole('combobox',{name:'Select opponent Pokémon'});
 const trainers=opponent.getByRole('combobox',{name:'Select Trainer'});
 assert.equal(await player.locator('img[alt="Player trainer"]').count(),1);
 assert.match(await player.innerText(),/AB/);
 assert.equal(await enemy.isDisabled(),true);
 const labels=await mine.locator('option').allTextContents();
 assert.equal(labels[0],'Select Pokémon');
 assert.match(labels.join(' '),/Bulbasaur · Lv. 50 · #1/);
 assert.match(labels.join(' '),/Bulbasaur · Lv. 50 · #2/);
 assert.doesNotMatch(labels.join(' '),/Eevee/);
 await mine.selectOption({label:'Charmander · Lv. 65'});
 assert.equal(await page.getByLabel('My matchup Pokémon',{exact:true}).getByAltText('Charmander front sprite').count(),1);
 const trainerKey=await trainers.locator('option').nth(1).getAttribute('value');
 await trainers.selectOption(trainerKey);
 assert.equal(await opponent.locator('img[alt="Opponent trainer"]').count(),1);
 assert.equal(await enemy.isDisabled(),false);
 assert.ok(await enemy.locator('option').count()>1);
 const text=await enemy.locator('option').nth(1).textContent();
 assert.doesNotMatch(text,/sets|Lv\./);
 await enemy.selectOption(await enemy.locator('option').nth(1).getAttribute('value'));
 assert.equal(await page.getByLabel('Opponent matchup Pokémon',{exact:true}).getByAltText(`${text} front sprite`).count(),1);
 assert.match(await opponent.locator('.battle-selection-detail').innerText(),/Lv\. 50/);
 assert.equal(await page.locator('.battle-active-identity').count(),0);
 for(const side of ['My matchup Pokémon','Opponent matchup Pokémon']) {
  const position=page.getByLabel(side,{exact:true});
  assert.ok(await position.evaluate(el=>{const art=el.querySelector('.battle-active-artwork').getBoundingClientRect(),types=el.querySelector('.battle-active-types').getBoundingClientRect();return types.top>=art.bottom && Math.abs((types.left+types.right)/2-(art.left+art.right)/2)<1;}));
 }
 assert.equal(await page.locator('.battle-player-slots,.battle-compact-slots').count(),0);
 for(const width of [320,390]) {
  await page.setViewportSize({width,height:844});
  const bounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
  assert.ok(bounds.scroll<=bounds.width+1,JSON.stringify(bounds));
  for(const select of [mine,enemy]) {
   assert.equal(await select.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el;}),true);
   assert.equal(await select.evaluate(el=>getComputedStyle(el).opacity),'1');
  }
 }
 await mkdir('artifacts/battle-singles-selection',{recursive:true});
 await page.screenshot({path:'artifacts/battle-singles-selection/singles.png',fullPage:true});
 await trainers.selectOption('');
 assert.equal(await enemy.inputValue(),'');
 assert.equal(await enemy.isDisabled(),true);
 await trainers.selectOption(trainerKey);
 await enemy.selectOption(await enemy.locator('option').nth(1).getAttribute('value'));
 await page.getByRole('combobox',{name:'Round',exact:true}).selectOption('1');
 assert.equal(await enemy.inputValue(),'');
 assert.equal(await trainers.inputValue(),'');
 const identity=await mine.inputValue();
 await page.getByRole('button',{name:'Battle Rules',exact:true}).click();
 await page.getByRole('dialog',{name:'Battle Rules',exact:true}).getByLabel('Battle Type').selectOption('Doubles');
 await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('region',{name:'My Team',exact:true}).locator('select').count(),4);
 assert.equal(await page.getByRole('region',{name:'My Team',exact:true}).locator('select').first().inputValue(),identity);
 await page.getByRole('button',{name:'Battle Rules',exact:true}).click();
 await page.getByRole('dialog',{name:'Battle Rules',exact:true}).getByLabel('Battle Type').selectOption('Singles');
 await page.keyboard.press('Escape');
 assert.equal(await mine.inputValue(),identity);
 console.log('PASS Singles native combatant selectors, artwork/name, Frontier identities/levels, species-only opponent labels and level detail, centered types, matchup updates, trainer/Round reset, mobile bounds/hitboxes, preserved Doubles path and player selection.');
 await context.close();
} finally {await browser.close();await server.close();}
