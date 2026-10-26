import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5307,strictPort:true},plugins:[{
 name:'spread-popup',configureServer(s){s.middlewares.use('/__spread',(_req,res)=>{
 res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/doublesSideConditions.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});await mkdir('artifacts/spread-damage',{recursive:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`${server.resolvedUrls.local[0]}__spread`);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap();
  const own=page.getByRole('combobox',{name:'My Side active Pokémon',exact:true}),other=page.getByRole('combobox',{name:'Opponent Side active Pokémon',exact:true});
  const dialog=page.getByRole('dialog'),hp=dialog.locator('.battle-core-damage-hp');
  const expectRange=async range=>{
   assert.equal(await hp.innerText(),`${range} HP damage`);
   assert.equal(await hp.evaluate(el=>el.previousElementSibling.className),'battle-core-damage-percent');
   const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
  };
  const close=async()=>{await hp.tap();assert.equal(await dialog.count(),0);};
  await tap('Battle Conditions');await tap('Use Doubles');assert.equal(await other.inputValue(),'2');
  const observations=await page.getByRole('status',{name:'Opponent observations'}).innerText(),sets=await page.getByRole('status',{name:'Possible set count'}).innerText();
  await tap('Player Surf');await expectRange('18–22');assert.equal(await dialog.locator('dd').first().innerText(),'95');
  assert.equal(await dialog.locator('.battle-move-scenario-controls').count(),0,'no spread toggle or extra popup control');
  // Fixture-only keyboard actions dispatch the same count action as the existing
  // controls, verifying a live React update without closing the native modal.
  await page.keyboard.press('1');await expectRange('36–43');assert.equal(await dialog.count(),1);assert.equal(await other.inputValue(),'1');
  await page.keyboard.press('2');await expectRange('18–22');assert.equal(await dialog.locator('dd').first().innerText(),'95');
  await page.screenshot({path:`artifacts/spread-damage/webkit-${width}.png`});await close();
  for(const [name,range] of [['Rock Slide','15–18'],['Heat Wave','20–24'],['Eruption','29–35'],['Water Spout','29–35']]){await tap(`Player ${name}`);await expectRange(range);await close();}
  for(const [name,range] of [['Earthquake','39–46'],['Magnitude','27–32'],['DoubleSlap','30–36']]) {
   await tap(`Player ${name}`);await expectRange(range);await page.keyboard.press('1');await expectRange(range);await page.keyboard.press('2');await close();
  }
  await other.selectOption('1');await tap('Opponent Surf');await expectRange('18–22');
  await page.keyboard.press('Alt+1');await expectRange('36–43');assert.equal(await own.inputValue(),'1');
  await page.keyboard.press('Alt+2');await expectRange('18–22');await close();await other.selectOption('2');
  await page.getByRole('checkbox',{name:'Opponent Light Screen',exact:true}).check();await page.getByRole('checkbox',{name:'Opponent Reflect',exact:true}).check();
  await tap('Player Surf');await expectRange('12–15');await close();await tap('Player Rock Slide');await expectRange('11–13');await close();
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).check();await tap('Player Surf');await expectRange('37–44');
  await page.keyboard.press('1');await expectRange('73–86');await page.keyboard.press('2');await expectRange('37–44');await close();
  await page.getByRole('combobox',{name:'Opponent ability',exact:true}).selectOption('Trace');
  for(const armor of ['Battle Armor','Shell Armor']) {
   await page.getByRole('combobox',{name:'Opponent Copied Ability',exact:true}).selectOption(armor);await tap('Player Surf');await expectRange('12–15');await close();
  }
  await page.getByRole('combobox',{name:'Opponent ability',exact:true}).selectOption('Synchronize');await tap('Reset');
  await tap('Use Singles');assert.equal(await other.count(),0);await tap('Player Surf');await expectRange('36–43');await close();
  await tap('Use Doubles');await other.selectOption('1');await tap('Player Surf');await expectRange('36–43');await close();await other.selectOption('2');
  // Repeat live-count updates through the actual production BattleMatchup popup.
  await page.getByRole('group',{name:'My matchup Pokémon',exact:true}).getByRole('button',{name:'Move information: Surf',exact:true}).tap();
  const reduced=await hp.innerText();assert.equal(await dialog.locator('.battle-damage-unavailable').count(),0);
  await page.keyboard.press('1');const full=await hp.innerText();assert.ok(parseInt(full.split('–')[1])>parseInt(reduced.split('–')[1]));
  await page.keyboard.press('2');assert.equal(await hp.innerText(),reduced);await close();
  assert.equal(await page.getByRole('status',{name:'Opponent observations'}).innerText(),observations);assert.equal(await page.getByRole('status',{name:'Possible set count'}).innerText(),sets);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  await page.close();console.log(`PASS WebKit ${width}px: live spread updates in actual/controlled popups, both directions, exclusions, HP power, screens/crit/armor, Singles, unchanged metadata/state and no overflow`);
 }
} finally {await browser?.close();await server.close();}
