import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
const server=await preview({preview:{host:'127.0.0.1',port:5217,strictPort:true}});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 const page=await browser.newPage({viewport:{width:375,height:568},isMobile:true,hasTouch:true});page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  const focus=HTMLElement.prototype.focus;window.destinationFocus=[];
  HTMLElement.prototype.focus=function(options){const before=scrollY;const result=focus.call(this,options);if(this.id==='main' || (this.tagName==='H1' && this.closest('#main')))window.destinationFocus.push({before,after:scrollY,preventScroll:options?.preventScroll});return result;};
 });
 await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
 const storage=new Uint8Array(33744);for(let i=0;i<100;i++)storage.set(makePokemon({pid:i,species:1}),4+i*80);
 await page.evaluate(encoded=>localStorage.setItem('emerald-companion-2.save.v1',encoded),Buffer.from(makeSave({blocks:{storage}})).toString('base64'));await page.reload();
 async function settle(){await page.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});}
 async function navigate(name){
  // Keep the source's current offset while invoking the existing navigation UI.
  if(name==='Settings')await page.getByRole('button',{name:'Settings',exact:true}).evaluate(node=>node.click());
  else {await page.getByRole('button',{name:'Open navigation',exact:true}).evaluate(node=>node.click());await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name,exact:true}).click();}
  await settle();
 }
 let transitions=0;
 for(const width of [375,430]) {
  // Short viewport also makes Settings scrollable at both phone widths.
  await page.setViewportSize({width,height:480});
  for(const source of ['Home','Collection','Battle','Settings']) {
   for(const destination of ['Home','Collection','Battle','Settings'].filter(name=>name!==source)) {
    await navigate(source);if(source==='Battle')await page.getByRole('tab',{name:'Trainers',exact:true}).click();
    await page.evaluate(()=>scrollTo(0,120));await settle();assert.ok(await page.evaluate(()=>scrollY)>0,`${width}px ${source} must be scrolled`);
    await navigate(destination);
    const result=await page.evaluate(()=>({y:scrollY,headerTop:document.querySelector('.header').getBoundingClientRect().top,headerBottom:document.querySelector('.header').getBoundingClientRect().bottom,focus:window.destinationFocus.at(-1),activeTag:document.activeElement.tagName,activeId:document.activeElement.id}));
    assert.equal(result.y,0,JSON.stringify({width,source,destination,result}));assert.equal(result.headerTop,0);assert.ok(result.headerBottom>0);
    assert.equal(result.focus.preventScroll,true);assert.equal(result.focus.before,0);assert.equal(result.focus.after,0);
    if(destination==='Settings')assert.equal(result.activeTag,'H1');else assert.equal(result.activeId,'main');
    transitions++;
   }
  }
 }
 assert.deepEqual(errors,[]);console.log(`PASS: ${transitions} scrolled-page transitions among Home, Collection, Battle and Settings at 375/430px; document top and global header preserved; destination focus retained without scrolling.`);
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
