import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5306,strictPort:true},plugins:[{
 name:'multi-hit-selectors',configureServer(s){s.middlewares.use('/__multi-hit-selectors',(_req,res)=>{
 res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/multiHitSelectorsPopup.jsx"></script>');
 });}
}]});
const moves=[
 ['DoubleSlap',15,10,12],['Comet Punch',18,11,13],['Fury Attack',15,10,12],['Pin Missile',14,6,8],
 ['Spike Cannon',20,12,15],['Barrage',15,10,12],['Fury Swipes',18,11,13],['Bone Rush',25,11,13],
 ['Arm Thrust',15,13,16],['Bullet Seed',10,5,6],['Icicle Spear',10,5,6],['Rock Blast',25,11,13],['Triple Kick'],
];
let browser;
try{
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,390,430]){
  const page=await browser.newPage({viewport:{width,height:667},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__multi-hit-selectors`);
  await page.getByRole('button',{name:'DoubleSlap',exact:true}).tap();
  for(const [name,power,perMin,perMax] of moves){
   const dialog=page.getByRole('dialog'),hits=dialog.getByRole('combobox',{name:'Hits',exact:true}),triple=name==='Triple Kick';
   assert.equal(await dialog.locator('h2').innerText(),name);
   assert.equal(await hits.inputValue(),'3','in-place move changes reset the count');
   assert.deepEqual(await hits.locator('option').allTextContents(),triple?['1','2','3']:['2','3','4','5']);
   assert.equal(await dialog.locator('dt').first().innerText(),triple?'Hit powers':'Power / hit');
   // Leave every move with a nondefault selection before switching.
   for(const n of triple?[3,2,1]:[3,2,4,5]){
    await hits.selectOption(String(n));
    const [min,max]=triple?[[10,12],[27,32],[52,62]][n-1]:[perMin*n,perMax*n];
    assert.equal(await dialog.locator('dd').first().innerText(),triple?[10,20,30].slice(0,n).join(' / '):String(power));
    assert.deepEqual(await dialog.locator('.battle-core-damage-hp').allTextContents(),[`${min}–${max} HP damage`]);
    assert.deepEqual(await dialog.locator('.battle-core-damage-percent').allTextContents(),[`${(min/2).toFixed(1)}% – ${(max/2).toFixed(1)}%`]);
    if(triple)assert.equal(await dialog.locator('.battle-core-damage-note').innerText(),n===1?'If 1 hit connects':`If all ${n} hits connect`);
    const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=667);
   }
   if(width===375&&triple)await page.screenshot({path:'/tmp/emerald-step3-triple-kick.png'});
   await page.keyboard.press('n');
  }
  assert.equal(await page.getByRole('dialog').locator('h2').innerText(),'Pound');
  assert.equal(await page.getByRole('combobox').count(),0);
  await page.keyboard.press('Escape');
  for(const name of ['DoubleSlap','Triple Kick']){
   await page.getByRole('button',{name,exact:true}).tap();
   assert.equal(await page.getByRole('combobox',{name:'Hits',exact:true}).inputValue(),'3');
   await page.getByRole('combobox',{name:'Hits',exact:true}).selectOption(name==='Triple Kick'?'1':'5');
   await page.getByRole('dialog').locator('.battle-core-damage-hp').tap();
   assert.equal(await page.getByRole('dialog').count(),0);
   await page.getByRole('button',{name,exact:true}).tap();
   assert.equal(await page.getByRole('combobox',{name:'Hits',exact:true}).inputValue(),'3','reopen resets');
   await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: all 13 moves/counts, literal selected damage, per-hit power, defaults, move/reopen resets, compact bounds and dismissal`);
 }
}finally{await browser?.close();await server.close();}
