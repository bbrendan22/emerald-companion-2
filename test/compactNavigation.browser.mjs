import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {makeSave} from './fixtures/synthetic.js';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined)});
try {
 for(const mobile of [true,false]) {
  const page=await browser.newPage({viewport:{width:mobile?375:1100,height:700},isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.BROWSER_URL || 'http://127.0.0.1:5173/');
  await page.evaluate(encoded=>localStorage.setItem('emerald-companion-2.save.v1',encoded),Buffer.from(makeSave()).toString('base64'));await page.reload();
  const toggle=page.getByRole('button',{name:'Open navigation',exact:true}),menu=page.getByRole('navigation',{name:'Main navigation',exact:true});
  const activate=async locator=>mobile?locator.tap():locator.click();
  for(const width of mobile?[320,375,430]:[1100]) {
   await page.setViewportSize({width,height:700});
   const header=await page.locator('.header').boundingBox(),trainer=await page.locator('.home-trainer').boundingBox();
   const typography=await page.locator('.home-resources .resources-destinations a').first().evaluate(e=>{const s=getComputedStyle(e);return [s.color,s.fontSize,s.fontFamily,s.fontWeight,s.lineHeight,s.letterSpacing];});
   await activate(toggle);
   assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   assert.deepEqual(await menu.locator('button').allTextContents(),['Home','Collection','Battle']);
   assert.equal(await menu.locator('svg,img,h1,h2,[aria-current],.nav-dot,.nav-arrow').count(),0);
   const rect=await menu.boundingBox(),anchor=await toggle.boundingBox();
   assert.equal(rect.width,112);assert.ok(rect.height<=150&&rect.height>=132);
   assert.ok(Math.abs(rect.x-anchor.x)<1);assert.ok(Math.abs(rect.y-anchor.y-anchor.height-4)<1);
   assert.ok(rect.x>=0&&rect.x+rect.width<=width&&rect.y+rect.height<=700);
   const fonts=await menu.locator('button').evaluateAll(nodes=>nodes.map(e=>{const s=getComputedStyle(e);return [s.color,s.fontSize,s.fontFamily,s.fontWeight,s.lineHeight,s.letterSpacing];}));
   for(const font of fonts)assert.deepEqual(font,typography,'exact Home link typography');
   const aligned=await page.evaluate(()=>{
    const icon=document.querySelector('[aria-controls="navigation-drawer"] svg path').getBoundingClientRect().left;
    return [...document.querySelectorAll('.drawer .nav-item')].every(button=>{const range=document.createRange();range.selectNodeContents(button);return Math.abs(range.getBoundingClientRect().left-icon)<1;});
   });assert.equal(aligned,true,'all labels align with left edge of hamburger strokes');
   assert.deepEqual(await page.locator('.header').boundingBox(),header);assert.deepEqual(await page.locator('.home-trainer').boundingBox(),trainer);
   assert.deepEqual(await page.evaluate(()=>[document.body.style.overflow,document.documentElement.style.overflow]),['','']);
   const toggleBox=await toggle.boundingBox();
   await page.mouse.click(toggleBox.x+toggleBox.width/2,toggleBox.y+toggleBox.height/2);assert.equal(await menu.count(),0,'hamburger dismisses without click-through');
   await activate(toggle);const outside=await page.locator('.home-resources-title').boundingBox();await page.mouse.click(outside.x+outside.width/2,outside.y+outside.height/2);assert.equal(await menu.count(),0,'outside tap dismisses');
   await toggle.focus();await page.keyboard.press('Enter');await menu.waitFor();await page.keyboard.press('Escape');assert.equal(await menu.count(),0);assert.equal(await toggle.evaluate(e=>e===document.activeElement),true);
   await activate(toggle);
   await page.evaluate(()=>{const spacer=document.createElement('div');spacer.id='scroll-check-spacer';spacer.style.height='700px';document.body.append(spacer);});
   const scrollBefore=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,200);await page.waitForTimeout(100);
   assert.ok(await page.evaluate(()=>scrollY)>scrollBefore,'page scroll stays enabled');
   assert.equal(await menu.count(),0,'page scroll dismisses menu');
   await page.keyboard.press('Escape');await page.evaluate(()=>{document.getElementById('scroll-check-spacer').remove();scrollTo(0,0);});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  for(const [label,pageClass] of [['Collection','.pokemon-page'],['Battle','.battle-page'],['Home','.home-page']]) {
   await activate(toggle);await activate(menu.getByRole('button',{name:label,exact:true}));
   await page.locator(pageClass).waitFor();assert.equal(await menu.count(),0);assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  }
  // Outside taps only close: no Settings navigation, input focus, database open, or star popup.
  for(const target of [page.getByRole('button',{name:'Settings',exact:true}),page.getByRole('searchbox',{name:'Search Resources',exact:true}),page.getByRole('link',{name:'Pokédex',exact:true}),page.locator('.trainer-card-stars button').last()]) {
   await activate(toggle);const box=await target.boundingBox();
   if(mobile)await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);else await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
   assert.equal(await menu.count(),0);assert.equal(await page.locator('.home-page').count(),1);
   assert.equal(await page.locator('.home-directory-heading, .achievement-popup').count(),0);
   assert.equal(await target.evaluate(e=>e===document.activeElement),false,'outside tap does not focus underlying control');
  }
  await activate(page.getByRole('button',{name:'Settings',exact:true}));
  await page.getByText('Your save file',{exact:true}).waitFor();assert.equal(await menu.count(),0);
  assert.deepEqual(errors,[]);
  if(mobile){await activate(toggle);await page.screenshot({path:'/private/tmp/compact-navigation.png'});}
  await page.close();
 }
 console.log('PASS: compact menu at 320/375/430px and desktop, exact Home link typography, toggle/outside/Escape dismissal, destination/Settings navigation, unchanged layout, enabled scrolling, no horizontal overflow.');
}finally{await browser.close();}
