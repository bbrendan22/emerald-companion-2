import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
const useWebKit=process.argv.includes('--webkit');
const server=await preview({preview:{host:'127.0.0.1',port:useWebKit?5225:5224,strictPort:true}});
const browser=await(useWebKit?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
const storage=new Uint8Array(33744);[1,4,7].forEach((species,pid)=>storage.set(makePokemon({species,pid}),4+pid*80));
const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
const mons=identifyPokemon(loadStoredSave({getItem:()=>encoded}).collection.records).map(toBattlePokemon).filter(Boolean);
const roles=Object.fromEntries(mons.map(mon=>[mon.identity,'Frontier']));
const teams=[{id:'test',name:'Team 1',ids:mons.map(mon=>mon.identity)}];
const errors=[];
try{
 for(const width of [320,375,390,430,1440]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500,serviceWorkers:'block'});
  await context.addInitScript(({encoded,roles,teams})=>{
   localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify(roles));localStorage.setItem('emerald-companion-2.battle-teams.v1',JSON.stringify(teams));
  },{encoded,roles,teams});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  const tap=async el=>width<500?el.tap():el.click();
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();
  const mySlots=page.getByRole('region',{name:'My Team',exact:true}).locator('.battle-compact-slot');
  const opponent=page.getByRole('region',{name:'Opponent Team',exact:true}),otherSlots=opponent.locator('.battle-compact-slot');
  const rulesTrigger=page.getByRole('button',{name:'Battle Rules',exact:true}),trainerTrigger=opponent.locator('.battle-opponent-trigger');
  const teamPopup=page.getByRole('dialog',{name:'My Team selection'}),trainerPopup=page.getByRole('dialog',{name:'Select opponent trainer'}),pokemonPopup=page.getByRole('dialog',{name:'Select opponent Pokémon'});
  const snapshot=()=>page.evaluate(()=>({
   images:[...document.querySelectorAll('.battle-compact-slot img')].map(img=>img.getAttribute('src')),
   matchup:document.querySelector('.battle-matchup-pair').textContent,
   trainer:document.querySelector('.battle-opponent-name').textContent,
   teams:localStorage.getItem('emerald-companion-2.battle-teams.v1'),
   rules:localStorage.getItem('emerald-companion-2.battle-rules.v1'),
   menu:document.querySelector('[aria-label="Open navigation"]')?.getAttribute('aria-expanded')
  }));
  for(const i of [0,1]){await tap(mySlots.nth(i));await tap(teamPopup.locator(`[data-pokemon-id="${mons[i].identity}"]`));}
  // Trainer selection now gates the opponent roster. Exercise its empty-state
  // popup separately; a selected trainer's trigger is a clear gesture, not a picker.
  const emptyTrainer=await snapshot();
  for(const target of [mySlots.nth(1),rulesTrigger,page.getByRole('button',{name:'Open navigation',exact:true})]) {
   await tap(trainerTrigger);await trainerPopup.waitFor();
   const bounds=await target.boundingBox(),popupBounds=await trainerPopup.boundingBox();
   const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
   if(x>=popupBounds.x&&x<=popupBounds.x+popupBounds.width&&y>=popupBounds.y&&y<=popupBounds.y+popupBounds.height){await page.keyboard.press('Escape');continue;}
   if(width<500)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
   assert.equal(await page.getByRole('dialog').count(),0);
   await target.evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1})));
   assert.deepEqual(await snapshot(),emptyTrainer,'trainer popup consumes outside/compatibility clicks');
  }
  await tap(trainerTrigger);const trainerSearch=trainerPopup.getByRole('searchbox');await tap(trainerSearch);
  await trainerSearch.fill('RADY');assert.equal(await trainerPopup.locator('.battle-opponent-result').count(),0);
  await trainerSearch.fill('bra');assert.ok(await trainerPopup.getByRole('button',{name:'Select trainer BRADY',exact:true}).isVisible());assert.ok((await trainerPopup.locator('strong').allTextContents()).every(name=>name.toLowerCase().startsWith('bra')));
  await trainerSearch.fill('VINCE');await tap(trainerPopup.getByRole('button',{name:'Select trainer VINCE',exact:true}));
  for(const [i,name] of ['Metagross','Gengar'].entries()){await tap(otherSlots.nth(i));await pokemonPopup.getByRole('searchbox').fill(name);await tap(pokemonPopup.getByRole('button',{name:`Select Pokémon ${name}`,exact:true}));}
  await tap(mySlots.nth(0));await tap(otherSlots.nth(0));
  const setButton=page.getByRole('region',{name:'Possible Sets',exact:true}).getByRole('button',{name:'Metagross 1',exact:true});
  const detailsButton=page.getByRole('region',{name:'Possible Sets',exact:true}).getByRole('button',{name:'Metagross 2',exact:true});
  const before=await snapshot();
  const sources=[rulesTrigger,otherSlots.nth(2),mySlots.nth(2),detailsButton];
  const targets=[mySlots.nth(1),otherSlots.nth(1),mySlots.nth(2),otherSlots.nth(2),rulesTrigger,trainerTrigger,setButton,page.getByRole('button',{name:'Open navigation',exact:true})];
  for(const [sourceIndex,source] of sources.entries())for(const [targetIndex,target] of targets.entries()){
   await tap(source);await page.getByRole('dialog').waitFor().catch(error=>{throw new Error(`${width}px source ${sourceIndex}, target ${targetIndex}: ${error.message}`)});assert.equal(await page.getByRole('dialog').count(),1);
   // Source and target can be the same trigger. It must dismiss only.
   const bounds=await target.boundingBox();
   const popupBounds=await page.getByRole('dialog').boundingBox();
   const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
   if(x>=popupBounds.x&&x<=popupBounds.x+popupBounds.width&&y>=popupBounds.y&&y<=popupBounds.y+popupBounds.height){await page.keyboard.press('Escape');continue;}
   // Details can cover an underlying button; click/tap coordinates, not hit-tested locator actions.
   if(width<500)await page.touchscreen.tap(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
   else await page.mouse.click(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
   assert.equal(await page.getByRole('dialog').count(),0,`source ${sourceIndex}, target ${targetIndex}: dismiss without opening another popup`);
   await target.evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1})));
   assert.equal(await page.getByRole('dialog').count(),0,'Safari compatibility click cannot open an underlying popup');
   assert.deepEqual(await snapshot(),before,`source ${sourceIndex}, target ${targetIndex}: underlying actions blocked`);
  }
  // Guard survives a held dismissal until its matching release, not a timer from pointer-down.
  await tap(rulesTrigger);
  await mySlots.nth(1).evaluate(el=>{
   el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:77}));
   const event=new Event('touchstart',{bubbles:true,cancelable:true});el.dispatchEvent(event);
  });
  await page.waitForTimeout(1100);
  await mySlots.nth(1).evaluate(el=>{
   el.dispatchEvent(new Event('touchend',{bubbles:true,cancelable:true}));
   el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));
  });
  assert.deepEqual(await snapshot(),before,'held dismissal cannot leak its delayed click');
  assert.equal(await page.getByRole('dialog').count(),0);
  // The next deliberate tap works immediately, including on the same control.
  await tap(rulesTrigger);await tap(mySlots.nth(1));assert.equal(await page.getByRole('dialog').count(),0);
  await tap(otherSlots.nth(2));const search=pokemonPopup.getByRole('searchbox');await tap(search);
  for(const [query,expected] of [['gross',[]],['META',['Metagross']],['mime',[]]]){
   await search.fill(query);assert.deepEqual(await pokemonPopup.locator('.battle-opponent-result span').allTextContents(),expected);
  }
  await search.fill('meta');assert.ok(await pokemonPopup.getByRole('button',{name:'Select Pokémon Metagross',exact:true}).isDisabled());
  await search.fill('');await tap(pokemonPopup.locator('.battle-opponent-result:not(:disabled)').first());
  assert.equal(await otherSlots.locator('img').count(),3,'normal result selection remains functional');
  await tap(mySlots.nth(2));await tap(teamPopup.getByRole('button',{name:'Create team',exact:true}));
  for(const mon of mons)await tap(teamPopup.locator(`[data-pokemon-id="${mon.identity}"]`));
  assert.equal(await teamPopup.getByRole('status').innerText(),'3/4 selected');
  await tap(teamPopup.getByRole('button',{name:'Cancel',exact:true}));assert.equal(await teamPopup.count(),1,'internal cancel controls do not click through');
  await page.keyboard.press('Escape');
  await context.close();console.log(`PASS ${width}px: all five popup types consume outside taps/compatibility clicks on sprites and controls, next tap works, inside interactions preserved, word-prefix searches and disabled entries retained.`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
