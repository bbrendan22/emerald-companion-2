import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {createServer} from 'vite';

const useWebKit=process.argv.includes('--webkit');
const server=await createServer({base:'/',server:{host:'127.0.0.1',port:0,hmr:false}});
let browser;
try {
 await server.listen();
 browser=await(useWebKit?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
 for(const width of [320,390,1440]) {
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500,serviceWorkers:'block'});
  try {
   const page=await context.newPage();page.setDefaultTimeout(10000);
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   const tap=control=>width<500?control.tap():control.click();
   for(const [path,fixture] of [['dismiss-move','battleMovePopup'],['dismiss-search','battleDropdownInteractions']]) {
    await page.route(`**/${path}`,route=>route.fulfill({contentType:'text/html',body:`<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/${fixture}.jsx"></script>`}));
   }
   await page.goto(new URL('/dismiss-move',server.resolvedUrls.local[0]).href);
   const trigger=page.getByRole('button',{name:'Open move',exact:true});
   const actions=()=>page.getByLabel('Underlying actions').textContent();
   // The current move dialog is modal. Backdrop dismissal must consume the
   // complete gesture even when it uncovers an actionable page control.
   const targets=[...['Pokémon slot','Move slot','Battle control'].map(name=>page.getByRole('button',{name,exact:true})),page.getByRole('combobox',{name:'Underlying dropdown'})];
   for(const target of targets) {
    const before=await actions();
    const bounds=await target.boundingBox();
    await tap(trigger);await page.getByRole('dialog').waitFor();
    const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
    if(width<500)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
    assert.equal(await page.getByRole('dialog').count(),0,'outside tap dismisses the move dialog');
    const permitted=await target.evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1})));
    assert.equal(permitted,false,'late compatibility click is consumed after unmount');
    assert.equal(await actions(),before,'underlying pointer/click handlers did not run');
    assert.equal(await page.getByRole('combobox').inputValue(),'None');
    await tap(page.getByRole('button',{name:'Battle control',exact:true}));
    assert.equal(Number(await actions()),Number(before)+2,'next deliberate gesture reaches pointerdown and click handlers');
   }
   await trigger.focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();
   await page.keyboard.press('Escape');
   assert.equal(await page.getByRole('dialog').count(),0);
   assert.equal(await trigger.evaluate(el=>document.activeElement===el),true,'keyboard dismissal restores move trigger focus');

   // Native Rules/team/trainer selectors have no custom search popup anymore.
   // Use the existing shared-popup fixture only for the held-gesture guard;
   // native switching and popup handoff matrices live in battleRapidDropdowns.
   await page.goto(new URL('/dismiss-search',server.resolvedUrls.local[0]).href);
   await page.waitForFunction(()=>{
    const state=JSON.parse(document.querySelector('[aria-label="Battle interaction state"]').textContent);
    return state.selectedOpponentSetId && state.matchupConditions.player[0]?.abilityState?.context==='Trace'
     && state.matchupConditions.enemy[0]?.abilityState?.context==='Synchronize|Trace';
   });
   const state=()=>page.getByLabel('Battle interaction state').textContent();
   const custom=page.getByRole('button',{name:'Open custom popup',exact:true});
   const weather=page.getByRole('combobox',{name:'Battle weather',exact:true});
   const before=await state();
   await tap(custom);await page.getByRole('dialog').waitFor();
   await page.getByLabel('Custom action count').evaluate(el=>{
    el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:77}));
    el.dispatchEvent(new Event('touchstart',{bubbles:true,cancelable:true}));
   });
   assert.equal(await page.getByRole('dialog').count(),0);
   await page.waitForTimeout(1100);
   const permitted=await weather.evaluate(el=>{
    el.dispatchEvent(new Event('touchend',{bubbles:true,cancelable:true}));
    return el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));
   });
   assert.equal(permitted,false,'held dismissal guard lasts until release, not a timer from pointerdown');
   assert.equal(await state(),before);
   await tap(custom);await page.getByRole('dialog').waitFor();
   await tap(page.getByRole('button',{name:'Choose custom option',exact:true}));
   assert.equal(await page.getByLabel('Custom action count').textContent(),'1','internal actions still work after held dismissal');
   assert.equal(await page.getByRole('dialog').count(),0);
   await custom.focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();
   await page.keyboard.press('Escape');
   assert.equal(await page.getByRole('dialog').count(),0);
   assert.equal(await custom.evaluate(el=>document.activeElement===el),true,'Escape restores shared-popup trigger focus');
   assert.equal(await state(),before,'dismissal does not change Battle state');
   assert.deepEqual(errors,[]);
   console.log(`PASS ${width}px: move backdrop dismissal, delayed click-through protection, next gesture, held shared-popup dismissal, internal actions, Escape and focus restoration`);
  } finally {await context.close();}
 }
} finally {await browser?.close();await server.close();}
