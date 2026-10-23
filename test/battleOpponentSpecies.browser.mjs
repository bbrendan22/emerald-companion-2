import {matchesBattleWords} from '../src/battle/searchWords.js';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium, webkit} from 'playwright';
import {preview} from 'vite';
import {towerSpecies, availableOpponentSpecies} from '../src/battle/opponentSpecies.js';
import {battleReducer, createBattleState} from '../src/battle/battleState.js';
const useWebKit=process.argv.includes('--webkit');
const server=await preview({preview:{host:'127.0.0.1',port:useWebKit?5207:5206,strictPort:true}});
const browser=await (useWebKit?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
const artifacts=`artifacts/opponent-species${useWebKit?'-webkit':''}`;
const errors=[];
try {
 await mkdir(artifacts,{recursive:true});
 for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[1440,900]]) {
  const context=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500,serviceWorkers:'block'});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
  const activate=async el=>width<500?el.tap():el.click();
  const battle=async()=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();};
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);await battle();
  const opponent=page.getByRole('region',{name:'Opponent Team',exact:true});
  const player=page.getByRole('region',{name:'My Team',exact:true});
  const playerBefore=await player.innerHTML();
  const slots=opponent.locator('.battle-compact-slot');
  const popup=page.getByRole('dialog',{name:'Select opponent Pokémon',exact:true});
  const search=popup.getByRole('searchbox',{name:'Search opponent Pokémon'});
  const rows=popup.locator('.battle-opponent-result');
  const saved=()=>slots.evaluateAll(els=>els.map(el=>el.querySelector('img')?.getAttribute('src')??null)).then(images=>images.map(src=>src?towerSpecies.find(mon=>mon.dex===Number(src.split('/').at(-1).replace('.png',''))).id:null));
  const names=()=>rows.locator('span').allTextContents();
  const all=towerSpecies.map(mon=>mon.name);
  const first=towerSpecies[0], second=towerSpecies[1];
  const fit=async()=>page.waitForFunction(()=>{const r=document.querySelector('[aria-label="Select opponent Pokémon"]')?.getBoundingClientRect();return r&&r.x>=0&&r.right<=innerWidth+1&&r.y>=0&&r.bottom<=innerHeight+1;},null,{timeout:10000});
  await activate(slots.nth(1));await fit();assert.deepEqual(await names(),all);
  await page.screenshot({path:`${artifacts}/full-popup-${width}.png`,fullPage:true});
  assert.equal(await rows.locator('small').count(),0);assert.equal(await popup.locator('select').count(),0);
  assert.equal(await rows.count(),new Set(await names()).size);
  assert.ok(await rows.first().locator('img').getAttribute('src').then(src=>src.includes('/pokemon/emerald/normal/')));
  await activate(search);await page.keyboard.type(first.name.toUpperCase());
  assert.ok(await search.evaluate(el=>document.activeElement===el));
  assert.deepEqual(await names(),all.filter(name=>matchesBattleWords(name,first.name)));
  await search.fill('no-such-species');assert.equal(await rows.count(),0);
  await search.fill('');
  await rows.last().scrollIntoViewIfNeeded();assert.ok(await popup.isVisible());
  assert.ok(await popup.locator('.battle-opponent-results').evaluate(el=>el.scrollTop>0));
  await search.fill(first.name);await activate(rows.first());assert.equal(await popup.count(),0);
  assert.equal(await slots.nth(1).locator('img').getAttribute('src'),`/emerald-companion-2/pokemon/box/${first.dex}.png`);
  assert.deepEqual(await saved(),[null,first.id,null]);
  await activate(slots.nth(0));await search.fill(second.name);await activate(rows.first());
  assert.deepEqual(await saved(),[second.id,first.id,null]);
  await activate(slots.nth(0));assert.equal(await popup.count(),0,'single tap preserves occupied slots');
  if(width<500) {await activate(slots.nth(0));} else await slots.nth(0).dblclick();
  assert.deepEqual(await saved(),[null,first.id,null]);
  assert.equal(await slots.nth(0).locator('img').count(),0);
  await page.waitForTimeout(450);
  // Ordinary trainer selection preserves species; clearing removes the lineup.
  const trainer=opponent.locator('.battle-opponent-trigger');
  await activate(trainer);
  const trainerPopup=page.getByRole('dialog',{name:'Select opponent trainer'});
  await trainerPopup.getByRole('searchbox').fill('BRADY');
  await activate(trainerPopup.getByRole('button',{name:'Select trainer BRADY',exact:true}));
  assert.deepEqual(await saved(),[null,first.id,null]);
  await activate(slots.nth(2));
  const allowed=availableOpponentSpecies(battleReducer(createBattleState(),{type:'opponentTrainer',key:'Youngster:BRADY'}));
  assert.deepEqual(await names(),allowed.map(mon=>mon.name));
  await search.fill('a');assert.deepEqual(await names(),allowed.filter(mon=>matchesBattleWords(mon.name,'a')).map(mon=>mon.name));
  await search.fill(allowed[0].name);await activate(rows.first());
  assert.deepEqual(await saved(),[null,first.id,allowed[0].id]);
  if(width<500) {await activate(trainer);await activate(trainer);} else await trainer.dblclick();
  assert.deepEqual(await saved(),[null,null,null]);
  assert.equal(await slots.locator('img').count(),0);
  await page.waitForTimeout(450);
  await activate(slots.nth(1));await search.fill(first.name);await activate(rows.first());
  await activate(slots.nth(2));await search.fill(allowed[0].name);await activate(rows.first());
  assert.equal(await trainer.locator('.battle-opponent-name').innerText(),'Opponent');
  // Three and four slots follow the existing rules. Fourth species survives toggling.
  await activate(page.getByRole('button',{name:'Battle Rules',exact:true}));
  const rules=page.getByRole('dialog',{name:'Battle Rules',exact:true});
  await rules.getByLabel('Battle Type',{exact:true}).selectOption('Doubles');
  await page.keyboard.press('Escape');assert.equal(await slots.count(),4);
  await activate(slots.nth(3));await search.fill(second.name);await activate(rows.first());
  const lineup=await saved();assert.deepEqual(lineup,[null,first.id,allowed[0].id,second.id]);
  await page.reload();await battle();assert.equal(await slots.count(),4);
  assert.deepEqual(await saved(),[null,null,null,null]);assert.equal(await slots.locator('img').count(),0);
  // Re-select explicitly after refresh: active lineups are intentionally session-only.
  for(const [slot,id] of lineup.entries()) {
   if(id===null)continue;
   const mon=towerSpecies.find(mon=>mon.id===id);
   await activate(slots.nth(slot));await search.fill(mon.name);await activate(rows.first());
  }
  assert.deepEqual(await saved(),lineup);
  await activate(page.getByRole('button',{name:'Battle Rules',exact:true}));
  await rules.getByLabel('Battle Type',{exact:true}).selectOption('Singles');await page.keyboard.press('Escape');
  assert.equal(await slots.count(),3);assert.deepEqual(await saved(),lineup.slice(0,3));
  // Dismissal, keyboard pan/resize and compact viewport scrolling.
  await activate(slots.nth(0));await activate(search);await page.keyboard.type('a');
  await page.evaluate(()=>window.dispatchEvent(new Event('scroll')));assert.ok(await popup.isVisible());
  if(width<500){await page.setViewportSize({width,height:Math.max(320,height-250)});await fit();}
  await search.fill('');await rows.last().scrollIntoViewIfNeeded();assert.ok(await popup.isVisible());
  await page.screenshot({path:`${artifacts}/popup-${width}.png`,fullPage:true});
  await page.keyboard.press('Escape');assert.equal(await popup.count(),0);
  await page.setViewportSize({width,height});
  await activate(slots.nth(0));await popup.click({position:{x:2,y:2}});assert.equal(await popup.count(),0);
  await activate(slots.nth(0));await page.mouse.click(4,100);assert.equal(await popup.count(),0);
  await activate(slots.nth(0));await activate(slots.nth(0));assert.equal(await popup.count(),0,'tapping the open slot toggles its popup closed');
  for(const symbol of ['Silver','Gold']) {
   await activate(trainer);
   await trainerPopup.getByRole('searchbox').fill('Anabel');
   await activate(trainerPopup.getByRole('button',{name:`Select trainer Anabel ${symbol}`,exact:true}));
   const brain=battleReducer(createBattleState(),{type:'opponentTrainer',key:`Anabel ${symbol}`});
   assert.deepEqual(await saved(),brain.opponentSpecies,`${symbol} auto-populates its own team`);
   assert.equal(await slots.locator('img').count(),3);
   if(width<500){await activate(trainer);await activate(trainer);}else await trainer.dblclick();
   assert.deepEqual(await saved(),[null,null,null]);assert.equal(await slots.locator('img').count(),0);
   await page.waitForTimeout(450);
  }
  assert.equal(await player.innerHTML(),playerBefore);assert.equal(await page.locator('.battle-matchup-title').innerText(),'Matchup');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.ok(await slots.evaluateAll(els=>els.every(el=>getComputedStyle(el).backgroundColor==='rgba(0, 0, 0, 0)')));
  await context.close();console.log(`PASS opponent species ${width}px: sorted/deduplicated pools, search, exact slots, removal, trainer preservation, rules, session-only lineups, scrolling and dismissal.`);
 }
 assert.deepEqual(errors,[]);
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
