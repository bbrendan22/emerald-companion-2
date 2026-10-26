import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({base:'/',server:{host:'127.0.0.1',port:0,hmr:false}});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const format of ['Singles','Doubles'])for(const width of [320,390]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/trace-test?*',route=>route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/conditionalAbilitiesPopup.jsx"></script>'}));
  await page.goto(new URL(`/trace-test?format=${format}`,server.resolvedUrls.local[0]).href);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap();
  const copy=side=>page.getByRole('combobox',{name:`${side} Trace Ability`,exact:true});
  const flash=side=>page.getByRole('checkbox',{name:`${side} Flash Fire Activated`,exact:true});
  const choices=side=>copy(side).locator('option').evaluateAll(options=>options.map(o=>o.value));
  const saved=()=>page.getByLabel('Conditions state').textContent().then(JSON.parse);
  if(format==='Singles') {
   assert.deepEqual(await choices('Player'),['','Early Bird','Flash Fire']);
   assert.equal(await copy('Player').inputValue(),'');
   await copy('Player').selectOption('Flash Fire');await flash('Player').check();
   await tap('Player Flamethrower');
   const active=await page.getByRole('dialog').locator('.battle-core-damage-hp').allTextContents();
   assert.ok(active.length);await page.keyboard.press('Escape');
   await flash('Player').uncheck();await tap('Player Flamethrower');
   const inactive=await page.getByRole('dialog').locator('.battle-core-damage-hp').allTextContents();
   assert.notDeepEqual(active,inactive);await page.keyboard.press('Escape');
   await flash('Player').check();
   await page.getByLabel('Observed ability',{exact:true}).selectOption('Early Bird');
   assert.deepEqual(await choices('Player'),['','Early Bird']);assert.equal(await copy('Player').inputValue(),'');
   assert.equal((await saved()).player[0].abilityState.flashFireActivated,false);
   await page.getByLabel('Observed ability',{exact:true}).selectOption('Flash Fire');
   assert.deepEqual(await choices('Player'),['','Flash Fire']);assert.equal(await copy('Player').inputValue(),'','one outcome stays manual');
   await copy('Player').selectOption('Flash Fire');await flash('Player').check();
   await tap('Opponent Snorlax');assert.deepEqual(await choices('Player'),['','Immunity','Thick Fat']);assert.equal(await copy('Player').inputValue(),'');
   await copy('Player').selectOption('Thick Fat');await tap('Faint enemy');
   assert.deepEqual(await choices('Player'),['']);assert.equal(await copy('Player').inputValue(),'');
   await tap('Reset');await tap('Opponent Ralts');
   await tap('Select Houndoom');assert.deepEqual(await choices('Opponent'),['','Flash Fire']);
   await copy('Opponent').selectOption('Flash Fire');await flash('Opponent').check();
   await tap('Select Snorlax');assert.deepEqual(await choices('Opponent'),['','Immunity']);assert.equal(await copy('Opponent').inputValue(),'');
  } else {
   assert.deepEqual(await choices('Player'),['','Early Bird','Flash Fire','Synchronize','Trace']);
   assert.deepEqual(await choices('Opponent'),['','Flash Fire','Trace']);
   await copy('Player').selectOption('Flash Fire');await flash('Player').check();
   assert.deepEqual(await choices('Opponent'),['','Flash Fire'],'resolved opposing Trace and teammate deduplicate');
   await copy('Opponent').selectOption('Flash Fire');await flash('Opponent').check();
   await tap('Select Houndoom');await tap('Opponent Houndoom');
   await page.getByLabel('Observed ability',{exact:true}).selectOption('Early Bird');
   // The other opposing Trace still holds Flash Fire, so it remains eligible.
   await tap('Opponent Ralts');await copy('Opponent').selectOption('');
   await page.waitForFunction(()=>JSON.parse(document.querySelector('[aria-label="Conditions state"]').textContent).player[0].abilityState.copiedAbility===null);
   assert.equal((await saved()).player[0].abilityState.copiedAbility,null,'unviewed Trace user reconciled');
   assert.equal((await saved()).player[0].abilityState.flashFireActivated,false);
   await tap('Select Ralts');
   assert.deepEqual(await choices('Player'),['','Early Bird','Synchronize','Trace']);
   await tap('Opponent Houndoom');await tap('Faint enemy');
   assert.deepEqual(await choices('Player'),['','Synchronize','Trace'],'fainted target excluded');
   await tap('Opponent Ralts');await tap('Faint enemy');assert.deepEqual(await choices('Player'),['']);
   await tap('Reset');assert.equal(await copy('Player').inputValue(),'');
   await tap('Remove Houndoom target');assert.deepEqual(await choices('Player'),['','Synchronize','Trace']);
   await tap('Add Houndoom target');assert.deepEqual(await choices('Player'),['','Early Bird','Flash Fire','Synchronize','Trace']);
   await tap('Select Houndoom');await tap('Faint player');await tap('Opponent Ralts');
   assert.deepEqual(await choices('Opponent'),['','Trace'],'opponent Trace excludes fainted player partner and bench');
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${format} ${width}px: opposing Trace options, observations, switching, fainting, resets and uncertainty`);
 }
} finally {await browser?.close();await server.close();}
