import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
 const page=await browser.newPage({viewport:{width:375,height:800},isMobile:true,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
 const storage=new Uint8Array(33744),b2=new Uint8Array(3884);b2.set([188,204,191,200,190,187,200,255]);
 [1,1,4,7,25,133].forEach((species,i)=>storage.set(makePokemon({species,pid:i}),4+i*80));
 const saved=[{id:'tower',name:'Saved Tower',ids:['0:0:0','0:2:0','0:3:0']}],savedText=JSON.stringify(saved);
 const encoded=Buffer.from(makeSave({blocks:{storage,saveBlock2:b2}})).toString('base64');
 await page.evaluate(({encoded,savedText})=>{localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify(Object.fromEntries([0,1,2,3,4].map(i=>[`0:${i}:0`,'Frontier']))));localStorage.setItem('emerald-companion-2.battle-teams.v1',savedText);},{encoded,savedText});
 await page.reload();
 const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();};
 await navigate('Battle');
 const tab=async name=>page.getByRole('tab',{name,exact:true}).click();
 const player=page.locator('.battle-team-header.battle-side-player'),enemy=page.locator('.battle-team-header.battle-side-enemy');
 const occupied=()=>player.locator('.battle-team-slot:has(img)');
 const teamSprites=()=>player.locator('.battle-team-slot img').evaluateAll(imgs=>imgs.map(i=>i.getAttribute('src')));
 const visibleMatchup=async (playerSelected,opponentSelected)=>{
  for(const [side,selected] of [['player',playerSelected],['enemy',opponentSelected]]) {
   assert.equal(await page.locator(`.battle-matchup-card.battle-side-${side}`).count(),selected?1:0);
   for(const section of ['stats','moves'])assert.equal(await page.locator(`.battle-matchup-${section}.battle-matchup-${side}`).count(),selected?1:0);
  }
 };
 const checkSaved=async()=>assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.battle-teams.v1')),savedText);
 await visibleMatchup(true,false);
 assert.deepEqual(await teamSprites(),['/pokemon/box/1.png','/pokemon/box/4.png','/pokemon/box/7.png']);
 await enemy.locator('.battle-slot-empty').first().tap();assert.equal(await page.getByRole('tab',{name:'Sets'}).getAttribute('aria-selected'),'true');
 await page.getByRole('searchbox',{name:'Search Pokémon sets'}).fill('Sunkern');await page.getByRole('button',{name:'Select Sunkern 1',exact:true}).click();await visibleMatchup(true,true);
 await occupied().nth(1).tap();assert.equal(await occupied().nth(1).getAttribute('aria-pressed'),'true');assert.equal(await occupied().count(),3);
 await page.waitForTimeout(400);await occupied().nth(1).dblclick();
 assert.deepEqual(await teamSprites(),['/pokemon/box/1.png','/pokemon/box/7.png']);assert.equal(await player.locator('[aria-pressed="true"]').count(),0);await visibleMatchup(false,true);await checkSaved();
 await navigate('Trainer');await navigate('Battle');assert.equal(await player.locator('[aria-pressed="true"]').count(),0);await visibleMatchup(false,true);
 await page.waitForTimeout(400);await player.locator('.battle-slot-empty').tap();assert.equal(await page.getByRole('tab',{name:'Teams'}).getAttribute('aria-selected'),'true');
 const hub=page.getByRole('region',{name:'My Frontier Pokémon'}), entries=hub.locator('.battle-frontier-entry');
 assert.equal(await entries.count(),5);assert.equal(await hub.locator('.battle-frontier-entry > span small').count(),2);
 for(const id of ['0:0:0','0:3:0'])assert.equal(await hub.locator(`[data-pokemon-id="${id}"]`).isDisabled(),true);
 await hub.locator('[data-pokemon-id="0:1:0"]').tap();
 assert.deepEqual(await teamSprites(),['/pokemon/box/1.png','/pokemon/box/7.png','/pokemon/box/1.png']);assert.equal(await occupied().nth(2).getAttribute('aria-pressed'),'true');await visibleMatchup(true,true);await checkSaved();
 await tab('Teams');assert.equal(await hub.locator('button:disabled').count(),5);
 await page.getByRole('button',{name:'Load Saved Tower',exact:true}).click();assert.deepEqual(await teamSprites(),['/pokemon/box/1.png','/pokemon/box/4.png','/pokemon/box/7.png']);assert.equal(await occupied().first().getAttribute('aria-pressed'),'true');
 // Real touch sequence, including a rapid third tap at the newly shifted slot.
 const bounds=await occupied().first().boundingBox(),x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
 await page.touchscreen.tap(x,y);await page.touchscreen.tap(x,y);await page.touchscreen.tap(x,y);
 assert.deepEqual(await teamSprites(),['/pokemon/box/4.png','/pokemon/box/7.png']);assert.equal(await player.locator('[aria-pressed="true"]').count(),0);await visibleMatchup(false,true);await checkSaved();
 await page.waitForTimeout(450);await occupied().first().tap();await visibleMatchup(true,true);
 await tab('Rules');await page.getByRole('button',{name:'Open Level',exact:true}).click();await page.getByRole('combobox',{name:'Open Level',exact:true}).selectOption('73');
 await tab('Trainers');await page.getByRole('searchbox',{name:'Search trainers'}).fill('Anabel Gold');await page.locator('.battle-trainer-result').click();
 for(let i=0;i<3;i++){if(i)await enemy.locator('.battle-slot-empty').first().tap();await page.locator('.battle-set-select:enabled').first().click();}
 const playerBefore=await teamSprites();assert.equal(await occupied().first().getAttribute('aria-pressed'),'true');
 const trainer=enemy.locator('.battle-trainer-reset');await trainer.tap();assert.equal(await enemy.locator('.battle-team-slot img').count(),3);
 await page.waitForTimeout(400);await trainer.dblclick();
 assert.equal(await enemy.locator('.battle-trainer-text').innerText(),'Opponent');assert.equal(await enemy.locator('.battle-trainer-portrait img, img.battle-trainer-portrait').count(),0);
 assert.equal(await enemy.locator('.battle-slot-empty').count(),3);assert.equal(await enemy.locator('.battle-team-slot img').count(),0);
 assert.deepEqual(await teamSprites(),playerBefore);assert.equal(await occupied().first().getAttribute('aria-pressed'),'true');await visibleMatchup(true,false);
 assert.equal(await page.getByRole('tab',{name:'Sets'}).getAttribute('aria-selected'),'true');assert.equal(await page.getByRole('searchbox',{name:'Search Pokémon sets'}).inputValue(),'');assert.equal(await page.locator('.battle-set-entry').count(),882);
 await tab('Rules');assert.equal(await page.getByRole('combobox',{name:'Open Level',exact:true}).inputValue(),'73');
 // The trainer name also supports two touch taps, while one tap is harmless.
 await tab('Trainers');await page.getByRole('searchbox',{name:'Search trainers'}).fill('Brady');await page.locator('.battle-trainer-result').click();
 await page.waitForTimeout(450);await enemy.locator('.battle-trainer-reset').tap();assert.equal(await enemy.locator('strong').innerText(),'BRADY');await enemy.locator('.battle-trainer-reset').tap();assert.equal(await enemy.locator('strong').innerText(),'Opponent');
 await checkSaved();
 await tab('Teams');
 for(const width of [320,375,430]) {
  await page.setViewportSize({width,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const header of [player,enemy])assert.equal((await header.boundingBox()).height,74);
  assert.ok(await entries.evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().height>=44 && n.scrollWidth<=n.clientWidth)));
  await page.screenshot({path:`/private/tmp/battle-frontier-hub-${width}.png`,fullPage:true});
 }
 assert.deepEqual(errors,[]);console.log('Battle hub passed: mouse/touch selection and double removal, triple-tap guard, stable order, active clearing across navigation, plus routing, role-only individual hub/duplicate/full guards, saved-team isolation/load, conditional Matchup, trainer single/double touch/reset/all sets/rules preservation, 320/375/430px fit.');
} finally {await browser.close();}
