import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
 const page=await browser.newPage({viewport:{width:375,height:600},hasTouch:true,isMobile:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Resources',exact:true}).click();await page.getByRole('link',{name:'Berries',exact:true}).click();
 const dialog=page.getByRole('dialog'),search=page.getByRole('searchbox',{name:'Search items',exact:true});
 const trigger=id=>page.locator(`button[data-item-id="${id}"]`);
 const visuals=id=>trigger(id).evaluate(e=>{const s=getComputedStyle(e);return [s.outlineStyle,s.backgroundColor,s.borderColor,s.boxShadow,s.transform];});
 for(const width of [320,375,390,430]){
  await page.setViewportSize({width,height:600});
  await search.fill('Sitrus Berry');
  await search.blur();await page.mouse.move(0,0);const normal=await visuals(142);
  for(const target of ['img','strong','small','.resource-item-source p','background','backdrop']){
   await trigger(142).tap();assert.equal(await dialog.count(),1);
   assert.deepEqual(await visuals(142),normal,'no selected row appearance');
   const box=await dialog.locator('.resources-move-dialog').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=600);
   assert.equal(await dialog.locator('button').count(),0);
   assert.equal(await dialog.evaluate(e=>getComputedStyle(e,'::backdrop').backgroundColor),'rgba(0, 0, 0, 0.6)');
   if(target==='backdrop')await page.touchscreen.tap(1,1);
   else if(target==='background')await dialog.locator('.resources-move-dialog').tap({position:{x:5,y:5}});
   else await dialog.locator(target).first().tap();
   assert.equal(await dialog.count(),0,`${target} dismisses`);
   assert.deepEqual(await visuals(142),normal,'no highlight after touch close');
   assert.equal(await trigger(142).evaluate(e=>e===document.activeElement),false);
  }
  await trigger(142).tap();
  const before=await page.evaluate(()=>scrollY);
  const touch=await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:Math.round(width/2),y:500}]});
  for(const y of [450,380,300,220,140])await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:Math.round(width/2),y}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
  await page.waitForTimeout(400);
  assert.equal(await dialog.count(),1,'swipe and momentum do not close');
  assert.ok(await dialog.locator('.resources-move-dialog').evaluate(e=>e.scrollTop>0),'popup actually scrolled');
  assert.equal(await page.evaluate(()=>scrollY),before,'underlying page stays still');
  await dialog.evaluate(element=>{
   const send=(type,x,y)=>element.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y}));
   send('pointerdown',50,100);send('pointermove',50,50);send('pointermove',50,100);send('pointerup',50,100);element.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  });assert.equal(await dialog.count(),1,'returning drag does not close');
  await dialog.evaluate(element=>{
   const pointer={bubbles:true,pointerId:1,isPrimary:true,button:0,clientX:50,clientY:100};
   element.dispatchEvent(new PointerEvent('pointerdown',pointer));element.dispatchEvent(new Event('scroll'));element.dispatchEvent(new PointerEvent('pointerup',pointer));element.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  });assert.equal(await dialog.count(),1,'scroll cancels stationary release');
  await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);assert.equal(await page.evaluate(()=>scrollY),before);
  await trigger(142).focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');
  assert.equal(await trigger(142).evaluate(e=>e===document.activeElement&&e.matches(':focus-visible')&&getComputedStyle(e).outlineStyle!=='none'),true,'visible keyboard focus restored');
  await search.fill('');
  await trigger(158).scrollIntoViewIfNeeded();const listY=await page.evaluate(()=>scrollY);assert.ok(listY>0);
  const layout=await page.locator('.resource-item-entry').evaluateAll(ns=>ns.map(n=>[n.offsetTop,n.offsetHeight]));
  await trigger(158).tap();assert.equal(await dialog.count(),1);await dialog.locator('img').tap();
  assert.equal(await page.evaluate(()=>scrollY),listY,'list scroll restored');
  assert.deepEqual(await page.locator('.resource-item-entry').evaluateAll(ns=>ns.map(n=>[n.offsetTop,n.offsetHeight])),layout,'no inline expansion or layout changes');
  await search.fill('Sitrus Berry');await trigger(142).tap();
  await page.screenshot({path:`/private/tmp/berry-popup-${width}.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await dialog.evaluate(e=>e.scrollWidth>e.clientWidth),false);
  await page.keyboard.press('Escape');await search.fill('');
 }
 assert.deepEqual(errors,[]);
 console.log('Berry popups: tap-anywhere dismissal, no touch highlight, keyboard/Escape restoration, real swipe/momentum, returning drag, scroll-release protection, unchanged list layout and scroll, one modal and no horizontal overflow at 320/375/390/430px.');
}finally{await browser.close();}
