import {selectedScenarioSections} from './fixtures/selectedScenarioSections.mjs';
import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5304,strictPort:true},plugins:[{
 name:'psywave-present-popup',configureServer(s){s.middlewares.use('/__psywave-present',(_req,res)=>{
  res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/psywavePresentPopup.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__psywave-present`);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap();
  const open=async(side,name)=>{await tap(`${side} ${name}`);return page.getByRole('dialog');};
  const close=async dialog=>{await dialog.locator('.battle-core-damage-hp').last().tap();assert.equal(await page.getByRole('dialog').count(),0);};
  const psy=async(side,min,max)=>{
   const dialog=await open(side,'Psywave');assert.equal(await dialog.locator('dd').first().innerText(),'Level-based');
   assert.deepEqual(await dialog.getByRole('region',{name:'Damage Calculation'}).locator('p').allTextContents(),[
    `${(min/2).toFixed(1)}% – ${(max/2).toFixed(1)}%`,`${min}–${max} HP damage`,'11 possible level-based damage rolls',
   ]);assert.equal(await dialog.locator('.battle-ability-result').count(),1,'one compact range, not11 cards');
   assert.equal(await dialog.locator('.battle-move-scenario-controls').count(),0);
   const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
   await close(dialog);
  };
  const labels=['DAMAGING PRESENT · 40 POWER · 39.84375%','DAMAGING PRESENT · 80 POWER · 29.6875%','DAMAGING PRESENT · 120 POWER · 10.15625%'];
  const sections=dialog=>selectedScenarioSections(dialog,labels);
  const present=async(side,ends)=>{
   const dialog=await open(side,'Present');assert.equal(await dialog.locator('dd').first().innerText(),'40');
   for await(const [i,section] of sections(dialog).entries()) {
    const max=ends[i],min=Math.floor(max*85/100),percent=max===0?'0% – 0%':`${(min/2).toFixed(1)}% – ${(max/2).toFixed(1)}%`;
    assert.deepEqual(await section.locator('p').allTextContents(),[labels[i],percent,`${min}–${max} HP damage`]);
   }
   assert.equal(await dialog.locator('.battle-core-damage-percent').count(),1,'no healing damage card');
   assert.equal(await dialog.locator('.battle-core-damage-note').innerText(),'Healing possibility: 20.3125% (not simulated).');
   const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);await close(dialog);
  };
  await psy('Player',25,75);await psy('Opponent',30,90);await present('Player',[28,55,81]);
  // EnemyLv60 uses level factor26 and Atk150: bases33/64/95, Normal STAB49/96/142.
  await present('Opponent',[49,96,142]);
  await tap('low');await psy('Player',0,1);
  await tap('high');await psy('Player',50,150);
  await tap('low-wonder');let lowDialog=await open('Player','Psywave');
  assert.deepEqual(await lowDialog.locator('.battle-core-damage-hp').allTextContents(),['0–1 HP damage','Blocked by Wonder Guard']);
  assert.deepEqual(await lowDialog.locator('.battle-ability-label:not(.battle-core-damage-note)').allTextContents(),['Immunity','Wonder Guard']);
  await close(lowDialog);
  await tap('low-dark');lowDialog=await open('Player','Psywave');
  assert.equal(await lowDialog.locator('.battle-core-damage-hp').innerText(),'Immune.');await close(lowDialog);
  await tap('normal');
  await tap('Battle Conditions');await page.getByRole('checkbox',{name:'Opponent Light Screen',exact:true}).check();
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).check();
  await page.getByRole('combobox',{name:'Battle weather',exact:true}).selectOption('sun');await psy('Player',25,75);
  await tap('Reset');await page.getByRole('checkbox',{name:'Opponent Reflect',exact:true}).check();await present('Player',[15,28,42]);
  await tap('Reset');await page.getByRole('combobox',{name:'Player status',exact:true}).selectOption('burn');await present('Player',[15,28,42]);
  await tap('guts');await present('Player',[42,81,121]);await psy('Player',25,75);
  await tap('Reset');await tap('same');await psy('Player',25,75);
  await tap('wonder');let dialog=await open('Player','Psywave');
  assert.deepEqual(await dialog.locator('.battle-ability-label:not(.battle-core-damage-note)').allTextContents(),['Immunity','Wonder Guard']);
  assert.deepEqual(await dialog.locator('.battle-core-damage-hp').allTextContents(),['25–75 HP damage','Blocked by Wonder Guard']);await close(dialog);
  dialog=await open('Player','Present');
  for await(const section of sections(dialog))assert.equal(await section.locator('.battle-core-damage-hp').last().innerText(),'Blocked by Wonder Guard');await close(dialog);
  await tap('dark');dialog=await open('Player','Psywave');assert.equal(await dialog.locator('.battle-core-damage-hp').innerText(),'Immune.');await close(dialog);
  await tap('ghost');await present('Player',[0,0,0]);
  await tap('unknown');dialog=await open('Player','Psywave');assert.equal(await dialog.locator('.battle-damage-unavailable').count(),1);await page.keyboard.press('Escape');
  dialog=await open('Player','Present');assert.equal(await dialog.locator('.battle-damage-unavailable').count(),1);
  assert.equal(await dialog.locator('.battle-core-damage-note').innerText(),'Healing possibility: 20.3125% (not simulated).');await page.keyboard.press('Escape');
  await tap('huge');await page.setViewportSize({width,height:480});dialog=await open('Opponent','Present');

  await dialog.locator('.battle-core-damage-note').scrollIntoViewIfNeeded();
  const note=await dialog.locator('.battle-core-damage-note').boundingBox();assert.ok(note.y>=0&&note.y+note.height<=480);
  await close(dialog);assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: Psywave one11-roll range/levels1/50/60/100/zero boundary, Present selected exact-probability power/healing note, both directions, percentage-first, modifiers, uncertainty, prevention/immunity/unavailable, scrolling/dismissal`);
 }
} finally {await browser?.close();await server.close();}
