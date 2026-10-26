import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:0,hmr:false},base:'/'});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 page.setDefaultTimeout(10000);
 await page.route('**/opening-fixture',r=>r.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/statusMovePopup.jsx"></script>'}));
 await page.goto(server.resolvedUrls.local[0]+'opening-fixture');
 const trigger=page.getByRole('button',{name:'Open player move',exact:true});
 await page.evaluate(()=>document.addEventListener('focusin',e=>{if(e.target.matches('.battle-move-scenario-controls select'))window.selectorFocus++;}));
 await page.evaluate(()=>document.addEventListener('click',e=>{if(!e.target.closest('dialog'))window.pageClicks++;}));
 for(const name of ['Bullet Seed','Rollout','Magnitude']) {
  await page.getByRole('combobox',{name:'Test move',exact:true}).selectOption({label:name});
  await page.evaluate(()=>{window.selectorFocus=0;});
  const before=await page.getByLabel('Battle snapshot').textContent();
  await trigger.tap();
  const dialog=page.getByRole('dialog');await dialog.waitFor();
  assert.equal(await dialog.evaluate(el=>document.activeElement===el),true,`${name}: initial focus belongs to dialog`);
  assert.equal(await page.evaluate(()=>window.selectorFocus),0,`${name}: opening must not focus native selector`);
  const selector=dialog.getByRole('combobox');
  const original=await selector.inputValue();
  await selector.tap();
  assert.equal(await selector.evaluate(el=>el===document.activeElement),true,'intentional selector tap focuses it');
  const value=await selector.locator('option').last().getAttribute('value');
  await selector.selectOption(value);assert.equal(await selector.inputValue(),value);
  assert.notEqual(value,original);assert.equal(await dialog.count(),1);
  await page.evaluate(()=>{window.pageClicks=0;});
  await dialog.locator('h2').tap();assert.equal(await page.getByRole('dialog').count(),0,'stationary tap dismisses');
  assert.equal(await page.evaluate(()=>window.pageClicks),0,'dismissal click cannot reach the page');
  assert.equal(await page.evaluate(()=>document.body.style.position),'','scroll lock restored');
  assert.equal(await page.getByLabel('Battle snapshot').textContent(),before,'popup controls do not mutate battle state');
  await trigger.focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.body.style.position),'fixed');
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(),0);
  assert.equal(await trigger.evaluate(el=>document.activeElement===el),true,'keyboard focus restored');
 }
 console.log('PASS WebKit: Bullet Seed, Rollout, Magnitude initial dialog focus; intentional selectors; tap/Escape dismissal; scroll lock and focus restoration; unchanged battle state');
} finally {await browser?.close();await server.close();}
