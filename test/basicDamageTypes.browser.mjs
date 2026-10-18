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
 const popup=page.getByRole('dialog'),move=(side,i=0)=>page.locator(`.battle-matchup-moves.battle-matchup-${side} button`).nth(i);
 const select=async name=>{await page.getByRole('tab',{name:'Sets',exact:true}).click();await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill(name);await page.getByRole('button',{name:`Select ${name} 1`,exact:true}).click();};
 const range=()=>popup.locator('.battle-basic-damage p').innerText(),close=async()=>{await page.mouse.click(2,2);assert.equal(await popup.count(),0);};
 await select('Onix');await move('player').tap();
 assert.equal(await popup.locator('h3').innerText(),'Damage Calculation');
 // Lv50 Swampert SpA95, Surf95 vs Onix1 SpD86: base48, STAB72, Ground144, Rock288.
 assert.equal(await range(),'186.3–219.8% · 244–288 HP');
 assert.deepEqual(await popup.locator('dd').allTextContents(),['95','100%','—']);assert.equal(await popup.locator('button').count(),0);
 for(const width of [320,375,430]){
  await page.setViewportSize({width,height:width===320?568:800});const r=await popup.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width);
  assert.equal(await popup.evaluate(el=>el.scrollWidth>el.clientWidth),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await popup.locator('.battle-basic-damage p').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
  await page.screenshot({path:`/private/tmp/step3-surf-onix-${width}.png`});
 }
 await close();await page.getByRole('button',{name:'Battle Conditions',exact:true}).click();
 const conditions=page.getByRole('region',{name:'Battle Conditions',exact:true}),snapshot=()=>conditions.locator('input,select,button').evaluateAll(nodes=>nodes.map(n=>({value:n.value,checked:n.checked,width:n.offsetWidth,height:n.offsetHeight})));
 const before=await snapshot();assert.equal(before.length,22);const rect=await conditions.boundingBox();
 await move('player').tap();assert.equal(await range(),'186.3–219.8% · 244–288 HP');assert.deepEqual(await snapshot(),before);assert.deepEqual(await conditions.boundingBox(),rect);
 await page.locator('select[aria-label="Battle weather"]').evaluate(el=>{el.value='rain';el.dispatchEvent(new Event('change',{bubbles:true}));});
 assert.equal(await range(),'274.8–323.7% · 360–424 HP');await close();
 // Reverse Rock Slide: base21, STAB31, Ground resistance15 =>12–15; max HP175.
 await move('enemy').tap();assert.equal(await range(),'6.9–8.6% · 12–15 HP');await close();
 await select('Gastly');await move('player',2).tap();assert.equal(await popup.locator('h2').innerText(),'Tackle');assert.equal(await range(),'0.0% · 0 HP');
 assert.equal(await popup.locator('.battle-basic-damage p').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
 await page.screenshot({path:'/private/tmp/step3-type-immunity.png'});await close();
 await move('player',3).tap();assert.equal(await popup.locator('.battle-basic-damage').count(),0);await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('combobox',{name:'Battle weather',exact:true}).inputValue(),'rain');
 assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.save.v1')),encoded);
 assert.deepEqual(requests.filter(url=>/(?:damagePreview|koProbability|BattleDamageResults|battleDamage|battleRetaliation)\.[jt]sx?/.test(url)),[]);
 assert.deepEqual(errors,[]);console.log('Step3 passed: exact Swampert Surf/Onix4x+STAB and reverse resistance, type immunity0.0%·0HP, white ranges, unchanged Conditions UI/live rain damage, unsupported omission, dismissal, no retired modules and320/375/430px fit.');
} finally {await browser.close();}
