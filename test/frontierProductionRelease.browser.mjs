import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
const storage=new Uint8Array(33744);
storage.set(makePokemon({species:285,experience:117360,moveIds:[58,57,89,70],heldItemId:0}),4);
const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
const mon=identifyPokemon(loadStoredSave({getItem:()=>encoded}).collection.records).map(toBattlePokemon).find(Boolean);
const server=await preview({preview:{host:'127.0.0.1',port:5315,strictPort:true}});
let browser;const results=[];
try {
 browser=await webkit.launch({headless:true});await mkdir('artifacts/frontier-candidate-step6',{recursive:true});
 for(const width of [320,375,390,430]) {
  const context=await browser.newContext({viewport:{width,height:844},screen:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await context.addInitScript(({encoded,identity,standalone})=>{
   if(!localStorage.getItem('emerald-companion-2.save.v1'))localStorage.setItem('emerald-companion-2.save.v1',encoded);
   if(!localStorage.getItem('emerald-companion-2.roles.v1'))localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({[identity]:'Frontier'}));
   if(standalone)Object.defineProperty(navigator,'standalone',{get:()=>true});
  },{encoded,identity:mon.identity,standalone:width===390});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
  const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).tap();await page.getByRole('button',{name,exact:true}).tap();};
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);await navigate('Battle');
  const own=page.getByRole('region',{name:'My Team',exact:true}),opponent=page.getByRole('region',{name:'Opponent Team',exact:true});
  const ownSlot=own.locator('.battle-compact-slot').first(),enemySlot=opponent.locator('.battle-compact-slot').first();
  await ownSlot.tap();await page.getByRole('dialog',{name:'My Team selection'}).locator(`[data-pokemon-id="${mon.identity}"]`).tap();await ownSlot.tap();
  await opponent.getByRole('button',{name:'Choose opponent trainer: Select Trainer',exact:true}).tap();
  const trainers=page.getByRole('dialog',{name:'Select opponent trainer'});await trainers.getByRole('searchbox').fill('ALEXAS');
  await trainers.getByRole('button',{name:'Select trainer ALEXAS',exact:true}).tap();
  await enemySlot.tap();const picker=page.getByRole('dialog',{name:'Select opponent Pokémon'});
  await picker.getByRole('searchbox').fill('Aerodactyl');await picker.getByRole('button',{name:'Select Pokémon Aerodactyl',exact:true}).tap();await enemySlot.tap();
  const player=page.getByRole('group',{name:'My matchup Pokémon',exact:true}),enemy=page.getByRole('group',{name:'Opponent matchup Pokémon',exact:true});
  for(const name of ['Ice Beam','Surf','Earthquake']) {
   await player.getByRole('button',{name:`Move information: ${name}`,exact:true}).tap();
   const dialog=page.getByRole('dialog');assert.equal(await dialog.locator('.battle-core-damage-percent').count(),1);
   assert.equal(await dialog.locator('.battle-core-damage-hp').evaluate(node=>node.previousElementSibling.className),'battle-core-damage-percent');
   assert.match(await dialog.innerText(),/Across 4 possible sets/);await page.keyboard.press('Escape');
  }
  await enemy.getByRole('combobox',{name:'Opponent held item',exact:true}).selectOption('Kings Rock');
  await enemy.getByRole('combobox',{name:'Opponent ability',exact:true}).selectOption('Pressure');
  await enemy.getByRole('combobox',{name:'Opponent move 1',exact:true}).selectOption('Double Edge');
  const observations=await enemy.locator('select').evaluateAll(nodes=>nodes.map(node=>[node.getAttribute('aria-label'),node.value]));
  await page.getByRole('button',{name:'Battle Rules',exact:true}).tap();
  let rules=page.getByRole('dialog',{name:'Battle Rules',exact:true});
  await rules.getByLabel('Battle Type').selectOption('Doubles');await rules.getByLabel('Level',{exact:true}).selectOption('85');
  await page.keyboard.press('Escape');
  await navigate('Home');await navigate('Battle');
  assert.deepEqual(await enemy.locator('select').evaluateAll(nodes=>nodes.map(node=>[node.getAttribute('aria-label'),node.value])),observations);
  await player.getByRole('button',{name:'Move information: Ice Beam',exact:true}).tap();
  const dialog=page.getByRole('dialog');assert.match(await dialog.innerText(),/Across 2 possible sets/);
  const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=844);
  await page.screenshot({path:`artifacts/frontier-candidate-step6/production-${width}.png`});await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('emerald-companion-2.battle-rules.v1')));
  assert.equal(saved.format,'Doubles');assert.equal(saved.openLevel,85);
  await page.reload();await navigate('Battle');
  assert.equal(await opponent.getByRole('button',{name:'Choose opponent trainer: Select Trainer',exact:true}).count(),1);
  assert.equal(await enemy.locator('select').count(),0,'observations and active matchup are session-only');
  await page.getByRole('button',{name:'Battle Rules',exact:true}).tap();rules=page.getByRole('dialog',{name:'Battle Rules',exact:true});
  assert.equal(await rules.getByLabel('Battle Type').inputValue(),'Doubles');assert.equal(await rules.getByLabel('Level',{exact:true}).inputValue(),'85');
  await page.keyboard.press('Escape');assert.deepEqual(errors,[]);
  results.push({width,standaloneFlagSimulation:width===390,navigationObservations:'preserved',reloadRules:'preserved',reloadObservations:'existing session-only reset'});
  await context.close();console.log(`PASS production WebKit ${width}px: actual Battle page, ALEXAS, navigation observations, reload rules/session reset, compact layout`);
 }
 await writeFile('artifacts/frontier-candidate-step6/production-validation.json',JSON.stringify(results,null,2)+'\n');
} finally {await browser?.close();await server.close();}
