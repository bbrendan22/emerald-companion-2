import {battleMove} from '../src/battle/reference.js';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
 const page=await browser.newPage({viewport:{width:375,height:800},isMobile:true,hasTouch:true}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
 const storage=new Uint8Array(33744);[1,4,7].forEach((s,i)=>storage.set(makePokemon({species:s,pid:i,experience:117360}),4+i*80));
 const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
 await page.evaluate(encoded=>{localStorage.clear();localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier','0:1:0':'Frontier','0:2:0':'Frontier'}));},encoded);
 await page.reload();await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();
 const popup=page.getByRole('dialog'),move=(side,i=0)=>page.locator(`.battle-matchup-moves.battle-matchup-${side} button`).nth(i);
 const select=async name=>{await page.getByRole('tab',{name:'Sets',exact:true}).click();await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill(name);await page.getByRole('button',{name:`Select ${name} 1`,exact:true}).click();};
 const header=side=>page.locator(`.battle-team-header.battle-side-${side} .battle-team-slot:has(img)`);
 const range=()=>popup.locator('.battle-basic-damage p').innerText();
 const choose=async(name,value)=>page.locator(`select[aria-label="${name}"]`).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},value);
 await select('Azumarill');await select('Sunkern');await header('enemy').first().click();
 await page.getByRole('button',{name:'Battle Conditions',exact:true}).click();
 const conditions=page.getByRole('region',{name:'Battle Conditions',exact:true});assert.equal(await conditions.locator('input,select,button').count(),22);
 const bars=await page.locator('.battle-matchup-bar span').evaluateAll(nodes=>nodes.map(n=>n.style.width));
 await move('player').tap();assert.equal(await range(),'4.6–5.7% · 8–10 HP');await popup.evaluate(el=>el.dataset.liveMarker='basic');
 // Raw Lv50 Bulbasaur Atk69, Tackle35 vs Def132: base10; no STAB or conditions.
 await choose('Player Atk stage','2');assert.equal(await range(),'8.6–10.3% · 15–18 HP');
 await page.locator('.battle-conditions-reset').evaluate(el=>el.click());assert.equal(await range(),'4.6–5.7% · 8–10 HP');
 await page.getByRole('spinbutton',{name:'Opponent current HP',exact:true}).evaluate(el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'1');el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await range(),'4.6–5.7% · 8–10 HP');assert.deepEqual(await page.locator('.battle-matchup-bar span').evaluateAll(nodes=>nodes.map(n=>n.style.width)),bars);
 await header('player').nth(1).evaluate(el=>el.click());assert.equal(await range(),'5.1–6.3% · 9–11 HP'); // Atk79 =>base11.
 await header('enemy').nth(1).evaluate(el=>el.click());assert.equal(await range(),'14.6–17.5% · 20–24 HP'); // Def55 =>base24.
 await header('player').first().evaluate(el=>el.click());assert.equal(await range(),'12.4–15.3% · 17–21 HP'); // Atk69 =>base21.
 await move('player',1).evaluate(el=>el.click());assert.equal(await popup.locator('h2').innerText(),'Growl');assert.equal(await popup.getByRole('region',{name:'Move effect',exact:true}).locator('p').textContent(),battleMove('Growl').description);
 await move('player').evaluate(el=>el.click());assert.equal(await range(),'12.4–15.3% · 17–21 HP');
 await header('enemy').first().evaluate(el=>el.click());
 await page.locator('.battle-level-options button').nth(1).evaluate(el=>el.click());await choose('Open Level','73');
 assert.equal(await range(),'2.0–2.8% · 5–7 HP'); // Player stays Lv50; opponent now HP251/Def190.
 await move('enemy').evaluate(el=>el.click());assert.equal(await popup.locator('h2').innerText(),'Bubble Beam');
 assert.equal(await range(),'25.0–30.0% · 30–36 HP'); // Base49, Water STAB73, Grass resistance36 =>30–36.
 assert.equal(await popup.getAttribute('data-live-marker'),'basic');
 assert.equal(await page.getByRole('combobox',{name:'Player Atk stage',exact:true}).inputValue(),'0');
 assert.equal(await page.getByRole('combobox',{name:'Player status',exact:true}).inputValue(),'none');
 assert.equal(await page.getByRole('spinbutton',{name:'Opponent current HP',exact:true}).inputValue(),'1');
 for(const width of [320,375,430]){
  await page.setViewportSize({width,height:width===320?568:800});const rect=await popup.boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width);
  assert.equal(await popup.evaluate(el=>el.scrollWidth>el.clientWidth),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await popup.locator('.battle-basic-damage p').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
  await page.screenshot({path:`/private/tmp/basic-damage-${width}.png`});
 }
 // Facade is supported in Step6C; Dig/Protect remain outside ordinary previews.
 for(const i of [1,2,3]){await move('enemy',i).evaluate(el=>el.click());assert.equal(await popup.locator('.battle-basic-damage').count(),i===1?1:0);
  if(i===1){assert.equal(await popup.locator('h2').innerText(),'Facade');assert.equal(await popup.locator('dd').first().innerText(),'70');}
 }
 await page.mouse.click(2,2);assert.equal(await popup.count(),0);
 await move('player').tap();assert.equal(await range(),'2.0–2.8% · 5–7 HP');await page.keyboard.press('Escape');assert.equal(await popup.count(),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.save.v1')),encoded);
 assert.deepEqual(requests.filter(url=>/(?:damagePreview|koProbability|BattleDamageResults|battleDamage|battleRetaliation)\.[jt]sx?/.test(url)),[]);
 assert.deepEqual(errors,[]);console.log('Basic damage passed: independent literal ranges, live player/opponent/move/Open Level changes, both directions, explicit stages/reset and current HP preservation, unsupported omissions, white percentage-first line, dismissal and 320/375/430px fit.');
} finally {await browser.close();}
