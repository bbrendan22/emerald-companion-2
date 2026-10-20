import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {makeSave} from './fixtures/synthetic.js';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined)});
try {
 const page=await browser.newPage({viewport:{width:375,height:600},hasTouch:true,isMobile:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BROWSER_URL || 'http://127.0.0.1:5173/');
 const encoded=Buffer.from(makeSave()).toString('base64');
 await page.evaluate(encoded=>localStorage.setItem('emerald-companion-2.save.v1',encoded),encoded);await page.reload();
 const search=page.getByRole('searchbox',{name:'Search Resources',exact:true});
 const results=page.getByRole('region',{name:'Search results',exact:true});
 const normal=page.locator('.home-resources .resources-destinations');
 assert.ok(await normal.count()>0);
 for(const [query,name] of [['thunderb','Thunderbolt'],['overg','Overgrow'],['rare c','Rare Candy'],['oran','Oran Berry']]){
  await search.fill(query);assert.equal(await normal.count(),0);
  await results.getByRole('button',{name,exact:true}).first().tap();
  const dialog=page.getByRole('dialog');await dialog.waitFor();
  assert.equal(await dialog.getAttribute('aria-label'),name);
  assert.equal(await search.inputValue(),'');assert.ok(await normal.count()>0);
  assert.equal(await search.evaluate(e=>e===document.activeElement),false);
  await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);
  assert.equal(await page.locator('.resources-catalog').count(),0);
 }
 await search.fill('bUlBa');await results.getByRole('button',{name:'Bulbasaur',exact:true}).tap();
 await page.locator('.species-profile').waitFor();
 assert.match(await page.locator('#species-profile-title').innerText(),/Bulbasaur/i);
 await page.getByRole('button',{name:'Back to Home',exact:true}).tap();
 assert.equal(await search.inputValue(),'');assert.ok(await normal.count()>0);
 await search.fill('zzzzzz');assert.equal(await results.innerText(),'No matching results');
 await page.getByRole('button',{name:'Clear search',exact:true}).tap();assert.ok(await normal.count()>0);
 for(const width of [320,375,430]){
  await page.setViewportSize({width,height:600});
  const geometry=()=>page.evaluate(()=>{
   const trainer=document.querySelector('.home-trainer').getBoundingClientRect(),resources=document.querySelector('.home-resources').getBoundingClientRect();
   return {trainerBottom:trainer.bottom,resourcesBottom:resources.bottom,top:resources.top,height:resources.height};
  });
  const original=await geometry();assert.ok(Math.abs(original.trainerBottom-original.resourcesBottom)<1,'sidebar ends at Trainer bottom');
  await search.fill('zzzzzz');assert.deepEqual(await geometry(),original,'no-results does not resize divider');
  await search.fill('a');assert.deepEqual(await geometry(),original,'many results do not resize divider');
  assert.equal(await search.evaluate(e=>getComputedStyle(e).outlineStyle),'none','no search focus outline');
  const resourceBox=await page.locator('.home-resources').boundingBox(),resultBox=await results.boundingBox();
  assert.ok(Math.abs(resourceBox.y+resourceBox.height-resultBox.y-resultBox.height)<1,'results fill to sidebar bottom');
  assert.ok(await results.locator('section').count()>1);
  assert.ok(await results.evaluate(e=>e.scrollHeight>e.clientHeight));
  const inputBefore=await search.boundingBox();
  const box=await results.boundingBox();const x=Math.round(box.x+box.width/2),y=Math.round(Math.min(box.y+box.height-10,550));
  const session=await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(const dy of [30,70,110,150])await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-dy}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
  await page.waitForTimeout(250);
  assert.ok(await results.evaluate(e=>e.scrollTop>0),'results scroll independently');
  assert.deepEqual(await search.boundingBox(),inputBefore,'search stays fixed above results');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'');
  await page.getByRole('button',{name:'Clear search',exact:true}).tap();
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: all five categories, live prefix search, direct existing popups/profile, clear/blur/normal Home restoration, no matches, grouping, independent touch scrolling at 320/375/430px.');
}finally{await browser.close();}
