import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
 const page=await browser.newPage({viewport:{width:375,height:800},isMobile:true,hasTouch:true}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
 const raw=makePokemon({species:285,pid:0,experience:117360,ivWord:(0x3fffffff&~(31<<20))|(11<<20)}),v=new DataView(raw.buffer);
 [57,58,33,45].forEach((id,i)=>v.setUint16(44+i*2,id,true));[9,9,17,17].forEach((n,i)=>v.setUint8(52+i,n));
 let sum=0;for(let i=32;i<80;i+=2)sum+=v.getUint16(i,true);v.setUint16(28,sum%65536,true);
 const storage=new Uint8Array(33744);storage.set(raw,4);const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
 await page.evaluate(encoded=>{localStorage.clear();localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier'}));},encoded);
 await page.reload();await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();
 await page.getByRole('tab',{name:'Sets',exact:true}).click();await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill('Onix');await page.getByRole('button',{name:'Select Onix 1',exact:true}).click();
 await page.getByRole('button',{name:'Battle Conditions',exact:true}).click();
 const popup=page.getByRole('dialog'),move=(side,i=0)=>page.locator(`.battle-matchup-moves.battle-matchup-${side} button`).nth(i);
 const choose=async(name,value)=>page.locator(`select[aria-label="${name}"]`).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('change',{bubbles:true}));},value);
 const check=async(name,value)=>page.locator(`input[aria-label="${name}"]`).evaluate((el,v)=>{if(el.checked!==v)el.click();},value);
 const hp=async(side,value)=>page.locator(`input[aria-label="${side} current HP"]`).evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));},value);
 const expect=async text=>assert.equal(await popup.locator('.battle-basic-damage p').innerText(),text);
 const reset=async()=>page.locator('.battle-conditions-reset').evaluate(el=>el.click());
 const pick=async(side,i=0)=>move(side,i).evaluate(el=>el.click());
 const conditions=page.getByRole('region',{name:'Battle Conditions',exact:true});
 const geometry=()=>conditions.locator('input,select,button').evaluateAll(nodes=>nodes.map(n=>({tag:n.tagName,label:n.getAttribute('aria-label'),width:n.offsetWidth,height:n.offsetHeight})));
 const bars=()=>page.locator('.battle-matchup-bar span').evaluateAll(nodes=>nodes.map(n=>n.style.width));
 await move('player').tap();await popup.evaluate(el=>el.dataset.liveMarker='conditions');
 const controls=await geometry(),bounds=await conditions.boundingBox(),rawBars=await bars();assert.equal(controls.length,22);
 await expect('186.3–219.8% · 244–288 HP');
 // Swampert Surf base subtotal46: Rain69,+2=71,STAB106,4x424. Sun23,+2=25,STAB37,4x148.
 for(const [weather,text] of [['rain','274.8–323.7% · 360–424 HP'],['sun','95.4–113.0% · 125–148 HP'],['sand','186.3–219.8% · 244–288 HP'],['hail','186.3–219.8% · 244–288 HP'],['none','186.3–219.8% · 244–288 HP']]){await choose('Battle weather',weather);await expect(text);}
 await check('Opponent Light Screen',true);await expect('95.4–113.0% · 125–148 HP');
 await choose('Battle weather','rain');await expect('139.7–164.9% · 183–216 HP'); //46->screen23->rain34,+2=36,STAB54,4x216.
 await reset();await expect('186.3–219.8% · 244–288 HP');
 await choose('Player SpA stage',2);await expect('365.6–430.5% · 479–564 HP');
 assert.equal(await page.locator('.battle-matchup-stats.battle-matchup-player dd').nth(3).innerText(),'190'); // Raw95 staged once.
 await reset();await choose('Opponent SpD stage',2);await expect('95.4–113.0% · 125–148 HP');
 await choose('Player SpA stage',-2);await check('Critical Hit',true);await expect('373.3–439.7% · 489–576 HP');
 await check('Opponent Light Screen',true);await expect('373.3–439.7% · 489–576 HP');
 await reset();await choose('Player status','burn');await expect('186.3–219.8% · 244–288 HP'); // Burn never halves special.
 await reset();await hp('Opponent',1);await hp('Player',1);await expect('274.8–323.7% · 360–424 HP'); // Torrent now boosts power at low HP (Step5).
 await pick('player',2);await expect('3.1–3.8% · 4–5 HP');
 // Tackle: rawAtk130,Def201,subtotal9,+2=11,Rock5. Each stage applied once to130.
 for(const [stage,text] of [[1,'4.6–6.1% · 6–8 HP'],[2,'6.1–7.6% · 8–10 HP'],[-1,'2.3–3.1% · 3–4 HP'],[-2,'1.5–2.3% · 2–3 HP'],[6,'13.0–15.3% · 17–20 HP'],[-6,'0.8–1.5% · 1–2 HP']]){await choose('Player Atk stage',stage);await expect(text);}
 await reset();await check('Opponent Reflect',true);await expect('1.5–2.3% · 2–3 HP');
 await choose('Player status','burn');await expect('0.8–1.5% · 1–2 HP');
 await check('Critical Hit',true);await expect('3.8–4.6% · 5–6 HP'); // Burn retained; Reflect bypassed.
 await reset();await choose('Player Atk stage',-2);await choose('Opponent Def stage',2);await check('Critical Hit',true);await expect('6.9–8.4% · 9–11 HP');
 await reset();await choose('Player Spe stage',6);await choose('Opponent Spe stage',-6);await expect('3.1–3.8% · 4–5 HP');
 await reset();await pick('enemy');await expect('6.9–8.6% · 12–15 HP');
 await choose('Opponent Atk stage',2);await expect('14.3–17.1% · 25–30 HP');
 await reset();await choose('Player Def stage',2);await expect('3.4–4.6% · 6–8 HP');
 await reset();await choose('Opponent status','burn');await expect('3.4–4.6% · 6–8 HP');
 await reset();await check('Player Reflect',true);await expect('3.4–4.6% · 6–8 HP');
 await choose('Opponent Atk stage',-2);await choose('Player Def stage',2);await check('Critical Hit',true);await expect('14.9–17.7% · 26–31 HP');
 await reset();await pick('enemy',2);await expect('6.3–8.0% · 11–14 HP'); // Onix DragonBreath SA50/Swampert SD110 =>14.
 await check('Player Light Screen',true);await expect('3.4–4.6% · 6–8 HP');
 await check('Critical Hit',true);await expect('13.1–16.0% · 23–28 HP');
 await reset();await pick('player');await expect('186.3–219.8% · 244–288 HP');
 assert.equal(await popup.getAttribute('data-live-marker'),'conditions');assert.deepEqual(await geometry(),controls);assert.deepEqual(await conditions.boundingBox(),bounds);assert.deepEqual(await bars(),rawBars);
 assert.equal(await page.getByRole('spinbutton',{name:'Opponent current HP',exact:true}).inputValue(),'131');assert.equal(await page.getByRole('spinbutton',{name:'Player current HP',exact:true}).inputValue(),'175');
 for(const width of [320,375,430]){
  await page.setViewportSize({width,height:width===320?568:800});const rect=await popup.boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width);
  assert.equal(await popup.evaluate(el=>el.scrollWidth>el.clientWidth),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await popup.locator('.battle-basic-damage p').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
  assert.equal(await popup.locator('button').count(),0);await page.screenshot({path:`/private/tmp/step4-conditions-${width}.png`});
 }
 await choose('Battle weather','rain');await hp('Opponent',1);await expect('274.8–323.7% · 360–424 HP');
 await page.mouse.click(2,2);await page.getByRole('tab',{name:'Rules',exact:true}).click();await page.getByRole('tab',{name:'Matchup',exact:true}).click();
 await move('player').tap();await expect('274.8–323.7% · 360–424 HP');assert.equal(await page.getByRole('spinbutton',{name:'Opponent current HP',exact:true}).inputValue(),'1');
 await page.keyboard.press('Escape');assert.equal(await popup.count(),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.save.v1')),encoded);
 assert.deepEqual(requests.filter(url=>/(?:damagePreview|koProbability|BattleDamageResults|battleDamage|battleRetaliation)\.[jt]sx?/.test(url)),[]);
 assert.deepEqual(errors,[]);console.log('Step4 passed: open-dialog weather/stages/crit/burn/screens and Reset in both directions; raw stats staged once; current/max HP, Conditions geometry/state, bars/save preserved; no retired imports; white compact popup at320/375/430.');
} finally {await browser.close();}
