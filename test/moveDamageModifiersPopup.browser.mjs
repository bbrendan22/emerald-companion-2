import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5290,strictPort:true},plugins:[{
 name:'move-modifiers-popup',configureServer(s){s.middlewares.use('/__modifiers',(_req,res)=>{
  res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/moveDamageModifiersPopup.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${server.resolvedUrls.local[0]}__modifiers`);
  for(const [key,power,hp] of [
   ['facade','70','54–64'],['burn','70','28–34'],['guts','70','81–96'],['critical','70','57–68'],
   ['smelling','60','47–56'],['smellingHealthy','60','23–28'],
   ['none','120','91–108'],['sun','120','91–108'],['rain','120','47–56'],['sand','120','47–56'],['hail','120','47–56'],
  ]) {
   await page.getByRole('button',{name:key,exact:true}).tap();
   const dialog=page.getByRole('dialog');
   assert.equal(await dialog.locator('dd').first().innerText(),power);
   assert.equal(await dialog.locator('.battle-core-damage-hp').innerText(),`${hp} HP damage`);
   assert.equal(await dialog.locator('.battle-damage-unavailable').count(),0);
   await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: Facade statuses/Guts/critical, SolarBeam weather, SmellingSalt and reference powers`);
 }
} finally {await browser?.close();await server.close();}
