import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';

// Real Settings import and App-owned Battle hook, against the built application.
const save=(species,experience=117360)=>{
 const storage=new Uint8Array(33744);
 species.forEach((species,pid)=>storage.set(makePokemon({species,pid:species,experience,moveIds:[33,45,0,0]}),4+pid*80));
 return Buffer.from(makeSave({blocks:{storage}}));
};
const initial=save([1,4]),updated=save([1,7],272535);
const records=bytes=>identifyPokemon(loadStoredSave({getItem:()=>bytes.toString('base64')}).collection.records).map(toBattlePokemon);
const old=records(initial),next=records(updated);
assert.equal(old[0].identity,next[0].identity);
const permanent={
 'emerald-companion-2.roles.v1':JSON.stringify(Object.fromEntries([...old,...next].map(mon=>[mon.identity,'Frontier']))),
 'emerald-companion-2.battle-teams.v1':JSON.stringify([{id:'keep',name:'Keep',ids:old.map(mon=>mon.identity)}]),
};
const server=await preview({preview:{host:'127.0.0.1',port:0}});
let browser;
try {
 browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
 page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const navigate=async name=>{if(name!=='Settings')await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();};
 await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
 await page.evaluate(entries=>{for(const [key,value] of Object.entries(entries))localStorage.setItem(key,value);},{...permanent,'emerald-companion-2.save.v1':initial.toString('base64')});
 await page.reload();
 const importSave=async bytes=>{
  await navigate('Settings');
  await page.locator('#save-file').setInputFiles({name:'replacement.sav',mimeType:'application/octet-stream',buffer:bytes});
  await page.getByRole('status').filter({hasText:'Save imported.'}).waitFor();
  await navigate('Battle');
 };
 for(const format of ['Singles','Doubles']) {
  await page.reload();await navigate('Battle');
  await page.getByRole('combobox',{name:'Format',exact:true}).selectOption(format);
  const mine=slot=>page.getByRole('combobox',{name:format==='Singles'?'Select my Pokémon':`Select my Pokémon Slot ${slot+1}`,exact:true});
  await mine(0).selectOption(next[0].identity);
  await page.getByRole('combobox',{name:'Select Trainer',exact:true}).selectOption('Expert (M):ALEXAS');
  const enemy=page.getByRole('combobox',{name:format==='Singles'?'Select opponent Pokémon':'Select opponent Pokémon Slot 1',exact:true});
  await enemy.selectOption(await enemy.locator('option').nth(1).getAttribute('value'));
  const matchup=page.getByRole('group',{name:'My matchup Pokémon',exact:true});
  for(const width of [320,375,390,430]) {
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   for(const name of ['Tackle','Growl']) {
    const trigger=matchup.getByRole('button',{name:`Move information: ${name}`,exact:true});
    await trigger.focus();await page.keyboard.press('Enter');
    const dialog=page.getByRole('dialog');await dialog.waitFor();
    const box=await dialog.boundingBox();assert.ok(box.x>=-1&&box.x+box.width<=width+1);
    if(name==='Tackle')assert.equal(await dialog.locator('.battle-core-damage-percent').count(),1);
    else {
     assert.equal(await dialog.locator('.battle-core-damage-percent').count(),0);
     assert.equal(await dialog.getByRole('combobox').count(),0);
    }
    await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
    assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.evaluate(()=>document.body.style.position),'');
   }
  }
  console.log(`PASS production WebKit ${format}: damage/status popups, bounds, Escape, focus and scroll unlock at 320/375/390/430px`);
  // Import preserves identity while changing level/stats, then removes it.
  await importSave(updated);
  assert.equal(await mine(0).inputValue(),next[0].identity);
  const player=page.getByRole('group',{name:'My matchup Pokémon',exact:true});
  assert.equal(await player.locator('.battle-active-level').innerText(),`Lv. ${next[0].level}`);
  assert.match(await player.innerText(),new RegExp(String(next[0].stats.hp)));
  await mine(0).selectOption(next[1].identity);
  await importSave(initial);
  assert.equal(await mine(0).inputValue(),'','missing identity cannot remain selected');
  assert.equal(await player.locator('.battle-matchup-sprite').count(),0);
  assert.equal(await mine(0).locator(`option[value="${next[1].identity}"]`).count(),0);
  for(const [key,value] of Object.entries(permanent))assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),value);
  assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.save.v1')),initial.toString('base64'));
  console.log(`PASS production WebKit ${format}: actual replacement import updates retained Pokémon level/stats, clears removed selection, preserves roles/presets and save`);
 }
 assert.deepEqual(errors,[]);
} finally {await browser?.close();await server.close();}
