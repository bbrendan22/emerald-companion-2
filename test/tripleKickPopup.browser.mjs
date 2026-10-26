import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5297,strictPort:true},plugins:[{
 name:'triple-kick-popup',configureServer(s){s.middlewares.use('/__triple-kick',(_req,res)=>{
  res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/tripleKickPopup.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__triple-kick`);
  const open=async side=>{await page.getByRole('button',{name:`${side} Triple Kick`,exact:true}).tap();return page.getByRole('dialog');};
  const check=async(side,min,max)=>{
   const dialog=await open(side);
   assert.equal(await dialog.locator('dd').first().innerText(),'10 / 20 / 30');
   assert.equal(await dialog.locator('header img').getAttribute('alt'),'fighting type');
   const percent=max===0?'0% – 0%':`${(min/2).toFixed(1)}% – ${(max/2).toFixed(1)}%`;
   assert.deepEqual(await dialog.getByRole('region',{name:'Damage Calculation'}).locator('p').allTextContents(),[percent,`${min}–${max} HP damage`,'If all 3 hits connect']);
   const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=844);
   const noteStyle=await dialog.locator('.battle-core-damage-note').evaluate(el=>({note:parseFloat(getComputedStyle(el).fontSize),primary:parseFloat(getComputedStyle(el.parentElement.querySelector('.battle-core-damage-percent')).fontSize)}));
   assert.ok(noteStyle.note<noteStyle.primary);
   await dialog.locator('.battle-core-damage-hp').tap();assert.equal(await page.getByRole('dialog').count(),0);
  };
  await check('Player',52,62);await check('Opponent',73,88);
  await page.getByRole('button',{name:'Battle Conditions',exact:true}).tap();
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).check();await check('Player',105,124);
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).uncheck();
  await page.getByRole('combobox',{name:'Player status',exact:true}).selectOption('burn');await check('Player',29,36);
  await page.getByRole('combobox',{name:'Player status',exact:true}).selectOption('none');
  await page.getByRole('spinbutton',{name:'Opponent current HP',exact:true}).fill('1');
  await page.getByRole('spinbutton',{name:'Opponent current HP',exact:true}).blur();await check('Player',52,62);
  await page.getByRole('button',{name:'ghost',exact:true}).tap();await check('Player',0,0);
  await page.getByRole('button',{name:'same',exact:true}).tap();await check('Player',52,62);
  await page.getByRole('button',{name:'contact',exact:true}).tap();let dialog=await open('Player');
  assert.deepEqual(await dialog.locator('.battle-ability-label:not(.battle-core-damage-note)').allTextContents(),['Immunity','Flame Body']);
  assert.equal(await dialog.locator('.battle-core-damage-note').innerText(),'If all 3 hits connect');
  assert.equal(await dialog.locator('.battle-damage-unavailable').count(),1);
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'unknown',exact:true}).tap();dialog=await open('Player');assert.equal(await dialog.locator('.battle-damage-unavailable').count(),1);
  await page.keyboard.press('Escape');assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: Triple Kick three-connected-hit totals, 10/20/30 powers, condition note, both directions, crit, status, immunity, scenarios and tap dismissal`);
 }
} finally {await browser?.close();await server.close();}
