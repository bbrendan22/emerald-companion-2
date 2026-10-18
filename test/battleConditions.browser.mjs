import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
 const page=await browser.newPage({viewport:{width:375,height:800},isMobile:true,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
 const storage=new Uint8Array(33744);[1,4,7,25].forEach((species,i)=>storage.set(makePokemon({species,pid:i}),4+i*80));
 const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64'),savedText=JSON.stringify([{id:'t',name:'Test Team',ids:['0:0:0','0:1:0','0:2:0']}]);
 await page.evaluate(({encoded,savedText})=>{localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify(Object.fromEntries([0,1,2,3].map(i=>[`0:${i}:0`,'Frontier']))));localStorage.setItem('emerald-companion-2.battle-teams.v1',savedText);},{encoded,savedText});
 await page.reload();
 const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();};
 const tab=async name=>page.getByRole('tab',{name,exact:true}).click();
 const combo=name=>page.getByRole('combobox',{name,exact:true}),hp=side=>page.getByRole('spinbutton',{name:`${side} current HP`,exact:true}),box=name=>page.getByRole('checkbox',{name,exact:true});
 const region=page.getByRole('region',{name:'Battle Conditions',exact:true}),toggle=page.getByRole('button',{name:'Battle Conditions',exact:true});
 const header=side=>page.locator(`.battle-team-header.battle-side-${side}`),select=async name=>{await tab('Sets');await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill(name);await page.getByRole('button',{name:`Select ${name} 1`,exact:true}).click();};
 await navigate('Battle');assert.equal(await region.count(),0);assert.equal(await page.locator('.battle-matchup-card.battle-side-player').count(),1);
 await select('Sunkern');assert.equal(await region.count(),1);assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await combo('Battle weather').count(),0);assert.equal(await region.getByRole('button',{name:'Reset',exact:true}).isVisible(),true);
 await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
 const originalBars=await page.locator('.battle-matchup-bar span').evaluateAll(nodes=>nodes.map(n=>n.style.width));
 const rawStats=await page.locator('.battle-matchup-stats dd').allTextContents(),rawEffects=await page.locator('.battle-matchup-effect').allTextContents();
 assert.equal(await combo('Battle weather').locator('option').count(),5);assert.equal(await hp('Opponent').inputValue(),await hp('Opponent').getAttribute('max'));
 await combo('Battle weather').selectOption('rain');await box('Critical Hit').check();await hp('Player').fill('5');await combo('Player status').selectOption('burn');await hp('Opponent').fill('9');await combo('Opponent status').selectOption('paralysis');
 await combo('Player Atk stage').selectOption('2');await combo('Player Spe stage').selectOption('-1');await combo('Opponent Def stage').selectOption('-2');await box('Player Reflect').check();await box('Player Light Screen').check();await box('Opponent Reflect').check();
 for(const side of ['Player','Opponent'])for(const stat of ['Atk','Def','SpA','SpD','Spe'])assert.equal(await combo(`${side} ${stat} stage`).locator('option').count(),13);
 await combo('Opponent Spe stage').selectOption('6');assert.equal(await combo('Opponent Spe stage').inputValue(),'6');await combo('Opponent Spe stage').selectOption('-6');assert.equal(await combo('Opponent Spe stage').inputValue(),'-6');
 const adjustedStats=rawStats.map(Number);adjustedStats[1]*=2;adjustedStats[5]=Math.floor(adjustedStats[5]*2/3);adjustedStats[8]=Math.floor(adjustedStats[8]/2);adjustedStats[11]=Math.floor(adjustedStats[11]/4);
 assert.deepEqual((await page.locator('.battle-matchup-stats dd').allTextContents()).map(Number),adjustedStats);
 assert.deepEqual(await page.locator('.battle-matchup-bar span').evaluateAll(nodes=>nodes.map(n=>n.style.width)),originalBars);assert.deepEqual(await page.locator('.battle-matchup-effect').allTextContents(),rawEffects);
 async function assertPersistent(){assert.equal(await combo('Battle weather').inputValue(),'rain');assert.equal(await box('Critical Hit').isChecked(),true);assert.equal(await combo('Player Atk stage').inputValue(),'2');assert.equal(await combo('Opponent Def stage').inputValue(),'-2');assert.equal(await box('Player Reflect').isChecked(),true);assert.equal(await box('Player Light Screen').isChecked(),true);assert.equal(await box('Opponent Reflect').isChecked(),true);}
 await header('player').locator('.battle-team-slot:has(img)').nth(1).click();await assertPersistent();assert.equal(await combo('Player status').inputValue(),'none');assert.equal(await hp('Player').inputValue(),await hp('Player').getAttribute('max'));
 await header('player').locator('.battle-team-slot:has(img)').first().click();assert.equal(await hp('Player').inputValue(),'5');assert.equal(await combo('Player status').inputValue(),'burn');
 await select('Azurill');await assertPersistent();assert.equal(await combo('Opponent status').inputValue(),'none');
 await header('enemy').locator('.battle-team-slot:has(img)').first().click();assert.equal(await hp('Opponent').inputValue(),'9');assert.equal(await combo('Opponent status').inputValue(),'paralysis');
 await hp('Opponent').fill('99999');assert.equal(await hp('Opponent').inputValue(),await hp('Opponent').getAttribute('max'));
 await hp('Opponent').fill('-5');assert.equal(await hp('Opponent').inputValue(),'0');await hp('Opponent').fill('2.8');assert.equal(await hp('Opponent').inputValue(),'2');await hp('Opponent').fill('');await combo('Opponent status').focus();assert.equal(await hp('Opponent').inputValue(),'0');await hp('Opponent').fill('9');
 await toggle.click();await header('player').locator('.battle-team-slot:has(img)').nth(1).click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');await tab('Teams');await tab('Matchup');assert.equal(await toggle.getAttribute('aria-expanded'),'false');await toggle.click();await assertPersistent();
 await navigate('Trainer');await navigate('Battle');await assertPersistent();
 await tab('Teams');await page.getByRole('button',{name:'Load Test Team',exact:true}).click();await assertPersistent();assert.equal(await hp('Player').inputValue(),'5');
 await tab('Rules');await page.getByRole('button',{name:'Open Level',exact:true}).click();await combo('Open Level').selectOption('73');await tab('Matchup');await assertPersistent();assert.equal(await hp('Opponent').inputValue(),'9');
 await tab('Trainers');await page.getByRole('searchbox',{name:'Search trainers'}).fill('Anabel Silver');await page.locator('.battle-trainer-result').click();await tab('Matchup');assert.equal(await region.count(),0);assert.equal(await page.locator('.battle-matchup-card.battle-side-player').count(),1);
 await tab('Sets');await page.locator('.battle-set-select').first().click();await assertPersistent();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
 await header('enemy').locator('.battle-trainer-reset').press('Delete');assert.equal(await region.count(),0);await select('Sunkern');await assertPersistent();assert.equal(await hp('Opponent').inputValue(),'9');assert.equal(await combo('Opponent status').inputValue(),'paralysis');
 await header('player').locator('.battle-team-slot:has(img)').first().press('Delete');assert.equal(await region.count(),0);assert.equal(await page.locator('.battle-matchup-card.battle-side-enemy').count(),1);
 await tab('Teams');await page.locator('[data-pokemon-id="0:0:0"]').click();await assertPersistent();assert.equal(await hp('Player').inputValue(),'5');
 await header('enemy').locator('.battle-team-slot:has(img)').first().press('Delete');assert.equal(await region.count(),0);await select('Sunkern');await assertPersistent();assert.equal(await hp('Opponent').inputValue(),'9');
 for(const width of [320,375,430]) {
  await page.setViewportSize({width,height:800});await region.scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const sides=await page.locator('.battle-condition-side').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,right:r.right,overflow:n.scrollWidth>n.clientWidth};}));assert.equal(sides[0].y,sides[1].y);assert.ok(sides[1].x>=sides[0].right);assert.equal(sides.some(s=>s.overflow),false);
  await page.screenshot({path:`/private/tmp/battle-conditions-${width}.png`,fullPage:true});
 }
 await toggle.click();const teamBefore=await header('player').locator('img').evaluateAll(imgs=>imgs.map(i=>i.getAttribute('src'))),enemyBefore=await header('enemy').locator('img').evaluateAll(imgs=>imgs.map(i=>i.getAttribute('src')));
 await region.getByRole('button',{name:'Reset',exact:true}).click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');await toggle.click();assert.equal(await combo('Battle weather').inputValue(),'none');assert.equal(await box('Critical Hit').isChecked(),false);
 for(const side of ['Player','Opponent']) {assert.equal(await hp(side).inputValue(),await hp(side).getAttribute('max'));assert.equal(await combo(`${side} status`).inputValue(),'none');for(const stat of ['Atk','Def','SpA','SpD','Spe'])assert.equal(await combo(`${side} ${stat} stage`).inputValue(),'0');for(const screen of ['Reflect','Light Screen'])assert.equal(await box(`${side} ${screen}`).isChecked(),false);}
 assert.deepEqual(await header('player').locator('img').evaluateAll(imgs=>imgs.map(i=>i.getAttribute('src'))),teamBefore);assert.deepEqual(await header('enemy').locator('img').evaluateAll(imgs=>imgs.map(i=>i.getAttribute('src'))),enemyBefore);
 assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.save.v1')),encoded);assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.battle-teams.v1')),savedText);
 await tab('Rules');assert.equal(await combo('Open Level').inputValue(),'73');assert.deepEqual(errors,[]);
 console.log('Battle Conditions passed: conditional visibility, collapse retention, all controls/HP bounds, identity HP/status and side stages/screens, player/opponent switches, trainer changes, navigation, saved-team load, removal/re-addition, rules changes, Reset isolation, unchanged imported save/stat/move displays, and 320/375/430px fit.');
} finally {await browser.close();}
