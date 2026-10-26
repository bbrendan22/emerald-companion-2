import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
const useWebKit=process.argv.includes('--webkit');
const server=await preview({preview:{host:'127.0.0.1',port:useWebKit?5215:5214,strictPort:true}});
const browser=await (useWebKit?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
const storage=new Uint8Array(33744);
[1,4,7,25].forEach((species,pid)=>storage.set(makePokemon({species,pid,experience:pid===0?117360:560,...(pid===1?{moveIds:[174,0,45,0]}:{})}),4+pid*80));
const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
const mons=identifyPokemon(loadStoredSave({getItem:()=>encoded}).collection.records).map(toBattlePokemon).filter(Boolean);
const roles=Object.fromEntries(mons.map(mon=>[mon.identity,'Frontier']));
const teams=[{id:'one',name:'Team 1',ids:[0,1,2].map(i=>mons[i].identity)},{id:'two',name:'Team 2',ids:[1,2,3].map(i=>mons[i].identity)}];
const errors=[];
try {
 await mkdir('artifacts/matchup',{recursive:true});
 for(const width of [320,375,390,430,1440]) {
  const touch=width<500;
  const context=await browser.newContext({viewport:{width,height:844},isMobile:touch,hasTouch:touch,serviceWorkers:'block'});
  await context.addInitScript(({encoded,roles,teams})=>{
   localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify(roles));
   localStorage.setItem('emerald-companion-2.battle-teams.v1',JSON.stringify(teams));
  },{encoded,roles,teams});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  const activate=async el=>touch?el.tap():el.click();
  const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();};
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);await navigate('Battle');
  const player=page.getByRole('region',{name:'My Team',exact:true}), opponent=page.getByRole('region',{name:'Opponent Team',exact:true});
  const mySlots=player.locator('.battle-compact-slot'), otherSlots=opponent.locator('.battle-compact-slot');
  const mine=page.getByRole('group',{name:'My matchup Pokémon',exact:true}), enemy=page.getByRole('group',{name:'Opponent matchup Pokémon',exact:true});
  const slotsSnapshot=()=>page.locator('.battle-compact-slot').evaluateAll(els=>els.map(el=>el.querySelector('img')?.getAttribute('src')??null));
  const empty=async side=>assert.equal(await side.locator('img').count(),0);
  await empty(mine);await empty(enemy);
  await activate(mySlots.nth(0));await activate(page.getByRole('button',{name:'Load Team 1',exact:true}));
  await mySlots.locator('img').nth(2).waitFor();await empty(mine);
  await activate(opponent.locator('.battle-opponent-trigger'));
  const trainerPopup=page.getByRole('dialog',{name:'Select opponent trainer'});
  await trainerPopup.getByRole('searchbox').fill('Anabel');await activate(trainerPopup.getByRole('button',{name:'Select trainer Anabel Gold',exact:true}));
  await otherSlots.locator('img').nth(2).waitFor();await empty(enemy);
  const before=await slotsSnapshot();
  await activate(mySlots.nth(0));await mine.locator('.battle-matchup-sprite').waitFor();
  assert.equal(await mine.locator('.battle-matchup-species').innerText(),mons[0].name);
  assert.equal(await mine.locator('small').innerText(),`Lv. ${mons[0].level}`);
  assert.match(await mine.locator('.battle-matchup-sprite').getAttribute('src'),/pokemon\/emerald\/(normal|shiny)\/1.png/);
  assert.equal(await mySlots.nth(0).getAttribute('aria-pressed'),'true');
  await activate(otherSlots.nth(0));await enemy.locator('.battle-matchup-sprite').waitFor();
  assert.equal(await enemy.locator('small').innerText(),'Lv. 50');
  assert.deepEqual(await mine.locator('.battle-active-stats dd').allTextContents(),['hp','attack','defense','spAttack','spDefense','speed'].map(key=>String(mons[0].stats[key])));
  assert.equal(await mine.locator('.battle-active-ability').innerText(),mons[0].ability);
  assert.equal(await mine.locator('.battle-active-item').innerText(),mons[0].item);
  assert.deepEqual(await mine.locator('.battle-active-move-name').allTextContents(),mons[0].moves.map(move=>move?.name??'—'));
  assert.equal(await mine.locator('.battle-active-facts img').count(),1);
  assert.deepEqual(await mine.locator('.battle-active-types img').evaluateAll(imgs=>imgs.map(img=>img.alt.toUpperCase())),mons[0].types.map(type=>`${type} TYPE`));
  assert.equal(await enemy.locator('.battle-active-facts dt').count(),0);
  assert.ok((await enemy.locator('.battle-active-ability').innerText()).length>0);
  assert.deepEqual(await enemy.locator('.battle-active-stats dd').allTextContents(),Array(6).fill('—'));
  assert.equal(await enemy.locator('.battle-active-moves select').count(),0);
  assert.ok(await enemy.locator('.is-inferred').count()>0,'Anabel’s single eligible set is inferred');
  assert.ok(await enemy.locator('.battle-active-types img').count()>0);

  assert.deepEqual(await slotsSnapshot(),before,'single-tap matchup selection never modifies either team');
  await activate(mySlots.nth(1));assert.equal(await mine.locator('.battle-matchup-species').innerText(),mons[1].name);
  const curse=mine.locator('.battle-active-moves li').first();
  assert.equal(await curse.locator('.battle-active-move-name').innerText(),'Curse');assert.equal(await curse.locator('img').count(),0);
  assert.equal(mons[1].moves[0].type,'MYSTERY','Curse retains its underlying Gen III type');

  assert.equal(await mySlots.nth(0).getAttribute('aria-pressed'),'false');assert.equal(await mySlots.nth(1).getAttribute('aria-pressed'),'true');
  await activate(otherSlots.nth(1));assert.equal(await otherSlots.nth(1).getAttribute('aria-pressed'),'true');
  await activate(page.getByRole('button',{name:'Battle Rules',exact:true}));
  await page.getByRole('dialog',{name:'Battle Rules'}).getByLabel('Level',{exact:true}).selectOption('85');await page.keyboard.press('Escape');
  assert.equal(await enemy.locator('small').innerText(),'Lv. 85');
  await page.locator('.battle-matchup-sprite').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
  assert.ok(await page.locator('.battle-matchup-pair').evaluate(pair=>{
   const box=pair.getBoundingClientRect(), region=pair.parentElement.getBoundingClientRect();
   const [a,b]=[...pair.children].map(el=>el.getBoundingClientRect());
   return a.right<=b.x && Math.abs((box.x+box.width/2)-(region.x+region.width/2))<1
     && [...pair.querySelectorAll('.battle-matchup-sprite')].every(img=>{const r=img.getBoundingClientRect();return img.naturalWidth>0 && r.width>=64 && r.width<=96 && r.right<=box.right;});
  }),'front sprites are smaller, side by side, centered and contained');
  assert.ok(await page.locator('.battle-matchup-pair').evaluate(pair=>{
   const [mine,enemy]=pair.children;
   const rows=side=>[...side.querySelectorAll('.battle-active-facts > div, .battle-active-stats > div, .battle-active-moves > li')];
   return rows(mine).every((row,i)=>Math.abs(row.getBoundingClientRect().y-rows(enemy)[i].getBoundingClientRect().y)<1);
  }),'corresponding facts, stats and moves align across both sides');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`artifacts/matchup/${useWebKit?'webkit':'chrome'}-${width}.png`,fullPage:true});
  // True double taps still remove only that member and clear its selected position.
  await page.waitForTimeout(450);
  if(touch){await activate(mySlots.nth(1));await activate(mySlots.nth(1));}else await mySlots.nth(1).dblclick();
  await empty(mine);assert.equal(await mySlots.nth(1).locator('img').count(),0);assert.equal(await enemy.locator('.battle-matchup-sprite').count(),1);
  await page.waitForTimeout(450);await activate(mySlots.nth(0));
  await activate(mySlots.nth(1));await activate(page.getByRole('button',{name:'Load Team 2',exact:true}));await empty(mine);
  assert.equal(await mySlots.nth(0).getAttribute('aria-pressed'),'false');
  await page.waitForTimeout(450);
  if(touch){await activate(otherSlots.nth(1));await activate(otherSlots.nth(1));}else await otherSlots.nth(1).dblclick();
  await empty(enemy);assert.equal(await otherSlots.nth(1).locator('img').count(),0);
  await page.waitForTimeout(450);await activate(otherSlots.nth(0));
  if(touch){await activate(opponent.locator('.battle-opponent-trigger'));await activate(opponent.locator('.battle-opponent-trigger'));}else await opponent.locator('.battle-opponent-trigger').dblclick();
  await empty(enemy);assert.equal(await otherSlots.locator('img').count(),0);
  await page.reload();await navigate('Battle');await empty(mine);await empty(enemy);
  assert.equal(await mySlots.locator('img').count(),0);assert.equal(await otherSlots.locator('img').count(),0);
  await context.close();console.log(`PASS Matchup ${width}px: empty startup, manual single-tap selection, actual/rules levels, front sprites, highlight, untouched lineups, double-tap removal, replacement/clear cleanup and responsive layout.`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
