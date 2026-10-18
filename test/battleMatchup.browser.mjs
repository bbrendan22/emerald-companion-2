import {assetPath} from './helpers/browserPaths.js';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {readPokemon} from '../src/save/readPokemon.js';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
const require=createRequire(import.meta.url), {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
 const page=await browser.newPage({viewport:{width:375,height:800},isMobile:true,hasTouch:true}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();};
 const tab=async name=>page.getByRole('tab',{name,exact:true}).click();
 await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5174');await navigate('Battle');
 assert.equal(await page.locator('.battle-matchup-cards').count(),0);
 assert.equal(await page.locator('.battle-team-header.battle-side-enemy .battle-trainer-identity strong').innerText(),'Opponent');
 const storage=new Uint8Array(33744);[1,4,7].forEach((species,i)=>storage.set(makePokemon({species,pid:i}),4+i*80));
 const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
 await page.evaluate(encoded=>{localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier','0:1:0':'Frontier','0:2:0':'Frontier'}));},encoded);
 await page.reload();await navigate('Battle');
 const select=async name=>{await tab('Sets');await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill(name);await page.getByRole('button',{name:`Select ${name} 1`,exact:true}).click();};
 assert.equal(await page.locator('.battle-matchup-card.battle-side-player').count(),1);assert.equal(await page.locator('.battle-matchup-card.battle-side-enemy').count(),0);await select('Azurill');
 const player=page.locator('.battle-matchup-card.battle-side-player'), enemy=page.locator('.battle-matchup-card.battle-side-enemy');
 assert.equal(await player.locator('h2').innerText(),'Bulbasaur');
 assert.equal(await player.locator('.battle-matchup-artwork img').getAttribute('src'),assetPath('/pokemon/artwork/shiny/1.png'));
 assert.equal(await player.locator('.battle-matchup-types img').count(),2);
 assert.equal(await player.locator('.battle-matchup-item').innerText(),'Potion');
 assert.equal(await player.locator('.battle-matchup-item img').getAttribute('src'),assetPath('/items/13.png'));
 assert.equal(await player.locator('.battle-matchup-ability').innerText(),'Overgrow');
 const statValues=async side=>(await page.locator(`.battle-matchup-stats.battle-matchup-${side} dd`).allTextContents()).map(Number);
 const originalPlayerStats=await statValues('player');assert.equal(originalPlayerStats.length,6);
 const statKeys=['hp','attack','defense','spAttack','spDefense','speed'];
 assert.deepEqual(originalPlayerStats,statKeys.map(k=>readPokemon(makePokemon({species:1,pid:0})).calculated.stats[k]));
 assert.equal(await page.locator('.battle-matchup-moves.battle-matchup-player button').count(),2);
 assert.equal(await page.locator('.battle-matchup-moves.battle-matchup-player .battle-matchup-pp').first().innerText(),'17/42');
 assert.equal(await page.locator('.battle-matchup-moves.battle-matchup-player .battle-matchup-effect').first().innerText(),'1x');
 const playerLevel=await player.locator('.battle-matchup-identity > span').innerText();
 await page.locator('.battle-team-header.battle-side-player .battle-team-slot').nth(1).click();assert.equal(await player.locator('h2').innerText(),'Charmander');
 assert.equal(await player.locator('.battle-matchup-types img').count(),1);
 const activePlayerStats=await statValues('player');assert.deepEqual(activePlayerStats,statKeys.map(k=>readPokemon(makePokemon({species:4,pid:1})).calculated.stats[k]));

 assert.equal(await enemy.locator('h2').innerText(),'Azurill #1');
 assert.match(await enemy.locator('.battle-matchup-ability').innerText(),/^(Thick Fat|Huge Power)$/);
 assert.equal(await enemy.locator('.battle-matchup-ability').getAttribute('aria-label'),'Possible abilities: Thick Fat or Huge Power');
 assert.equal(await enemy.locator('.battle-matchup-item').innerText(),'Cheri Berry');
 assert.equal(await enemy.locator('.battle-matchup-identity > span').innerText(),'Lv. 50');
 const visibleAbility=await enemy.locator('.battle-matchup-ability').innerText();
 const cardBefore=await enemy.boundingBox();await page.waitForTimeout(3100);
 assert.notEqual(await enemy.locator('.battle-matchup-ability').innerText(),visibleAbility);assert.equal((await enemy.boundingBox()).height,cardBefore.height);
 const opponentStats50=await statValues('enemy');assert.deepEqual(opponentStats50,[157,40,60,79,54,40]);
 await select('Sunkern');assert.equal(await enemy.locator('.battle-matchup-ability').innerText(),'Chlorophyll');
 await page.locator('.battle-team-header.battle-side-enemy .battle-team-slot').first().click();assert.equal(await enemy.locator('h2').innerText(),'Azurill #1');
 await tab('Rules');await page.getByRole('button',{name:'Open Level',exact:true}).click();await page.getByRole('combobox',{name:'Open Level',exact:true}).selectOption('73');await tab('Matchup');
 assert.equal(await enemy.locator('.battle-matchup-identity > span').innerText(),'Lv. 73');
 assert.equal(await player.locator('.battle-matchup-identity > span').innerText(),playerLevel);
 assert.ok((await statValues('enemy'))[0]>opponentStats50[0]);assert.deepEqual(await statValues('player'),activePlayerStats);
 assert.equal(await page.locator('.battle-matchup-moves.battle-matchup-enemy .battle-matchup-pp').first().innerText(),'PP 20');
 const firstMove=page.locator('.battle-matchup-moves.battle-matchup-player button').first();
 await firstMove.click();const popup=page.getByRole('dialog');
 assert.equal(await popup.locator('h2').innerText(),'Tackle');assert.deepEqual(await popup.locator('dd').allTextContents(),['35','95%','—']);
 await page.mouse.click(2,2);assert.equal(await popup.count(),0);
 await firstMove.click();await page.keyboard.press('Escape');assert.equal(await popup.count(),0);
 await firstMove.click();await page.mouse.click(2,2);assert.equal(await popup.count(),0);
 await page.locator('.battle-matchup-moves.battle-matchup-enemy button').first().click();assert.equal(await popup.locator('h2').innerText(),'Water Pulse');assert.deepEqual(await popup.locator('dd').allTextContents(),['60','100%','20%']);await page.mouse.click(2,2);
 const stats=await Promise.all(['player','enemy'].map(statValues));
 const fast=stats[0][5]>stats[1][5]?'player':stats[0][5]<stats[1][5]?'enemy':null;
 assert.equal(await page.locator('.battle-matchup-faster').count(),fast?1:0);
 if(fast)assert.equal(await page.locator(`.battle-matchup-${fast} .battle-matchup-faster`).innerText(),String(Math.max(stats[0][5],stats[1][5])));

 await navigate('Trainer');await navigate('Battle');assert.equal(await enemy.locator('h2').innerText(),'Azurill #1');
 for(const width of [320,375,430]) {
  await page.setViewportSize({width,height:800});
  await page.locator('.battle-matchup-artwork img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const panel=page.locator('#battle-panel-Matchup');
  assert.equal(await panel.getAttribute('tabindex'),null);
  const panelStyle=await panel.evaluate(e=>{const s=getComputedStyle(e);return {background:s.backgroundColor,border:s.borderTopWidth,shadow:s.boxShadow,outline:s.outlineStyle,tap:s.webkitTapHighlightColor};});
  assert.deepEqual(panelStyle,{background:'rgba(0, 0, 0, 0)',border:'0px',shadow:'none',outline:'none',tap:'rgba(0, 0, 0, 0)'});
  assert.equal(await page.getByRole('tab',{name:'Matchup',exact:true}).getAttribute('aria-selected'),'true');
  assert.notEqual(await page.getByRole('tab',{name:'Matchup',exact:true}).evaluate(e=>getComputedStyle(e).boxShadow),'none');
  const containers=await page.locator('.battle-matchup-moves').evaluateAll(nodes=>nodes.map(n=>({height:n.getBoundingClientRect().height,paddingTop:getComputedStyle(n).paddingTop,paddingBottom:getComputedStyle(n).paddingBottom})));
  assert.equal(containers[0].height,containers[1].height);
  for(const container of containers){assert.equal(container.paddingTop,'0px');assert.equal(container.paddingBottom,'0px');assert.ok(container.height<160);}
  const boxes=await page.locator('.battle-matchup-card').evaluateAll(cards=>cards.map(c=>{const r=c.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
  assert.equal(boxes[0].y,boxes[1].y);assert.equal(boxes[0].height,boxes[1].height);assert.ok(boxes[1].x>=boxes[0].x+boxes[0].width);
  assert.equal(await page.locator('.battle-matchup-card').evaluateAll(cards=>cards.some(c=>c.scrollWidth>c.clientWidth)),false);
  assert.equal(await page.locator('.battle-matchup-card img').evaluateAll(imgs=>imgs.some(i=>!i.complete||!i.naturalWidth)),false);
  const alignment=await page.locator('.battle-matchup-stats, .battle-matchup-moves').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));assert.equal(alignment[0],alignment[1]);assert.equal(alignment[2],alignment[3]);
  for(const card of [player,enemy]) {
   const info=await card.locator('.battle-matchup-details').boundingBox();assert.ok(info.height<=20);
   const artwork=await card.locator('.battle-matchup-artwork').boundingBox();
   assert.ok((await card.boundingBox()).height<artwork.height+101); // Previous card spacing.
   assert.equal(await card.locator('.battle-matchup-details').evaluate(e=>e.scrollWidth>e.clientWidth),false);
  }
  for(const side of ['player','enemy']) {
   const name=await page.locator(`.battle-team-header.battle-side-${side} .battle-trainer-text`).boundingBox();
   const species=await page.locator(`.battle-matchup-card.battle-side-${side} h2`).boundingBox();assert.equal(name.x,species.x);
   const stats=await page.locator(`.battle-matchup-stats.battle-matchup-${side}`).boundingBox();assert.ok(stats.height<145);
   assert.equal(await page.locator(`.battle-matchup-stats.battle-matchup-${side} .battle-matchup-stat`).count(),6);
   const entries=await page.locator(`.battle-matchup-moves.battle-matchup-${side} button`).evaluateAll(nodes=>nodes.map(n=>({height:n.getBoundingClientRect().height,font:getComputedStyle(n).fontSize,icon:n.querySelector('img').getBoundingClientRect().width,overflow:n.scrollWidth>n.clientWidth})));
   for(const entry of entries){assert.ok(entry.height>=30 && entry.height<40);assert.equal(entry.icon,16);assert.equal(entry.font,'11.2px');assert.equal(entry.overflow,false);}
  }
  const art=await player.locator('.battle-matchup-artwork').boundingBox();assert.ok(art.width/boxes[0].width<.78);assert.ok(art.width/boxes[0].width>.65);
  const types=await player.locator('.battle-matchup-types').boundingBox(), heading=await player.locator('h2').boundingBox();assert.ok(types.y>=heading.y+heading.height);
  await page.screenshot({path:`/private/tmp/battle-matchup-b-${width}.png`,fullPage:true});
  await firstMove.click();assert.ok((await popup.boundingBox()).width<width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`/private/tmp/battle-move-popup-${width}.png`});await page.mouse.click(2,2);
 }
 await tab('Rules');await page.getByRole('button',{name:'Level 50',exact:true}).click();await tab('Matchup');assert.equal(await enemy.locator('.battle-matchup-identity > span').innerText(),'Lv. 50');
 await tab('Trainers');await page.getByRole('searchbox',{name:'Search trainers'}).fill('Anabel Gold');await page.locator('.battle-trainer-result').click();await tab('Matchup');assert.equal(await page.locator('.battle-matchup-card.battle-side-player').count(),1);assert.equal(await page.locator('.battle-matchup-card.battle-side-enemy').count(),0);
 await tab('Sets');await page.locator('.battle-set-select').first().click();assert.equal(await enemy.locator('h2').innerText(),'Raikou');assert.equal(await enemy.locator('.battle-matchup-ability').innerText(),'Pressure');
 assert.equal(await page.locator('.battle-conditions-shell, .battle-future-section').count(),0);
 assert.deepEqual(errors,[]);console.log('Stage 4.8B Matchup passed: actual save stats and PP Ups, opponent stats/PP, alternating abilities with stable geometry, Speed highlight, active selections/level changes, popup data/close/Escape/outside click, missing moves/empty states, reduced artwork, aligned sections and no overflow at 320/375/430px.');
} finally {await browser.close();}
