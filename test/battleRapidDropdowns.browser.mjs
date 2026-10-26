import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
// These regressions verify app event delivery, focus, handoff, and state.
// Playwright WebKit cannot verify whether a physical iPhone's native picker opens.
const server=await createServer({base:'/',server:{host:'127.0.0.1',port:0,hmr:false}});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:375,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(10000);
 await page.route('**/rapid-move',route=>route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/battleMovePopup.jsx"></script>'}));
 await page.goto(new URL('/rapid-move',server.resolvedUrls.local[0]).href);
 await page.getByRole('button',{name:'Open move',exact:true}).tap();
 await page.getByRole('dialog').locator('h2').tap();assert.equal(await page.getByRole('dialog').count(),0);
 // A new native-picker touch may arrive without a pointerdown after dismissal.
 // It is a NEW gesture, not the compatibility tail of the completed click.
 const swallowed=await page.getByRole('combobox').evaluate(select=>select.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1})));
 assert.equal(swallowed,false,'the same-gesture compatibility click remains consumed');
 const permitted=await page.getByRole('combobox').evaluate(select=>select.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,cancelable:true})));
 assert.equal(permitted,true,'the first new touchstart after click dismissal must not be canceled');
 console.log('PASS completed popup gesture does not swallow the next touch-only dropdown interaction');

 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/rapid-battle?*',route=>route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/battleDropdownInteractions.jsx"></script>'}));
 for(const width of [320,390])for(const format of ['Singles','Doubles']) {
  await page.setViewportSize({width,height:844});
  await page.goto(new URL(`/rapid-battle?format=${format}`,server.resolvedUrls.local[0]).href);
  const saved=()=>page.getByLabel('Battle interaction state').textContent().then(JSON.parse);
  await page.waitForFunction(()=>{
   const state=JSON.parse(document.querySelector('[aria-label="Battle interaction state"]').textContent);
   return state.matchupConditions.player[0]?.abilityState?.context==='Trace'&&state.matchupConditions.enemy[0]?.abilityState?.context==='Synchronize|Trace';
  });
  const item=page.getByRole('combobox',{name:'Observed held item',exact:true});
  assert.equal(await item.inputValue(),'');
  assert.equal(await item.locator('option[value=""]').textContent(),'Add item');
  assert.equal(await item.evaluate(el=>el.parentElement.querySelector('.battle-observation-value').textContent),'Add item');
  await page.evaluate(()=>{
   globalThis.nativeDropdowns=new Map([...document.querySelectorAll('.battle-foundation select')].map(el=>[el.getAttribute('aria-label'),el]));
   globalThis.dropdownEvents=[];
   const record=event=>{if(event.target instanceof HTMLSelectElement || event.target.closest?.('button[aria-haspopup="dialog"]')){globalThis.dropdownEvents.push({type:event.type,label:event.target.getAttribute('aria-label')??event.target.textContent,trusted:event.isTrusted,get canceled(){return event.defaultPrevented;}});}};
   for(const type of ['pointerdown','pointerup','touchstart','touchend','click','focusin','focusout','change'])document.addEventListener(type,record,{capture:true,passive:false});
  });
  const baseline=await saved();
  const names=await page.locator('.battle-foundation select:not(:disabled)').evaluateAll(controls=>controls.map(el=>el.getAttribute('aria-label')));
  assert.ok(names.includes(format==='Doubles'?'Select opponent set Slot 1':'Select opponent set'));
  assert.ok(names.includes(format==='Doubles'?'Select my Pokémon Slot 1':'Select my Pokémon'));
  assert.ok(names.includes(format==='Doubles'?'Select opponent Pokémon Slot 1':'Select opponent Pokémon'));
  for(const name of ['Facility','Format','Level','Round','Select Trainer','Observed held item','Add observed move','Battle weather','Player status','Opponent status','Player Trace Ability','Opponent Trace Ability','Player Atk stage'])assert.ok(names.includes(name),name);
  // No delay or debounce: change focus straight from one native control to the next.
  for(const name of names) {
   const control=page.getByRole('combobox',{name,exact:true});await control.scrollIntoViewIfNeeded();
   assert.ok(await control.evaluate(el=>{const b=el.getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)===el;}),`${name}: unobstructed native hit area`);
   await control.tap();assert.equal(await control.evaluate(el=>document.activeElement===el),true,`${name}: first tap focuses intended control`);
  }
  await page.keyboard.press('Escape');assert.deepEqual(await saved(),baseline,'opening/changing focus alone never changes battle state');
  assert.ok(await page.evaluate(()=>[...globalThis.nativeDropdowns].every(([name,el])=>el.isConnected&&document.querySelector(`select[aria-label="${name}"]`)===el)),'native selects were not remounted');
  assert.ok(await page.evaluate(()=>globalThis.dropdownEvents.every(event=>!event.canceled)),'ordinary dropdown taps are not canceled by app handlers');
  const weather=page.getByRole('combobox',{name:'Battle weather',exact:true}),status=page.getByRole('combobox',{name:'Player status',exact:true});
  for(let repeat=0;repeat<3;repeat++)for(const control of [weather,weather,status]) {
   await control.tap();assert.equal(await control.evaluate(el=>document.activeElement===el),true,'immediate native switching/reopening reaches the intended control');
  }
  await page.keyboard.press('Escape');
  await weather.tap();await weather.selectOption('rain');assert.equal((await saved()).field.weather,'rain');
  await status.tap();await status.selectOption('burn');assert.equal((await saved()).matchupConditions.player[0].status,'burn');await page.keyboard.press('Escape');
  const stage=page.getByRole('combobox',{name:'Player Atk stage',exact:true});await stage.tap();await stage.selectOption('2');await page.keyboard.press('Escape');
  assert.equal((await saved()).matchupConditions.player[0].stages.attack,2);
  const choice=await item.locator('option').evaluateAll(options=>options.find(option=>option.value)?.value);
  await item.tap();await item.selectOption(choice);await page.keyboard.press('Escape');
  assert.equal((await saved()).opponentObservations[0].item,choice);
  assert.equal(await item.evaluate(el=>el.parentElement.querySelector('.battle-observation-value').textContent),choice);
  await page.getByRole('button',{name:'Reset observations',exact:true}).tap();assert.equal(await item.inputValue(),'');
  assert.equal(await item.evaluate(el=>el.parentElement.querySelector('.battle-observation-value').textContent),'Add item');
  const beforePopup=await saved();
  const custom=page.getByRole('button',{name:'Open custom popup',exact:true});
  const second=page.getByRole('button',{name:'Open second custom popup',exact:true});
  await weather.tap();await weather.selectOption('rain');
  await custom.tap();assert.equal(await page.getByRole('dialog',{name:'Custom interaction popup',exact:true}).count(),1,'native selection followed immediately by custom trigger');
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{globalThis.dropdownEvents=[];});
  await custom.tap();await second.tap();
  assert.equal(await page.getByRole('dialog',{name:'Second custom interaction popup',exact:true}).count(),1,
   JSON.stringify(await page.evaluate(()=>dropdownEvents.slice(-16))));
  assert.equal(await page.getByRole('dialog').count(),1,'previous custom popup closed without dismissing the new one');
  const handoff=await page.evaluate(()=>dropdownEvents.filter(event=>event.label==='Open second custom popup'));
  for(const type of ['pointerdown','touchstart','pointerup','touchend','click'])assert.ok(handoff.some(event=>event.type===type&&event.trusted&&!event.canceled),`${type}: trusted handoff event must reach second trigger`);
  await custom.tap();assert.equal(await page.getByRole('dialog',{name:'Custom interaction popup',exact:true}).count(),1);
  await custom.tap();assert.equal(await page.getByRole('dialog').count(),0,'same trigger dismisses without reopening on its compatibility click');
  await custom.tap();assert.equal(await page.getByRole('dialog').count(),1,'next tap reopens same custom popup');
  await page.keyboard.press('Escape');
  for(let repeat=0;repeat<3;repeat++) {
   await page.getByRole('button',{name:'Open custom popup',exact:true}).tap();assert.equal(await page.getByRole('dialog',{name:'Custom interaction popup'}).count(),1);
   await page.touchscreen.tap(2,2);assert.equal(await page.getByRole('dialog').count(),0);
   await weather.tap();assert.equal(await weather.evaluate(el=>document.activeElement===el),true);await page.keyboard.press('Escape');
  }
  await page.getByRole('button',{name:'Open custom popup',exact:true}).tap();await weather.tap();
  assert.equal(await page.getByRole('dialog').count(),0);
  assert.equal(await weather.evaluate(el=>document.activeElement===el),true,'one tap switches from custom popup to native select');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Open custom popup',exact:true}).tap();await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
  await page.getByRole('button',{name:'Open custom popup',exact:true}).tap();await page.getByRole('button',{name:'Choose custom option',exact:true}).tap();assert.equal(await page.getByLabel('Custom action count').textContent(),'1');
  await second.tap();assert.equal(await page.getByRole('dialog',{name:'Second custom interaction popup',exact:true}).count(),1,'option selection followed immediately by next custom popup');
  await weather.tap();assert.equal(await page.getByRole('dialog').count(),0);
  assert.equal(await weather.evaluate(el=>document.activeElement===el),true);
  assert.deepEqual(await saved(),beforePopup);
  await page.keyboard.press('Tab');await weather.focus();assert.equal(await weather.evaluate(el=>getComputedStyle(el.parentElement).outlineStyle),'solid');
  await page.keyboard.press('Escape');assert.deepEqual(await saved(),beforePopup);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log(`PASS ${format} ${width}px: native/native, custom/custom, native/custom, custom/native, same-control reopening, immediate options/outside dismissal, trusted touch/pointer/click handoff, stable nodes/state and keyboard/Escape`);
 }
 assert.deepEqual(errors,[]);
} finally {await browser?.close();await server.close();}
