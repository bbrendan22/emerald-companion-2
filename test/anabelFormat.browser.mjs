import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {preview} from 'vite';
const useWebKit=process.argv.includes('--webkit');
const server=await preview({preview:{host:'127.0.0.1',port:useWebKit?5217:5216,strictPort:true}});
const browser=await(useWebKit?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
const errors=[];
try{
 for(const width of [320,375,390,430,1440]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500,serviceWorkers:'block'});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  const tap=async el=>width<500?el.tap():el.click();
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();
  const opponent=page.getByRole('region',{name:'Opponent Team',exact:true});
  const trainer=opponent.locator('.battle-opponent-trigger');
  const popup=page.getByRole('dialog',{name:'Select opponent trainer'});
  const rules=page.getByRole('dialog',{name:'Battle Rules'});
  const change=async format=>{await tap(page.getByRole('button',{name:'Battle Rules',exact:true}));await rules.getByLabel('Battle Type').selectOption(format);await page.keyboard.press('Escape');};
  const sprites=()=>opponent.locator('.battle-compact-slot img').evaluateAll(imgs=>imgs.map(img=>img.getAttribute('src')));
  for(const symbol of ['Silver','Gold']){
   await tap(trainer);await popup.getByRole('searchbox').fill('Anabel');
   assert.equal(await popup.locator('.battle-opponent-result').count(),2);
   await tap(popup.getByRole('button',{name:`Select trainer Anabel ${symbol}`,exact:true}));
   await opponent.locator('.battle-compact-slot img').nth(2).waitFor();
   // Make an explicit species choice before changing format.
   const slots=opponent.locator('.battle-compact-slot');
   await page.waitForTimeout(450);
   if(width<500){await tap(slots.nth(0));await tap(slots.nth(0));}else await slots.nth(0).dblclick();
   await page.waitForTimeout(450);await tap(slots.nth(0));
   const species=page.getByRole('dialog',{name:'Select opponent Pokémon'});
   await tap(species.locator('.battle-opponent-result:not(:disabled)').first());
   const before=await sprites();assert.equal(before.length,3);
   await change('Doubles');
   assert.equal(await trainer.locator('.battle-opponent-name').innerText(),'Opponent');
   assert.equal(await trainer.locator('.battle-compact-trainer').count(),0);
   assert.deepEqual(await sprites(),before,'switching formats preserves manually selected opponent Pokémon');
   await tap(trainer);assert.equal(await popup.locator('.battle-opponent-result').count(),300);
   await popup.getByRole('searchbox').fill('Anabel');assert.equal(await popup.locator('.battle-opponent-result').count(),0);
   await page.keyboard.press('Escape');await change('Singles');
   assert.equal(await trainer.locator('.battle-opponent-name').innerText(),'Opponent');
   assert.deepEqual(await sprites(),before);
  }
  await tap(trainer);await popup.getByRole('searchbox').fill('BRADY');
  await tap(popup.getByRole('button',{name:'Select trainer BRADY',exact:true}));await change('Doubles');
  assert.equal(await trainer.locator('.battle-opponent-name').innerText(),'BRADY');
  await context.close();console.log(`PASS ${width}px: both Anabel entries Singles-only, immediate heading reset, manual species preserved, ordinary trainer retained.`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
