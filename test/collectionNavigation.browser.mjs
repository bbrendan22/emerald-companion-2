import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
const server=await preview({preview:{host:'127.0.0.1',port:5216,strictPort:true}});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 const page=await browser.newPage({viewport:{width:375,height:568},isMobile:true,hasTouch:true});page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  const focus=HTMLElement.prototype.focus;window.navigationFocus=[];
  HTMLElement.prototype.focus=function(options){const before=scrollY;const result=focus.call(this,options);if(this.id==='main')window.navigationFocus.push({before,after:scrollY,options:options??null});return result;};
 });
 await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
 const storage=new Uint8Array(33744);for(let i=0;i<100;i++)storage.set(makePokemon({pid:i,species:1}),4+i*80);
 await page.evaluate(encoded=>{localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify(Object.fromEntries(Array.from({length:100},(_,i)=>[`0:${i}:0`,'Frontier']))));},Buffer.from(makeSave({blocks:{storage}})).toString('base64'));await page.reload();
 async function settle(){await page.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});}
 async function navigate(name){
  // Open the actual navigation from the current document offset without Playwright
  // scrolling the offscreen header into view before the navigation test begins.
  await page.getByRole('button',{name:'Open navigation',exact:true}).evaluate(node=>node.click());
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name,exact:true}).click();await settle();
 }
 for(const width of [375,430]) {
  await page.setViewportSize({width,height:568});
  for(const source of ['Home','Battle']) {
   if(source==='Battle'){await navigate('Battle');await page.getByRole('tab',{name:'Trainers',exact:true}).click();}else if(await page.locator('.home-layout').count()===0)await navigate('Home');
   await page.evaluate(()=>scrollTo(0,120));await settle();assert.ok(await page.evaluate(()=>scrollY)>0,`${source} must be scrolled for this regression`);
   await navigate('Collection');
   const entry=await page.evaluate(()=>({scroll:scrollY,container:document.scrollingElement.tagName,searchTop:document.querySelector('.collection-search-row').getBoundingClientRect().top,headerBottom:document.querySelector('.header').getBoundingClientRect().bottom,focus:window.navigationFocus.at(-1)}));
   console.log(`${width}px ${source} → Collection: ${JSON.stringify(entry)}`);
   assert.equal(entry.scroll,0);assert.equal(entry.container,'HTML');assert.ok(entry.searchTop>=entry.headerBottom && entry.searchTop-entry.headerBottom<=3);assert.equal(await page.locator('#main').evaluate(node=>node===document.activeElement),true);
  }
  const cards=page.locator('.pokemon-card');await cards.nth(32).scrollIntoViewIfNeeded();const before=await page.evaluate(()=>scrollY);assert.ok(before>0);
  await cards.nth(32).click();await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(),0);await settle();assert.equal(await page.evaluate(()=>scrollY),before);
  // A query that retains these records must not reset the current scroll position.
  await page.getByLabel('Search Pokémon',{exact:true}).evaluate(node=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,'Bulbasaur');node.dispatchEvent(new Event('input',{bubbles:true}));});await settle();assert.equal(await page.evaluate(()=>scrollY),before);
  await page.locator('.collection-role-toggles').getByRole('button',{name:'Frontier',exact:true}).evaluate(node=>node.click());await settle();assert.equal(await cards.count(),100);assert.equal(await page.evaluate(()=>scrollY),before);
  await page.locator('.collection-role-toggles').getByRole('button',{name:'Frontier',exact:true}).evaluate(node=>node.click());await settle();assert.equal(await page.evaluate(()=>scrollY),before);
  await page.getByRole('button',{name:'Filter Collection',exact:true}).evaluate(node=>node.click());
  await page.getByLabel('Type',{exact:true}).evaluate(node=>{node.value='grass';node.dispatchEvent(new Event('change',{bubbles:true}));});await settle();assert.equal(await page.evaluate(()=>scrollY),before);assert.equal(await cards.count(),100);
  const old=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,150);await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>scrollY)>old);
 }
 assert.deepEqual(errors,[]);console.log('PASS: Collection enters at document top from scrolled Home/Battle at 375/430px; focus remains accessible; popup dismissal, category filters, search, and native scrolling preserve expected position.');
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
