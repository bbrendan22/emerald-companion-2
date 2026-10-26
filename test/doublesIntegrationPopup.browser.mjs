import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5310,strictPort:true},plugins:[{name:'doubles-integration',configureServer(s){s.middlewares.use('/__integration',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/doublesSideConditions.jsx"></script>');});}}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});await mkdir('artifacts/doubles-integration',{recursive:true});
 for(const width of [320,375,390,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.goto(`${server.resolvedUrls.local[0]}__integration`);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap(),box=name=>page.getByRole('checkbox',{name,exact:true});
  const own=page.getByRole('combobox',{name:'My Side active Pokémon',exact:true}),enemy=page.getByRole('combobox',{name:'Opponent Side active Pokémon',exact:true});
  const dialog=page.getByRole('dialog'),hp=dialog.locator('.battle-core-damage-hp');
  const close=async()=>{await hp.first().tap();assert.equal(await dialog.count(),0);};
  const range=async expected=>{assert.deepEqual(await hp.allTextContents(),[`${expected} HP damage`]);assert.equal(await hp.evaluate(el=>el.previousElementSibling.className),'battle-core-damage-percent');const b=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width+1);};
  const check=async(name,expected)=>{await tap(name);await range(expected);await close();};
  await tap('Battle Conditions');assert.equal(await own.count(),0);assert.equal(await box('Player Helping Hand Active').count(),0);await tap('Use Doubles');
  assert.equal(await own.inputValue(),'2');assert.equal(await enemy.inputValue(),'2');
  for(const side of ['Player','Opponent']) {await box(`${side} Light Screen`).check();await box(`${side} Reflect`).check();await box(`${side} Helping Hand Active`).check();}
  const observations=await page.getByRole('status',{name:'Opponent observations'}).innerText(),sets=await page.getByRole('status',{name:'Possible set count'}).innerText();
  await check('Player Surf','18–22');await check('Opponent Surf','18–22');
  await own.selectOption('1');await check('Player Surf','18–22');await check('Opponent Surf','28–33');
  await box('Critical Hit').check();await check('Player Surf','56–66');await check('Opponent Surf','109–129');await own.selectOption('2');
  await check('Player Razor Wind','72–85');
  await page.getByRole('combobox',{name:'Opponent ability',exact:true}).selectOption('Trace');
  for(const armor of ['Battle Armor','Shell Armor']) {await page.getByRole('combobox',{name:'Opponent Copied Ability',exact:true}).selectOption(armor);await check('Player Razor Wind','23–28');}
  await box('Critical Hit').uncheck();await page.getByRole('combobox',{name:'Opponent Copied Ability',exact:true}).selectOption('Flash Fire');
  assert.equal(await box('Opponent Helping Hand Active').isChecked(),true);await check('Opponent Heat Wave','20–24');await box('Opponent Flash Fire Activated').check();await check('Opponent Heat Wave','28–34');
  assert.ok(await page.getByRole('combobox',{name:'Opponent Copied Ability',exact:true}).evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
  await page.screenshot({path:`artifacts/doubles-integration/conditional-abilities-${width}.png`,fullPage:true});
  await page.getByRole('combobox',{name:'Opponent ability',exact:true}).selectOption('Synchronize');assert.equal(await box('Opponent Flash Fire Activated').count(),0);assert.equal(await box('Opponent Helping Hand Active').isChecked(),true);
  await check('Player Comet Punch','33–39');await check('Player Triple Kick','10–14'); // Reflect ->base4/6/10 ->HH6/9/15 ->Psychic resistance3/4/7 ->random2–3/3–4/5–7.
  await tap('Player Surf');await page.keyboard.press('1');await range('28–33');await page.keyboard.press('h');await range('18–22');await page.keyboard.press('h');await range('28–33');await page.keyboard.press('2');await range('18–22');await close();
  await tap('Select Gengar');assert.equal(await box('Player Helping Hand Active').isChecked(),false);assert.equal(await box('Player Reflect').isChecked(),true);await tap('Select Snorlax');assert.equal(await box('Player Helping Hand Active').isChecked(),true);
  await tap('Opponent Houndoom');assert.equal(await box('Opponent Helping Hand Active').isChecked(),false);assert.equal(await box('Opponent Light Screen').isChecked(),true);await tap('Opponent Gardevoir');
  assert.equal(await page.getByRole('status',{name:'Opponent observations'}).innerText(),observations);assert.equal(await page.getByRole('status',{name:'Possible set count'}).innerText(),sets);
  await tap('Use Singles');assert.equal(await own.count(),0);assert.equal(await box('Player Helping Hand Active').count(),0);await check('Player Surf','18–22');await tap('Use Doubles');assert.equal(await box('Player Helping Hand Active').isChecked(),true);
  await tap('Battle Conditions');await tap('Battle Conditions');await check('Player Surf','18–22');
  assert.equal(await page.getByRole('group',{name:'Active Pokémon',exact:true}).count(),1);assert.equal(await page.locator('.battle-matchup-position').count(),2);
  const countRow=await page.getByRole('group',{name:'Active Pokémon',exact:true}).boundingBox();assert.ok(countRow.height<=30);
  for(const select of [own,enemy])assert.ok(await select.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
  for(const side of ['Player','Opponent'])assert.ok(await box(`${side} Helping Hand Active`).evaluate(el=>el.parentElement.getBoundingClientRect().height<=32));
  await own.focus();assert.equal(await page.evaluate(()=>visualViewport.scale),1);await own.blur();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`artifacts/doubles-integration/conditions-${width}.png`,fullPage:true});
  await tap('Player Surf');await page.screenshot({path:`artifacts/doubles-integration/popup-${width}.png`});await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);
  await tap('Reset');assert.equal(await own.inputValue(),'2');assert.equal(await enemy.inputValue(),'2');for(const side of ['Player','Opponent'])for(const field of ['Helping Hand Active','Reflect','Light Screen'])assert.equal(await box(`${side} ${field}`).isChecked(),false);
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS WebKit ${width}px: combined screens/spread/Helping Hand/crit/armor, multi-hit, both directions, live updates, state/observations, compact controls, no zoom/overflow, dismissal`);
 }
} finally {await browser?.close();await server.close();}
