import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium, webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';

const useWebKit=process.argv.includes('--webkit');
const server=await preview({preview:{host:'127.0.0.1',port:useWebKit ? 5203 : 5202,strictPort:true}});
const artifactDir=`artifacts/battle-team-picker${useWebKit ? '-webkit' : ''}`;
const browser=useWebKit ? await webkit.launch({headless:true}) : await chromium.launch({headless:true,channel:'chrome'});
const species=[1,2,4,7,25,133,16,19,21,23,27,29,32,35,37,39,41,43,46,48,50];
const storage=new Uint8Array(33744);
species.forEach((species,pid)=>storage.set(makePokemon({species,pid,experience:pid<2 ? 117360 : pid===2 ? 272535 : 560}),4+pid*80));
const trainer=new Uint8Array(3884);trainer.set([187,188,255]);trainer[8]=1;
const encoded=Buffer.from(makeSave({blocks:{storage,saveBlock2:trainer}})).toString('base64');
const snapshot=loadStoredSave({getItem:()=>encoded});
const mons=identifyPokemon(snapshot.collection.records).map(toBattlePokemon).filter(Boolean);
assert.equal(mons.length,species.length);
assert.deepEqual(mons.slice(0,3).map(mon=>mon.level),[50,50,65]);
const roles=Object.fromEntries(mons.slice(0,-1).map(mon=>[mon.identity,'Frontier']));
const seedTeams=[{id:'first',name:'Old custom name',ids:mons.slice(4,7).map(m=>m.identity)},
  {id:'second',name:'Another custom name',ids:mons.slice(7,10).map(m=>m.identity)}];
