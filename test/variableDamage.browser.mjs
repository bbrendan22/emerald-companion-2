import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {expForLevel} from '../src/save/stats.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
function pokemon(species,moves,experience,friendship=70,ivWord=0x3fffffff){
 const raw=makePokemon({species,pid:0,experience,friendship,ivWord}),v=new DataView(raw.buffer);
 v.setUint16(34,0,true);moves.forEach((id,i)=>{v.setUint16(44+i*2,id,true);v.setUint8(52+i,5);});
 let sum=0;for(let i=32;i<80;i+=2)sum+=v.getUint16(i,true);v.setUint16(28,sum%65536,true);return raw;
}
try{
 const page=await browser.newPage({viewport:{width:375,height:800},isMobile:true,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
 const storage=new Uint8Array(33744);
 [pokemon(68,[237,216,218,67],expForLevel(50,'GROWTH_MEDIUM_SLOW')),pokemon(20,[175,179,237,216],125000,255),pokemon(55,[175,179,237,216],125000,0,0)].forEach((raw,i)=>storage.set(raw,4+i*80));
 const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
 await page.evaluate(encoded=>{localStorage.clear();localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier','0:0:1':'Frontier','0:0:2':'Frontier'}));},encoded);
 const fresh=async()=>{await page.reload();await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();};
 const popup=page.getByRole('dialog'),move=(side,i=0)=>page.locator(`.battle-matchup-moves.battle-matchup-${side} button`).nth(i);
 const player=i=>page.locator('.battle-team-header.battle-side-player .battle-team-slot:has(img)').nth(i);
 const select=async(name,n=1)=>{await page.getByRole('tab',{name:'Sets',exact:true}).click();await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill(name);await page.getByRole('button',{name:`Select ${name} ${n}`,exact:true}).click();};
 const pick=async(side,i=0)=>move(side,i).evaluate(el=>el.click());
 const close=async()=>{await page.mouse.click(2,2);assert.equal(await popup.count(),0);};
 const expectPower=async p=>assert.equal(await popup.locator('dd').first().textContent(),String(p));
 const text=()=>popup.locator('.battle-basic-damage p').allTextContents();
 const hp=async(side,value)=>page.locator(`input[aria-label="${side} current HP"]`).evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));},value);
 await fresh();await select('Onix');await page.getByRole('button',{name:'Battle Conditions',exact:true}).click();await move('player').tap();
 await expectPower(70);assert.match(await popup.locator('header img').getAttribute('src'),/dark.png/);
 // Machamp SpA85 vsOnixSpD86: base32, Dark neutral =>27–32.
 assert.deepEqual(await text(),['20.6–24.4% · 27–32 HP']);
 await pick('player',1);await expectPower(28);await pick('player',2);await expectPower(74);await pick('player',3);await expectPower(120);
 const conditions=page.getByRole('region',{name:'Battle Conditions',exact:true});
 const geometry=()=>conditions.locator('input,select,button').evaluateAll(nodes=>nodes.map(n=>[n.tagName,n.offsetWidth,n.offsetHeight]));
 const initialGeometry=await geometry();
 await popup.evaluate(el=>el.dataset.marker='live');await player(1).evaluate(el=>el.click());await pick('player');await expectPower(20);
 const currentBars=await page.locator('.battle-matchup-bar span').evaluateAll(nodes=>nodes.map(n=>n.style.width));
 for(const [value,p] of [[1,200],[5,200],[6,150],[13,150],[14,100],[27,100],[28,80],[46,80],[47,40],[89,40],[90,20],[130,20]]){await hp('Player',value);await expectPower(p);}
 assert.deepEqual(await page.locator('.battle-matchup-bar span').evaluateAll(nodes=>nodes.map(n=>n.style.width)),currentBars);
 await hp('Player',1);await pick('player',1);await expectPower(200);assert.match(await popup.locator('header img').getAttribute('src'),/fighting.png/);
 await pick('player',2);await expectPower(70);await player(2).evaluate(el=>el.click());await expectPower(30);assert.match(await popup.locator('header img').getAttribute('src'),/fighting.png/);
 assert.equal(await popup.getAttribute('data-marker'),'live');
 await pick('player',3);await expectPower(1);await player(1).evaluate(el=>el.click());await expectPower(102);
 assert.deepEqual(await geometry(),initialGeometry);
 for(const width of [320,375,430]){
  await page.setViewportSize({width,height:width===320?568:800});const rect=await popup.boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width);
  assert.equal(await popup.evaluate(el=>el.scrollWidth>el.clientWidth),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await popup.locator('.battle-basic-damage p').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');assert.equal(await popup.locator('button').count(),0);
  await page.screenshot({path:`/private/tmp/step6b-variable-${width}.png`});
 }
 await close();await select('Togepi');await move('enemy').tap();await expectPower(102);await close();await select('Unown');await move('enemy').tap();await expectPower(70);assert.match(await popup.locator('header img').getAttribute('src'),/dark.png/);await close();
 await fresh();await select('Furret',2);await page.getByRole('button',{name:'Battle Conditions',exact:true}).click();await move('enemy',1).tap();await expectPower(102);await close();await select('Mankey');await move('enemy',1).tap();await expectPower(100);await player(1).evaluate(el=>el.click());await expectPower(40);await player(2).evaluate(el=>el.click());await expectPower(80);await close();
 await select('Magikarp');await move('enemy').tap();await expectPower(20);await hp('Opponent',1);await expectPower(200);await close();
 await fresh();await select('Raichu',2);await page.getByRole('button',{name:'Battle Conditions',exact:true}).click();await move('enemy',1).tap();await expectPower(20);await hp('Opponent',1);await expectPower(200);await close();
 assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.save.v1')),encoded);assert.deepEqual(errors,[]);
 console.log('Step6B: all six popup powers/types, both directions, live IV/HP/player changes, weight, exact friendship, unchanged Conditions/stat bars/save, white ranges, dismissal and 320/375/430px passed.');
}finally{await browser.close();}
