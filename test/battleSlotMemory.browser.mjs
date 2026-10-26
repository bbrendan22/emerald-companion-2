import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
import {frontierPokemon} from '../src/battle/data/frontierPokemon.js';
const useWebKit=process.argv.includes('--webkit');
const server=await preview({preview:{host:'127.0.0.1',port:useWebKit?5243:5242,strictPort:true}});
const browser=await(useWebKit?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
const storage=new Uint8Array(33744);
[1,4].forEach((species,pid)=>storage.set(makePokemon({species,pid}),4+pid*80));
const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
const mons=identifyPokemon(loadStoredSave({getItem:()=>encoded}).collection.records).map(toBattlePokemon).filter(Boolean);
const roles=Object.fromEntries(mons.map(mon=>[mon.identity,'Frontier']));
try {
 await mkdir('artifacts/slot-memory',{recursive:true});
 for(const width of [320,375,430,1440]) {
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500,serviceWorkers:'block'});
  await context.addInitScript(({encoded,roles})=>{localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify(roles));},{encoded,roles});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  const tap=async el=>width<500?el.tap():el.click();
  const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();};
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);await navigate('Battle');
  const opponent=page.getByRole('region',{name:'Opponent Team',exact:true}),slots=opponent.locator('.battle-compact-slot');
  const mine=page.getByRole('region',{name:'My Team',exact:true}).locator('.battle-compact-slot');
  const enemy=page.getByRole('group',{name:'Opponent matchup Pokémon',exact:true}),list=page.locator('.battle-possible-set-list > button');
  const observe=async(field,value)=>{const name=field==='item'?'Opponent held item':`Opponent move ${field+1}`;await enemy.getByRole('combobox',{name,exact:true}).selectOption(value);};
  const add=async(slot,name)=>{await tap(slots.nth(slot));const popup=page.getByRole('dialog',{name:'Select opponent Pokémon'});await popup.getByRole('searchbox').fill(name);await tap(popup.getByRole('button',{name:`Select Pokémon ${name}`,exact:true}));};
  const display=async()=>({
   stats:await enemy.locator('.battle-active-stats dd').evaluateAll(els=>els.map(el=>el.dataset.value)),
   moves:await enemy.locator('.battle-active-moves .battle-observation-value').allTextContents(),
   item:await enemy.locator('.battle-active-item .battle-observation-display').innerText(),
   fields:await enemy.locator('select').evaluateAll(els=>els.map(el=>({name:el.getAttribute('aria-label'),value:el.value}))),
   sets:await list.allTextContents(),
   readonly:await enemy.locator('.battle-active-moves li').evaluateAll(rows=>rows.map(row=>!row.querySelector('select'))),
  });
  for(const [slot,mon]of mons.entries()) {await tap(mine.nth(slot));await tap(page.getByRole('dialog',{name:'My Team selection'}).locator(`[data-pokemon-id="${mon.identity}"]`));}
  assert.ok(await slots.first().isDisabled());
  await slots.first().evaluate(el=>el.click());
  assert.equal(await page.getByRole('dialog',{name:'Select opponent Pokémon'}).count(),0);
  await tap(opponent.locator('.battle-opponent-trigger'));
  const trainerPopup=page.getByRole('dialog',{name:'Select opponent trainer'});
  await trainerPopup.getByRole('searchbox').fill('VINCE');
  await tap(trainerPopup.getByRole('button',{name:'Select trainer VINCE',exact:true}));
  assert.equal(await slots.locator('img').count(),0);
  assert.ok(await slots.first().isEnabled());
  await tap(slots.first());
  const rosterPopup=page.getByRole('dialog',{name:'Select opponent Pokémon'});
  const {availableOpponentSpecies}=await import('../src/battle/opponentSpecies.js');
  assert.deepEqual(await rosterPopup.locator('.battle-opponent-result span').allTextContents(),availableOpponentSpecies({selectedTrainer:'Cooltrainer (M):VINCE'}).map(mon=>mon.name));
  await page.keyboard.press('Escape');
  await tap(mine.first());await add(0,'Metagross');await add(1,'Gardevoir');
  const storageKeys=await page.evaluate(()=>Object.keys(localStorage).sort());
  await tap(slots.nth(0));
  assert.deepEqual(await enemy.locator('.battle-active-move-pp').allTextContents(),['','','','']);
  assert.deepEqual(await enemy.locator('.battle-active-move-effectiveness').allTextContents(),['','','','']);
  assert.deepEqual(await enemy.locator('.battle-active-moves select').evaluateAll(els=>els.map(el=>el.options[0].text)),['Move 1','Move 2','Move 3','Move 4']);
  assert.equal(await enemy.locator('.battle-active-item img').count(),0,'unknown item has no sprite');
  assert.ok(await page.locator('.battle-matchup-position').evaluateAll(els=>els.every(el=>{
    const ability=el.querySelector('.battle-active-ability').getBoundingClientRect(),item=el.querySelector('.battle-active-item').getBoundingClientRect();
    return ability.bottom<=item.top+.5&&Math.abs((ability.left+ability.right)/2-(item.left+item.right)/2)<.5;
  })),'ability appears above centered item on both sides');
  const statValues=await enemy.locator('.battle-active-stats dd').evaluateAll(els=>els.map(el=>el.dataset.value));
  assert.ok(statValues.some(value=>value.includes('–')));
  assert.ok(statValues.some(value=>/^\d+$/.test(value)));
  assert.ok(await enemy.locator('.battle-active-stats').evaluate(row=>{
    const cells=[...row.children],boxes=cells.map(cell=>cell.getBoundingClientRect());
    return boxes.every(box=>Math.abs(box.width-boxes[0].width)<1)&&cells.every((cell,index)=>{
      return [...cell.querySelectorAll('dd > span')].every(span=>{const text=span.getBoundingClientRect(),box=boxes[index];return text.left>=box.left-.5&&text.right<=box.right+.5;});
    });
  }),'stat range values fit six fixed rows without overlap');
  const positions=()=>page.locator('.battle-matchup-position').evaluateAll(els=>els.map(el=>{const stats=el.querySelector('.battle-active-stats').getBoundingClientRect(),moves=el.querySelector('.battle-active-moves').getBoundingClientRect();return {top:stats.top,height:stats.height,moves:moves.top};}));
  const beforePositions=await positions();
  await observe(2,'Psychic');
  assert.equal((await enemy.locator('.battle-active-move-pp').allTextContents())[2],'PP 10');
  assert.notEqual((await enemy.locator('.battle-active-move-effectiveness').allTextContents())[2],'');
  await observe('item','Quick Claw');
  assert.ok((await enemy.locator('.battle-active-move-pp').allTextContents()).every(text=>text.startsWith('PP ')),'identified moves show PP');
  assert.ok((await enemy.locator('.battle-active-move-effectiveness').allTextContents()).every(Boolean),'identified moves show effectiveness');
  assert.ok(await page.locator('.battle-active-item').evaluateAll(els=>els.every(el=>{
    const item=el.querySelector('.battle-set-item');if(!item)return true;
    const text=item.querySelector('span').getBoundingClientRect(),sprite=item.querySelector('img')?.getBoundingClientRect(),bounds=el.getBoundingClientRect();
    const group=el.querySelector('.battle-observation-display')??item,box=group.getBoundingClientRect();
    return Math.abs((text.left+text.right)/2-(bounds.left+bounds.right)/2)<.5&&(!sprite||sprite.left>=text.right)&&box.left>=bounds.left-.5&&box.right<=bounds.right+.5&&Math.abs((box.left+box.right)/2-(bounds.left+bounds.right)/2)<.5;
  })),'item text itself is centered with its sprite immediately to the right');
  assert.deepEqual(await positions(),beforePositions,'ranges to exact never moves either stat row or moves');
  assert.deepEqual(await list.allTextContents(),['Metagross 4']);
  const a=await display();assert.ok(a.stats.every(value=>/^\d+$/.test(value)));assert.deepEqual(a.readonly,[true,true,false,true]);assert.equal(a.fields.length,2);
  await tap(slots.nth(1));assert.deepEqual(await positions(),beforePositions,'switching opponents keeps stat rows and moves fixed');assert.equal(await enemy.getByRole('combobox').count(),5,'B starts with no inherited observations');
  await observe(1,'Thunderbolt');const b=await display();
  assert.equal(await enemy.getByRole('combobox',{name:'Opponent move 2',exact:true}).inputValue(),'Thunderbolt');
  await tap(slots.nth(0));assert.deepEqual(await display(),a,'A restores move positions, item, filtered set and read-only inference');
  await tap(slots.nth(1));assert.deepEqual(await display(),b,'B restores its independent move');
  await page.waitForTimeout(450);
  if(width<500){await tap(slots.nth(0));await tap(slots.nth(0));}else await slots.nth(0).dblclick();
  await page.waitForTimeout(450);assert.equal(await slots.nth(0).locator('img').count(),0);
  await tap(slots.nth(1));assert.deepEqual(await display(),b,'removing A preserves B');
  await add(0,'Metagross');await tap(slots.nth(0));
  assert.equal(await list.count(),8);assert.equal(await enemy.getByRole('combobox').count(),5);
  assert.deepEqual(await enemy.locator('.battle-active-moves select').evaluateAll(els=>els.map(el=>el.value)),['','','','']);
  assert.equal(await enemy.getByRole('combobox',{name:'Opponent held item',exact:true}).inputValue(),'','same-species replacement starts empty');
  await tap(slots.nth(1));assert.deepEqual(await display(),b);
  await tap(mine.nth(1));assert.deepEqual(await display(),b,'switching My Pokémon leaves opponent observations alone');
  await tap(slots.nth(0));await observe(2,'Psychic');await observe('item','Quick Claw');
  await tap(slots.nth(1));assert.deepEqual(await display(),b);await tap(slots.nth(0));assert.deepEqual(await display(),a);
  await navigate('Home');await navigate('Battle');assert.deepEqual(await display(),a,'memory belongs to the parent battle state, not a mounted matchup component');
  await tap(page.getByRole('button',{name:'Battle Rules',exact:true}));await page.getByRole('dialog',{name:'Battle Rules'}).getByLabel('Level',{exact:true}).selectOption('85');await page.keyboard.press('Escape');
  assert.deepEqual(await display(),{...a,stats:['257','314','252','246','184','150']},'Open Level recalculates stats while preserving observations and inference');
  await page.screenshot({path:`artifacts/slot-memory/${useWebKit?'webkit':'chrome'}-${width}.png`,fullPage:true});
  const mineBefore=await mine.evaluateAll(els=>els.map(el=>el.innerHTML));
  const trainerButton=opponent.locator('.battle-opponent-trigger');
  if(width<500){await tap(trainerButton);await tap(trainerButton);}else await trainerButton.dblclick();
  await page.waitForTimeout(450);
  await tap(trainerButton);const trainers=page.getByRole('dialog',{name:'Select opponent trainer'});
  await trainers.getByRole('searchbox').fill('COOPER');await tap(trainers.getByRole('button',{name:'Select trainer COOPER',exact:true}));
  assert.equal(await slots.locator('img').count(),0);
  assert.equal(await list.count(),0);
  assert.deepEqual(await mine.evaluateAll(els=>els.map(el=>el.innerHTML)),mineBefore);
  await add(0,'Metagross');await tap(slots.first());
  assert.ok((await enemy.locator('.battle-active-stats dd').evaluateAll(els=>els.map(el=>el.dataset.value))).every(value=>/^\d+$/.test(value)));
  assert.equal(await enemy.locator('select').count(),0,'new trainer uniquely identifies its own eligible set without old observations');
  assert.ok(await page.locator('.battle-active-item').evaluateAll(els=>els.every(el=>{
    const name=el.querySelector('.battle-set-item > span');if(!name)return true;
    const original=name.textContent;name.textContent='Never Melt Ice';
    const group=el.querySelector('.battle-observation-display')??el.querySelector('.battle-set-item');
    const box=group.getBoundingClientRect(),bounds=el.getBoundingClientRect(),sprite=el.querySelector('img')?.getBoundingClientRect(),text=name.getBoundingClientRect();
    const arrow=el.querySelector('.battle-observation-arrow')?.getBoundingClientRect();
    const fits=box.left>=bounds.left-.5&&box.right<=bounds.right+.5&&(!sprite||sprite.left>=text.right-.5)&&(!arrow||arrow.left-(sprite?.right??text.right)<5);
    name.textContent=original;return fits;
  })),'long item names fit without pushing the sprite or dropdown arrow outside the group');
  assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).sort()),storageKeys,'no permanent observation storage is added');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  await context.close();console.log(`PASS slot memory ${width}px: independent A/B positions and items, restored inference, same-species replacement reset, player switching, page remount, Rules changes, trainer reset and session-only memory.`);
 }
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
