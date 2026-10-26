import {selectedScenarioSections} from './fixtures/selectedScenarioSections.mjs';
import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5301,strictPort:true},plugins:[{
 name:'conditional-damage-popup',configureServer(s){s.middlewares.use('/__conditional-damage',(_req,res)=>{
  res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/conditionalDamagePopup.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__conditional-damage`);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap();
  const open=async(side,name)=>{await tap(`${side} ${name}`);return page.getByRole('dialog');};
  const labels=name=>name==='Pursuit'?['NORMAL HIT · 40 POWER','TARGET SWITCHING · 80 POWER']:['NORMAL HIT · 60 POWER','AFTER TAKING QUALIFYING DAMAGE · 120 POWER'];
  const sections=(dialog,name)=>selectedScenarioSections(dialog,labels(name));
  const check=async(side,name,ends)=>{
   const dialog=await open(side,name);
   assert.equal(await dialog.locator('dd').first().innerText(),name==='Pursuit'?'40':'60');
   assert.equal(await dialog.locator('header img').getAttribute('alt'),name==='Pursuit'?'dark type':'fighting type');
   for await(const [i,section] of sections(dialog,name).entries()) {
    const max=ends[i],min=Math.floor(max*85/100),percentage=max===0?'0% – 0%':`${(min/2).toFixed(1)}% – ${(max/2).toFixed(1)}%`;
    assert.deepEqual(await section.locator('p').allTextContents(),[labels(name)[i],percentage,`${min}–${max} HP damage`]);
   }
   assert.equal(await dialog.locator('.battle-core-damage-percent').count(),1,'one selected scenario range');
   const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
   await dialog.locator('.battle-core-damage-hp').last().tap();assert.equal(await page.getByRole('dialog').count(),0,'tap dismissal');
  };
  await check('Player','Pursuit',[19,38]);await check('Opponent','Pursuit',[17,34]);
  await check('Player','Revenge',[56,112]);await check('Opponent','Revenge',[82,164]);
  await tap('Battle Conditions');
  await page.getByRole('checkbox',{name:'Opponent Reflect',exact:true}).check();await check('Player','Revenge',[30,60]);
  await page.getByRole('checkbox',{name:'Opponent Light Screen',exact:true}).check();await check('Player','Pursuit',[10,20]);
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).check();await check('Player','Pursuit',[38,76]);await check('Player','Revenge',[112,224]);
  await tap('Reset');
  await page.getByRole('combobox',{name:'Player status',exact:true}).selectOption('burn');await check('Player','Revenge',[30,60]);
  await tap('guts');await check('Player','Revenge',[82,164]);await check('Player','Pursuit',[19,38]);
  await tap('Reset');await tap('normal');
  await page.getByRole('spinbutton',{name:'Player current HP',exact:true}).fill('1');await page.getByRole('spinbutton',{name:'Player current HP',exact:true}).blur();
  await check('Player','Revenge',[56,112]);await check('Player','Pursuit',[19,38]);
  await tap('huge');let dialog=await open('Opponent','Revenge');
  for await(const [i,section] of sections(dialog,'Revenge').entries()) {
   assert.deepEqual(await section.locator('.battle-ability-label').allTextContents(),[labels('Revenge')[i],'Immunity','Huge Power']);
   assert.deepEqual(await section.locator('.battle-core-damage-hp').allTextContents(),i===0?['69–82 HP damage','137–162 HP damage']:['139–164 HP damage','275–324 HP damage']);
  }
  await page.keyboard.press('Escape');
  await tap('wonder');dialog=await open('Player','Pursuit');
  for await(const section of sections(dialog,'Pursuit')) {
   assert.equal(await section.locator('.battle-core-damage-percent').count(),1);
   assert.equal(await section.locator('.battle-core-damage-hp').last().innerText(),'Blocked by Wonder Guard');
  }
  await page.keyboard.press('Escape');
  await tap('ghost');await check('Player','Revenge',[0,0]);await check('Player','Pursuit',[38,76]);
  await tap('unknown');dialog=await open('Player','Revenge');
  for await(const section of sections(dialog,'Revenge'))assert.equal(await section.locator('.battle-damage-unavailable').count(),1);
  await page.keyboard.press('Escape');
  await tap('huge');await page.setViewportSize({width,height:480});dialog=await open('Opponent','Revenge');
  await dialog.locator('.battle-core-damage-hp').last().scrollIntoViewIfNeeded();
  const last=await dialog.locator('.battle-core-damage-hp').last().boundingBox();assert.ok(last.y>=0&&last.y+last.height<=480);
  await dialog.locator('.battle-core-damage-hp').last().tap();assert.equal(await page.getByRole('dialog').count(),0);
  assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: selected conditional powers/results, both directions, percentage-first, screens/crit/burn/Guts, nested ability grouping, prevention/immunity/unavailable, HP independence, scrolling and dismissal`);
 }
} finally {await browser?.close();await server.close();}
