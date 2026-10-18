import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {expForLevel} from '../src/save/stats.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
function pokemon(species,moves,experience,ivWord=0x3fffffff){
 const raw=makePokemon({species,pid:0,experience,ivWord}),v=new DataView(raw.buffer);
 v.setUint16(34,0,true);moves.forEach((id,i)=>{v.setUint16(44+i*2,id,true);v.setUint8(52+i,5);});
 let sum=0;for(let i=32;i<80;i+=2)sum+=v.getUint16(i,true);v.setUint16(28,sum%65536,true);return raw;
}
try{
 const page=await browser.newPage({viewport:{width:375,height:800},isMobile:true,hasTouch:true}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
 const storage=new Uint8Array(33744);
 [pokemon(385,[311,284,323,263],125000),pokemon(68,[280,70,263,284],expForLevel(50,'GROWTH_MEDIUM_SLOW')),pokemon(55,[311,284,323,263],125000,0xbfffffff)].forEach((raw,i)=>storage.set(raw,4+i*80));
 const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
 await page.evaluate(encoded=>{localStorage.clear();localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier','0:0:1':'Frontier','0:0:2':'Frontier'}));},encoded);
 const fresh=async()=>{await page.reload();await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();};
 const popup=page.getByRole('dialog'),move=(side,i=0)=>page.locator(`.battle-matchup-moves.battle-matchup-${side} button`).nth(i);
 const player=i=>page.locator('.battle-team-header.battle-side-player .battle-team-slot:has(img)').nth(i);
 const select=async(name,n=1)=>{await page.getByRole('tab',{name:'Sets',exact:true}).click();await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill(name);await page.getByRole('button',{name:`Select ${name} ${n}`,exact:true}).click();};
 const pick=async(side,i=0)=>move(side,i).evaluate(el=>el.click());
 const close=async()=>{await page.mouse.click(2,2);assert.equal(await popup.count(),0);};
 const power=async p=>assert.equal(await popup.locator('dd').first().textContent(),String(p));
 const text=()=>popup.locator('.battle-basic-damage p').allTextContents();
 const choose=async(name,value)=>page.locator(`select[aria-label="${name}"]`).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('change',{bubbles:true}));},value);
 const hp=async(side,value)=>page.locator(`input[aria-label="${side} current HP"]`).evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));},value);
 const check=async(label,value)=>page.locator(`input[aria-label="${label}"]`).evaluate((el,v)=>{if(el.checked!==v)el.click();},value);
 const reset=async()=>page.locator('.battle-conditions-reset').evaluate(el=>el.click());
 const bars=()=>page.locator('.battle-matchup-bar span').evaluateAll(nodes=>nodes.map(n=>n.style.width));
 await fresh();await select('Onix');await page.getByRole('button',{name:'Battle Conditions',exact:true}).click();await move('player').tap();
 const geometry=()=>page.getByRole('region',{name:'Battle Conditions',exact:true}).locator('input,select,button').evaluateAll(nodes=>nodes.map(n=>[n.tagName,n.offsetWidth,n.offsetHeight]));
 const initialGeometry=await geometry(),rawBars=await bars();await popup.evaluate(el=>el.dataset.marker='live');
 for(const [weather,type,expected] of [['none','normal','4.6–6.1% · 6–8 HP'],['rain','water','280.2–329.8% · 367–432 HP'],['sun','fire','34.4–41.2% · 45–54 HP'],['hail','ice','96.9–114.5% · 127–150 HP'],['sand','rock','6.9–8.4% · 9–11 HP']]){
  await choose('Battle weather',weather);await power(50);assert.match(await popup.locator('header img').getAttribute('src'),new RegExp(`${type}.png`));assert.deepEqual(await text(),[expected]);
  assert.match(await move('player').locator('img').getAttribute('src'),new RegExp(`${type}.png`));
 }
 await choose('Battle weather','rain');await check('Opponent Light Screen',true);assert.deepEqual(await text(),['139.7–164.9% · 183–216 HP']);
 await check('Critical Hit',true);assert.deepEqual(await text(),['560.3–659.5% · 734–864 HP']);
 await player(2).evaluate(el=>el.click());await power(50);assert.match(await popup.locator('header img').getAttribute('src'),/normal.png/);
 await player(0).evaluate(el=>el.click());await reset();await pick('player',1);await power(150);assert.deepEqual(await text(),['22.1–26.7% · 29–35 HP']);
 await hp('Player',72);await power(74);await hp('Player',1);await power(1);assert.deepEqual(await text(),['0.8–0.8% · 1–1 HP']);
 await pick('player',2);await power(1);assert.deepEqual(await text(),['4.6–6.1% · 6–8 HP']);await reset();await power(150);
 await pick('player',3);await power(70);assert.deepEqual(await text(),['6.9–8.4% · 9–11 HP']);
 await choose('Player status','burn');assert.deepEqual(await text(),['7.6–9.2% · 10–12 HP']);await choose('Player status','poison');assert.deepEqual(await text(),['13.7–16.8% · 18–22 HP']);
 await choose('Player Atk stage',1);const staged=await text();assert.notDeepEqual(staged,['13.7–16.8% · 18–22 HP']);await reset();
 assert.deepEqual(await geometry(),initialGeometry);assert.deepEqual(await bars(),rawBars);assert.equal(await popup.getAttribute('data-marker'),'live');
 await player(1).evaluate(el=>el.click());await pick('player');await power(75);assert.deepEqual(await text(),['50.4–59.5% · 66–78 HP']);
 await check('Opponent Reflect',true);await check('Opponent Light Screen',true);assert.deepEqual(await text(),['50.4–59.5% · 66–78 HP']);
 assert.equal(await page.locator('input[aria-label="Opponent Reflect"]').isChecked(),true);await pick('player',1);assert.deepEqual(await text(),['3.8–5.3% · 5–7 HP']);
 await pick('player');await check('Critical Hit',true);const crit=await text();assert.notDeepEqual(crit,['50.4–59.5% · 66–78 HP']);await reset();
 for(const width of [320,375,430]){
  await page.setViewportSize({width,height:width===320?568:800});const rect=await popup.boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width);
  assert.equal(await popup.evaluate(el=>el.scrollWidth>el.clientWidth),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await popup.locator('.battle-basic-damage p').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');assert.equal(await popup.locator('button').count(),0);
  await page.screenshot({path:`/private/tmp/step6c-special-${width}.png`});
 }
 await close();await select('Camerupt',2);await move('enemy',1).tap();await power(150);await hp('Opponent',1);await power(1);await reset();await power(150);
 const lv50=await text();await page.locator('.battle-level-options button').nth(1).evaluate(el=>el.click());await choose('Open Level',100);await power(150);assert.notDeepEqual(await text(),lv50);await close();
 await select('Wailmer',2);await move('enemy').tap();await power(150);await hp('Opponent',1);await power(1);await close();
 await fresh();await select('Swellow');await page.getByRole('button',{name:'Battle Conditions',exact:true}).click();await move('enemy',2).tap();await power(70);const clean=await text();await choose('Opponent status','burn');assert.notDeepEqual(await text(),clean);await close();
 await fresh();await select('Bagon');await page.getByRole('button',{name:'Battle Conditions',exact:true}).click();await move('enemy',2).tap();await power(75);const noScreen=await text();
 await check('Player Reflect',true);await check('Player Light Screen',true);assert.deepEqual(await text(),noScreen);assert.equal(await page.locator('input[aria-label="Player Reflect"]').isChecked(),true);await close();
 assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.save.v1')),encoded);assert.deepEqual(errors,[]);
 assert.deepEqual(requests.filter(url=>/(?:damagePreview|koProbability|BattleDamageResults|battleDamage|battleRetaliation)\.[jt]sx?/.test(url)),[]);
 console.log('Step6C: five moves, exact numerical weather/HP/status fixtures, live types/levels/HP/stages/crit/screens/selection, suppression, both directions, unchanged Conditions/bars/save, dismissal, no retired imports and320/375/430px passed.');
}finally{await browser.close();}
