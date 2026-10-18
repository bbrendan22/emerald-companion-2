import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
 const page=await browser.newPage({viewport:{width:375,height:800},isMobile:true,hasTouch:true}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
 const storage=new Uint8Array(33744);[1,4,7].forEach((s,i)=>storage.set(makePokemon({species:s,pid:i}),4+i*80));
 const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
 await page.evaluate(encoded=>{localStorage.clear();localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier','0:1:0':'Frontier','0:2:0':'Frontier'}));},encoded);
 await page.reload();await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();
 const popup=page.getByRole('dialog'),move=(side,i=0)=>page.locator(`.battle-matchup-moves.battle-matchup-${side} button`).nth(i);
 const close=async()=>{await page.mouse.click(2,2);assert.equal(await popup.count(),0);};
 const clean=async(basic=false)=>{
  assert.equal(await popup.locator('header img').count(),1);assert.equal(await popup.locator('dl > div').count(),3);
  assert.equal(await popup.locator('p').count(),basic?2:1);assert.ok((await popup.locator('p').first().innerText()).length>0);
  assert.equal(await popup.locator('button,[class*="battle-damage"]').count(),0);
  assert.doesNotMatch(await popup.innerText(),/chance to .*HKO|Guaranteed .*HKO|Repeat KO unavailable|of max HP/);
 };
 await move('player').tap();await clean();assert.equal(await popup.locator('h2').innerText(),'Tackle');assert.deepEqual(await popup.locator('dd').allTextContents(),['35','95%','—']);await close();
 await page.getByRole('tab',{name:'Sets',exact:true}).click();await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill('Azumarill');await page.getByRole('button',{name:'Select Azumarill 1',exact:true}).click();
 await page.getByRole('button',{name:'Battle Conditions',exact:true}).click();
 const conditions=page.getByRole('region',{name:'Battle Conditions',exact:true});
 await page.getByRole('combobox',{name:'Player Atk stage',exact:true}).selectOption('2');
 const controls=()=>conditions.locator('input,select,button').evaluateAll(nodes=>nodes.map(n=>({tag:n.tagName,value:n.value,checked:n.checked,rect:[n.offsetWidth,n.offsetHeight]})));
 assert.equal((await controls()).length,22);const before=await controls(),bounds=await conditions.boundingBox();
 const bars=await page.locator('.battle-matchup-bar span').evaluateAll(nodes=>nodes.map(n=>n.style.width));
 for(const side of ['player','enemy']){
  await move(side).tap();await clean(true);if(side==='enemy'){assert.equal(await popup.locator('h2').innerText(),'Bubble Beam');assert.deepEqual(await popup.locator('dd').allTextContents(),['65','100%','10%']);}
  assert.deepEqual(await controls(),before);assert.deepEqual(await conditions.boundingBox(),bounds);await close();
 }
 await move('enemy',3).tap();await clean();await page.keyboard.press('Escape');assert.equal(await popup.count(),0);
 for(const width of [320,375,430]){
  await page.setViewportSize({width,height:width===320?568:800});await move('player').tap();await clean(true);
  const rect=await popup.boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width);assert.ok(rect.height<240);
  assert.equal(await popup.evaluate(el=>el.scrollWidth>el.clientWidth),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`/private/tmp/battle-information-${width}.png`});await close();
 }
 assert.deepEqual(await page.locator('.battle-matchup-bar span').evaluateAll(nodes=>nodes.map(n=>n.style.width)),bars);
 assert.equal(await page.getByRole('combobox',{name:'Player Atk stage',exact:true}).inputValue(),'2');
 assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.save.v1')),encoded);
 assert.deepEqual(requests.filter(url=>/(?:damagePreview|koProbability|BattleDamageResults|battleDamage|battleRetaliation)\.[jt]sx?/.test(url)),[]);
 assert.deepEqual(errors,[]);console.log('Informational popup passed: player/opponent/status moves, metadata, outside/Escape dismissal, no retired damage modules loaded, unchanged Conditions controls/geometry/stages/bars/save, and 320/375/430px fit.');
} finally {await browser.close();}
