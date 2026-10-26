import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
import {battleMove} from '../src/battle/reference.js';
import baseline from './fixtures/damageFinalizationBaseline.json' with {type:'json'};
const server=await createServer({server:{host:'127.0.0.1',port:5307,strictPort:true},plugins:[{
 name:'special-move-outcomes',configureServer(s){s.middlewares.use('/__special-outcomes',(_req,res)=>{
 res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/specialMoveOutcomesPopup.jsx"></script>');
 });}
}]});
let browser;
try{
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]){
  const page=await browser.newPage({viewport:{width,height:667},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__special-outcomes`);
  const options=await page.getByRole('combobox',{name:'Opponent move 1',exact:true}).locator('option').allTextContents();
  assert.ok(options.length>1);assert.equal(options.includes('Struggle'),false);
  await page.getByRole('button',{name:'Open outcomes',exact:true}).tap();
  const dialog=page.getByRole('dialog');
  const compact=async()=>{
   const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=667);
   assert.equal(await dialog.locator('.battle-move-scenario-controls').count(),0);
  };
  const outcome=async expected=>{
   assert.deepEqual(await dialog.locator('.battle-core-damage-outcome').allTextContents(),expected);
   assert.equal(await dialog.locator('.battle-core-damage-percent,.battle-core-damage-hp').count(),0,'OHKO has no numeric damage');
   await compact();
  };
  for(const name of ['Guillotine','Horn Drill','Fissure','Sheer Cold']){
   assert.equal(await dialog.locator('h2').innerText(),name);
   await outcome(['OHKO']);assert.equal(await dialog.locator('dd').nth(1).innerText(),'Level-based');
   await page.keyboard.press('s');await outcome(['IMMUNE']);
   await page.keyboard.press('u');await outcome(['OHKO','IMMUNE']);
   assert.deepEqual(await dialog.locator('.battle-ability-label').allTextContents(),['Rock Head','Sturdy']);
   if(width===375&&name==='Fissure')await page.screenshot({path:'/tmp/emerald-step4-ohko.png'});
   await page.keyboard.press('l');await outcome(['BLOCKED']);
   await page.keyboard.press('g');await outcome([['Guillotine','Horn Drill'].includes(name)?'IMMUNE':'OHKO']);
   await page.keyboard.press('f');await outcome([name==='Fissure'?'IMMUNE':'OHKO']);
   await page.keyboard.press('v');await outcome([name==='Fissure'?'IMMUNE':'OHKO']);
   await page.keyboard.press('i');await outcome(['OHKO']);
   await page.keyboard.press('x');assert.equal(await dialog.locator('.battle-damage-unavailable').count(),1);
   await page.keyboard.press('n');
  }
  for(const row of baseline.moves.filter(m=>m.category==='status')){
   assert.equal(await dialog.locator('h2').innerText(),row.name);
   const effect=dialog.getByRole('region',{name:'Move effect',exact:true});
   assert.equal(await effect.locator('p').textContent(),battleMove(row.id).description);
   assert.equal(await dialog.getByRole('region',{name:'Damage Calculation',exact:true}).count(),0);
   assert.equal(await dialog.locator('.battle-core-damage-percent,.battle-core-damage-outcome').count(),0);
   await compact();
   // Descriptions must not depend on exact stats or known abilities.
   if(row.name==='Growl'){await page.keyboard.press('x');assert.equal(await effect.locator('p').textContent(),battleMove(row.id).description);}
   await page.keyboard.press('n');
  }
  for(const name of ['Counter','Mirror Coat','Bide','Beat Up','Future Sight','Doom Desire','Spit Up']){
   assert.equal(await dialog.locator('h2').innerText(),name);
   assert.equal(await dialog.getByRole('region',{name:'Damage Calculation',exact:true}).locator('p').innerText(),'Damage unavailable: requires special battle-state handling.');
   assert.equal(await dialog.locator('dd').first().innerText(),'—');
   assert.equal(await dialog.locator('.battle-core-damage-percent,.battle-core-damage-outcome').count(),0);await compact();
   await page.keyboard.press('n');
  }
  assert.equal(await dialog.locator('h2').innerText(),'Struggle');assert.equal(await dialog.locator('.battle-core-damage-percent').count(),1,'direct/imported Struggle remains calculable');
  await dialog.locator('.battle-core-damage-hp').tap();assert.equal(await page.getByRole('dialog').count(),0);
  await page.getByRole('button',{name:'Open outcomes',exact:true}).tap();
  await dialog.locator('.battle-core-damage-outcome').tap();assert.equal(await page.getByRole('dialog').count(),0,'outcome tap dismisses');
  await page.getByRole('button',{name:'Open outcomes',exact:true}).tap();await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
  assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: four OHKO outcomes/uncertainty, all 138 descriptions, seven unsupported messages, Struggle selection/internal support, compact bounds and dismissal`);
 }
}finally{await browser?.close();await server.close();}
