import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5304,strictPort:true},plugins:[{
 name:'opponent-ability',configureServer(s){s.middlewares.use('/__opponent-ability',(_req,res)=>{
 res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/opponentAbilitySelection.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});await page.goto(`${server.resolvedUrls.local[0]}__opponent-ability`);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap(),ability=page.getByRole('combobox',{name:'Opponent ability',exact:true});
  const own=page.getByRole('group',{name:'My matchup Pokémon',exact:true}),enemy=page.getByRole('group',{name:'Opponent matchup Pokémon',exact:true});
  const copy=page.getByRole('combobox',{name:'Opponent Copied Ability',exact:true}),flash=page.getByRole('checkbox',{name:'Opponent Flash Fire Activated',exact:true});
  const open=()=>own.getByRole('button',{name:'Move information: Flamethrower',exact:true}).tap();
  const close=()=>page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Opponent Houndoom',exact:true}).waitFor();
  assert.equal(await ability.inputValue(),'');assert.deepEqual(await ability.locator('option').allTextContents(),['Both / Unknown','Early Bird','Flash Fire']);
  const count=await page.getByRole('status',{name:'Possible set count'}).innerText(),observed=await page.getByRole('status',{name:'Observed item and moves'}).innerText();
  await open();assert.equal(await page.getByRole('dialog').locator('.battle-core-damage-hp').count(),2);await close();
  for(const name of ['Early Bird','Flash Fire','']) {
   await ability.selectOption(name);assert.equal(await page.locator('.battle-opponent-ability-values').innerText(),name||'Early Bird / Flash Fire');
   assert.equal(await page.getByRole('status',{name:'Possible set count'}).innerText(),count);assert.equal(await page.getByRole('status',{name:'Observed item and moves'}).innerText(),observed);
   await open();const hp=await page.getByRole('dialog').locator('.battle-core-damage-hp').allTextContents();assert.equal(hp.length,name?1:2);
   if(name==='Flash Fire')assert.deepEqual(hp,['0–0 HP damage']);
   const box=await page.getByRole('dialog').locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
   await page.getByRole('dialog').locator('.battle-core-damage-hp').first().tap();assert.equal(await page.getByRole('dialog').count(),0);
  }
  await ability.selectOption('Flash Fire');await tap('Battle Conditions');assert.equal(await flash.count(),1);await flash.check();
  const enemyMove=enemy.getByRole('button',{name:/^Move information:/}).first();await enemyMove.tap();assert.equal(await page.getByRole('dialog').locator('.battle-damage-unavailable').count(),0);await close();
  await tap('Opponent Gardevoir');assert.equal(await ability.inputValue(),'');assert.equal(await copy.count(),1);
  await ability.selectOption('Synchronize');assert.equal(await copy.count(),0);await open();assert.equal(await page.getByRole('dialog').locator('.battle-damage-unavailable').count(),0);await close();
  await ability.selectOption('Trace');assert.equal(await copy.inputValue(),'');await open();assert.match(await page.getByRole('dialog').innerText(),/select the copied ability for Trace/);await close();
  await copy.selectOption('Flash Fire');await flash.check();await open();assert.deepEqual(await page.getByRole('dialog').locator('.battle-core-damage-hp').allTextContents(),['0–0 HP damage']);await close();
  await tap('Select Swampert');assert.equal(await ability.inputValue(),'Trace');await tap('Opponent Houndoom');assert.equal(await ability.inputValue(),'Flash Fire');
  await tap('Opponent Gardevoir');assert.equal(await ability.inputValue(),'Trace');assert.equal(await copy.inputValue(),'Flash Fire');
  await tap('Change level');assert.equal(await ability.inputValue(),'Trace');await tap('Reset');assert.equal(await ability.inputValue(),'Trace');assert.equal(await copy.inputValue(),'');
  await tap('Battle Conditions');await tap('Battle Conditions');assert.equal(await ability.inputValue(),'Trace');
  await tap('Opponent Weezing');assert.equal(await ability.count(),0);assert.equal(await enemy.locator('.battle-active-ability').innerText(),'Levitate');
  await tap('Opponent Gardevoir');await tap('Remove Gardevoir');await tap('Add Gardevoir');await tap('Opponent Gardevoir');assert.equal(await ability.inputValue(),'');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.ok(await ability.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));assert.deepEqual(errors,[]);
  await page.close();console.log(`PASS WebKit ${width}px: ability Both/first/second, damage narrowing, Trace, state lifecycle, single ability, unchanged set/item/moves and no overflow`);
 }
} finally {await browser?.close();await server.close();}
