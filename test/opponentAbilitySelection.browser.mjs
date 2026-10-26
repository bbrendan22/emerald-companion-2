import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({base:'/',server:{host:'127.0.0.1',port:0,hmr:false}});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const format of ['Singles','Doubles'])for(const width of [320,390]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/opponent-ability?*',route=>route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/opponentAbilitySelection.jsx"></script>'}));
  await page.goto(new URL(`/opponent-ability?format=${format}`,server.resolvedUrls.local[0]).href);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap();
  const ability=page.getByRole('combobox',{name:'Opponent ability',exact:true});
  const copy=side=>page.getByRole('combobox',{name:`${side} Trace Ability`,exact:true});
  const flash=side=>page.getByRole('checkbox',{name:`${side} Flash Fire Activated`,exact:true});
  const own=page.getByRole('group',{name:'My matchup Pokémon',exact:true});
  const popup=page.getByRole('dialog');
  const damage=async()=>{
   await own.getByRole('button',{name:'Move information: Flamethrower',exact:true}).tap();
   assert.doesNotMatch(await popup.innerText(),/Select the copied ability for Trace|Damage unavailable/i);
   const hp=await popup.locator('.battle-core-damage-hp').allTextContents();assert.ok(hp.length);
   assert.ok(await popup.locator('.battle-core-damage-percent').count());
   const box=await popup.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
   await page.keyboard.press('Escape');return hp;
  };
  await tap('Opponent Gardevoir');
  const sets=await page.getByLabel('Possible set count').textContent(),observed=await page.getByLabel('Observed item and moves').textContent();
  assert.equal(await ability.inputValue(),'');assert.equal(await copy('Opponent').inputValue(),'');
  const unknown=await damage();assert.equal(unknown.length,1,'equivalent Synchronize/Trace branches produce one result');
  await ability.selectOption('Synchronize');assert.deepEqual(await damage(),unknown);
  await ability.selectOption('Trace');assert.equal(await copy('Opponent').inputValue(),'');assert.deepEqual(await damage(),unknown);
  assert.equal(await page.getByLabel('Possible set count').textContent(),sets);
  assert.equal(await page.getByLabel('Observed item and moves').textContent(),observed);
  assert.ok((await copy('Opponent').locator('option').allTextContents()).includes('Flash Fire'));
  assert.ok(!(await copy('Opponent').locator('option').allTextContents()).includes('Wonder Guard'),'opponent-aware options stay restricted');
  await copy('Opponent').selectOption('Flash Fire');await flash('Opponent').check();assert.deepEqual(await damage(),['0–0 HP damage']);
  await copy('Opponent').selectOption('');assert.equal(await flash('Opponent').count(),0);assert.deepEqual(await damage(),unknown);
  await tap('Select Ralts');assert.equal(await copy('Player').inputValue(),'');
  const both=await damage();assert.equal(both.length,1,'both sides and hidden Trace are neutral');
  await ability.selectOption('Synchronize');assert.deepEqual(await damage(),both);
  await copy('Player').selectOption('Synchronize');assert.deepEqual(await damage(),both);
  await ability.selectOption('Trace');assert.equal(await copy('Player').inputValue(),'');assert.deepEqual(await damage(),both);
  await tap('Opponent Houndoom');await ability.selectOption('Early Bird');
  assert.equal(await copy('Player').inputValue(),'');const neutral=await damage();
  // Enable a legitimate Flash Fire target, copy it, then compare activation.
  await ability.selectOption('');await copy('Player').selectOption('Flash Fire');
  const inactive=await damage();await flash('Player').check();const active=await damage();assert.notDeepEqual(active,inactive);
  await ability.selectOption('Early Bird');assert.equal(await copy('Player').inputValue(),'');assert.deepEqual(await damage(),neutral);
  await tap('Select Houndoom');await tap('Select Ralts');assert.equal(await copy('Player').inputValue(),'');assert.deepEqual(await damage(),neutral);
  await tap('Reset');assert.equal(await copy('Player').inputValue(),'');assert.deepEqual(await damage(),neutral);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS ${format} ${width}px: real Frontier popup, neutral confirmed/possible Trace, equivalent results, observations, both sides, Flash Fire activation and switching`);
 }
} finally {await browser?.close();await server.close();}
