import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5295,strictPort:true},plugins:[{
 name:'two-hit-popup',configureServer(s){s.middlewares.use('/__two-hit',(_req,res)=>{
  res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/twoHitPopup.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__two-hit`);
  const open=async(side,name)=>{await page.getByRole('button',{name:`${side} ${name}`,exact:true}).tap();return page.getByRole('dialog');};
  const check=async(side,name,hp,percent,power)=>{
   const dialog=await open(side,name);
   assert.equal(await dialog.locator('dd').first().innerText(),String(power));
   const section=dialog.getByRole('region',{name:'Damage Calculation'});
   assert.deepEqual(await section.locator('p').allTextContents(),[percent,`${hp} HP damage`]);
   const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
   await dialog.locator('.battle-core-damage-hp').tap();assert.equal(await page.getByRole('dialog').count(),0);
  };
  for(const [name,outgoing,incoming,outPercent,inPercent,power] of [
   ['Double Kick','50–60','70–84','25.0% – 30.0%','35.0% – 42.0%',30],
   ['Twineedle','22–26','30–36','11.0% – 13.0%','15.0% – 18.0%',25],
   ['Bonemerang','40–48','58–70','20.0% – 24.0%','29.0% – 35.0%',50],
  ]) {await check('Player',name,outgoing,outPercent,power);await check('Opponent',name,incoming,inPercent,power);}
  await page.getByRole('button',{name:'Battle Conditions',exact:true}).tap();
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).check();
  await check('Player','Double Kick','102–120','51.0% – 60.0%',30);
  await check('Player','Twineedle','44–52','22.0% – 26.0%',25);
  await check('Player','Bonemerang','80–96','40.0% – 48.0%',50);
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).uncheck();
  await page.getByRole('spinbutton',{name:'Opponent current HP',exact:true}).fill('1');
  await page.getByRole('spinbutton',{name:'Opponent current HP',exact:true}).blur();
  await check('Player','Double Kick','50–60','25.0% – 30.0%',30);
  await page.getByRole('button',{name:'ghost',exact:true}).tap();
  await check('Player','Double Kick','0–0','0% – 0%',30);
  await page.getByRole('button',{name:'levitate',exact:true}).tap();
  let dialog=await open('Player','Bonemerang');
  assert.deepEqual(await dialog.locator('.battle-ability-label').allTextContents(),['Levitate','Pressure']);
  assert.deepEqual(await dialog.locator('.battle-core-damage-hp').allTextContents(),['0–0 HP damage','40–48 HP damage']);
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'contact',exact:true}).tap();dialog=await open('Player','Double Kick');
  assert.deepEqual(await dialog.locator('.battle-ability-label').allTextContents(),['Immunity','Flame Body']);
  assert.equal(await dialog.locator('.battle-damage-unavailable').count(),1);
  assert.equal(await dialog.locator('.battle-core-damage-hp').innerText(),'50–60 HP damage');
  await page.keyboard.press('Escape');assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: all fixed two-hit totals, independent critical-conditioned ranges, both directions, immunity, scenarios and unchanged popup layout`);
 }
} finally {await browser?.close();await server.close();}
