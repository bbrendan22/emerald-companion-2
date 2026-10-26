import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5293,strictPort:true},plugins:[{
 name:'deterministic-popup',configureServer(s){s.middlewares.use('/__deterministic',(_req,res)=>{
  res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/deterministicDamagePopup.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__deterministic`);
  const check=async(side,name,damage,maximum)=>{
   await page.getByRole('button',{name:`${side} ${name}`,exact:true}).tap();const dialog=page.getByRole('dialog');
   const section=dialog.getByRole('region',{name:'Damage Calculation'});
   const expected=typeof damage==='number'?[`${(damage*100/maximum).toFixed(1)}%`,`${damage} HP damage`]
    : [damage==='immune'?'Immune.':damage==='failed'?'Move fails.':'Damage unavailable for this matchup.'];
   assert.deepEqual(await section.locator('.battle-ability-result p').allTextContents(),expected);
   const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
   await page.keyboard.press('Escape');
  };
  for(const [name,outgoing,incoming] of [['Seismic Toss',50,73],['Night Shade',50,'immune'],['Dragon Rage',40,40],['SonicBoom',20,20],['Super Fang',50,25],['Endeavor',51,'failed']]) {
   await check('Player',name,outgoing,140);await check('Opponent',name,incoming,200);
  }
  await page.getByRole('button',{name:'Battle Conditions',exact:true}).tap();
  const hp=side=>page.getByRole('spinbutton',{name:`${side} current HP`,exact:true});
  await hp('Opponent').fill('3');await hp('Opponent').blur();await check('Player','Super Fang',1,140);
  await hp('Player').fill('1');await hp('Player').blur();await check('Player','Endeavor',2,140);
  await hp('Opponent').fill('1');await hp('Opponent').blur();await check('Player','Endeavor','failed');
  await hp('Opponent').fill('');await hp('Opponent').blur();await check('Player','Super Fang',70,140);
  await check('Player','Endeavor',139,140);
  await page.getByRole('combobox',{name:'Battle weather',exact:true}).selectOption('sun');
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).check();await check('Player','Dragon Rage',40,140);
  await page.getByRole('button',{name:'ghost',exact:true}).tap();await check('Player','Seismic Toss','immune');
  await page.getByRole('button',{name:'unknown',exact:true}).tap();await check('Player','Dragon Rage','unavailable');
  await page.getByRole('button',{name:'uncertain',exact:true}).tap();await check('Player','Dragon Rage',40,140);
  await page.getByRole('button',{name:'unknownHP',exact:true}).tap();await check('Player','Super Fang','unavailable');
  assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: six deterministic moves, single percentages/HP, both directions, HP controls, immunity/failure/unavailable and grouping`);
 }
} finally {await browser?.close();await server.close();}
