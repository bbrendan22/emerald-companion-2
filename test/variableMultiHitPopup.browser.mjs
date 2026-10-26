import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5296,strictPort:true},plugins:[{
 name:'variable-multi-hit-popup',configureServer(s){s.middlewares.use('/__variable-multi-hit',(_req,res)=>{
  res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/variableMultiHitPopup.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__variable-multi-hit`);
  const open=async(side,name)=>{await page.getByRole('button',{name:`${side} ${name}`,exact:true}).tap();return page.getByRole('dialog');};
  const check=async(side,name,min,max,power)=>{
   const dialog=await open(side,name);
   assert.equal(await dialog.locator('dd').first().innerText(),String(power));
   assert.equal(await dialog.getByRole('combobox',{name:'Hits',exact:true}).inputValue(),'3');
   const section=dialog.getByRole('region',{name:'Damage Calculation'});
   // Existing literal fixtures encode 2-hit minima and 5-hit maxima. Visit
   // each selected count with the same independently known per-hit endpoints.
   const perMin=min/2,perMax=max/5;
   for(const count of [2,3,4,5]) {
   await dialog.getByRole('combobox',{name:'Hits',exact:true}).selectOption(String(count));
   min=perMin*count;max=perMax*count;
   assert.equal(await dialog.locator('dd').first().innerText(),String(power));
   const percent=max===0?'0% – 0%':`${(min/2).toFixed(1)}% – ${(max/2).toFixed(1)}%`;
   assert.deepEqual(await section.locator('p').allTextContents(),[percent,`${min}–${max} HP damage`]);
   }
   const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
   await dialog.locator('.battle-core-damage-hp').tap();assert.equal(await page.getByRole('dialog').count(),0);
  };
  for(const [name,outMin,outMax,inMin,inMax,power] of [
   ['DoubleSlap',20,60,26,80,15],['Comet Punch',22,65,32,95,18],['Fury Attack',20,60,26,80,15],
   ['Pin Missile',12,40,18,55,14],['Spike Cannon',24,75,36,110,20],['Barrage',20,60,26,80,15],
   ['Fury Swipes',22,65,32,95,18],['Bone Rush',22,65,30,90,25],['Arm Thrust',26,80,36,110,15],
   ['Bullet Seed',10,30,12,40,10],['Icicle Spear',10,30,12,40,10],['Rock Blast',22,65,30,90,25],
  ]) {await check('Player',name,outMin,outMax,power);await check('Opponent',name,inMin,inMax,power);}
  await page.getByRole('button',{name:'Battle Conditions',exact:true}).tap();
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).check();
  await check('Player','DoubleSlap',40,120,15);await check('Player','Arm Thrust',54,160,15);await check('Player','Bullet Seed',20,60,10);
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).uncheck();
  await page.getByRole('combobox',{name:'Battle weather',exact:true}).selectOption('rain');
  await check('Player','Bullet Seed',10,30,10);
  await page.getByRole('combobox',{name:'Player status',exact:true}).selectOption('burn');
  await check('Player','DoubleSlap',10,35,15);await check('Player','Bullet Seed',10,30,10);
  await page.getByRole('combobox',{name:'Player status',exact:true}).selectOption('none');
  await page.getByRole('spinbutton',{name:'Opponent current HP',exact:true}).fill('1');
  await page.getByRole('spinbutton',{name:'Opponent current HP',exact:true}).blur();
  await check('Player','DoubleSlap',20,60,15);
  await page.getByRole('button',{name:'ghost',exact:true}).tap();await check('Player','DoubleSlap',0,0,15);
  await page.getByRole('button',{name:'fat',exact:true}).tap();let dialog=await open('Player','Icicle Spear');
  assert.deepEqual(await dialog.locator('.battle-ability-label').allTextContents(),['Immunity','Thick Fat']);
  assert.deepEqual(await dialog.locator('.battle-core-damage-hp').allTextContents(),['15–18 HP damage','9–12 HP damage']);
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'contact',exact:true}).tap();dialog=await open('Player','DoubleSlap');
  assert.deepEqual(await dialog.locator('.battle-ability-label').allTextContents(),['Immunity','Flame Body']);
  assert.equal(await dialog.locator('.battle-damage-unavailable').count(),1);
  assert.equal(await dialog.locator('.battle-core-damage-hp').innerText(),'30–36 HP damage');
  await page.keyboard.press('Escape');await check('Player','Spike Cannon',24,75,20);
  assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: all12 selected 2/3/4/5-hit total ranges, both directions, crit policy, status/weather, grouping and tap dismissal`);
 }
} finally {await browser?.close();await server.close();}
