import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5291,strictPort:true},plugins:[{
 name:'hp-moves-popup',configureServer(s){s.middlewares.use('/__hp-moves',(_req,res)=>{
  res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/hpDependentMovesPopup.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__hp-moves`);
  await page.getByRole('button',{name:'Battle Conditions',exact:true}).tap();
  const own=page.getByRole('group',{name:'My matchup Pokémon',exact:true});
  const enemy=page.getByRole('group',{name:'Opponent matchup Pokémon',exact:true});
  const hp=side=>page.getByRole('spinbutton',{name:`${side} current HP`,exact:true});
  const check=async(group,name,power)=>{
   await group.getByRole('button',{name:`Move information: ${name}`,exact:true}).tap();
   const dialog=page.getByRole('dialog');
   assert.equal(await dialog.locator('dd').first().innerText(),String(power));
   assert.equal(await dialog.locator('.battle-damage-unavailable').count(),0);
   const damage=await dialog.locator('.battle-core-damage-hp').allTextContents();
   assert.ok(damage.length>0);await page.keyboard.press('Escape');return damage;
  };
  for(const [current,flail,eruption] of [[200,20,150],[100,40,75],[1,200,1]]) {
   await hp('Player').fill(String(current));await hp('Player').blur();
   for(const name of ['Flail','Reversal'])await check(own,name,flail);
   for(const name of ['Eruption','Water Spout'])await check(own,name,eruption);
  }
  // Clearing the actual existing control resets to full, even though save currentHP was1.
  await hp('Player').fill('');await hp('Player').blur();
  const outgoing=await check(own,'Water Spout',150);
  await hp('Opponent').fill('1');await hp('Opponent').blur();
  assert.deepEqual(await check(own,'Water Spout',150),outgoing,'defender HP cannot alter outgoing power/damage');
  await check(enemy,'Water Spout',1);
  await hp('Opponent').fill('');await hp('Opponent').blur();await check(enemy,'Water Spout',150);
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).check();
  await check(own,'Flail',20);
  await page.getByRole('button',{name:'Unknown HP',exact:true}).tap();
  const dialog=page.getByRole('dialog');
  assert.equal(await dialog.locator('dd').first().innerText(),'—');
  assert.equal(await dialog.locator('.battle-damage-unavailable').innerText(),'Damage unavailable for this matchup.');
  await page.keyboard.press('Escape');assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: all HP moves, live Battle Conditions, both directions, null reset and unknown HP metadata`);
 }
} finally {await browser?.close();await server.close();}
