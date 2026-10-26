import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5300,strictPort:true},plugins:[{
 name:'weather-suppression-popup',configureServer(s){s.middlewares.use('/__weather-suppression',(_req,res)=>{
  res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/weatherSuppressionPopup.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__weather-suppression`);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap();
  const open=async(side,name)=>{await tap(`${side} ${name}`);return page.getByRole('dialog');};
  const close=async dialog=>{await dialog.locator('.battle-core-damage-hp').first().tap();assert.equal(await page.getByRole('dialog').count(),0);};
  const check=async(side,name,hp,type,power)=>{
   const dialog=await open(side,name);
   assert.equal(await dialog.locator('.battle-core-damage-hp').innerText(),`${hp} HP damage`);
   assert.equal(await dialog.getByRole('region',{name:'Damage Calculation'}).locator('p').first().getAttribute('class'),'battle-core-damage-percent');
   if(type)assert.equal(await dialog.locator('header img').getAttribute('alt'),`${type} type`);
   if(power)assert.equal(await dialog.locator('dd').first().innerText(),String(power));
   const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
   await close(dialog);
  };
  await tap('Battle Conditions');const weather=page.getByRole('combobox',{name:'Battle weather',exact:true});
  await weather.selectOption('rain');await check('Player','Weather Ball','59–70','water',100);
  for(const mode of ['player-cloud','enemy-cloud','player-air','enemy-air','both']) {
   await tap(mode);
   for(const value of ['rain','sun','sand','hail']) {
    await weather.selectOption(value);
    await check('Player','Weather Ball','30–36','normal',50);await check('Opponent','Weather Ball','44–52','normal',50);
    assert.equal(await weather.inputValue(),value,'selected weather survives suppression');
   }
  }
  await weather.selectOption('rain');await check('Player','Surf','36–43');await check('Player','SolarBeam','45–54');
  await check('Player','Flamethrower','36–43');await check('Player','Triple Kick','52–62');await check('Player','Seismic Toss','50');
  await page.getByRole('checkbox',{name:'Opponent Reflect',exact:true}).check();await check('Player','Weather Ball','16–19','normal',50);
  await page.getByRole('checkbox',{name:'Opponent Reflect',exact:true}).uncheck();
  await tap('off');await check('Player','Surf','53–63');await check('Player','SolarBeam','23–28');
  await check('Player','Weather Ball','59–70','water',100);assert.equal(await weather.inputValue(),'rain','effects resume without clearing weather');
  for(const mode of ['uncertain-player','uncertain-enemy']) {
   await tap(mode);
   for(const side of ['Player','Opponent']) {
    const dialog=await open(side,'Weather Ball');
    assert.equal(await dialog.locator('dd').first().innerText(),'50 / 100');
    assert.equal(await dialog.locator('header img').count(),0,'no misleading global type icon');
    assert.deepEqual(await dialog.locator('.battle-ability-label').allTextContents(),['Damp · Water · Power 100','Cloud Nine · Normal · Power 50']);
    assert.deepEqual(await dialog.locator('.battle-core-damage-hp').allTextContents(),side==='Player'?['59–70 HP damage','30–36 HP damage']:['51–60 HP damage','44–52 HP damage']);
    const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
    await close(dialog);
   }
  }
  await tap('uncertain-enemy');let dialog=await open('Player','Explosion');
  assert.deepEqual(await dialog.locator('.battle-core-damage-hp').allTextContents(),['Prevented by Damp','283–333 HP damage']);await close(dialog);
  await tap('unknown');dialog=await open('Player','Weather Ball');
  assert.equal(await dialog.locator('dd').first().innerText(),'—');assert.equal(await dialog.locator('header img').count(),0);
  assert.equal(await dialog.locator('.battle-damage-unavailable').count(),1);await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: selected weather preserved, both suppressors/either side, Weather Ball type/power/category/screens, uncertainty metadata, solar/weather totals, prevention and dismissal`);
 }
} finally {await browser?.close();await server.close();}
