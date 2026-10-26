import assert from 'node:assert/strict';
import {chromium, webkit} from 'playwright';

const useWebKit=process.argv.includes('--webkit');
const browser=await (useWebKit ? webkit.launch({headless:true}) : chromium.launch({headless:true,channel:'chrome'}));
try {
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 page.setDefaultTimeout(10000);
 await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5173/');
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();
 await page.getByRole('button',{name:'Battle',exact:true}).click();
 const own=page.getByRole('combobox',{name:'Select my Pokémon',exact:true});
 const trainer=page.getByRole('combobox',{name:'Select Trainer',exact:true});
 const outline=control=>control.evaluate(el=>({style:getComputedStyle(el.parentElement).outlineStyle,width:getComputedStyle(el.parentElement).outlineWidth}));
 for(const control of [own,trainer]) {
  await control.tap();
  await page.keyboard.press('Escape');
  // Return to touch modality after Escape, which itself is keyboard input.
  await control.tap();
  const value=await outline(control);
  assert.equal(value.style,'none',JSON.stringify(value));
 }
 await page.keyboard.press('Escape');
 await page.keyboard.press('Tab');
 await own.focus();
 assert.equal((await outline(own)).width,'1px');
 await trainer.focus();
 assert.equal((await outline(trainer)).width,'1px');
 // Exercise every shared selector family, including portal and nested-button
 // cases, without depending on a particular imported save or matchup.
 await page.evaluate(()=>{
  const host=document.createElement('div');host.id='focus-fixtures';
  const select='<span class="battle-observation-display">One ▾</span><select><option>One</option><option>Two</option></select>';
  host.innerHTML=`<section class="battle-workspace-panel">
   <label class="battle-pokemon-control" data-focus="set">${select}</label>
   <span class="battle-observation-select" data-focus="ability">${select}</span>
   <span class="battle-observation-select" data-focus="observation">${select}<span class="battle-observation-display"><button>Move info</button></span></span>
  </section><section class="battle-conditions"><label class="battle-condition-hp">HP<input type="number" aria-label="Focus fixture HP" value="50" min="0" max="100"></label><span class="battle-observation-select battle-condition-select" data-focus="condition">${select}</span></section>
  <div class="battle-move-viewport"><div class="battle-move-scenario-controls"><span class="battle-observation-select" data-focus="scenario">${select}</span></div></div>
  <div class="battle-content"><span class="battle-observation-select" data-focus="legacy">${select}</span></div>`;
  // The real modal is already borderless; keep this selector fixture non-modal.
  host.querySelector('.battle-move-viewport').style.cssText='position:static;height:auto;width:auto;';
  document.querySelector('.battle-foundation').append(host);
  for(const selector of ['.battle-content','.battle-move-viewport']) {
   const node=host.querySelector(selector);node.id=selector==='.battle-content'?'focus-legacy':'focus-portal';document.body.append(node);
  }
 });
 for(const name of ['set','ability','observation','condition','scenario']) {
  const control=page.locator(`[data-focus="${name}"] > select`);
  await control.tap();
  assert.equal((await outline(control)).style,'none',name);
  await page.keyboard.press('Tab');await control.focus();
  assert.equal((await outline(control)).width,'1px',name);
 }
 const button=page.locator('[data-focus="observation"] button');
 await page.keyboard.press('Tab');await button.focus();
 assert.equal(await button.evaluate(el=>getComputedStyle(el).outlineStyle),'solid');
 assert.equal(await button.evaluate(el=>getComputedStyle(el.closest('.battle-observation-select')).outlineStyle),'none');
 const hp=page.getByRole('spinbutton',{name:'Focus fixture HP'});
 await hp.tap();
 const hpStyle=()=>hp.evaluate(el=>({outline:getComputedStyle(el).outlineStyle,shadow:getComputedStyle(el).boxShadow,border:getComputedStyle(el).borderWidth}));
 assert.equal((await hpStyle()).outline,'none');
 assert.equal((await hpStyle()).shadow,'none');
 assert.equal((await hpStyle()).border,'0px');
 await hp.fill('');await page.keyboard.type('37');assert.equal(await hp.inputValue(),'37');
 assert.equal((await hpStyle()).outline,'none');
 assert.equal(await page.locator('.battle-foundation').getAttribute('data-keyboard-focus'),null);
 await page.keyboard.press('Tab');await hp.focus();
 assert.equal((await hpStyle()).outline,'solid');
 assert.equal((await hpStyle()).shadow,'none');
 const legacy=page.locator('[data-focus="legacy"] > select');await legacy.tap();
 assert.equal((await outline(legacy)).width,'1px');
 await page.locator('#focus-fixtures, #focus-legacy, #focus-portal').evaluateAll(nodes=>nodes.forEach(el=>el.remove()));
 for(const name of ['Facility','Format','Level','Round']) {
  const control=page.getByRole('combobox',{name,exact:true});await control.tap();
  assert.equal((await outline(control)).style,'none',name);
  await page.keyboard.press('Tab');await control.focus();
  assert.equal((await outline(control)).width,'1px',name);
 }
 console.log(`PASS ${useWebKit?'WebKit':'Chrome'}: actual Pokémon/Trainer touch and keyboard focus; Set/ability/observations/conditions/scenario selector coverage; one nested-button indicator; Rules touch/keyboard focus, undecorated HP touch editing, and legacy focus preserved.`);
} finally {await browser.close();}
