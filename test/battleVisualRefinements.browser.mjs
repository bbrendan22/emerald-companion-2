import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {battleMove} from '../src/battle/reference.js';
import {battleItemId} from '../src/battle/itemLookup.js';
import {towerSetById} from '../src/battle/towerSets.js';
const useWebKit=process.argv.includes('--webkit');
const server=await preview({preview:{host:'127.0.0.1',port:useWebKit?5223:5222,strictPort:true}});
const browser=await(useWebKit?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
const storage=new Uint8Array(33744);storage.set(makePokemon({species:143,moveIds:[33,174,247,156]}),4);
const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
const errors=[];
try{
 await mkdir('artifacts/ui-refinements',{recursive:true});
 for(const width of [320,375,390,430,1440]){
  const touch=width<500,context=await browser.newContext({viewport:{width,height:844},isMobile:touch,hasTouch:touch,serviceWorkers:'block'});
  await context.addInitScript(encoded=>localStorage.setItem('emerald-companion-2.save.v1',encoded),encoded);
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  const tap=async el=>touch?el.tap():el.click();
  const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();};
  const noMystery=async()=>assert.equal(await page.locator('img[src*="/types/icons/mystery"],img[src*="/types/icons/???"]').count(),0);
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);await navigate('Battle');
  const headings=page.locator('.battle-section-heading');
  assert.deepEqual(await headings.evaluateAll(els=>els.map(el=>getComputedStyle(el).color)),['rgb(255, 216, 92)','rgb(181, 187, 197)','rgb(181, 187, 197)']);
  const opponent=page.getByRole('region',{name:'Opponent Team',exact:true});
  await tap(opponent.locator('.battle-opponent-trigger'));
  const trainers=page.getByRole('dialog',{name:'Select opponent trainer'});
  assert.doesNotMatch((await trainers.locator('.battle-opponent-result').allTextContents()).join(''),/[()♂♀]/);
  assert.equal(await trainers.locator('.battle-opponent-result').count(),302);
  await trainers.getByRole('searchbox').fill('COOPER');
  assert.match(await trainers.locator('.battle-opponent-result').innerText(),/Cooltrainer/);
  assert.doesNotMatch(await trainers.locator('.battle-opponent-result').getAttribute('title'),/[()♂♀]/);
  await page.keyboard.press('Escape');
  await tap(opponent.locator('.battle-compact-slot').first());
  const species=page.getByRole('dialog',{name:'Select opponent Pokémon'});
  await species.getByRole('searchbox').fill('Snorlax');await tap(species.getByRole('button',{name:'Select Pokémon Snorlax',exact:true}));
  await tap(opponent.locator('.battle-compact-slot').first());
  await tap(page.getByRole('region',{name:'Possible Sets',exact:true}).getByRole('button',{name:'Snorlax 2',exact:true}));
  const details=page.getByRole('dialog',{name:'Snorlax 2',exact:true});
  assert.deepEqual(await details.locator('dt').allTextContents(),['Ability','Held item']);
  const item=details.locator('.battle-set-item'),set=towerSetById('Snorlax 2');
  assert.equal(await item.locator('span').innerText(),set.item);
  assert.match(await item.locator('img').getAttribute('src'),new RegExp(`/items/${battleItemId(set.item)}.png$`));
  assert.ok(await item.evaluate(el=>{const name=el.querySelector('span').getBoundingClientRect(),icon=el.querySelector('img').getBoundingClientRect();return icon.x>=name.right&&Math.abs(icon.y+icon.height/2-name.y-name.height/2)<1;}));
  const moves=details.getByRole('list',{name:'Moves'}).locator('li');
  assert.deepEqual(await moves.locator(':scope > span:last-child').allTextContents(),set.moves);
  for(let i=0;i<4;i++){
   const move=moves.nth(i),type=battleMove(set.moves[i]).type;
   if(set.moves[i]==='Curse'){assert.equal(await move.locator('img').count(),0);assert.equal(await move.locator('[aria-hidden="true"]').count(),1);}
   else assert.match(await move.locator('img').getAttribute('src'),new RegExp(`/types/icons/${type.toLowerCase()}.png$`));
  }
  const align=await moves.evaluateAll(els=>els.map(el=>{const name=el.lastElementChild.getBoundingClientRect(),icon=el.firstElementChild.getBoundingClientRect();return {x:name.x,y:el.getBoundingClientRect().y,gap:name.x-icon.right,w:icon.width};}));
  assert.ok(align.every(row=>row.x===align[0].x&&row.w===16&&row.gap===5));
  assert.ok(align.slice(1).every((row,i)=>Math.abs((row.y-align[i].y)-(align[1].y-align[0].y))<1));
  await details.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));await noMystery();
  await page.screenshot({path:`artifacts/ui-refinements/${useWebKit?'webkit':'chrome'}-${width}.png`,fullPage:true});
  await page.keyboard.press('Escape');
  await navigate('Collection');await page.locator('.pokemon-card').first().click();
  const collection=page.getByRole('dialog',{name:'Pokémon details',exact:true});
  const collectionMoves=collection.locator('.collection-pokemon-moves li');
  assert.equal(await collectionMoves.nth(1).locator('.collection-pokemon-move-name').innerText(),'Curse');
  assert.equal(await collectionMoves.nth(1).locator('img').count(),0);
  const xs=await collectionMoves.locator('.collection-pokemon-move-name').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().x));assert.ok(xs.every(x=>x===xs[0]));await noMystery();
  await page.keyboard.press('Escape');await navigate('Home');
  const search=page.getByRole('searchbox',{name:'Search Resources',exact:true});await search.fill('Curse');
  const result=page.getByRole('region',{name:'Search results'}).getByRole('button',{name:'Curse',exact:true});
  assert.equal(await result.locator('img').count(),0);assert.equal(await result.locator('span[aria-hidden="true"]').count(),1);
  await tap(result);const curse=page.getByRole('dialog',{name:'Curse',exact:true});
  assert.equal(await curse.locator('.resources-move-heading img').count(),0);assert.equal(await curse.locator('.resources-move-heading > span[aria-hidden="true"]').count(),1);await noMystery();
  await page.keyboard.press('Escape');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await context.close();console.log(`PASS ${width}px: neutral headings, clean trainer labels, item sprite order, move type icons, Curse blank/aligned in Battle, My Pokémon and Home/Research, unchanged type data.`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
