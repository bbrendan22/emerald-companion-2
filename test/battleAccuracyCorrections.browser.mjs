import {assetPath} from './helpers/browserPaths.js';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {battleMove} from '../src/battle/reference.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
 const page=await browser.newPage({viewport:{width:375,height:800},isMobile:true,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
 // PID zero keeps the four encrypted substructures in identity order.
 const cast=makePokemon({species:385,pid:0,experience:125000}),view=new DataView(cast.buffer),plain=new Uint8Array(48);
 for(let i=0;i<48;i+=4)new DataView(plain.buffer).setUint32(i,view.getUint32(32+i,true),true);
 const data=new DataView(plain.buffer);[battleMove('Weather Ball').id,57,58,33].forEach((id,i)=>data.setUint16(12+i*2,id,true));
 [5,9,9,17].forEach((pp,i)=>data.setUint8(20+i,pp));let checksum=0;
 for(let i=0;i<48;i+=2)checksum+=data.getUint16(i,true);view.setUint16(28,checksum%65536,true);cast.set(plain,32);
 const golduck=makePokemon({species:55,pid:1,experience:125000,ivWord:0xbfffffff});
 const storage=new Uint8Array(33744);[cast,golduck,makePokemon({species:1,pid:2})].forEach((raw,i)=>storage.set(raw,4+i*80));
 const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
 await page.evaluate(encoded=>{localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier','0:1:0':'Frontier','0:2:0':'Frontier'}));},encoded);await page.reload();
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();
 const tab=async name=>page.getByRole('tab',{name,exact:true}).click(),combo=name=>page.getByRole('combobox',{name,exact:true}),header=side=>page.locator(`.battle-team-header.battle-side-${side}`);
 const select=async name=>{await tab('Sets');await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill(name);await page.getByRole('button',{name:`Select ${name} 1`,exact:true}).click();};
 const values=side=>page.locator(`.battle-matchup-stats.battle-matchup-${side} dd`).allTextContents();
 const bars=()=>page.locator('.battle-matchup-bar span').evaluateAll(nodes=>nodes.map(n=>n.style.width));
 const card=side=>page.locator(`.battle-matchup-card.battle-side-${side}`),move=(side,i=0)=>page.locator(`.battle-matchup-moves.battle-matchup-${side} button`).nth(i);
 const types=side=>card(side).locator('.battle-matchup-types img').evaluateAll(imgs=>imgs.map(i=>i.getAttribute('src')));
 const fast=side=>page.locator(`.battle-matchup-stats.battle-matchup-${side} .battle-matchup-faster`).count();
 await select('Sunkern');await page.getByRole('button',{name:'Battle Conditions',exact:true}).click();
 const ownStats=await values('player'),rawBars=await bars();
 await combo('Player status').selectOption('paralysis');assert.equal(await fast('enemy'),1);assert.deepEqual(await values('player'),ownStats);assert.deepEqual(await bars(),rawBars);
 await combo('Player status').selectOption('none');await combo('Battle weather').selectOption('sun');
 assert.equal(await fast('player'),0);assert.equal(await fast('enemy'),0); // 90 versus Chlorophyll 90.
 await combo('Player Spe stage').selectOption('1');assert.equal(await fast('player'),1);assert.equal((await values('player'))[5],String(Math.floor(Number(ownStats[5])*1.5)));assert.deepEqual(await bars(),rawBars);
 await page.locator('.battle-conditions-reset').click();
 await move('player').click();const popup=page.getByRole('dialog');await popup.evaluate(el=>el.dataset.liveMarker='weather');
 const choose=async(name,value)=>combo(name).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},value);
 for(const [weather,type,label] of [['rain','water','.5x'],['sun','fire','2x'],['hail','ice','2x'],['sand','normal','1x'],['none','normal','1x']]){
  await choose('Battle weather',weather);
  const moveType=weather==='sand'?'rock':type;
  assert.deepEqual(await types('player'),[assetPath(`/types/icons/${type}.png`)]);
  assert.equal(await move('player').locator('img').getAttribute('src'),assetPath(`/types/icons/${moveType}.png`));
  assert.equal(await move('player').locator('.battle-matchup-effect').innerText(),label);
  assert.equal(await popup.locator('header img').getAttribute('src'),assetPath(`/types/icons/${moveType}.png`));
  assert.equal(await popup.locator('.battle-basic-damage').count(),1);
  assert.equal(await popup.getAttribute('data-live-marker'),'weather');assert.deepEqual(await bars(),rawBars);
 }
 await page.mouse.click(2,2);await select('Castform');await combo('Battle weather').selectOption('rain');
 assert.deepEqual(await types('player'),[assetPath('/types/icons/water.png')]);assert.deepEqual(await types('enemy'),[assetPath('/types/icons/water.png')]);
 await move('enemy',1).click();assert.equal(await popup.locator('h2').innerText(),'Water Pulse');
 assert.equal(await popup.locator('.battle-basic-damage').count(),1);await page.mouse.click(2,2);
 await header('player').locator('.battle-team-slot:has(img)').nth(1).click();assert.equal(await card('player').locator('.battle-matchup-ability').innerText(),'Cloud Nine');
 assert.deepEqual(await types('enemy'),[assetPath('/types/icons/normal.png')]);
 await header('player').locator('.battle-team-slot:has(img)').first().click();await select('Golduck');
 assert.deepEqual(new Set(await types('player')),new Set([assetPath('/types/icons/normal.png'),assetPath('/types/icons/water.png')]));
 assert.equal(await move('player').locator('.battle-matchup-effect').innerText(),'*');
 await move('player').click();assert.equal(await popup.locator('.battle-basic-damage').count(),1);
 for(const width of [320,375,430]){
  await page.setViewportSize({width,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await popup.evaluate(el=>el.scrollWidth>el.clientWidth),false);
  assert.equal(await page.locator('.battle-matchup-card').evaluateAll(cards=>cards.some(c=>c.scrollWidth>c.clientWidth)),false);
  await page.screenshot({path:`/private/tmp/battle-accuracy-${width}.png`});
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.save.v1')),encoded);assert.deepEqual(errors,[]);
 console.log('Accuracy corrections passed: live Forecast/card/move/popup typing, suppression and uncertain abilities, informational popups on both sides, effective Speed without number/bar changes, and 320/375/430px layouts.');
} finally {await browser.close();}
