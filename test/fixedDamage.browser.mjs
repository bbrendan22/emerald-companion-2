import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {expForLevel} from '../src/save/stats.js';
import {profile} from '../src/battle/reference.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
function pokemon(species,moves,experience,item){
 const raw=makePokemon({species,pid:0,experience}),v=new DataView(raw.buffer);
 v.setUint16(34,Number(Object.keys(profile.itemNames).find(id=>profile.itemNames[id]===item)),true);
 moves.forEach((id,i)=>{v.setUint16(44+i*2,id,true);v.setUint8(52+i,5);});
 let sum=0;for(let i=32;i<80;i+=2)sum+=v.getUint16(i,true);v.setUint16(28,sum%65536,true);return raw;
}
try {
 const page=await browser.newPage({viewport:{width:375,height:800},isMobile:true,hasTouch:true}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
 const storage=new Uint8Array(33744);
 [pokemon(68,[69,101,82,49],expForLevel(47,'GROWTH_MEDIUM_SLOW'),'Choice Band'),pokemon(20,[162,33,49,69],125000,'Silk Scarf')].forEach((raw,i)=>storage.set(raw,4+i*80));
 const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
 await page.evaluate(encoded=>{localStorage.clear();localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier','0:0:1':'Frontier'}));},encoded);
 const fresh=async()=>{await page.reload();await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();};
 const popup=page.getByRole('dialog'),move=(side,i=0)=>page.locator(`.battle-matchup-moves.battle-matchup-${side} button`).nth(i);
 const player=i=>page.locator('.battle-team-header.battle-side-player .battle-team-slot:has(img)').nth(i);
 const select=async(name,n=1)=>{await page.getByRole('tab',{name:'Sets',exact:true}).click();await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill(name);await page.getByRole('button',{name:`Select ${name} ${n}`,exact:true}).click();};
 const expect=async text=>assert.deepEqual(await popup.locator('.battle-basic-damage p').allTextContents(),[text]);
 const pick=async(side,i=0)=>move(side,i).evaluate(el=>el.click()),close=async()=>{await page.mouse.click(2,2);assert.equal(await popup.count(),0);};
 const choose=async(name,value)=>page.locator(`select[aria-label="${name}"]`).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('change',{bubbles:true}));},value);
 const hp=async(side,value)=>page.locator(`input[aria-label="${side} current HP"]`).evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));},value);
 await fresh();await select('Onix');await page.getByRole('button',{name:'Battle Conditions',exact:true}).click();await move('player').tap();
 await expect('35.9% · 47 HP');assert.deepEqual(await popup.locator('dd').allTextContents(),['Level','100%','—']);
 await popup.evaluate(el=>el.dataset.liveMarker='fixed');
 const conditions=page.getByRole('region',{name:'Battle Conditions',exact:true});
 const geometry=()=>conditions.locator('input,select,button').evaluateAll(nodes=>nodes.map(n=>({tag:n.tagName,width:n.offsetWidth,height:n.offsetHeight})));
 const original=await geometry();assert.equal(original.length,22);
 const bars=await page.locator('.battle-matchup-bar span').evaluateAll(nodes=>nodes.map(n=>n.style.width));
 await choose('Player Atk stage',6);await choose('Player SpA stage',6);await choose('Opponent Def stage',-6);await choose('Opponent SpD stage',-6);await choose('Player status','burn');await choose('Battle weather','sun');
 for(const label of ['Critical Hit','Opponent Reflect','Opponent Light Screen'])await page.locator(`input[aria-label="${label}"]`).evaluate(el=>el.click());
 await expect('35.9% · 47 HP');await pick('player',1);await expect('35.9% · 47 HP');await pick('player',2);await expect('30.5% · 40 HP');await pick('player',3);await expect('15.3% · 20 HP');
 assert.deepEqual(await geometry(),original);assert.deepEqual(await page.locator('.battle-matchup-bar span').evaluateAll(nodes=>nodes.map(n=>n.style.width)),bars);
 await player(1).evaluate(el=>el.click());await pick('player');await expect('49.6% · 65 HP'); // floor131/2=65, not STAB/crit boosted.
 for(const [value,text] of [[100,'38.2% · 50 HP'],[101,'38.2% · 50 HP'],[3,'0.8% · 1 HP'],[1,'0.8% · 1 HP']]){await hp('Opponent',value);await expect(text);assert.equal(await page.getByRole('spinbutton',{name:'Opponent current HP',exact:true}).inputValue(),String(value));}
 await hp('Opponent',0);assert.equal(await popup.locator('.battle-basic-damage').count(),0);await hp('Opponent',101);await expect('38.2% · 50 HP');
 assert.equal(await popup.getAttribute('data-live-marker'),'fixed');
 for(const width of [320,375,430]){
  await page.setViewportSize({width,height:width===320?568:800});const rect=await popup.boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width);
  assert.equal(await popup.evaluate(el=>el.scrollWidth>el.clientWidth),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await popup.locator('.battle-basic-damage p').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
  assert.equal(await popup.locator('button').count(),0);await page.screenshot({path:`/private/tmp/step6a-fixed-${width}.png`});
 }
 await close();await player(0).click();await select('Spinarak');await move('enemy',1).tap();
 await expect('32.1% · 50 HP'); // Machamp Lv47 maxHP156; opponent Lv50.
 await page.locator('.battle-level-options button').nth(1).evaluate(el=>el.click());await choose('Open Level',100);await expect('64.1% · 100 HP');
 await pick('player');await expect('16.5% · 47 HP'); // Spinarak Open100 maxHP284; player stays47.
 await pick('enemy',1);await player(1).evaluate(el=>el.click());await expect('0.0% · 0 HP'); // Night Shade vsNormal.
 await close();await select('Raticate',2);await player(0).click();await move('enemy').tap();
 await hp('Player',47);await expect('14.7% · 23 HP');await hp('Player',48);await expect('15.4% · 24 HP');await hp('Player',1);await expect('0.6% · 1 HP');
 assert.equal(await page.getByRole('spinbutton',{name:'Player current HP',exact:true}).inputValue(),'1');await close();
 await fresh();await select('Gastly');await move('player').tap();await expect('0.0% · 0 HP');await pick('player',1);await expect('34.3% · 47 HP');await pick('player',3);await expect('0.0% · 0 HP');
 await player(1).evaluate(el=>el.click());await pick('player');await expect('0.0% · 0 HP');await close();
 await fresh();await select('Exploud');await move('player',3).tap();await expect('9.5% · 20 HP'); // Soundproof does not block Gen3 SonicBoom.
 await pick('player',1);await expect('0.0% · 0 HP');await pick('player',2);await expect('19.0% · 40 HP');await page.keyboard.press('Escape');assert.equal(await popup.count(),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.save.v1')),encoded);
 assert.deepEqual(requests.filter(url=>/(?:damagePreview|koProbability|BattleDamageResults|battleDamage|battleRetaliation)\.[jt]sx?/.test(url)),[]);
 assert.deepEqual(errors,[]);console.log('Step6A passed: all five fixed moves, deterministic percentages, no boosts, live FangHP/min1/fainted omission, Ghost/Normal immunities and SonicBoom/Soundproof, both directions, raw player47/opponent50/Open100, unchanged UI/bars/save, dismissal and320/375/430px.');
} finally {await browser.close();}
