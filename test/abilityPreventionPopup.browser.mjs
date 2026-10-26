import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5299,strictPort:true},plugins:[{
 name:'ability-prevention-popup',configureServer(s){s.middlewares.use('/__ability-prevention',(_req,res)=>{
  res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/abilityPreventionPopup.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__ability-prevention`);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap();
  const open=async name=>{await tap(name);return page.getByRole('dialog');};
  const close=async dialog=>{await dialog.locator('.battle-core-damage-hp').first().tap();assert.equal(await page.getByRole('dialog').count(),0);};
  const blocked=async(name,message)=>{
   const dialog=await open(name);
   assert.deepEqual(await dialog.getByRole('region',{name:'Damage Calculation'}).locator('p').allTextContents(),[message]);
   assert.equal(await dialog.locator('.battle-core-damage-percent').count(),0);
   const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
   await close(dialog);
  };
  const available=async(name,hp)=>{
   const dialog=await open(name),region=dialog.getByRole('region',{name:'Damage Calculation'});
   assert.equal(await dialog.locator('.battle-core-damage-hp').innerText(),`${hp} HP damage`);
   assert.equal(await region.locator('p').first().getAttribute('class'),'battle-core-damage-percent');
   await close(dialog);
  };
  for(const name of ['Strength','Surf','Weather Ball','Seismic Toss','SonicBoom','Endeavor','Double Kick','DoubleSlap','Triple Kick'])await blocked(name,'Blocked by Wonder Guard');
  await tap('weak');await available('Double Kick','50–60');await available('Triple Kick','52–62');await available('Seismic Toss','50');
  await tap('psychic');await available('Hidden Power','54–64');
  await tap('grass');await tap('sun');await available('Weather Ball','119–140');
  await tap('none');await tap('ghost');await available('Night Shade','50');await blocked('Seismic Toss','Immune.');
  await available('Struggle','20–24');
  await tap('sound');for(const name of ['Snore','Uproar','Hyper Voice'])await blocked(name,'Blocked by Soundproof');
  await available('SonicBoom','20');await available('Strength','46–55');
  await tap('damp');for(const side of ['Player','Opponent']) {
   await tap(`${side} attacks`);for(const name of ['Explosion','Self Destruct'])await blocked(name,'Prevented by Damp');
  }
  await tap('Player attacks');
  for(const [mode,name,label,message] of [['uncertain-wonder','Strength','Wonder Guard','Blocked by Wonder Guard'],['uncertain-sound','Hyper Voice','Soundproof','Blocked by Soundproof'],['uncertain-damp','Explosion','Damp','Prevented by Damp']]) {
   await tap(mode);const dialog=await open(name);
   assert.deepEqual(await dialog.locator('.battle-ability-label').allTextContents(),[mode==='uncertain-damp'?'Water Absorb':'Immunity',label]);
   assert.equal(await dialog.locator('.battle-core-damage-percent').count(),1);
   assert.equal(await dialog.locator('.battle-core-damage-hp').last().innerText(),message);await close(dialog);
  }
  await tap('reasons');let dialog=await open('Hyper Voice');
  assert.deepEqual(await dialog.locator('.battle-core-damage-hp').allTextContents(),['Blocked by Wonder Guard','Blocked by Soundproof']);
  await page.keyboard.press('Escape');
  await tap('unknown');dialog=await open('Strength');assert.equal(await dialog.locator('.battle-damage-unavailable').count(),1);
  await page.keyboard.press('Escape');assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: Wonder Guard resolved/deterministic/multi-hit, Soundproof exceptions, Damp both directions, uncertainty, messages, percentages and tap dismissal`);
 }
} finally {await browser?.close();await server.close();}
