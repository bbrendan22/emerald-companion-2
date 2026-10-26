import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5302,strictPort:true},plugins:[{
 name:'conditional-abilities',configureServer(s){s.middlewares.use('/__conditional-abilities',(_req,res)=>{
 res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/conditionalAbilitiesPopup.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,390,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__conditional-abilities`);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap();
  const copy=side=>page.getByRole('combobox',{name:`${side} Copied Ability`,exact:true});
  const flash=side=>page.getByRole('checkbox',{name:`${side} Flash Fire Activated`,exact:true});
  const close=()=>page.keyboard.press('Escape');
  await tap('Battle Conditions');
  assert.equal(await copy('Player').inputValue(),'');assert.equal(await copy('Opponent').inputValue(),'');
  assert.equal(await copy('Player').locator('option').count(),77);
  assert.equal(await flash('Player').count(),0);
  await tap('Player Flamethrower');assert.match(await page.getByRole('dialog').innerText(),/select the copied ability for Trace/);await close();
  await copy('Opponent').selectOption('Immunity');
  await tap('Player Psywave');assert.deepEqual(await page.getByRole('dialog').locator('.battle-core-damage-hp').allTextContents(),['25–75 HP damage']);await close();
  await tap('Player Guillotine');assert.deepEqual(await page.getByRole('dialog').locator('.battle-core-damage-outcome').allTextContents(),['OHKO']);await close();
  await copy('Player').selectOption('Flash Fire');
  assert.equal(await flash('Player').isChecked(),false);
  await tap('Player Flamethrower');const inactive=await page.getByRole('dialog').locator('.battle-core-damage-hp').allTextContents();await close();
  await flash('Player').check();await tap('Player Flamethrower');
  const active=await page.getByRole('dialog').locator('.battle-core-damage-hp').allTextContents();assert.notDeepEqual(active,inactive);
  const box=await page.getByRole('dialog').locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
  await page.getByRole('dialog').locator('.battle-core-damage-hp').first().tap();assert.equal(await page.getByRole('dialog').count(),0);
  // Production matchup also receives the saved conditional ability state.
  await page.getByRole('group',{name:'My matchup Pokémon',exact:true}).getByRole('button',{name:'Move information: Flamethrower',exact:true}).tap();
  assert.doesNotMatch(await page.getByRole('dialog').innerText(),/select the copied ability for Trace/);await close();
  await tap('Battle Conditions');await tap('Battle Conditions');
  assert.equal(await copy('Player').inputValue(),'Flash Fire');assert.equal(await flash('Player').isChecked(),true,'collapse preserves valid activation');
  for(const armor of ['Battle Armor','Shell Armor']) {
   await copy('Opponent').selectOption(armor);
   await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).uncheck();
   await tap('Player Flamethrower');const normal=await page.getByRole('dialog').locator('.battle-core-damage-hp').allTextContents();await close();
   await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).check();
   await tap('Player Flamethrower');const critical=await page.getByRole('dialog').locator('.battle-core-damage-hp').allTextContents();
   assert.equal(critical[0],normal[0],'copied armor ignores selected crit');assert.equal(critical.length,2,'Synchronize retains its legitimate critical alternative');await close();
  }
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).uncheck();
  await copy('Opponent').selectOption('Flash Fire');assert.equal(await flash('Opponent').isChecked(),false);await flash('Opponent').check();
  await tap('Opponent Flamethrower');assert.ok((await page.getByRole('dialog').locator('.battle-core-damage-hp').allTextContents()).some(s=>s.startsWith('0–0')));await close();
  await tap('Opponent ralts');assert.equal(await copy('Opponent').inputValue(),'');assert.equal(await flash('Opponent').count(),0);
  await copy('Opponent').selectOption('Plus');await tap('Opponent gardevoir');
  assert.equal(await copy('Opponent').inputValue(),'Flash Fire');assert.equal(await flash('Opponent').isChecked(),true,'opponent slots retain independent state');
  await copy('Player').selectOption('Levitate');assert.equal(await flash('Player').count(),0);
  await copy('Player').selectOption('Flash Fire');assert.equal(await flash('Player').isChecked(),false,'changing copy clears activation');
  await flash('Player').check();await tap('Select Houndoom');assert.equal(await copy('Player').count(),0);assert.equal(await flash('Player').isChecked(),false);
  await tap('Select Snorlax');assert.equal(await flash('Player').count(),0);assert.equal(await copy('Player').count(),0);
  await tap('Select Ralts');assert.equal(await flash('Player').isChecked(),true,'same slot retains state');
  await tap('Battle Conditions');await tap('Change ability');await tap('Change ability');await tap('Battle Conditions');
  assert.equal(await copy('Player').inputValue(),'','ability changes invalidate even while collapsed');
  await copy('Player').selectOption('Flash Fire');await flash('Player').check();await tap('Reset');
  assert.equal(await copy('Player').inputValue(),'');assert.equal(await copy('Opponent').inputValue(),'');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.ok(await copy('Player').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
  await copy('Player').selectOption('Flash Fire');await flash('Player').check();await tap('Remove Ralts');
  await tap('Select Houndoom');assert.equal(await flash('Player').isChecked(),false);
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS WebKit ${width}px: contextual copied ability/activation, both sides, uncertainty, actual matchup, reset, persistence, dismissal and no overflow`);
 }
} finally {await browser?.close();await server.close();}
