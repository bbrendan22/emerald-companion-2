import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {battleMove} from '../src/battle/reference.js';
const server=await createServer({server:{host:'127.0.0.1',port:5301,strictPort:true},plugins:[{
 name:'forecast-popup',configureServer(s){s.middlewares.use('/__forecast',(_req,res)=>{
 res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/forecastPopup.jsx"></script>');
 });}
}]});
const own={dex:351,level:50,types:['NORMAL'],ability:'Forecast',item:'None',currentHp:200,stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const other={...own,dex:55,types:['WATER'],ability:'Damp',stats:{...own.stats,attack:150,spAttack:90}};
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__forecast`);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap();
  await tap('Battle Conditions');const weatherControl=page.getByRole('combobox',{name:'Battle weather',exact:true});
  for(const mode of ['off','enemy-cloud','enemy-air','uncertain-enemy']) {
   await tap(mode);
   const enemy={...other,...(mode==='enemy-cloud'?{ability:'Cloud Nine'}:mode==='enemy-air'?{dex:384,types:['DRAGON','FLYING'],ability:'Air Lock'}:mode==='uncertain-enemy'?{abilityOptions:{status:'uncertain',source:'species',values:['Damp','Cloud Nine']}}:{})};
   for(const weather of ['none','sun','rain','hail','sand']) {
    await weatherControl.selectOption(weather);
    for(const side of ['Player','Opponent'])for(const name of ['Weather Ball','Surf']) {
     const expected=calculateAbilityScenarios(battleMove(name),side==='Player'?own:enemy,side==='Player'?enemy:own,{weather});
     await tap(`${side} ${name}`);const dialog=page.getByRole('dialog');
     assert.deepEqual(await dialog.locator('.battle-core-damage-hp').allTextContents(),expected.groups.map(g=>`${g.result.min}–${g.result.max} HP damage`),`${width} ${mode} ${weather} ${side} ${name}`);
     assert.ok((await dialog.locator('.battle-core-damage-hp').evaluateAll(els=>els.map(el=>el.previousElementSibling?.className))).every(name=>name==='battle-core-damage-percent'));
     const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
     assert.equal(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth),false);
     await dialog.locator('.battle-core-damage-hp').first().tap();assert.equal(await page.getByRole('dialog').count(),0);
    }
   }
  }
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS WebKit ${width}px Forecast: all weather, both directions, suppression, uncertainty, percentage-first and dismissal`);
 }
} finally {await browser?.close();await server.close();}
