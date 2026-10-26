import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5292,strictPort:true},plugins:[{
 name:'weather-ball-popup',configureServer(s){s.middlewares.use('/__weather-ball',(_req,res)=>{
  res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/weatherBallPopup.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__weather-ball`);
  await page.getByRole('button',{name:'Battle Conditions',exact:true}).tap();
  for(const [weather,type,power,outgoing,incoming] of [
   ['none','normal',50,'30–36','44–52'],['sun','fire',100,'59–70','51–60'],
   ['rain','water',100,'59–70','51–60'],['sand','rock',100,'40–48','59–70'],['hail','ice',100,'40–48','35–42'],
  ]) {
   await page.getByRole('combobox',{name:'Battle weather',exact:true}).selectOption(weather);
   for(const [side,hp] of [['Player',outgoing],['Opponent',incoming]]) {
    await page.getByRole('button',{name:`${side} Weather Ball`,exact:true}).tap();
    const dialog=page.getByRole('dialog');
    assert.equal(await dialog.locator('header img').getAttribute('alt'),`${type} type`);
    assert.equal(await dialog.locator('dd').first().innerText(),String(power));
    assert.equal(await dialog.locator('.battle-core-damage-hp').innerText(),`${hp} HP damage`);
    assert.equal(await dialog.locator('.battle-damage-unavailable').count(),0);
    const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
    await page.keyboard.press('Escape');
   }
  }
  await page.getByRole('button',{name:'Reset',exact:true}).tap();
  await page.getByRole('button',{name:'Player Weather Ball',exact:true}).tap();
  assert.equal(await page.getByRole('dialog').locator('dd').first().innerText(),'50');
  assert.equal(await page.getByRole('dialog').locator('header img').getAttribute('alt'),'normal type');
  assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: Weather Ball type/power/damage in all weather, both directions, existing controls and reset`);
 }
} finally {await browser?.close();await server.close();}
