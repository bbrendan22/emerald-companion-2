import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {preview} from 'vite';
import {availableOpponentSpecies} from '../src/battle/opponentSpecies.js';
const safari=process.argv.includes('--webkit');
const server=await preview({preview:{host:'127.0.0.1',port:safari?5207:5206,strictPort:true}});
const browser=await(safari?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
try {
 for(const width of [320,390,430,1440]) {
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500,serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  const tap=el=>width<500?el.tap():el.click();
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();
  const opponent=page.getByRole('region',{name:'Opponent Team',exact:true}),slots=opponent.locator('.battle-compact-slot');
  const player=page.getByRole('region',{name:'My Team',exact:true}),before=await player.innerHTML();
  const trigger=opponent.locator('.battle-opponent-trigger');
  const choose=async name=>{await tap(trigger);const popup=page.getByRole('dialog',{name:'Select opponent trainer'});await popup.getByRole('searchbox').fill(name.split(' ')[0]);await tap(popup.getByRole('button',{name:`Select trainer ${name}`,exact:true}));};
  const clear=async()=>{if(width<500){await tap(trigger);await tap(trigger);}else await trigger.dblclick();await page.waitForTimeout(450);};
  const roster=async state=>{
   await tap(slots.first());const popup=page.getByRole('dialog',{name:'Select opponent Pokémon'});
   const expected=availableOpponentSpecies(state);
   assert.deepEqual(await popup.locator('.battle-opponent-result span').allTextContents(),expected.map(mon=>mon.name));
   await popup.getByRole('searchbox').fill('no-such-species');assert.equal(await popup.getByRole('status').innerText(),'No Pokémon found.');
   await popup.getByRole('searchbox').fill(expected[0].name);
   await tap(popup.getByRole('button',{name:`Select Pokémon ${expected[0].name}`,exact:true}));
   assert.equal(await slots.first().locator('img').getAttribute('src'),`/emerald-companion-2/pokemon/box/${expected[0].dex}.png`);
  };
  assert.ok(await slots.evaluateAll(els=>els.every(el=>el.disabled)));
  await slots.first().evaluate(el=>el.click());assert.equal(await page.getByRole('dialog').count(),0);
  await choose('BRADY');assert.equal(await slots.locator('img').count(),0);assert.ok(await slots.first().isEnabled());
  await roster({selectedTrainer:'Youngster:BRADY'});
  await clear();assert.equal(await slots.locator('img').count(),0);assert.ok(await slots.first().isDisabled());
  await choose('Anabel Gold');assert.equal(await slots.locator('img').count(),0);await roster({selectedTrainer:'Anabel',selectedBrainSymbol:'Gold'});
  await clear();await choose('VINCE');
  const rules=async(format,level)=>{await tap(page.getByRole('button',{name:'Battle Rules',exact:true}));const dialog=page.getByRole('dialog',{name:'Battle Rules'});await dialog.getByLabel('Battle Type',{exact:true}).selectOption(format);await dialog.getByLabel('Level',{exact:true}).selectOption(level);await page.keyboard.press('Escape');};
  await rules('Doubles','85');assert.equal(await slots.count(),4);await roster({selectedTrainer:'Cooltrainer (M):VINCE'});
  await rules('Singles','50');assert.equal(await slots.count(),3);
  assert.deepEqual(await player.innerHTML(),before);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  await context.close();console.log(`PASS trainer-specific opponent selection ${width}px: gate, exact rosters, search, no auto-fill, resets, My Team, Singles/Doubles, Level 50/Open Level.`);
 }
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
