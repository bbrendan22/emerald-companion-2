import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5294,strictPort:true},plugins:[{
 name:'special-conventional-popup',configureServer(s){s.middlewares.use('/__special-conventional',(_req,res)=>{
  res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/specialConventionalPopup.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__special-conventional`);
  const open=async(side,name)=>{await page.getByRole('button',{name:`${side} ${name}`,exact:true}).tap();return page.getByRole('dialog');};
  const check=async(side,name,hp,power)=>{
   const dialog=await open(side,name);
   assert.equal(await dialog.locator('dd').first().innerText(),String(power));
   assert.equal(await dialog.locator('.battle-core-damage-hp').innerText(),`${hp} HP damage`);
   const section=dialog.getByRole('region',{name:'Damage Calculation'});
   assert.equal(await section.locator('p').first().getAttribute('class'),'battle-core-damage-percent');
   const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
   await dialog.locator('.battle-core-damage-hp').tap();assert.equal(await page.getByRole('dialog').count(),0,'tap dismissal');
  };
  for(const [name,outgoing,incoming,power] of [['False Swipe','23–28','35–42',40],['Explosion','283–333','423–498',250],['Self Destruct','226–267','339–399',200],['Struggle','20–24','29–35',50]]) {
   await check('Player',name,outgoing,power);await check('Opponent',name,incoming,power);
  }
  await page.getByRole('button',{name:'Battle Conditions',exact:true}).tap();
  const hp=side=>page.getByRole('spinbutton',{name:`${side} current HP`,exact:true});
  await hp('Opponent').fill('27');await hp('Opponent').blur();await check('Player','False Swipe','23–26',40);
  await hp('Opponent').fill('1');await hp('Opponent').blur();await check('Player','False Swipe','0–0',40);
  await hp('Player').fill('5');await hp('Player').blur();await check('Opponent','False Swipe','4–4',40);
  await page.getByRole('button',{name:'ghost',exact:true}).tap();
  await check('Player','Explosion','0–0',250);await check('Player','False Swipe','0–0',40);await check('Player','Struggle','20–24',50);
  await page.getByRole('button',{name:'damp',exact:true}).tap();
  const dialog=await open('Player','Explosion');
  assert.deepEqual(await dialog.locator('.battle-ability-label').allTextContents(),['Water Absorb','Damp']);
  assert.equal(await dialog.locator('.battle-damage-unavailable').count(),0);
  assert.deepEqual(await dialog.locator('.battle-core-damage-hp').allTextContents(),['283–333 HP damage','Prevented by Damp']);
  await page.keyboard.press('Escape');assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: False Swipe HP caps, explosions, typeless Struggle, both directions, Damp scenarios and tap dismissal`);
 }
} finally {await browser?.close();await server.close();}
