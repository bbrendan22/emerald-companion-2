import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5262,strictPort:true},plugins:[{
 name:'move-dismiss-fixture',configureServer(server){
  server.middlewares.use('/__move-dismiss',(_request,response)=>{
   response.setHeader('Content-Type','text/html');
   response.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/battleMovePopup.jsx"></script>');
  });
 }
}]});
await server.listen();
try {
 for (const [name,engine] of [['Chrome',chromium],['WebKit',webkit]]) {
  const browser=await engine.launch({headless:true,...(name==='Chrome'?{channel:'chrome'}:{})});
  try {
   for (const width of [320,375,430,1280]) {
    const touch=width<500;
    const page=await browser.newPage({viewport:{width,height:844},isMobile:touch,hasTouch:touch,serviceWorkers:'block'});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${server.resolvedUrls.local[0]}__move-dismiss`);
    const open=page.getByRole('button',{name:'Open move',exact:true}),popup=page.getByRole('dialog');
    const activate=async locator=>touch?locator.tap():locator.click();
    const tapPoint=async(x,y)=>touch?page.touchscreen.tap(x,y):page.mouse.click(x,y);
    const count=()=>page.getByLabel('Underlying actions').innerText();
    for (const selector of ['header img','h2','dl','p',null]) {
     await activate(open);assert.equal(await popup.locator('button').count(),0);
     if(selector) await activate(popup.locator(selector).first());
     else {const box=await popup.boundingBox();await tapPoint(box.x+2,box.y+2);}
     assert.equal(await popup.count(),0,'every interior tap closes');
     assert.equal(await count(),'0');
    }
    for (const label of ['Pokémon slot','Move slot','Battle control','Underlying dropdown']) {
     const control=label==='Underlying dropdown'?page.getByRole('combobox'):page.getByRole('button',{name:label,exact:true});
     await control.scrollIntoViewIfNeeded();
     const box=await control.boundingBox(),before=await count();
     await activate(open);await tapPoint(box.x+box.width/2,box.y+box.height/2);
     assert.equal(await popup.count(),0,'tap over underlying control closes');
     await control.evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1})));
     assert.equal(await count(),before,'same-gesture compatibility click is consumed');
     await activate(control);assert.ok(Number(await count())>Number(before),'a separate tap works immediately');
     await page.keyboard.press('Escape');
    }
    await activate(open);await page.keyboard.press('Escape');assert.equal(await popup.count(),0);
    // A held press stays open until release, then consumes its late click.
    await activate(open);
    await page.evaluate(()=>document.querySelector('dialog').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:77,isPrimary:true,button:0})));
    assert.equal(await popup.count(),1);const before=await count();
    await page.waitForTimeout(1100);
    await page.evaluate(()=>{
     const el=document.querySelector('dialog');
     el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:77,isPrimary:true,button:0}));
     el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));
    });
    assert.equal(await popup.count(),0);
    await page.getByRole('button',{name:'Move slot',exact:true}).evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1})));
    assert.equal(await count(),before);
    await activate(open);assert.equal(await popup.count(),1);await page.keyboard.press('Escape');
    assert.deepEqual(errors,[]);await page.close();
    console.log(`PASS ${name} ${width}px: interior/outside dismissal, no close button, no click-through, immediate next tap, held gesture and Escape.`);
   }
  } finally {await browser.close();}
 }
} finally {await server.close();}