const errors=[];
try {
 await mkdir(artifactDir,{recursive:true});
 for(const width of [320,375,390,430,1440]) {
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width,height:844},isMobile:width<500,hasTouch:width<500});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
  await page.evaluate(({encoded,roles,seedTeams})=>{
   localStorage.setItem('emerald-companion-2.save.v1',encoded);
   localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify(roles));
   localStorage.setItem('emerald-companion-2.battle-teams.v1',JSON.stringify(seedTeams));
   localStorage.removeItem('emerald-companion-2.battle-rules.v1');
  },{encoded,roles,seedTeams});
  await page.reload();
  const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();};
  await navigate('Battle');
  const myTeam=page.getByRole('region',{name:'My Team',exact:true});
  const popup=page.getByRole('dialog',{name:'My Team selection'});
  const open=async(slot=1)=>{await myTeam.getByRole('button',{name:`Add Pokémon, My Team, empty slot ${slot}`,exact:true}).click();await popup.waitFor();const box=await popup.boundingBox();assert.ok(box.x>=0 && box.x+box.width<=width && box.y+box.height<=844,'popup stays inside viewport');};
  const row=index=>popup.locator(`[data-pokemon-id="${mons[index].identity}"]`);
  const reset=async()=>{await page.reload();await navigate('Battle');};
  const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('emerald-companion-2.battle-teams.v1')));
  assert.equal(await myTeam.locator('h3').innerText(),'AB');
  assert.match(await myTeam.locator('.battle-compact-trainer').getAttribute('src'),/may-emerald/);
  assert.equal(await myTeam.locator('.battle-compact-slot img').count(),0);
  assert.ok(await page.locator('.battle-compact-slot').evaluateAll(slots=>slots.every(s=>getComputedStyle(s).backgroundColor==='rgba(0, 0, 0, 0)')));
  assert.equal(await page.locator('.battle-matchup-title').innerText(),'Matchup');
  await open(3);
  assert.equal(await popup.locator('.battle-picker-pokemon').count(),mons.length-1);
  assert.equal(await popup.locator(`[data-pokemon-id="${mons.at(-1).identity}"]`).count(),0);
  assert.deepEqual(await popup.locator('.battle-picker-team-name').allTextContents(),['Team 1','Team 2']);
  assert.equal(await popup.locator('.battle-picker-team').first().locator('.battle-picker-team-level').innerText(),`Lv. ${Math.max(...mons.slice(4,7).map(mon=>mon.level))}`);
  assert.equal(await popup.locator('.battle-picker-team').first().locator('img').count(),3);
  assert.deepEqual(await popup.locator('.battle-picker-team').first().locator('img').evaluateAll(images=>images.map(img=>img.getAttribute('src').split('/').at(-1))),mons.slice(4,7).map(mon=>`${mon.dex}.png`));
  assert.ok(await popup.locator('.battle-picker-team').evaluateAll(rows=>rows.every(row=>{
    const bounds=row.getBoundingClientRect(), name=row.querySelector('.battle-picker-team-name').getBoundingClientRect();
    return [...row.querySelectorAll('img')].every(img=>{const b=img.getBoundingClientRect();return b.x>=name.right && b.right<=bounds.right && b.y>=bounds.y && b.bottom<=bounds.bottom && getComputedStyle(img).backgroundColor==='rgba(0, 0, 0, 0)';});
  })));
  await popup.locator('.battle-picker-team img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
  await page.screenshot({path:`${artifactDir}/saved-teams-${width}.png`,fullPage:true});
  assert.match(await row(0).locator('img').getAttribute('src'),new RegExp(`pokemon/emerald/${mons[0].shiny ? 'shiny' : 'normal'}/1.png`));
  assert.equal(await row(0).locator('small').innerText(),`Lv. ${mons[0].level}`);
  const scrollY=await page.evaluate(()=>scrollY);
  if(useWebKit && width<500)await popup.evaluate(el=>el.scrollBy(0,300));
  else {await popup.hover();await page.mouse.wheel(0,300);}
  await page.waitForFunction(()=>document.querySelector('.battle-team-selection')?.scrollTop>0);
  assert.equal(await page.evaluate(()=>scrollY),scrollY);
  assert.ok(await popup.isVisible());
  await popup.evaluate(el=>el.scrollTop=0);
  await row(0).click();assert.equal(await popup.count(),0);
  assert.match(await myTeam.locator('.battle-compact-slot').nth(2).locator('img').getAttribute('src'),/box\/1.png/);
  assert.equal(await myTeam.locator('.battle-compact-slot').nth(0).locator('img').count(),0);
  await open(1);assert.ok(await row(0).isDisabled());assert.ok(await row(1).isEnabled());
  const inTeamAppearance=await row(0).evaluate(el=>({opacity:getComputedStyle(el).opacity,filter:getComputedStyle(el).filter}));
  await row(1).click();
  assert.equal(await myTeam.locator('.battle-compact-slot img').count(),2);
  await open(2);await popup.getByRole('button',{name:'Load Team 1',exact:true}).click();
  for(let i=0;i<3;i++)assert.match(await myTeam.locator('.battle-compact-slot').nth(i).locator('img').getAttribute('src'),new RegExp(`box/${mons[i+4].dex}.png`));

  await reset();await open();
  await popup.getByRole('button',{name:'Create team',exact:true}).click();
  assert.ok(await popup.getByRole('button',{name:'Save',exact:true}).isDisabled());
  const toggle=async index=>{if(width<500)await row(index).tap();else await row(index).click();};
  const background=index=>row(index).evaluate(el=>getComputedStyle(el).backgroundColor);
  const clear='rgba(0, 0, 0, 0)';
  const selectedShade=clear;
  const appearance=index=>row(index).evaluate(el=>({opacity:getComputedStyle(el).opacity,filter:getComputedStyle(el).filter}));
  // Dispatch several selections in one task, before queued renders can settle.
  await popup.evaluate(el=>{
    const rows=el.querySelectorAll('.battle-picker-pokemon');
    for(const index of [0,1,2,3,4])rows[index].click();
  });
  assert.equal(await popup.getByRole('status').innerText(),'4/4 selected');
  for(const index of [0,1,2,3])assert.equal(await row(index).getAttribute('aria-pressed'),'true');
  assert.equal(await row(4).getAttribute('aria-pressed'),'false');
  assert.deepEqual(await appearance(0),inTeamAppearance);
  assert.deepEqual(await appearance(4),{opacity:'1',filter:'none'});
  await popup.evaluate(el=>{
    const rows=el.querySelectorAll('.battle-picker-pokemon');
    for(const index of [0,1,2,3])rows[index].click();
  });
  assert.equal(await popup.getByRole('status').innerText(),'0/4 selected');
  // Model Safari retargeting a rapid adjacent tap's synthetic click to the
  // preceding row. A consumed touch must cancel that click at its source.
  if(width<500) {
    await popup.evaluate(el=>{
      const rows=el.querySelectorAll('.battle-picker-pokemon');
      for(const index of [0,1]) {
        const row=rows[index], box=row.getBoundingClientRect();
        const touch={identifier:index,clientX:box.x+box.width/2,clientY:box.y+box.height/2};
        const start=new Event('touchstart',{bubbles:true,cancelable:true});
        Object.defineProperties(start,{touches:{value:[touch]},changedTouches:{value:[touch]}});
        row.dispatchEvent(start);
        const end=new Event('touchend',{bubbles:true,cancelable:true});
        Object.defineProperties(end,{touches:{value:[]},changedTouches:{value:[touch]}});
        if(row.dispatchEvent(end))rows[0].click();
      }
    });
    assert.equal(await popup.getByRole('status').innerText(),'2/4 selected');
    assert.equal(await row(0).getAttribute('aria-pressed'),'true');
    assert.equal(await row(1).getAttribute('aria-pressed'),'true');
    await toggle(0);await toggle(1);
  }
  // Exercise real rapid adjacent touches downward, upward and skipping a row.
  for(const order of [[0,1,2],[2,1,0],[0,2,1]]) {
    if(width<500) {
      const centers=await popup.locator('.battle-picker-pokemon').evaluateAll(rows=>rows.slice(0,3).map(row=>{const r=row.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};}));
      for(const index of order)await page.touchscreen.tap(centers[index].x,centers[index].y);
    } else {for(const index of order)await row(index).click();}
    assert.equal(await popup.getByRole('status').innerText(),'3/4 selected');
    for(const index of order)assert.equal(await row(index).getAttribute('aria-pressed'),'true');
    for(const index of order)await toggle(index);
    assert.equal(await popup.getByRole('status').innerText(),'0/4 selected');
  }
  // Normal, spaced-out taps must work just as reliably as rapid selections.
  for(const index of [0,1,2]) {
    await page.waitForTimeout(800);
    await toggle(index);
    assert.equal(await popup.getByRole('status').innerText(),`${index + 1}/4 selected`);
    for(let selected=0;selected<=index;selected++)assert.equal(await row(selected).getAttribute('aria-pressed'),'true');
  }
  for(const index of [0,1,2])await toggle(index);
  assert.equal(await popup.getByRole('status').innerText(),'0/4 selected');
  assert.deepEqual(await appearance(0),{opacity:'1',filter:'none'});
  assert.equal(await background(0),clear);
  await toggle(0);assert.equal(await background(0),selectedShade);
  assert.deepEqual(await appearance(0),inTeamAppearance);
  await toggle(1);assert.equal(await background(0),selectedShade);assert.equal(await background(1),selectedShade);
  await toggle(0);assert.equal(await background(0),clear,'deselected row clears even with pointer remaining on it');
  assert.equal(await background(1),selectedShade,'selected rows have no background');
  await toggle(0);assert.equal(await background(0),selectedShade);
  await toggle(0);assert.equal(await background(0),clear);
  await toggle(0);assert.equal(await background(0),selectedShade);
  assert.equal(await popup.getByRole('status').innerText(),'2/4 selected');
  assert.equal(await row(0).getAttribute('aria-pressed'),'true');
  await popup.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal((await stored()).length,2);
  await popup.getByRole('button',{name:'Create team',exact:true}).click();
  for(const i of [0,1,2])await row(i).click();
  assert.ok(await popup.getByRole('button',{name:'Save',exact:true}).isEnabled());
  assert.ok(await row(3).isEnabled());
  await toggle(3);
  assert.equal(await popup.getByRole('status').innerText(),'4/4 selected');
  assert.ok(await popup.getByRole('button',{name:'Save',exact:true}).isEnabled());
  assert.ok(await row(4).isDisabled());
  await toggle(3);
  assert.equal(await popup.getByRole('status').innerText(),'3/4 selected');
  assert.equal(await background(3),clear);
  await toggle(2);assert.equal(await background(2),clear);assert.ok(await row(3).isEnabled());
  assert.equal(await background(3),clear,'enabling another row does not shade it');
  await toggle(2);assert.equal(await background(2),selectedShade);
  assert.ok(await popup.getByRole('button',{name:'Save',exact:true}).isEnabled());
  await page.screenshot({path:`${artifactDir}/create-${width}.png`,fullPage:true});
  await popup.getByRole('button',{name:'Save',exact:true}).click();
  assert.equal(await popup.getByRole('button',{name:'Save',exact:true}).count(),0);
  assert.deepEqual((await stored()).map(team=>team.name),['Team 1','Team 2','Team 3']);
  assert.equal(await popup.getByRole('button',{name:'Load Team 3',exact:true}).locator('.battle-picker-team-level').innerText(),'Lv. 65');
  await page.keyboard.press('Escape');await open();
  await popup.getByRole('button',{name:'Remove team',exact:true}).click();
  await popup.getByRole('button',{name:'Remove Team 2',exact:true}).click();
  assert.equal((await stored()).length,3);
  await popup.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal((await stored()).length,3);
  await popup.getByRole('button',{name:'Remove Team 2',exact:true}).click();
  await popup.getByRole('button',{name:'Delete',exact:true}).click();
  assert.deepEqual((await stored()).map(team=>team.name),['Team 1','Team 2']);
  assert.deepEqual((await stored())[1].ids,mons.slice(0,3).map(m=>m.identity));
  await popup.click({position:{x:2,y:2}});assert.equal(await popup.count(),0);
  await reset();await open();assert.equal(await popup.locator('.battle-picker-team').count(),2);
  await popup.getByRole('button',{name:'Load Team 2',exact:true}).click();
  assert.equal(await myTeam.locator('.battle-compact-slot img').count(),3);

  // Losing a role clears only that active slot; stored team references stay intact.
  const beforeTeams=await stored();
  await page.evaluate(identity=>{const roles=JSON.parse(localStorage.getItem('emerald-companion-2.roles.v1'));delete roles[identity];localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify(roles));},mons[0].identity);
  await navigate('Home');await navigate('Battle');await open(1);
  assert.ok(await popup.getByRole('button',{name:'Load Team 2',exact:true}).isDisabled());
  assert.equal(await popup.locator(`[data-pokemon-id="${mons[0].identity}"]`).count(),0);
  assert.equal(await myTeam.locator('.battle-compact-slot').nth(1).locator('img').count(),1);
  assert.deepEqual(await stored(),beforeTeams);
  await page.keyboard.press('Escape');
  // Doubles uses four slots and requires exactly four picks.
  await page.getByRole('button',{name:'Battle Rules',exact:true}).click();
  await page.getByRole('dialog',{name:'Battle Rules',exact:true}).getByLabel('Battle Type').selectOption('Doubles');
  await page.keyboard.press('Escape');
  assert.equal(await myTeam.locator('.battle-compact-slot').count(),4);
  await open(4);await popup.getByRole('button',{name:'Create team',exact:true}).click();
  for(const i of [1,2,3])await row(i).click();
  assert.equal(await popup.getByRole('status').innerText(),'3/4 selected');
  assert.ok(await popup.getByRole('button',{name:'Save',exact:true}).isEnabled());
  await row(4).click();await popup.getByRole('button',{name:'Save',exact:true}).click();
  assert.equal((await stored())[2].ids.length,4);
  const doublesRow=popup.getByRole('button',{name:'Load Team 3',exact:true});
  assert.equal(await doublesRow.locator('img').count(),4);
  assert.ok(await doublesRow.evaluate(row=>row.scrollWidth<=row.clientWidth));
  await doublesRow.click();
  assert.equal(await myTeam.locator('.battle-compact-slot img').count(),4);
  await reset();await open(4);
  assert.equal(await popup.getByRole('button',{name:'Load Team 1',exact:true}).count(),0);
  assert.equal(await doublesRow.locator('img').count(),4);
  assert.ok(await doublesRow.evaluate(row=>row.scrollWidth<=row.clientWidth));
  await doublesRow.click();
  assert.equal(await myTeam.locator('.battle-compact-slot img').count(),4);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.ok(await myTeam.locator('.battle-compact-slots').evaluate(el=>{const r=el.getBoundingClientRect();return [...el.children].every(s=>s.getBoundingClientRect().right<=r.right+1);}));
  const finalRoles=await page.evaluate(()=>JSON.parse(localStorage.getItem('emerald-companion-2.roles.v1')));
  const expectedRoles={...roles};delete expectedRoles[mons[0].identity];assert.deepEqual(finalRoles,expectedRoles);
  await myTeam.locator('.battle-compact-slot img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  assert.ok(await myTeam.locator('.battle-compact-slot img').evaluateAll(images=>images.every(image=>image.naturalWidth>0)));
  await page.screenshot({path:`${artifactDir}/doubles-${width}.png`,fullPage:true});
  const slotButtons=myTeam.locator('.battle-compact-slot');
  const beforeRemoval=await slotButtons.locator('img').evaluateAll(images=>images.map(img=>img.getAttribute('src')));
  const immutableStorage=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
  const target=slotButtons.nth(1);
  if(width<500) {
    await target.tap();
    assert.equal(await slotButtons.locator('img').count(),4,'single touch keeps team');
    await page.waitForTimeout(400);
    await slotButtons.nth(0).tap();await slotButtons.nth(2).tap();
    assert.equal(await slotButtons.locator('img').count(),4,'different-slot taps keep team');
    await page.waitForTimeout(400);
    const scale=await page.evaluate(()=>visualViewport.scale);
    await target.tap();await target.tap();
    assert.equal(await page.evaluate(()=>visualViewport.scale),scale,'no double-tap zoom');
  } else {
    await target.click();assert.equal(await slotButtons.locator('img').count(),4,'single click keeps team');
    await target.dblclick();
  }
  assert.equal(await slotButtons.nth(1).innerText(),'+');
  assert.equal(await slotButtons.nth(1).locator('img').count(),0);
  for(const index of [0,2,3])assert.equal(await slotButtons.nth(index).locator('img').getAttribute('src'),beforeRemoval[index]);
  assert.equal(await page.getByRole('dialog').count(),0,'second click never opens the new empty slot');
  assert.equal(await page.evaluate(()=>getSelection().toString()),'');
  assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),immutableStorage,'collection, roles and presets unchanged');
  assert.ok(await slotButtons.evaluateAll(slots=>slots.every(slot=>{const style=getComputedStyle(slot);return style.touchAction==='manipulation' && (style.userSelect==='none' || style.webkitUserSelect==='none');})));
  const trainerStyle=await myTeam.locator('.battle-compact-trainer').evaluate(img=>{
    const style=getComputedStyle(img);return {width:style.width,height:style.height,fit:style.objectFit,rendering:style.imageRendering};
  });
  assert.deepEqual(trainerStyle,{width:'36px',height:'48px',fit:'contain',rendering:'pixelated'});
  assert.ok(await myTeam.evaluate(section=>{
    const bounds=section.getBoundingClientRect(), children=[...section.querySelector('.battle-player-heading').children].map(el=>el.getBoundingClientRect());
    const slots=[...section.querySelector('.battle-compact-slots').children].map(el=>el.getBoundingClientRect());
    return Math.abs(children[0].x-bounds.x)<1
      && children[0].bottom<=children[1].top
      && children[1].right<=slots[0].x
      && section.querySelector('.battle-player-heading').firstElementChild.classList.contains('battle-player-name')
      && Math.abs(children[1].x-bounds.x)<1;
  }),'trainer name is above the portrait, with team slots immediately to its right');
  assert.ok(await slotButtons.locator('img').evaluateAll(images=>images.every(img=>getComputedStyle(img).width==='40px' || img.getBoundingClientRect().width<=40)));
  await page.screenshot({path:`${artifactDir}/removed-${width}.png`,fullPage:true});
  await page.waitForTimeout(450);
  await open(2);assert.ok(await row(2).isEnabled());await row(2).click();
  assert.equal(await slotButtons.locator('img').count(),4,'removed Pokémon remains available to refill the same slot');
  const beforeClear=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
  const opponentBeforeClear=await page.getByRole('region',{name:'Opponent Team',exact:true}).innerHTML();
  const trainerName=myTeam.getByRole('button',{name:/double-tap to clear My Team/});
  if(width<500) {
    await trainerName.tap();assert.equal(await slotButtons.locator('img').count(),4,'single name tap keeps lineup');
    await page.waitForTimeout(400);
    const scale=await page.evaluate(()=>visualViewport.scale);
    await trainerName.tap();await trainerName.tap();
    assert.equal(await page.evaluate(()=>visualViewport.scale),scale);
  } else {
    await trainerName.click();assert.equal(await slotButtons.locator('img').count(),4,'single name click keeps lineup');
    await trainerName.dblclick();
  }
  assert.equal(await slotButtons.locator('img').count(),0);
  assert.deepEqual(await slotButtons.allTextContents(),['+','+','+','+']);
  assert.equal(await page.getByRole('dialog').count(),0);
  assert.equal(await page.getByRole('region',{name:'Opponent Team',exact:true}).innerHTML(),opponentBeforeClear);
  assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),beforeClear);
  await open();await popup.getByRole('button',{name:'Load Team 3',exact:true}).click();
  assert.equal(await slotButtons.locator('img').count(),4,'clearing keeps the saved preset loadable');
  // Create Singles while Battle Rules remains Doubles.
  await reset();await open();
  const beforeTypes=await stored();
  assert.deepEqual(await popup.locator('.battle-picker-team-name').allTextContents(),['Team 3']);
  await popup.getByRole('button',{name:'Create team',exact:true}).click();
  assert.equal(await popup.getByRole('combobox').count(),0);
  for(const i of [1,2,3])await row(i).click();
  assert.equal(await popup.getByRole('status').innerText(),'3/4 selected');
  await popup.getByRole('button',{name:'Save',exact:true}).click();
  assert.equal((await stored())[3].ids.length,3);
  assert.deepEqual((await stored()).slice(0,3),beforeTypes);
  assert.equal(await popup.getByRole('button',{name:'Load Team 4',exact:true}).count(),0);
  await popup.getByRole('button',{name:'Remove team',exact:true}).click();
  assert.deepEqual(await popup.locator('.battle-picker-team-name').allTextContents(),['Team 1','Team 2','Team 3','Team 4']);
  await popup.getByRole('button',{name:'Done',exact:true}).click();
  await page.keyboard.press('Escape');
  const changeFormat=async format=>{
    await page.getByRole('button',{name:'Battle Rules',exact:true}).click();
    await page.getByRole('dialog',{name:'Battle Rules',exact:true}).getByLabel('Battle Type').selectOption(format);
    await page.keyboard.press('Escape');
  };
  const beforeSwitch=await stored();
  await changeFormat('Singles');assert.deepEqual(await stored(),beforeSwitch);
  await open();assert.deepEqual(await popup.locator('.battle-picker-team-name').allTextContents(),['Team 1','Team 2','Team 4']);
  // Three selections enable Singles immediately; a fourth creates Doubles,
  // regardless of the active Singles rules. Deselecting the fourth stays valid.
  await popup.getByRole('button',{name:'Create team',exact:true}).click();
  assert.equal(await popup.getByRole('combobox').count(),0);
  for(const i of [1,2,3])await row(i).click();
  assert.equal(await popup.getByRole('status').innerText(),'3/4 selected');
  assert.ok(await popup.getByRole('button',{name:'Save',exact:true}).isEnabled());
  await row(4).click();
  assert.equal(await popup.getByRole('status').innerText(),'4/4 selected');
  assert.ok(await row(5).isDisabled());
  await row(4).click();
  assert.equal(await popup.getByRole('status').innerText(),'3/4 selected');
  assert.ok(await popup.getByRole('button',{name:'Save',exact:true}).isEnabled());
  await row(4).click();
  await page.screenshot({path:`${artifactDir}/independent-type-${width}.png`,fullPage:true});
  await popup.getByRole('button',{name:'Save',exact:true}).click();
  assert.equal((await stored())[4].ids.length,4);
  assert.equal(await popup.getByRole('button',{name:'Load Team 5',exact:true}).count(),0);
  // Remove mode exposes and can delete a team hidden by the active rules.
  await popup.getByRole('button',{name:'Remove team',exact:true}).click();
  assert.equal(await popup.locator('.battle-picker-team').count(),5);
  await popup.getByRole('button',{name:'Remove Team 5',exact:true}).click();
  await popup.getByRole('button',{name:'Delete',exact:true}).click();
  assert.equal((await stored()).length,4);
  assert.deepEqual(await popup.locator('.battle-picker-team-name').allTextContents(),['Team 1','Team 2','Team 4']);
  await page.keyboard.press('Escape');
  const beforeReturn=await stored();
  await changeFormat('Doubles');assert.deepEqual(await stored(),beforeReturn);
  await reset();await open();
  assert.deepEqual(await popup.locator('.battle-picker-team-name').allTextContents(),['Team 3']);
  assert.equal(await popup.locator('.battle-picker-team-level').innerText(),`Lv. ${Math.max(...[1,2,3,4].map(index=>mons[index].level))}`);
  assert.ok(await popup.locator('.battle-picker-team').evaluateAll(rows=>rows.every(row=>row.scrollWidth<=row.clientWidth)));
  await page.screenshot({path:`${artifactDir}/filtered-level-${width}.png`,fullPage:true});
  await page.keyboard.press('Escape');
  // Reimporting changes the derived level without changing the saved references.
  const unchangedTeams=await stored();
  for(const team of unchangedTeams)assert.deepEqual(Object.keys(team).sort(),['id','ids','name']);
  const updated=storage.slice();
  updated.set(makePokemon({species:4,pid:2,experience:344960}),4+2*80);
  const updatedSave=Buffer.from(makeSave({blocks:{storage:updated,saveBlock2:trainer}})).toString('base64');
  await page.evaluate(encoded=>localStorage.setItem('emerald-companion-2.save.v1',encoded),updatedSave);
  await reset();await open();
  assert.equal(await popup.getByRole('button',{name:'Load Team 3',exact:true}).locator('.battle-picker-team-level').innerText(),'Lv. 70');
  assert.deepEqual(await stored(),unchangedTeams);
  updated.fill(0,4+2*80,4+3*80);
  const missingSave=Buffer.from(makeSave({blocks:{storage:updated,saveBlock2:trainer}})).toString('base64');
  await page.evaluate(encoded=>localStorage.setItem('emerald-companion-2.save.v1',encoded),missingSave);
  await reset();await open();
  assert.equal(await popup.getByRole('button',{name:'Load Team 3',exact:true}).locator('.battle-picker-team-level').innerText(),'Lv. 50');
  assert.equal(await popup.getByRole('button',{name:'Load Team 3',exact:true}).locator('.battle-picker-team-missing').count(),1);
  assert.deepEqual(await stored(),unchangedTeams);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>localStorage.removeItem('emerald-companion-2.save.v1'));
  await reset();await open();
  assert.equal(await popup.getByRole('button',{name:'Load Team 3',exact:true}).locator('.battle-picker-team-missing').count(),4);
  assert.ok(await popup.getByRole('button',{name:'Load Team 3',exact:true}).isDisabled());
  assert.equal(await popup.getByRole('button',{name:'Load Team 3',exact:true}).locator('.battle-picker-team-level').innerText(),'Lv. —');
  assert.ok(await popup.locator('.battle-picker-team').evaluateAll(rows=>rows.every(row=>row.scrollWidth<=row.clientWidth)));
  await page.screenshot({path:`${artifactDir}/missing-team-${width}.png`,fullPage:true});
  await context.close();
  console.log(`PASS My Team picker ${width}px: slot identity, Frontier-only sprites/levels, scrolling, team load/create/cancel/delete/renumber, persisted Singles/Doubles, unavailable roles, single-tap safety, touch/desktop removal without slot shifting or storage changes, trainer sizes.`);
 }
 assert.deepEqual(errors,[]);
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
