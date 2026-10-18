import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {expForLevel} from '../src/save/stats.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
function pokemon(species,moves,experience){
 const raw=makePokemon({species,pid:0,experience}),v=new DataView(raw.buffer);v.setUint16(34,0,true);
 moves.forEach((id,i)=>{v.setUint16(44+i*2,id,true);v.setUint8(52+i,5);});let sum=0;for(let i=32;i<80;i+=2)sum+=v.getUint16(i,true);v.setUint16(28,sum%65536,true);return raw;
}
try{
 const page=await browser.newPage({viewport:{width:375,height:800},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
 const storage=new Uint8Array(33744);
 [pokemon(285,[89,57,58,85],expForLevel(47,'GROWTH_MEDIUM_SLOW')),pokemon(385,[53,157,247,72],125000),pokemon(94,[89,53,85,202],117360)].forEach((raw,i)=>storage.set(raw,4+i*80));
 const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');await page.evaluate(encoded=>{localStorage.clear();localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier','0:0:1':'Frontier','0:0:2':'Frontier'}));},encoded);
 const fresh=async()=>{await page.reload();await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();};
 const popup=page.getByRole('dialog'),move=(side,i=0)=>page.locator(`.battle-matchup-moves.battle-matchup-${side} button`).nth(i);
 const select=async(name,n=1)=>{await page.getByRole('tab',{name:'Sets',exact:true}).click();await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill(name);await page.getByRole('button',{name:`Select ${name} ${n}`,exact:true}).click();};
 const pick=async(side,i=0)=>move(side,i).evaluate(el=>el.click());
 const close=async()=>{await page.mouse.click(2,2);assert.equal(await popup.count(),0);};
 const rows=()=>popup.locator('.battle-basic-damage p').allTextContents();
 await fresh();await select('Azurill');await page.getByRole('button',{name:'Battle Conditions',exact:true}).click();await move('player').tap();
 assert.equal(await popup.locator('h2').textContent(),'Earthquake');assert.deepEqual(await popup.locator('dd').allTextContents(),['100','100%','—']);assert.deepEqual(await rows(),['66.9–79.0% · 105–124 HP']);
 assert.equal(await popup.locator('.battle-preview-percent-amber').count(),1);assert.equal(await popup.locator('.battle-preview-hp').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
 await popup.evaluate(el=>el.dataset.marker='earthquake');const before=await rows();
 await page.locator('select[aria-label="Player Atk stage"]').evaluate(el=>{el.value='1';el.dispatchEvent(new Event('change',{bubbles:true}));});assert.notDeepEqual(await rows(),before);
 await page.locator('.battle-conditions-reset').evaluate(el=>el.click());assert.deepEqual(await rows(),before);assert.equal(await popup.getAttribute('data-marker'),'earthquake');
 for(let i=1;i<4;i++){await pick('player',i);assert.equal(await popup.locator('.battle-basic-damage').count(),1);}
 await pick('player');
 for(const width of [320,375,430]){
  await page.setViewportSize({width,height:width===320?568:800});const r=await popup.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width);assert.equal(await popup.evaluate(el=>el.scrollWidth>el.clientWidth),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await popup.locator('button').count(),0);await page.screenshot({path:`/private/tmp/earthquake-${width}.png`});
 }
 await close();await select('Raticate');await move('player').tap();assert.deepEqual(await rows(),['52.3–62.3% · 79–94 HP']);await close();await select('Pidgey');await move('player').tap();assert.deepEqual(await rows(),['0.0% · 0 HP']);assert.equal(await popup.locator('.battle-preview-percent-red').count(),1);await close();
 await fresh();await select('Gastly');await move('player').tap();assert.deepEqual(await rows(),['0.0% · 0 HP']);await close();await select('Lickitung',2);await move('enemy').tap();assert.equal(await popup.locator('h2').textContent(),'Earthquake');assert.equal(await popup.locator('.battle-basic-damage').count(),1);assert.notDeepEqual(await rows(),['0.0% · 0 HP']);
 await page.locator('.battle-team-header.battle-side-player .battle-team-slot:has(img)').nth(2).evaluate(el=>el.click());assert.deepEqual(await rows(),['0.0% · 0 HP']); // Known player Levitate.
 await page.locator('.battle-team-header.battle-side-player .battle-team-slot:has(img)').first().evaluate(el=>el.click());await pick('enemy',2);assert.equal(await popup.locator('h2').textContent(),'Shadow Ball');assert.equal(await popup.locator('.battle-basic-damage').count(),1);await pick('enemy',3);assert.equal(await popup.locator('h2').textContent(),'Rock Slide');assert.equal(await popup.locator('.battle-basic-damage').count(),1);
 await page.locator('.battle-team-header.battle-side-player .battle-team-slot:has(img)').nth(1).evaluate(el=>el.click());
 for(let i=0;i<4;i++){await pick('player',i);assert.equal(await popup.locator('.battle-basic-damage').count(),1);}
 await close();assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.save.v1')),encoded);assert.deepEqual(errors,[]);
 console.log('Earthquake correction passed: Lv47Swampert/Azurill literal range, neutral/Flying/Levitate, both directions, mounted move/active/stage/reset updates, all six common attacks, drain eligibility, colors/save/dismissal and320/375/430px.');
}finally{await browser.close();}
