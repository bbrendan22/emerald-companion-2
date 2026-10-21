import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {makeSave} from './fixtures/synthetic.js';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined)});
try {
 const page=await browser.newPage({viewport:{width:375,height:650},hasTouch:true,isMobile:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BROWSER_URL || 'http://127.0.0.1:5173/');
 await page.evaluate(encoded=>localStorage.setItem('emerald-companion-2.save.v1',encoded),Buffer.from(makeSave()).toString('base64'));await page.reload();
 const search=page.getByRole('searchbox',{name:'Search Resources',exact:true}),results=page.getByRole('region',{name:'Search results',exact:true}),dialog=page.getByRole('dialog');
 for(const width of [320,375,430]){
  await page.setViewportSize({width,height:650});
  let expectedShell=null;
  for(const [query,name] of [['thunderb','Thunderbolt'],['levitate','Levitate'],['leftovers','Leftovers'],['lum berry','Lum Berry'],['TM26','TM26 · Earthquake']]){
   await search.fill(query);
   await results.getByRole('button',{name,exact:true}).tap();await dialog.waitFor();
   assert.equal(await search.inputValue(),'');assert.equal(await dialog.getAttribute('aria-label'),name);
   const card=dialog.locator('.resources-reference-popup');
   const box=await card.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=650,'popup contained');
   const shell=await card.evaluate(e=>{const s=getComputedStyle(e);return [s.backgroundColor,s.borderTopColor,s.borderTopWidth,s.padding,s.borderRadius];});
   if(!expectedShell)expectedShell=shell;else assert.deepEqual(shell,expectedShell,'same shell across reference types');
   const heading=card.locator('.resources-move-heading strong, .resource-item-main strong').first();
   assert.equal(await heading.evaluate(e=>getComputedStyle(e).fontSize),'13px','consistent heading font');
   assert.equal(await card.evaluate(e=>e.scrollWidth>e.clientWidth),false,'no popup horizontal overflow');
   assert.equal(await card.locator('button').count(),0,'no close button added');
   assert.equal(await page.locator('.home-search').evaluate(e=>e===document.activeElement),false);
   const pageScroll=await page.evaluate(()=>scrollY);
   const session=await page.context().newCDPSession(page);
   const x=Math.round(box.x+box.width/2),y=Math.round(Math.min(box.y+box.height-15,600));
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(const dy of [30,75,130,190])await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:Math.max(box.y+10,y-dy)}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
   await page.waitForTimeout(200);assert.equal(await dialog.count(),1,'swipe leaves popup open');
   assert.equal(await page.evaluate(()=>scrollY),pageScroll);
   if(await card.evaluate(e=>e.scrollHeight>e.clientHeight))assert.ok(await card.evaluate(e=>e.scrollTop>0),'long popup scrolls');
   await dialog.evaluate(element=>{
    const p={bubbles:true,pointerId:1,isPrimary:true,button:0,clientX:50,clientY:100};
    element.dispatchEvent(new PointerEvent('pointerdown',p));element.dispatchEvent(new Event('scroll'));
    element.dispatchEvent(new PointerEvent('pointerup',p));element.dispatchEvent(new MouseEvent('click',{bubbles:true}));
   });assert.equal(await dialog.count(),1,'scroll release cannot dismiss');
   await page.touchscreen.tap(1,1);assert.equal(await dialog.count(),0,'outside tap dismisses');
   assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'','scroll lock restored');
  }
  await search.fill('thunderb');await results.getByRole('button',{name:'Thunderbolt',exact:true}).tap();await dialog.waitFor();
  await dialog.locator('.resources-move-heading').tap();assert.equal(await dialog.count(),0,'content tap dismisses');
  await search.fill('levitate');await results.getByRole('button',{name:'Levitate',exact:true}).tap();await dialog.waitFor();await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);
  await search.fill('x'.repeat(2000));assert.equal(await results.innerText(),'No results.');assert.equal(await results.locator('button').count(),0);
  await page.getByRole('button',{name:'Clear search',exact:true}).tap();assert.equal(await search.inputValue(),'');assert.ok(await page.getByRole('link',{name:'Pokédex',exact:true}).isVisible());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: reference popup shell/headings, all four types plus TM, containment, real touch scrolling, swipe/scroll-release protection, tap/Escape dismissal, clear/empty state and overflow at 320/375/430px.');
}finally{await browser.close();}
