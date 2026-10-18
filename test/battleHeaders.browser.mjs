import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
 const page=await browser.newPage({viewport:{width:375,height:800},isMobile:true,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5175');
 const navigate=async()=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();};
 const tab=async name=>page.getByRole('tab',{name,exact:true}).click();
 const player=page.locator('.battle-team-header.battle-side-player'),enemy=page.locator('.battle-team-header.battle-side-enemy');
 for(const [gender,sprite] of [[0,'brendan-emerald'],[1,'may-emerald']]) {
  const storage=new Uint8Array(33744),b2=new Uint8Array(3884);
  b2.set([188,204,191,200,190,187,200,255]);b2[8]=gender;
  [1,4,7].forEach((species,i)=>storage.set(makePokemon({species,pid:i}),4+i*80));
  const encoded=Buffer.from(makeSave({blocks:{storage,saveBlock2:b2}})).toString('base64');
  await page.evaluate(encoded=>{localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier','0:1:0':'Frontier','0:2:0':'Frontier'}));},encoded);
  await page.reload();await navigate();
  assert.equal(await player.locator('.battle-trainer-portrait').getAttribute('src'),`/trainers/${sprite}.png`);
  // Same imported name in both saves proves sprite selection uses gender, not name.
  assert.equal(await player.locator('.battle-trainer-identity strong').innerText(),'BRENDAN');
  assert.equal(await player.locator('.battle-trainer-identity img').count(),0);
  assert.equal(await enemy.locator('.battle-slot-empty').count(),3);
  await player.locator('button.battle-team-slot').nth(1).click();assert.equal(await page.locator('.battle-matchup-card.battle-side-player h2').innerText(),'Charmander');
  assert.equal(await player.locator('button.battle-team-slot').nth(1).getAttribute('aria-pressed'),'true');
  const selectedStyle=await player.locator('button.battle-team-slot').nth(1).evaluate(e=>({background:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderBottomColor}));
  assert.equal(selectedStyle.background,'rgba(0, 0, 0, 0)');assert.equal(selectedStyle.border,'rgba(0, 0, 0, 0)');
  for(const [trainer,sprite,className] of [['Brady','youngster','Youngster'],['Anabel Gold','salon_maiden_anabel','Salon Maiden']]) {
   await tab('Trainers');await page.getByRole('searchbox',{name:'Search trainers'}).fill(trainer);await page.locator('.battle-trainer-result').click();await tab('Matchup');
   assert.equal(await enemy.locator('.battle-trainer-portrait').getAttribute('src'),`/trainers/frontier/${sprite}.png`);
   assert.ok((await enemy.locator('.battle-trainer-text').innerText()).includes(className));
  }
  for(const width of [320,375,430]) {
   await page.setViewportSize({width,height:800});
   await page.locator('.battle-team-header img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   for(const header of [player,enemy]) {
    const bounds=await header.boundingBox();assert.equal(bounds.height,74);assert.ok(bounds.height<86);
    const layout=await header.evaluate(e=>{
     const rect=n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height,center:r.top+r.height/2};};
     return {header:rect(e),name:rect(e.querySelector('.battle-trainer-identity')),sprites:[e.querySelector('.battle-trainer-portrait'),...e.querySelectorAll('.battle-team-slot')].map(rect),nowrap:getComputedStyle(e.querySelector('.battle-trainer-text')).whiteSpace};
    });
    assert.equal(layout.nowrap,'nowrap');
    for(const sprite of layout.sprites){assert.ok(sprite.left>=layout.header.left);assert.ok(sprite.right<=layout.header.right);assert.equal(sprite.height,50);assert.equal(sprite.center,layout.sprites[0].center);assert.ok(sprite.top>=layout.name.bottom);}
   }
   await page.screenshot({path:`/private/tmp/battle-headers-${gender}-${width}.png`,fullPage:true});
  }
 }
 assert.deepEqual(errors,[]);
 console.log('Compact Battle headers passed: exact male/female Emerald sprite paths using save gender, save name, Frontier trainer sprites/classes, active selection without visual highlight, visible empty slots, one sprite row with 50px touch targets, 74px headers versus previous 86px, and no overflow at 320/375/430px.');
} finally {await browser.close();}
