import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
 const page=await browser.newPage({viewport:{width:375,height:800},isMobile:true,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
 const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();};
 const tab=async name=>page.getByRole('tab',{name,exact:true}).click();
 const header=side=>page.locator(`.battle-team-header.battle-side-${side}`);
 async function check(player,enemy) {
  await tab('Matchup');
  assert.equal(await page.locator('.battle-team-header').count(),2);assert.equal(await page.getByRole('tab').count(),5);
  assert.equal(await page.locator('.battle-matchup-empty').count(),0);
  assert.equal(await page.locator('.battle-conditions').count(),player && enemy?1:0);
  for(const [side,selected] of [['player',player],['enemy',enemy]]) {
   const card=page.locator(`.battle-matchup-card.battle-side-${side}`);assert.equal(await card.count(),selected?1:0);
   for(const section of ['stats','moves'])assert.equal(await page.locator(`.battle-matchup-${section}.battle-matchup-${side}`).count(),selected?1:0);
   if(selected) {
    const box=await card.boundingBox(),head=await header(side).boundingBox();assert.equal(box.x,head.x);assert.equal(box.width,head.width);
    const stats=await page.locator(`.battle-matchup-stats.battle-matchup-${side}`).boundingBox(),moves=await page.locator(`.battle-matchup-moves.battle-matchup-${side}`).boundingBox();
    assert.equal(stats.x,head.x);assert.equal(moves.x,head.x);assert.ok(stats.y>=box.y+box.height);assert.ok(moves.y>=stats.y+stats.height);
    if(!player || !enemy)assert.ok((await page.locator('.battle-matchup-effect').allTextContents()).every(text=>text==='-'));
   }
  }
  if(!player || !enemy)assert.equal(await page.locator('.battle-matchup-faster').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 await navigate('Battle');await check(false,false);
 const storage=new Uint8Array(33744);[1,4,7].forEach((species,i)=>storage.set(makePokemon({species,pid:i}),4+i*80));
 const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
 await page.evaluate(encoded=>{localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier','0:1:0':'Frontier','0:2:0':'Frontier'}));},encoded);
 await page.reload();await navigate('Battle');
 for(const width of [320,375,430]) {
  await page.setViewportSize({width,height:800});await check(true,false);
  await page.screenshot({path:`/private/tmp/battle-player-only-${width}.png`,fullPage:true});
 }
 await tab('Sets');await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill('Sunkern');await page.getByRole('button',{name:'Select Sunkern 1',exact:true}).click();await check(true,true);
 assert.equal(await page.locator('.battle-matchup-faster').count(),1);assert.equal(await page.locator('.battle-matchup-moves.battle-matchup-player .battle-matchup-effect').first().innerText(),'1x');
 await header('player').locator('.battle-team-slot:has(img)').nth(1).click();assert.equal(await page.locator('.battle-matchup-card.battle-side-player h2').innerText(),'Charmander');
 await header('player').locator('.battle-team-slot:has(img)').nth(1).press('Delete');await check(false,true);
 for(const width of [320,375,430]) {
  await page.setViewportSize({width,height:800});await check(false,true);await page.screenshot({path:`/private/tmp/battle-opponent-only-${width}.png`,fullPage:true});
 }
 await navigate('Trainer');await navigate('Battle');await check(false,true);
 await header('enemy').locator('.battle-team-slot:has(img)').press('Delete');await check(false,false);
 assert.equal(await header('player').locator('.battle-team-slot img').count(),2);
 await header('player').locator('.battle-team-slot:has(img)').first().click();await check(true,false);
 assert.equal(await page.locator('.battle-matchup-card.battle-side-player h2').innerText(),'Bulbasaur');
 assert.equal(await page.locator('.battle-matchup-stats.battle-matchup-player dd').count(),6);
 assert.equal(await page.locator('.battle-matchup-moves.battle-matchup-player button').count(),2);
 assert.equal(await page.locator('.battle-conditions-shell').count(),0);assert.deepEqual(errors,[]);
 console.log('Visibility passed: all four combinations, isolated card/Stats/Moves visibility, fixed left/right half-width columns, no placeholders, switching/removing/reselecting, navigation retention, Speed/effectiveness with missing target, 320/375/430px fit.');
} finally {await browser.close();}
