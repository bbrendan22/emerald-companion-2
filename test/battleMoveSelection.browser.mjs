import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';

const server=await createServer({server:{host:'127.0.0.1',port:5333,strictPort:true},plugins:[{
 name:'move-selection-regression',configureServer(s){s.middlewares.use('/__move-selection',(_req,res)=>{
  res.setHeader('Content-Type','text/html');
  res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/frontierCandidatePopup.jsx"></script>');
 });},
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(server.resolvedUrls.local[0]+'__move-selection');await page.waitForFunction(()=>window.frontierFixture);
 const own=page.getByRole('group',{name:'My matchup Pokémon',exact:true});
 const rows=own.locator('.battle-active-moves li'),dialog=page.getByRole('dialog');
 const expected=[['Ice Beam','71–84 HP damage'],['Surf','107–126 HP damage'],['Earthquake','0–0 HP damage']];
 const verify=async index=>{
  await dialog.waitFor();
  assert.equal(await dialog.locator('h2').innerText(),expected[index][0]);
  assert.equal(await dialog.locator('.battle-core-damage-hp').innerText(),expected[index][1]);
 };
 const close=async()=>{await dialog.locator('h2').tap();assert.equal(await dialog.count(),0);};
 const pairs=[[0,1],[1,0],[1,2],[0,2],[1,1]];
 // Keep the physical gesture location on the new row, but deliver its click to
 // the previous button. This isolates stale compatibility-event targeting from
 // React state, popup reconciliation, and the actual damage engine.
 for(const [from,to]of pairs) {
  await rows.nth(from).locator('button').tap();await verify(from);await close();
  await own.evaluate((group,{from,to})=>{
   const rows=group.querySelectorAll('.battle-active-moves li');
   const intended=rows[to].querySelector('button'),previous=rows[from].querySelector('button');
   const bounds=intended.getBoundingClientRect(),x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
   const pointer={bubbles:true,cancelable:true,isPrimary:true,pointerId:41,pointerType:'touch',button:0,clientX:x,clientY:y};
   intended.dispatchEvent(new PointerEvent('pointerdown',pointer));
   intended.dispatchEvent(new PointerEvent('pointerup',pointer));
   previous.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1,clientX:x,clientY:y}));
  },{from,to});
  await verify(to);await close();
 }
 for(const selector of ['button','.battle-active-move-pp'])for(const [from,to]of pairs) {
  await rows.nth(from).locator(selector).tap();await verify(from);await close();
  await rows.nth(to).locator(selector).tap();await verify(to);await close();
 }
 // Keyboard activation remains tied to the focused button, with no pointer.
 await rows.nth(1).locator('button').focus();await page.keyboard.press('Enter');await verify(1);
 await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS WebKit 390px: 5 retargeted-click sequences, 10 native adjacent/nonadjacent/reopen sequences, keyboard activation; correct first-open move and damage.');
} finally {await browser?.close();await server.close();}
