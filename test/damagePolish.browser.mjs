import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {frontierTrainers} from '../src/battle/data/frontierTrainers.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
function pokemon(species,moves,ivWord=0x3fffffff){
 const raw=makePokemon({species,pid:0,experience:117360,ivWord}),v=new DataView(raw.buffer);v.setUint16(34,0,true);
 moves.forEach((id,i)=>{v.setUint16(44+i*2,id,true);v.setUint8(52+i,5);});let sum=0;for(let i=32;i<80;i+=2)sum+=v.getUint16(i,true);v.setUint16(28,sum%65536,true);return raw;
}
try{
 const page=await browser.newPage({viewport:{width:375,height:800},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');const storage=new Uint8Array(33744);
 [pokemon(285,[57,58,53,311],(0x3fffffff&~(31<<20))|(11<<20)),pokemon(385,[57,58,53,311]),pokemon(55,[57,58,53,311],0xbfffffff)].forEach((raw,i)=>storage.set(raw,4+i*80));
 const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
 await page.evaluate(encoded=>{localStorage.clear();localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier','0:0:1':'Frontier','0:0:2':'Frontier'}));},encoded);
 const fresh=async()=>{await page.reload();await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();};
 const popup=page.getByRole('dialog'),seen=new Set(),colors={white:'rgb(255, 255, 255)',amber:'rgb(255, 216, 92)',green:'rgb(105, 217, 154)',red:'rgb(255, 133, 133)'};let direction='player';
 const moves=(side,i=0)=>page.locator(`.battle-matchup-moves.battle-matchup-${side} button`).nth(i);
 const pick=async(side,i=0)=>{direction=side;await moves(side,i).evaluate(el=>el.click());};
 const select=async(name)=>{await page.getByRole('tab',{name:'Sets',exact:true}).click();await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill(name);await page.getByRole('button',{name:`Select ${name} 1`,exact:true}).click();};
 const mountedSet=async name=>page.locator('.battle-team-header.battle-side-enemy .battle-team-slot:has(img)').nth({Onix:0,Gastly:1,Lapras:2}[name]).evaluate(el=>el.click());
 const choose=async(name,value)=>page.locator(`select[aria-label="${name}"]`).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('change',{bubbles:true}));},value);
 const check=async(name)=>page.locator(`input[aria-label="${name}"]`).evaluate(el=>el.click());
 const close=async()=>{await page.mouse.click(2,2);assert.equal(await popup.count(),0);};
 const rows=()=>popup.locator('.battle-basic-damage p').allTextContents();
 const verify=async()=>{
  const maxHp=Number(await page.locator(`.battle-matchup-stats.battle-matchup-${direction==='player'?'enemy':'player'} dd`).first().textContent());
  const ps=popup.locator('.battle-basic-damage p');assert.ok(await ps.count()>0);
  for(const p of await ps.all()){
   const hp=await p.locator('.battle-preview-hp').textContent(),numbers=hp.match(/\d+/g).map(Number),min=numbers[0],max=numbers.at(-1);
   const expected=min===0&&max===0?'red':min>=maxHp?'green':max*2>=maxHp?'amber':'white';seen.add(expected);
   const percent=p.locator('.battle-preview-percent');assert.ok((await percent.getAttribute('class')).includes(`percent-${expected}`));
   assert.equal(await percent.evaluate(el=>getComputedStyle(el).color),colors[expected]);assert.equal(await p.locator('.battle-preview-hp').evaluate(el=>getComputedStyle(el).color),colors.white);
   const expectedPercent=min===0&&max===0?'0.0%':numbers.length===1?`${(min*100/maxHp).toFixed(1)}%`:`${(min*100/maxHp).toFixed(1)}–${(max*100/maxHp).toFixed(1)}%`;
   assert.equal(await percent.textContent(),expectedPercent);
  }
 };
 await fresh();await select('Onix');await select('Gastly');await select('Lapras');await mountedSet('Onix');await page.getByRole('button',{name:'Battle Conditions',exact:true}).click();await moves('player').tap();await popup.evaluate(el=>el.dataset.marker='polish');await verify();
 assert.ok((await popup.locator('.battle-preview-percent').getAttribute('class')).includes('green'));
 const conditions=page.getByRole('region',{name:'Battle Conditions',exact:true}),geometry=()=>conditions.locator('input,select,button').evaluateAll(nodes=>nodes.map(n=>[n.tagName,n.offsetWidth,n.offsetHeight]));const original=await geometry();
 for(const [name,value] of [['Player SpA stage',1],['Opponent SpD stage',1],['Player Atk stage',2],['Opponent Def stage',-1],['Battle weather','rain'],['Player status','burn']]){await choose(name,value);await verify();}
 for(const label of ['Critical Hit','Opponent Reflect','Opponent Light Screen']){await check(label);await verify();}
 await page.locator('.battle-conditions-reset').evaluate(el=>el.click());await verify();assert.deepEqual(await geometry(),original);
 await pick('player',1);await verify();assert.ok((await popup.locator('.battle-preview-percent').getAttribute('class')).includes('amber'));
 await pick('player',2);await verify();assert.ok((await popup.locator('.battle-preview-percent').getAttribute('class')).includes('white'));
 await pick('player',3);await mountedSet('Gastly');await verify();assert.deepEqual(await rows(),['0.0% · 0 HP']);
 await mountedSet('Lapras');await pick('player');await verify();assert.equal(await popup.locator('.battle-basic-damage p').count(),2);
 await choose('Player SpA stage',6);await choose('Opponent SpD stage',-6);await verify();assert.equal(await popup.locator('.battle-preview-percent-red').count(),1);assert.equal(await popup.locator('.battle-preview-percent-green').count(),1);
 const baseline=await rows();await page.locator('input[aria-label="Opponent current HP"]').evaluate(el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'1');el.dispatchEvent(new Event('input',{bubbles:true}));});await verify();assert.deepEqual(await rows(),baseline);
 await page.locator('.battle-team-header.battle-side-player .battle-team-slot:has(img)').nth(1).evaluate(el=>el.click());await verify();
 await choose('Battle weather','sun');await pick('player',3);await verify();await page.locator('.battle-team-header.battle-side-player .battle-team-slot:has(img)').nth(2).evaluate(el=>el.click());await verify();
 await pick('enemy');await verify();await page.locator('.battle-level-options button').nth(1).evaluate(el=>el.click());await choose('Open Level',100);await verify();await page.locator('.battle-level-options button').first().evaluate(el=>el.click());await verify();
 assert.equal(await popup.getAttribute('data-marker'),'polish');
 await pick('player');await page.locator('.battle-team-header.battle-side-player .battle-team-slot:has(img)').first().evaluate(el=>el.click());await choose('Player SpA stage',6);await verify();
 for(const width of [320,375,430]){
  await page.setViewportSize({width,height:width===320?568:800});await verify();const r=await popup.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width&&r.y>=0&&r.y+r.height<=(width===320?568:800));
  assert.equal(await popup.evaluate(el=>el.scrollWidth>el.clientWidth||el.scrollHeight>el.clientHeight),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await popup.locator('button').count(),0);
  await page.screenshot({path:`/private/tmp/step8-colors-${width}.png`});
 }
 assert.deepEqual([...seen].sort(),['amber','green','red','white']);await close();
 // Trainer changes intentionally clear the enemy and dismiss the modal. Reopen with trainer IV data.
 await page.getByRole('tab',{name:'Trainers',exact:true}).click();await page.getByRole('searchbox',{name:'Search trainers'}).fill('BRADY');await page.locator('.battle-trainer-result').click();
 const brady=frontierTrainers.find(t=>t.name==='BRADY'),id=brady.pokemonSetIds[0];
 await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill(id.replace(/ \d+$/,''));await page.getByRole('button',{name:`Select ${id}`,exact:true}).click();await moves('player').tap();direction='player';await verify();
 assert.ok((await page.locator('.battle-rules-ivs strong').textContent()).includes(`${brady.ivs} IVs`));await close();
 assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.save.v1')),encoded);assert.deepEqual(errors,[]);
 console.log('Step8 passed: raw-based four colors, independent ability colors, white HP, exact percentages, mounted moves/directions/Pokemon/sets/rules/conditions, reset, IV trainer, unchanged controls/save, dismissal and320/375/430px.');
}finally{await browser.close();}
