import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium, webkit} from 'playwright';
import {createServer} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';

const useWebKit=process.argv.includes('--webkit');
const server=await createServer({server:{host:'127.0.0.1',port:useWebKit ? 5203 : 5202,strictPort:true,hmr:false}});
await server.listen();
const artifactDir=`artifacts/battle-team-picker${useWebKit ? '-webkit' : ''}`;
const browser=useWebKit ? await webkit.launch({headless:true}) : await chromium.launch({headless:true,channel:'chrome'});
const species=[1,1,4,25,7,16,19,21,23,27,29,32,35,37,39,41,43,46,48,50,133];
const storage=new Uint8Array(33744);
species.forEach((species,pid)=>storage.set(makePokemon({species,pid,experience:pid<2 ? 117360 : pid===2 ? 272535 : 560}),4+pid*80));
const trainer=new Uint8Array(3884);trainer.set([187,188,255]);trainer[8]=1;
const encoded=Buffer.from(makeSave({blocks:{storage,saveBlock2:trainer}})).toString('base64');
const snapshot=loadStoredSave({getItem:()=>encoded});
const mons=identifyPokemon(snapshot.collection.records).map(toBattlePokemon).filter(Boolean);
assert.equal(mons.length,species.length);
assert.deepEqual(mons.slice(0,3).map(mon=>mon.level),[50,50,65]);
const roles=Object.fromEntries(mons.slice(0,-1).map(mon=>[mon.identity,'Frontier']));
try {
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
 await page.evaluate(({encoded,roles})=>{
  localStorage.setItem('emerald-companion-2.save.v1',encoded);
  localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify(roles));
 },{encoded,roles});
 await page.reload();
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();
 await page.getByRole('button',{name:'Battle',exact:true}).click();
 const team=page.getByRole('region',{name:'My Team',exact:true});
 const selects=team.locator('select');
 const matchup=page.getByLabel('My matchup Pokémon',{exact:true});
 const opponent=page.getByRole('region',{name:'Opponent Team',exact:true});
 const opponentBefore=await opponent.innerHTML();
 assert.equal(await selects.count(),3);
 assert.equal(await team.locator('.battle-player-caption, .battle-player-control').count(),0);
 const labels=await selects.nth(0).locator('option').allTextContents();
 assert.equal(labels[0],'Empty slot');
 assert.match(labels.join(' '),/Bulbasaur · Lv. 50 · #1/);
 assert.match(labels.join(' '),/Bulbasaur · Lv. 50 · #2/);
 assert.doesNotMatch(labels.join(' '),/Eevee/);
 assert.deepEqual(labels.slice(1),[...labels.slice(1)].sort((a,b)=>a.localeCompare(b)));
 const choose=async (slot,label)=>selects.nth(slot).selectOption({label});
 await choose(0,'Charmander · Lv. 65');
 assert.match(await matchup.innerText(),/Charmander/);
 assert.equal(await selects.first().locator('option:checked').textContent(),'Charmander · Lv. 65');
 await choose(1,'Bulbasaur · Lv. 50 · #1');
 await choose(2,'Pikachu · Lv. 8');
 // Desktop WebKit exercises DOM touch routing, not the iPhone OS picker UI.
 const adjacentInteractions=async count=>{
  const originals=await selects.evaluateAll(nodes=>{
   window.__myTeamNodes=nodes.map(node=>({node,options:[...node.options]}));
   return nodes.map(node=>node.value);
  });
  for(const [from,to] of [[0,1],[1,0],[1,2],[2,1],...(count===4?[[2,3],[3,2]]:[])]) {
   await selects.nth(from).tap();
   await page.keyboard.press('Escape');
   await selects.nth(to).tap();
   assert.equal(await selects.nth(to).evaluate(el=>document.activeElement===el),true);
   await page.keyboard.press('Escape');
   for(const slot of [from,to]) {
    const sprite=team.locator('.battle-player-slot').nth(slot).getByRole('button');
    await sprite.tap();
    assert.equal(await sprite.getAttribute('aria-pressed'),'true');
   }
  }
  assert.equal(await selects.evaluateAll(nodes=>nodes.every((node,index)=>node===window.__myTeamNodes[index].node && [...node.options].every((option,i)=>option===window.__myTeamNodes[index].options[i]))),true);
  assert.deepEqual(await selects.evaluateAll(nodes=>nodes.map(node=>node.value)),originals);
  for(const select of await selects.all()) {
   assert.equal(await select.evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();return r.top>=p.top && r.bottom<=p.bottom && r.left>=p.left && r.right<=p.right;}),true);
  }
 };
 await adjacentInteractions(3);
 await team.locator('.battle-player-slot').first().getByRole('button').tap();

 assert.match(await matchup.innerText(),/Charmander/);
 assert.equal(await selects.nth(1).locator('option').filter({hasText:'Charmander'}).isDisabled(),true);
 await team.locator('.battle-player-sprite').nth(1).tap();
 assert.match(await matchup.innerText(),/Bulbasaur/);
 await choose(1,'Bulbasaur · Lv. 50 · #2');
 assert.match(await team.locator('.battle-player-sprite').nth(1).getAttribute('aria-label'),/#2/);
 await choose(1,'Empty slot');
 assert.match(await matchup.innerText(),/Charmander/);
 assert.equal(await team.locator('.battle-player-placeholder').count(),1);
 assert.equal(await opponent.innerHTML(),opponentBefore);
 await page.getByRole('button',{name:'Battle Rules',exact:true}).click();
 await page.getByRole('dialog',{name:'Battle Rules',exact:true}).getByLabel('Battle Type').selectOption('Doubles');
 await page.keyboard.press('Escape');
 assert.equal(await selects.count(),4);
 await choose(3,'Bulbasaur · Lv. 50 · #1');
 assert.match(await matchup.innerText(),/Charmander/);
 await team.locator('.battle-player-slot').nth(3).getByRole('button').tap();
 assert.match(await matchup.innerText(),/Bulbasaur/);
 await choose(2,'Bulbasaur · Lv. 50 · #2');
 await choose(1,'Pikachu · Lv. 8');
 await selects.nth(2).tap();await page.keyboard.press('Escape');
 assert.equal(await team.locator('.battle-player-slot').nth(3).getByRole('button').getAttribute('aria-pressed'),'true');
 await adjacentInteractions(4);
 for(const width of [320,390]) {
  await page.setViewportSize({width,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  for(const select of await selects.all()) {
   assert.deepEqual(await select.evaluate(el=>{const s=getComputedStyle(el);return [s.opacity,s.appearance,s.position];}),['1','auto','static']);
   assert.ok((await select.boundingBox()).width>0);
   assert.deepEqual(await select.evaluate(el=>{const s=getComputedStyle(el);return [s.borderTopWidth,s.backgroundColor];}),['0px','rgba(0, 0, 0, 0)']);
   assert.equal(await select.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el;}),true);

  }
 }
 await mkdir('artifacts/battle-my-team',{recursive:true});
 await page.screenshot({path:'artifacts/battle-my-team/polished-rows.png',fullPage:true});
 for(const slot of [3,2,1,0]) await choose(slot,'Empty slot');
 assert.equal(await team.locator('.battle-player-sprite').count(),0);
 assert.equal(await page.getByRole('dialog',{name:'Select Pokémon',exact:true}).count(),0);
 await mkdir('artifacts/battle-my-team',{recursive:true});
 await page.screenshot({path:'artifacts/battle-my-team/native-rows.png',fullPage:true});
 console.log('PASS adjacent DOM tap/Escape routing, stable selects/options, rapid sprite switching in Singles/Doubles; iPhone OS picker requires device validation. Native My Team rows: Singles/Doubles, Frontier filtering, levels, duplicate identities, slot edits, removal, sprite activation, unrelated edits preserve matchup, visible native selects, 320/390px overflow, opponent unchanged.');
 await context.close();
} finally {await browser.close();await server.close();}
