import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium, webkit} from 'playwright';
import {createServer} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';

const useWebKit=process.argv.includes('--webkit');
const server=await createServer({server:{host:'127.0.0.1',port:useWebKit ? 5223 : 5222,strictPort:true,hmr:false}});
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

 const mine=[1,2].map(n=>page.getByRole('combobox',{name:`Select my Pokémon Slot ${n}`,exact:true}));
 const enemy=[1,2].map(n=>page.getByRole('combobox',{name:`Select opponent Pokémon Slot ${n}`,exact:true}));
 const trainers=page.getByRole('combobox',{name:'Select Trainer',exact:true});
 const player=page.getByLabel('My matchup Pokémon',{exact:true});
 const opponent=page.getByLabel('Opponent matchup Pokémon',{exact:true});
 const playerConditions=page.getByRole('region',{name:'Player conditions',exact:true});
 const opponentConditions=page.getByRole('region',{name:'Opponent conditions',exact:true});
 const pSwitch=player.locator('.battle-sprite-switch');
 const oSwitch=opponent.locator('.battle-sprite-switch');
 await page.getByRole('combobox',{name:'Select my Pokémon',exact:true}).selectOption(mons[0].identity);
 assert.equal(await pSwitch.count(),0);
 await changeFormat('Doubles');
 await mine[0].selectOption(mons[0].identity);
 assert.equal(await pSwitch.count(),0);
 await mine[1].selectOption(mons[2].identity);
 await trainers.selectOption('Expert (M):ALEXAS');
 const options=await enemy[0].locator('option').evaluateAll(options=>options.map(o=>({value:o.value,name:o.textContent})).filter(o=>o.value));
 await enemy[0].selectOption(options[0].value);
 assert.equal(await oSwitch.count(),0);
 await enemy[1].selectOption(options[1].value);
 // Selection retains Step 1 viewing behavior. Return each side to slot 1.
 if(!(await pSwitch.getAttribute('aria-label')).includes('Slot 1'))await pSwitch.tap();
 if(!(await oSwitch.getAttribute('aria-label')).includes('Slot 1'))await oSwitch.tap();
 await page.getByLabel('Player current HP',{exact:true}).fill('20');
 await page.getByLabel('Player status',{exact:true}).selectOption('burn');
 await page.getByLabel('Player Atk stage',{exact:true}).selectOption('2');
 await page.getByLabel('Opponent current HP',{exact:true}).fill('30');
 await page.getByLabel('Opponent status',{exact:true}).selectOption('sleep');
 await page.getByLabel('Battle weather',{exact:true}).selectOption('rain');
 await page.getByLabel('Player Reflect',{exact:true}).check();
 assert.equal(await page.getByLabel('My Side active Pokémon',{exact:true}).innerText(),'2');
 const slotsBefore=await page.locator('.battle-doubles-selection select').evaluateAll(els=>els.map(el=>el.value));
 await pSwitch.tap();
 await page.waitForFunction(()=>document.querySelector('[aria-label="My matchup Pokémon"] img.battle-matchup-sprite').alt.startsWith('Charmander'));
 assert.match(await oSwitch.getAttribute('aria-label'),/Slot 1/);
 assert.match(await playerConditions.locator('h4').innerText(),/Charmander/);
 assert.equal(await page.getByLabel('Player status',{exact:true}).inputValue(),'none');
 await page.getByLabel('Player current HP',{exact:true}).fill('40');
 await page.getByLabel('Player status',{exact:true}).selectOption('paralysis');
 await oSwitch.tap();
 assert.match(await pSwitch.getAttribute('aria-label'),/Slot 2/);
 assert.match(await opponentConditions.locator('h4').innerText(),new RegExp(options[1].name));
 await page.getByLabel('Opponent current HP',{exact:true}).fill('50');
 await page.getByLabel('Opponent status',{exact:true}).selectOption('poison');
 for(const width of [320,375,390]) {
  await page.setViewportSize({width,height:844});
  for(const button of [pSwitch,oSwitch]) {
   await button.scrollIntoViewIfNeeded();
   assert.ok(await button.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2).closest('button')===el && r.height===96;}));
   assert.equal(await button.evaluate(el=>getComputedStyle(el).touchAction),'manipulation');
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }
 await pSwitch.tap();await oSwitch.tap();
 assert.equal(await page.getByLabel('Player current HP',{exact:true}).inputValue(),'20');
 assert.equal(await page.getByLabel('Player status',{exact:true}).inputValue(),'burn');
 assert.equal(await page.getByLabel('Player Atk stage',{exact:true}).inputValue(),'2');
 assert.equal(await page.getByLabel('Opponent current HP',{exact:true}).inputValue(),'30');
 assert.equal(await page.getByLabel('Opponent status',{exact:true}).inputValue(),'sleep');
 assert.equal(await page.getByLabel('Battle weather',{exact:true}).inputValue(),'rain');
 assert.equal(await page.getByLabel('Player Reflect',{exact:true}).isChecked(),true);
 assert.equal(await page.getByLabel('My Side active Pokémon',{exact:true}).innerText(),'2');
 assert.deepEqual(await page.locator('.battle-doubles-selection select').evaluateAll(els=>els.map(el=>el.value)),slotsBefore);
 await pSwitch.tap();await oSwitch.tap();
 assert.equal(await page.getByLabel('Player current HP',{exact:true}).inputValue(),'40');
 assert.equal(await page.getByLabel('Player status',{exact:true}).inputValue(),'paralysis');
 assert.equal(await page.getByLabel('Opponent current HP',{exact:true}).inputValue(),'50');
 assert.equal(await page.getByLabel('Opponent status',{exact:true}).inputValue(),'poison');
 // Move information must use the newly viewed player and opponent.
 const moveButton=player.getByRole('button',{name:/Move information:/}).first();
 const moveName=(await moveButton.getAttribute('aria-label')).replace('Move information: ','');
 await moveButton.click();
 const dialog=page.getByRole('dialog');
 assert.ok((await dialog.innerText()).includes(moveName));
 const secondViewDetails=await dialog.innerText();
 await page.keyboard.press('Escape');
 await pSwitch.tap();
 await player.getByRole('button',{name:/Move information:/}).first().click();
 assert.notEqual(await dialog.innerText(),secondViewDetails);
 await page.keyboard.press('Escape');
 await pSwitch.tap();
 await mkdir('artifacts/battle-sprite-switch',{recursive:true});
 await page.screenshot({path:`artifacts/battle-sprite-switch/${useWebKit?'webkit':'chrome'}-populated.png`,fullPage:true});
 await page.keyboard.press('Escape');
 await mine[0].selectOption('');
 await enemy[0].selectOption('');
 assert.equal(await pSwitch.count(),0);assert.equal(await oSwitch.count(),0);
 // Empty Frontier roster: feedback must follow all selector rows in both formats.
 await page.evaluate(()=>localStorage.setItem('emerald-companion-2.roles.v1','{}'));
 await page.reload();
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();
 await page.getByRole('button',{name:'Battle',exact:true}).click();
 for(const format of ['Singles','Doubles']) {
  await changeFormat(format);
  for(const width of [320,390]) {
   await page.setViewportSize({width,height:844});
   const bounds=await page.locator('.battle-single-selection').evaluate(el=>{
    const message=el.querySelector('.battle-player-empty').getBoundingClientRect();
    const controls=[...el.querySelectorAll('.battle-selection-player .battle-pokemon-control')].map(el=>el.getBoundingClientRect());
    return {top:message.top,bottom:message.bottom,controlsBottom:Math.max(...controls.map(r=>r.bottom)),bottomOfArea:el.getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   assert.ok(bounds.top>=bounds.controlsBottom,JSON.stringify(bounds));
   assert.ok(bounds.bottom<=bounds.bottomOfArea+1,JSON.stringify(bounds));assert.equal(bounds.overflow,false);
  }
 }
 await mkdir('artifacts/battle-sprite-switch',{recursive:true});
 await page.screenshot({path:`artifacts/battle-sprite-switch/${useWebKit?'webkit':'chrome'}-empty.png`,fullPage:true});
 console.log('Step 3 mobile sprite switching, independent condition memory, move popup, Singles and empty-roster checks passed.');
 await context.close();
} finally {await browser.close();await server.close();}
