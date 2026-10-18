import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {restoredDamageMoves} from './fixtures/restoredDamageMoves.js';
import {frontierPokemon} from '../src/battle/data/frontierPokemon.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
function save(ids){
 const raw=makePokemon({species:235,pid:0,experience:100000}),v=new DataView(raw.buffer);v.setUint16(34,0,true);
 for(let i=0;i<4;i++){v.setUint16(44+i*2,ids[i]??0,true);v.setUint8(52+i,ids[i]?5:0);}let sum=0;for(let i=32;i<80;i+=2)sum+=v.getUint16(i,true);v.setUint16(28,sum%65536,true);
 const storage=new Uint8Array(33744);storage.set(raw,4);return Buffer.from(makeSave({blocks:{storage}})).toString('base64');
}
try{
 const page=await browser.newPage({viewport:{width:375,height:800},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
 const popup=page.getByRole('dialog'),moves=side=>page.locator(`.battle-matchup-moves.battle-matchup-${side} button`);
 const fresh=async ids=>{
  const encoded=save(ids);await page.evaluate(encoded=>{localStorage.clear();localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier'}));},encoded);
  await page.reload();await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();return encoded;
 };
 const select=async id=>{await page.getByRole('tab',{name:'Sets',exact:true}).click();await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill(id.replace(/ \d+$/,''));await page.getByRole('button',{name:`Select ${id}`,exact:true}).click();};
 const close=async()=>{await page.mouse.click(2,2);assert.equal(await popup.count(),0);};
 const controls=()=>page.getByRole('region',{name:'Battle Conditions',exact:true}).locator('input,select,button').evaluateAll(nodes=>nodes.map(n=>({tag:n.tagName,value:n.value,checked:n.checked,width:n.offsetWidth,height:n.offsetHeight})));
 let reviewed=0;
 for(let start=0;start<restoredDamageMoves.length;start+=4){
  const chunk=restoredDamageMoves.slice(start,start+4),encoded=await fresh(chunk.map(row=>row[0]));await select('Azurill 1');await page.getByRole('button',{name:'Battle Conditions',exact:true}).click();const before=await controls();assert.equal(before.length,22);
  await moves('player').first().tap();await popup.evaluate(el=>el.dataset.marker='review');
  for(const [index,[,name,type,power]] of chunk.entries()){
   await moves('player').nth(index).evaluate(el=>el.click());assert.equal(await popup.locator('h2').textContent(),name);assert.equal(await popup.locator('dd').first().textContent(),String(power));assert.match(await popup.locator('header img').getAttribute('src'),new RegExp(`${type.toLowerCase()}.png`));
   assert.ok(await popup.locator('.battle-basic-damage p').count()>0,name);assert.equal(await popup.getAttribute('data-marker'),'review');
   for(const line of await popup.locator('.battle-basic-damage p').all())assert.equal(await line.locator('.battle-preview-hp').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
   assert.doesNotMatch(await popup.locator('.battle-basic-damage').textContent(),/OHKO|[2-9]HKO|Guaranteed|chance to/);
   assert.deepEqual(await controls(),before,name);reviewed++;
  }
  if(start===0)for(const width of [320,375,430]){
   await page.setViewportSize({width,height:width===320?568:800});const rect=await popup.boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width);assert.equal(await popup.evaluate(el=>el.scrollWidth>el.clientWidth||el.scrollHeight>el.clientHeight),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await popup.locator('button').count(),0);await page.screenshot({path:`/private/tmp/final-damage-corrections-${width}.png`});
  }
  await close();assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.save.v1')),encoded);await page.setViewportSize({width:375,height:800});
 }
 assert.equal(reviewed,39);
 // Every requested common move also has a live, actual Frontier opponent fixture.
 for(const name of ['Earthquake','Surf','Ice Beam','Thunderbolt','Flamethrower','Rock Slide','Shadow Ball','Body Slam','Crunch','Waterfall','Sludge Bomb','Double Edge','Giga Drain','Hyper Beam']){
  const set=frontierPokemon.find(s=>s.moves.includes(name));assert.ok(set,name);await fresh([89,57,58,85]);await select(set.id);await moves('enemy').nth(set.moves.indexOf(name)).tap();assert.equal(await popup.locator('h2').textContent(),name);assert.ok(await popup.locator('.battle-basic-damage p').count()>0,name);await close();
 }
 assert.deepEqual(errors,[]);console.log('Final corrections passed: all39 restored popup previews, all14 common moves in actual opponent sets, unchanged22 Conditions controls/values/geometry, mounted move changes, white HP, no KO UI, save/dismissal and320/375/430px.');
}finally{await browser.close();}
