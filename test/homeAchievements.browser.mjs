import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {makeSave} from './fixtures/synthetic.js';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined)});
try {
 const page=await browser.newPage({viewport:{width:375,height:600},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BROWSER_URL || 'http://127.0.0.1:5173/');
 const load=async earned=>{
  const b1=new Uint8Array(15752);const flag=id=>{b1[0x1270+(id>>>3)]|=1<<(id&7);};
  if(earned){new DataView(b1.buffer).setUint32(0x15c4,1,true);new DataView(b1.buffer).setUint32(0x15a0,1,true);flag(0x864);for(let i=0;i<8;i+=2)flag(0x867+i);for(let i=0;i<7;i++){if(i%3===1)flag(0x8c4+2*i);if(i%3===2)flag(0x8c5+2*i);}}
  const encoded=Buffer.from(makeSave({blocks:{saveBlock1:b1}})).toString('base64');
  await page.evaluate(encoded=>localStorage.setItem('emerald-companion-2.save.v1',encoded),encoded);await page.reload();
 };
 await load(true);
 const targets=page.locator('.achievement-target'),dialog=page.getByRole('tooltip');
 assert.equal(await targets.count(),19);
 assert.equal(await page.locator('.trainer-champion').count(),0);
 const starLayout=await page.evaluate(()=>{
  const name=document.querySelector('.trainer-name').getBoundingClientRect(), row=document.querySelector('.trainer-card-stars').getBoundingClientRect();
  const stars=[...document.querySelectorAll('.trainer-card-stars button')].map(e=>({top:e.getBoundingClientRect().top,color:getComputedStyle(e).color}));
  return {aligned:Math.abs(name.left-row.left)<1,below:row.top>=name.bottom,stars};
 });
 assert.ok(starLayout.aligned&&starLayout.below);assert.equal(new Set(starLayout.stars.map(s=>s.top)).size,1);
 const stableLayout=await page.evaluate(()=>{
  const selectors=['.trainer-sprite','.trainer-portrait','.trainer-card','.trainer-fields','.dex-card','.gym-card','.frontier-card','.home-resources'];
  const measure=()=>selectors.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [r.x,r.y,r.width,r.height];});
  const before=measure(),block=document.querySelector('.trainer-name-block'),stars=document.querySelector('.trainer-card-stars');
  block.style.display='contents';stars.style.display='none';const withoutStars=measure();
  block.style.display='';stars.style.display='';return {before,withoutStars};
 });assert.deepEqual(stableLayout.before,stableLayout.withoutStars,'star row preserves sprite, Trainer Card, fields, Dex, badges, symbols and Resources geometry');
 assert.equal(starLayout.stars[0].color,'rgb(215, 182, 91)');assert.equal(starLayout.stars[1].color,'rgb(85, 91, 100)');
 assert.deepEqual(await targets.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),[
  'Hall of Fame: Earned','Hoenn Pokédex: Not Earned','Contest Master: Not Earned','Battle Frontier: Not Earned', ...['Stone','Knuckle','Dynamo','Heat','Balance','Feather','Mind','Rain'].map((n,i)=>`${n} Badge: ${i%2===0?'Earned':'Not Earned'}`),
  ...['Ability','Tactics','Spirits','Guts','Knowledge','Luck','Brave'].map((n,i)=>`${n} Symbol: ${['Not Earned','Silver','Gold'][i%3]}`)
 ]);
 for(const width of [320,375,430]){
  await page.setViewportSize({width,height:600});
  for(let i=0;i<19;i++){
   const target=targets.nth(i),label=await target.getAttribute('aria-label');
   await target.tap();await dialog.waitFor();
   assert.equal(await dialog.locator('strong').innerText(),label.split(': ')[0]);
   if(i<4){assert.doesNotMatch(await dialog.innerText(),/Status: /);assert.equal(await dialog.locator('.achievement-popup-detail').count(),1);}
   else assert.equal(await dialog.innerText(),label.split(': ')[0]);
   const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=600);
   const art=await target.boundingBox();assert.ok(Math.abs(box.y-(art.y+art.height+8))<2 || Math.abs(box.y+box.height+8-art.y)<2,'popup is beside artwork');
   if(width===375&&i===0)await page.screenshot({path:'/private/tmp/trainer-card-star-popup.png'});
   await dialog.locator('strong').tap();assert.equal(await dialog.count(),0);
  }
 }
 assert.equal(await page.locator('.badge-unearned button').count(),4);
 assert.equal(await page.locator('.frontier-unearned').count(),3);
 await targets.first().tap();
 const session=await page.context().newCDPSession(page);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:450}]});
 for(const y of [400,330,250,170])await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await dialog.count(),1,'swipe leaves popup open');
 await dialog.evaluate(element=>{
  const pointer={bubbles:true,pointerId:1,isPrimary:true,button:0,clientX:50,clientY:100};
  element.dispatchEvent(new PointerEvent('pointerdown',pointer));element.dispatchEvent(new Event('scroll'));
  element.dispatchEvent(new PointerEvent('pointerup',pointer));element.dispatchEvent(new MouseEvent('click',{bubbles:true}));
 });assert.equal(await dialog.count(),1,'scroll cancels tap dismissal');
 await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);
 await targets.first().focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');assert.equal(await targets.first().evaluate(e=>e===document.activeElement),true);
 await targets.first().tap();await page.touchscreen.tap(1,1);assert.equal(await dialog.count(),0);
 // A dismissal tap must never reach a second achievement or a Resource link/input.
 for (const next of [targets.nth(1),targets.nth(9),page.locator('.home-resources a').first(),page.locator('.home-search')]) {
  await next.scrollIntoViewIfNeeded();
  await targets.first().tap();
  const url=page.url();
  const box=await next.boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
  assert.equal(await dialog.count(),0,'next tap only dismisses');
  assert.equal(page.url(),url,'dismissal tap does not navigate');
  assert.equal(await next.evaluate(e=>e===document.activeElement),false,'dismissal tap does not focus underlying control');
  assert.equal(await page.locator('.trainer-content').count(),1,'Home stays visible');
 }
 await targets.first().tap();const same=await targets.first().boundingBox();await page.touchscreen.tap(same.x+same.width/2,same.y+same.height/2);assert.equal(await dialog.count(),0,'same target only dismisses');
 await targets.nth(1).tap();assert.equal(await dialog.count(),1,'following tap activates normally');await page.keyboard.press('Escape');
 await load(false);assert.equal(await targets.count(),19,'four stars remain visible before Champion');
 for(const button of await targets.all()){assert.match(await button.getAttribute('aria-label'),/: Not Earned$/);await button.tap();assert.equal(await dialog.locator('strong').innerText(),(await button.getAttribute('aria-label')).split(': ')[0]);await page.keyboard.press('Escape');}
 await page.locator('.frontier-symbols').scrollIntoViewIfNeeded();const before=await page.evaluate(()=>scrollY);
 await page.mouse.wheel(0,-400);await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>scrollY)<before,'page scrolling works after dismissal');
 assert.deepEqual(errors,[]);
 await page.screenshot({path:'/private/tmp/home-achievement-anchored.png'});
 console.log('PASS: all 19 targets (4 stars, 8 badges, 7 symbols) at 320/375/430px; mixed save statuses; unearned badges/symbols; tap inside/outside, swipe protection, Escape/focus, viewport containment, page scrolling.');
}finally{await browser.close();}
