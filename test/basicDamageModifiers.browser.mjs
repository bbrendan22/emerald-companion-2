import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {profile,battleMove} from '../src/battle/reference.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
function pokemon(species,names,{experience=117360,ivWord=0x3fffffff,item='Potion'}={}){
 const raw=makePokemon({species,pid:0,experience,ivWord}),v=new DataView(raw.buffer);
 v.setUint16(34,Number(Object.keys(profile.itemNames).find(id=>profile.itemNames[id]===item)),true);
 names.forEach((name,i)=>{v.setUint16(44+i*2,battleMove(name).id,true);v.setUint8(52+i,5);});
 let sum=0;for(let i=32;i<80;i+=2)sum+=v.getUint16(i,true);v.setUint16(28,sum%65536,true);return raw;
}
try {
 const page=await browser.newPage({viewport:{width:375,height:800},isMobile:true,hasTouch:true}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
 const storage=new Uint8Array(33744);
 [pokemon(285,['Surf','Ice Beam','Tackle','Mud Shot'],{ivWord:(0x3fffffff&~(31<<20))|(11<<20),item:'Choice Band'}),
  pokemon(385,['Flamethrower','Water Pulse','Ice Beam','Tackle'],{experience:125000}),
  pokemon(55,['Surf','Ice Beam','Tackle','Mud Shot'],{experience:125000,ivWord:0xbfffffff})].forEach((raw,i)=>storage.set(raw,4+i*80));
 const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
 await page.evaluate(encoded=>{localStorage.clear();localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier','0:0:1':'Frontier','0:0:2':'Frontier'}));},encoded);
 async function fresh(){await page.reload();await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();}
 const select=async(name,n=1)=>{await page.getByRole('tab',{name:'Sets',exact:true}).click();await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill(name);await page.getByRole('button',{name:`Select ${name} ${n}`,exact:true}).click();};
 const popup=page.getByRole('dialog'),move=(side,i=0)=>page.locator(`.battle-matchup-moves.battle-matchup-${side} button`).nth(i),rows=()=>popup.locator('.battle-basic-damage p').allTextContents();
 const pick=async(side,i=0)=>move(side,i).evaluate(el=>el.click()),close=async()=>{await page.mouse.click(2,2);assert.equal(await popup.count(),0);};
 const choose=async(name,value)=>page.locator(`select[aria-label="${name}"]`).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('change',{bubbles:true}));},value);
 const hp=async(side,value)=>page.locator(`input[aria-label="${side} current HP"]`).evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));},value);
 const player=i=>page.locator('.battle-team-header.battle-side-player .battle-team-slot:has(img)').nth(i);
 await fresh();await select('Azumarill');await move('player',1).tap();
 assert.deepEqual(await rows(),['Thick Fat: 3.4–4.6% · 6–8 HP','Huge Power: 7.4–9.1% · 13–16 HP']);
 await popup.evaluate(el=>el.dataset.liveMarker='abilities');
 await pick('player');assert.deepEqual(await rows(),['11.4–13.7% · 20–24 HP']); // Water unaffected by either ability; no labels.
 await pick('player',2);assert.deepEqual(await rows(),['11.4–13.7% · 20–24 HP']); // Choice Band Atk130->195, base24.
 await pick('player');await page.getByRole('button',{name:'Battle Conditions',exact:true}).evaluate(el=>el.click());
 const conditions=page.getByRole('region',{name:'Battle Conditions',exact:true}),count=await conditions.locator('input,select,button').count();assert.equal(count,22);
 await hp('Player',59);assert.deepEqual(await rows(),['11.4–13.7% · 20–24 HP']);
 await hp('Player',58);assert.deepEqual(await rows(),['16.0–19.4% · 28–34 HP']); // Torrent floor175/3=58, power142.
 assert.equal(await popup.getAttribute('data-live-marker'),'abilities');assert.equal(await page.getByRole('spinbutton',{name:'Player current HP',exact:true}).inputValue(),'58');
 await page.locator('.battle-conditions-reset').evaluate(el=>el.click());assert.deepEqual(await rows(),['11.4–13.7% · 20–24 HP']);await close();
 await fresh();await select('Azumarill',2);await move('enemy').tap();
 // Mega Kick120, Atk77/154 vs110: bases38/75. Neither Water ability grants Normal STAB.
 assert.deepEqual(await rows(),['Thick Fat: 18.3–21.7% · 32–38 HP','Huge Power: 36.0–42.9% · 63–75 HP']);
 for(const width of [320,375,430]){
  await page.setViewportSize({width,height:width===320?568:800});const r=await popup.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width);
  assert.equal(await popup.evaluate(el=>el.scrollWidth>el.clientWidth),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(await popup.locator('.battle-basic-damage p').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).color)),['rgb(255, 255, 255)','rgb(255, 255, 255)']);
  assert.equal(await popup.locator('button').count(),0);await page.screenshot({path:`/private/tmp/step5-ability-lines-${width}.png`});
 }
 await close();await fresh();await select('Lapras');await move('player').tap();
 assert.deepEqual(await rows(),['Water Absorb: 0.0% · 0 HP','Shell Armor: 8.3–10.2% · 17–21 HP']);
 await page.getByRole('button',{name:'Battle Conditions',exact:true}).evaluate(el=>el.click());await hp('Opponent',1);
 await page.locator('input[aria-label="Critical Hit"]').evaluate(el=>el.click());
 assert.deepEqual(await rows(),['Water Absorb: 0.0% · 0 HP','Shell Armor: 8.3–10.2% · 17–21 HP']);
 assert.equal(await page.getByRole('spinbutton',{name:'Opponent current HP',exact:true}).inputValue(),'1');assert.equal(await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).isChecked(),true);await close();
 await select('Pikachu');await player(1).click();await page.locator('.battle-conditions-reset').click();await move('enemy').tap();
 // Light Ball: SA70->140, ThunderPunch75 vsCastform SD90: base53, STAB79 =>67–79.
 assert.deepEqual(await rows(),['46.2–54.5% · 67–79 HP']);await close();
 await select('Golduck');await choose('Battle weather','sun');await move('player').tap();
 assert.deepEqual(await rows(),['Damp: 22.6–27.1% · 35–42 HP','Cloud Nine: 10.3–12.3% · 16–19 HP']);
 await choose('Battle weather','rain');assert.deepEqual(await rows(),['Damp: 5.2–6.5% · 8–10 HP','Cloud Nine: 10.3–12.3% · 16–19 HP']);await close();
 await player(2).click();await move('enemy').tap();
 assert.deepEqual(await rows(),['35.5–41.9% · 55–65 HP']); // Known player Cloud Nine makes both opponent branches identical.
 await close();await fresh();await player(2).click();await select('Castform');await page.getByRole('button',{name:'Battle Conditions',exact:true}).click();await choose('Battle weather','rain');await move('enemy',1).tap();
 assert.deepEqual(await rows(),['9.0–11.0% · 14–17 HP']); // Player Cloud Nine suppresses both Forecast STAB and rain boost.
 assert.equal(await page.getByRole('combobox',{name:'Battle weather',exact:true}).inputValue(),'rain');await page.keyboard.press('Escape');assert.equal(await popup.count(),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.save.v1')),encoded);
 assert.deepEqual(requests.filter(url=>/(?:damagePreview|koProbability|BattleDamageResults|battleDamage|battleRetaliation)\.[jt]sx?/.test(url)),[]);
 assert.deepEqual(errors,[]);console.log('Step5 passed: real item/ability data, defensive/offensive uncertainty split/dedupe, Choice Band, Light Ball, live Torrent threshold/reset, Shell Armor/absorb HP safety, Forecast/suppression both ways, white compact320/375/430px lines and no retired modules.');
} finally {await browser.close();}
