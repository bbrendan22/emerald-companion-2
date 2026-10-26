import {selectedScenarioSections} from './fixtures/selectedScenarioSections.mjs';
import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5303,strictPort:true},plugins:[{
 name:'magnitude-popup',configureServer(s){s.middlewares.use('/__magnitude',(_req,res)=>{
  res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/magnitudePopup.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__magnitude`);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap();
  const open=async side=>{await tap(`${side} Magnitude`);return page.getByRole('dialog');};
  const labels=[10,30,50,70,90,110,150].map((power,index)=>`MAGNITUDE ${index+4} · ${power} POWER · ${[5,10,20,30,20,10,5][index]}%`);
  const sections=dialog=>selectedScenarioSections(dialog,labels);
  const base=[6,15,24,32,41,50,68];
  const close=async dialog=>{await dialog.locator('.battle-core-damage-hp').last().tap();assert.equal(await page.getByRole('dialog').count(),0);};
  const check=async(side,ends)=>{
   const dialog=await open(side);
   assert.equal(await dialog.locator('dd').first().innerText(),'70');
   assert.equal(await dialog.locator('header img').getAttribute('alt'),'ground type');
   assert.deepEqual(await dialog.getByRole('region',{name:'Damage Calculation'}).getByRole('group').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),[labels[3]]);
   for await(const [i,section] of sections(dialog).entries()) {
    const max=ends[i],min=Math.floor(max*85/100),percentage=max===0?'0% – 0%':`${(min/2).toFixed(1)}% – ${(max/2).toFixed(1)}%`;
    assert.deepEqual(await section.locator('p').allTextContents(),[labels[i],percentage,`${min}–${max} HP damage`]);
   }
   assert.equal(await dialog.locator('.battle-core-damage-percent').count(),1);
   const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=844);
   await close(dialog);
  };
  await check('Player',base);await check('Opponent',[8,21,35,48,61,74,101]);
  await tap('stab');await check('Player',[9,22,36,48,61,75,102]);await tap('normal');
  await tap('Battle Conditions');
  await page.getByRole('checkbox',{name:'Opponent Reflect',exact:true}).check();await check('Player',[4,8,13,17,21,26,35]);
  await page.getByRole('checkbox',{name:'Opponent Light Screen',exact:true}).check();
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).check();await check('Player',base.map(n=>n*2));
  await tap('Reset');await page.getByRole('checkbox',{name:'Opponent Light Screen',exact:true}).check();await check('Player',base);
  await tap('Reset');await page.getByRole('combobox',{name:'Player status',exact:true}).selectOption('burn');await check('Player',[4,8,13,17,21,26,35]);
  await tap('guts');await check('Player',[8,21,35,48,61,74,101]);
  await tap('Reset');await tap('normal');await page.getByRole('combobox',{name:'Battle weather',exact:true}).selectOption('rain');await check('Player',base);
  await tap('levitate');let dialog=await open('Player');
  for await(const [index,section] of sections(dialog).entries()) {
   assert.deepEqual(await section.locator('.battle-ability-label').allTextContents(),[labels[index],'Immunity','Levitate']);
   assert.equal(await section.locator('.battle-core-damage-percent').count(),2);
   assert.equal(await section.locator('.battle-core-damage-hp').last().innerText(),'0–0 HP damage');
  }
  await close(dialog);
  await tap('huge');dialog=await open('Opponent');
  assert.deepEqual(await (await sections(dialog).at(0)).locator('.battle-core-damage-hp').allTextContents(),['6–8 HP damage','12–15 HP damage']);
  assert.deepEqual(await (await sections(dialog).at(-1)).locator('.battle-core-damage-hp').allTextContents(),['85–101 HP damage','170–200 HP damage']);await close(dialog);
  await tap('wonder');dialog=await open('Player');
  for await(const section of sections(dialog))assert.equal(await section.locator('.battle-core-damage-hp').last().innerText(),'Blocked by Wonder Guard');await close(dialog);
  await tap('flying');await check('Player',Array(7).fill(0));
  await tap('unknown');dialog=await open('Player');assert.equal(await dialog.locator('.battle-damage-unavailable').count(),1);await page.keyboard.press('Escape');
  await tap('levitate');await page.setViewportSize({width,height:480});dialog=await open('Player');

  await dialog.locator('.battle-core-damage-hp').last().scrollIntoViewIfNeeded();
  const last=await dialog.locator('.battle-core-damage-hp').last().boundingBox();assert.ok(last.y>=0&&last.y+last.height<=480);
  await close(dialog);assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: selected Magnitude powers/chances, both directions, percentage-first, STAB/screens/crit/burn/Guts/weather, ability uncertainty, immunity/prevention/unavailable, scrolling and dismissal`);
 }
} finally {await browser?.close();await server.close();}
