import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5303,strictPort:true},plugins:[{
 name:'plus-minus',configureServer(s){s.middlewares.use('/__plus-minus',(_req,res)=>{
 res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/plusMinusPopup.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`${server.resolvedUrls.local[0]}__plus-minus`);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap();
  for(const mode of ['pair','reverse','trace','uncertain','missing','doubles-pair','doubles-missing']) {
   await tap(mode);
   for(const side of ['Player','Opponent']) {
    await tap(`${side} Surf`);const dialog=page.getByRole('dialog');
    if(mode==='doubles-missing'&&side==='Player')assert.equal(await dialog.locator('.battle-damage-unavailable').count(),1);
    else assert.deepEqual(await dialog.locator('.battle-core-damage-hp').allTextContents(),mode==='uncertain'?['54–64 HP damage','36–43 HP damage']:mode==='doubles-pair'?['28–33 HP damage']:mode==='doubles-missing'?['18–22 HP damage']:mode==='missing'?['36–43 HP damage']:['54–64 HP damage']);
    const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
    for(const hp of await dialog.locator('.battle-core-damage-hp').all())assert.equal(await hp.evaluate(el=>el.previousElementSibling.className),'battle-core-damage-percent');
    await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
   }
   await tap('Player Strength');assert.deepEqual(await page.getByRole('dialog').locator('.battle-core-damage-hp').allTextContents(),['46–55 HP damage']);
   await page.getByRole('dialog').locator('.battle-core-damage-hp').tap();assert.equal(await page.getByRole('dialog').count(),0);
  }
  await tap('pair');await tap('Player Bullet Seed');
  assert.deepEqual(await page.getByRole('dialog').locator('.battle-core-damage-hp').allTextContents(),['18–24 HP damage']);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS WebKit ${width}px: Plus/Minus both directions, Trace, uncertainty, Doubles safeguard, categories, multi-hit, percentage-first and dismissal`);
 }
} finally {await browser?.close();await server.close();}
