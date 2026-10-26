import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5306,strictPort:true},plugins:[{
 name:'doubles-sides',configureServer(s){s.middlewares.use('/__doubles-sides',(_req,res)=>{
 res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/doublesSideConditions.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});await mkdir('artifacts/doubles-side-conditions',{recursive:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});await page.goto(`${server.resolvedUrls.local[0]}__doubles-sides`);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap();
  const own=page.getByRole('combobox',{name:'My Side active Pokémon',exact:true}),other=page.getByRole('combobox',{name:'Opponent Side active Pokémon',exact:true});
  const check=async(side,name,range)=>{
   await tap(`${side} ${name}`);const dialog=page.getByRole('dialog');assert.deepEqual(await dialog.locator('.battle-core-damage-hp').allTextContents(),[`${range} HP damage`]);
   assert.equal(await dialog.locator('.battle-core-damage-hp').evaluate(el=>el.previousElementSibling.className),'battle-core-damage-percent');
   await dialog.locator('.battle-core-damage-hp').tap();assert.equal(await dialog.count(),0);
  };
  await tap('Battle Conditions');assert.equal(await own.count(),0);assert.equal(await other.count(),0);
  await tap('Use Doubles');assert.equal(await own.inputValue(),'2');assert.equal(await other.inputValue(),'2');
  const sets=await page.getByRole('status',{name:'Possible set count'}).innerText(),obs=await page.getByRole('status',{name:'Opponent observations'}).innerText();
  for(const side of ['Player','Opponent'])for(const screen of ['Reflect','Light Screen'])await page.getByRole('checkbox',{name:`${side} ${screen}`,exact:true}).check();
  await check('Player','Strength','30–36');await check('Player','Surf','12–15');await check('Opponent','Strength','20–24');await check('Opponent','Surf','12–15');
  await own.selectOption('1');await check('Player','Surf','12–15');await check('Opponent','Surf','18–22');
  // Exercise the actual production matchup popup, not just the controlled stats fixture.
  const actual=page.getByRole('group',{name:'My matchup Pokémon',exact:true}).getByRole('button',{name:'Move information: Strength',exact:true});
  await actual.tap();const two=await page.getByRole('dialog').locator('.battle-core-damage-hp').innerText();await page.keyboard.press('Escape');
  await other.selectOption('1');await actual.tap();const one=await page.getByRole('dialog').locator('.battle-core-damage-hp').innerText();await page.keyboard.press('Escape');
  assert.ok(parseInt(two.split('–')[1])>parseInt(one.split('–')[1]),'production popup uses opposing count, not own count');
  await check('Player','Strength','23–28');await check('Player','Surf','18–22');
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).check();await check('Player','Strength','94–111');await check('Player','Surf','73–86');
  await page.getByRole('combobox',{name:'Opponent ability',exact:true}).selectOption('Trace');
  for(const armor of ['Battle Armor','Shell Armor']) {
   await page.getByRole('combobox',{name:'Opponent Copied Ability',exact:true}).selectOption(armor);await check('Player','Surf','18–22');
  }
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).uncheck();await page.getByRole('combobox',{name:'Opponent ability',exact:true}).selectOption('Synchronize');
  await other.selectOption('2');await tap('Use Singles');assert.equal(await own.count(),0);await check('Player','Surf','18–22');
  await tap('Use Doubles');assert.equal(await own.inputValue(),'1');assert.equal(await other.inputValue(),'2');await check('Player','Surf','12–15');
  await page.getByRole('spinbutton',{name:'Player current HP',exact:true}).fill('75');await page.getByRole('combobox',{name:'Player status',exact:true}).selectOption('burn');
  await tap('Select Gengar');assert.equal(await page.getByRole('checkbox',{name:'Player Reflect',exact:true}).isChecked(),true);assert.equal(await own.inputValue(),'1');assert.equal(await page.getByRole('combobox',{name:'Player status',exact:true}).inputValue(),'none');
  await tap('Opponent Houndoom');assert.equal(await page.getByRole('checkbox',{name:'Opponent Light Screen',exact:true}).isChecked(),true);assert.equal(await other.inputValue(),'2');
  await tap('Select Snorlax');await tap('Opponent Gardevoir');assert.equal(await page.getByRole('spinbutton',{name:'Player current HP',exact:true}).inputValue(),'75');
  assert.equal(await page.getByRole('status',{name:'Possible set count'}).innerText(),sets);assert.equal(await page.getByRole('status',{name:'Opponent observations'}).innerText(),obs);
  await tap('Battle Conditions');await tap('Battle Conditions');assert.equal(await own.inputValue(),'1');
  await page.screenshot({path:`artifacts/doubles-side-conditions/webkit-${width}.png`,fullPage:true});
  assert.ok((await page.getByRole('group',{name:'Active Pokémon',exact:true}).boundingBox()).height<=30,'one compact count row');
  for(const field of [own,other])assert.ok(await field.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await tap('Remove Snorlax');await tap('Select Gengar');assert.equal(await page.getByRole('checkbox',{name:'Player Reflect',exact:true}).isChecked(),true);assert.equal(await own.inputValue(),'1');
  await tap('Add Snorlax');await tap('Select Snorlax');assert.equal(await page.getByRole('checkbox',{name:'Player Reflect',exact:true}).isChecked(),true);assert.equal(await page.getByRole('combobox',{name:'Player status',exact:true}).inputValue(),'none');
  await tap('Remove Gardevoir');await tap('Opponent Houndoom');assert.equal(await page.getByRole('checkbox',{name:'Opponent Light Screen',exact:true}).isChecked(),true);
  await tap('Add Gardevoir');await tap('Opponent Gardevoir');assert.equal(await page.getByRole('checkbox',{name:'Opponent Light Screen',exact:true}).isChecked(),true);
  await tap('Reset');assert.equal(await own.inputValue(),'2');assert.equal(await other.inputValue(),'2');
  for(const side of ['Player','Opponent'])for(const screen of ['Reflect','Light Screen'])assert.equal(await page.getByRole('checkbox',{name:`${side} ${screen}`,exact:true}).isChecked(),false);
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS WebKit ${width}px: side counts/screens, both directions, exact ranges, armor, Singles/Doubles, switches, replacement, reset, unchanged observations and compact/no-overflow controls`);
 }
} finally {await browser?.close();await server.close();}
