import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
 const page=await browser.newPage({viewport:{width:375,height:800},isMobile:true,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
 const storage=new Uint8Array(33744);[1,4,7].forEach((species,i)=>storage.set(makePokemon({species,pid:i}),4+i*80));
 const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
 await page.evaluate(encoded=>{localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier','0:1:0':'Frontier','0:2:0':'Frontier'}));},encoded);await page.reload();
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();
 const tab=async name=>page.getByRole('tab',{name,exact:true}).click(),combo=name=>page.getByRole('combobox',{name,exact:true});
 const header=side=>page.locator(`.battle-team-header.battle-side-${side}`);
 const select=async name=>{await tab('Sets');await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill(name);await page.getByRole('button',{name:`Select ${name} 1`,exact:true}).click();};
 const values=async side=>(await page.locator(`.battle-matchup-stats.battle-matchup-${side} dd`).allTextContents()).map(Number);
 const bars=()=>page.locator('.battle-matchup-bar span').evaluateAll(nodes=>nodes.map(n=>({percent:n.style.width,width:n.getBoundingClientRect().width})));
 const reset=()=>page.getByRole('region',{name:'Battle Conditions',exact:true}).getByRole('button',{name:'Reset',exact:true}).click();
 await select('Sunkern');await page.getByRole('button',{name:'Battle Conditions',exact:true}).click();
 const ownRaw=await values('player'),enemyRaw=await values('enemy'),originalBars=await bars();
 for(const [stage,multiplier] of [[1,1.5],[2,2],[-1,2/3],[-2,.5],[6,4],[-6,.25]]) {
  for(const [side,label,raw] of [['player','Player',ownRaw],['enemy','Opponent',enemyRaw]]) {
   await combo(`${label} Atk stage`).selectOption(String(stage));assert.equal((await values(side))[1],Math.floor(raw[1]*multiplier));assert.equal((await values(side))[0],raw[0]);
  }
  assert.deepEqual(await bars(),originalBars);
 }
 for(const label of ['Player','Opponent'])for(const stat of ['Atk','Def','SpA','SpD','Spe'])await combo(`${label} ${stat} stage`).selectOption('2');
 assert.deepEqual(await values('player'),ownRaw.map((v,i)=>i===0?v:v*2));assert.deepEqual(await values('enemy'),enemyRaw.map((v,i)=>i===0?v:v*2));assert.deepEqual(await bars(),originalBars);
 await reset();assert.deepEqual(await values('player'),ownRaw);assert.deepEqual(await values('enemy'),enemyRaw);assert.deepEqual(await bars(),originalBars);
 await combo('Player Spe stage').selectOption('6');assert.equal(await page.locator('.battle-matchup-stats.battle-matchup-player .battle-matchup-faster').count(),1);
 await combo('Opponent Spe stage').selectOption('6');assert.equal(await page.locator('.battle-matchup-stats.battle-matchup-enemy .battle-matchup-faster').count(),1);assert.deepEqual(await bars(),originalBars);
 await reset();await header('player').locator('.battle-team-slot:has(img)').nth(1).click();const charRaw=await values('player');await header('player').locator('.battle-team-slot:has(img)').first().click();
 await combo('Player Atk stage').selectOption('1');await combo('Player Spe stage').selectOption('2');await header('player').locator('.battle-team-slot:has(img)').nth(1).click();
 assert.equal((await values('player'))[1],Math.floor(charRaw[1]*1.5));assert.equal((await values('player'))[5],charRaw[5]*2);
 await combo('Opponent Atk stage').selectOption('1');await select('Azurill');assert.equal((await values('enemy'))[1],60);
 await header('enemy').locator('.battle-team-slot:has(img)').first().click();assert.equal((await values('enemy'))[1],75);
 await tab('Teams');await tab('Matchup');assert.equal((await values('enemy'))[1],75);
 await reset();await tab('Rules');await page.getByRole('button',{name:'Open Level',exact:true}).click();await combo('Open Level').selectOption('100');await select('Slaking');
 const highBars=await bars();await combo('Opponent Atk stage').selectOption('6');assert.ok((await values('enemy'))[1]>=1000);
 for(const width of [320,375,430]) {
  await page.setViewportSize({width,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`/private/tmp/battle-staged-stats-${width}.png`,fullPage:true});
  const overlaps=await page.locator('.battle-matchup-stat').evaluateAll(rows=>rows.flatMap(row=>{const value=row.querySelector('dd'),range=document.createRange();range.selectNodeContents(value);const r=range.getBoundingClientRect(),bar=row.querySelector('.battle-matchup-bar').getBoundingClientRect();return r.right>bar.left?[{label:row.querySelector('dt').innerText,value:value.innerText,textRight:r.right,barLeft:bar.left,cellWidth:value.getBoundingClientRect().width,font:getComputedStyle(value).fontSize}]:[];}));assert.deepEqual(overlaps,[]);
  await page.screenshot({path:`/private/tmp/battle-staged-stats-${width}.png`,fullPage:true});
 }
 await page.setViewportSize({width:375,height:800});assert.deepEqual(await bars(),highBars);
 await reset();assert.ok((await values('enemy'))[1]<1000);
 assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.save.v1')),encoded);assert.deepEqual(errors,[]);
 console.log('Staged stats passed: all requested positive/negative multipliers, five stats on both sides, unchanged HP and bar percentages/pixel widths, staged Speed highlight, switch/tab persistence, Reset, four-digit values and no overlap/overflow at 320/375/430px.');
} finally {await browser.close();}
