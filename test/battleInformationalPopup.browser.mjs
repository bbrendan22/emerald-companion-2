import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
import {battleMove} from '../src/battle/reference.js';
import {moveResources} from '../src/battle/data/moveResources.js';
import {movePopupValues} from '../src/battle/matchupPresentation.js';
const probes=[
 ['frontierCandidateDamage.js','  const construction=frontierMatchupCandidates(state);','frontier'],
 ['abilityScenarios.js','export function calculateAbilityScenarios(move,attacker,defender,options={}) {','ability'],
 ['conditionalSelection.js','export function conditionalSelector(move) {','scenario'],
 ['multiHitSelection.js','export function multiHitSelector(move) {','hits'],
];
const server=await createServer({base:'/',server:{host:'127.0.0.1',port:0,hmr:false},plugins:[{
 name:'status-calculation-probes',enforce:'pre',transform(code,id){
  for(const [file,needle,key] of probes)if(id.endsWith(`/src/battle/${file}`)){
   assert.ok(code.includes(needle),`probe anchor: ${file}`);
   return code.replace(needle,`${needle}\n globalThis.popupCalls??={};globalThis.popupCalls.${key}=(globalThis.popupCalls.${key}??0)+1;`);
  }
 }
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
 page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/status-popup',route=>route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/statusMovePopup.jsx"></script>'}));
 await page.goto(new URL('/status-popup',server.resolvedUrls.local[0]).href);
 const popup=page.getByRole('dialog'),choose=id=>page.getByLabel('Test move',{exact:true}).selectOption(String(id));
 const calls=()=>page.evaluate(()=>globalThis.popupCalls??{}),resetCalls=()=>page.evaluate(()=>{globalThis.popupCalls={};});
 const open=side=>page.getByRole('button',{name:`Open ${side} move`,exact:true}).click();
 const clean=async move=>{
  const values=movePopupValues(move);
  assert.equal(await popup.locator('h2').innerText(),move.name);
  assert.deepEqual(await popup.locator('dt').allTextContents(),['Power','Accuracy','Effect %']);
  assert.deepEqual(await popup.locator('dd').allTextContents(),['—',values.accuracy,values.effect]);
  assert.deepEqual(await popup.locator('p').allTextContents(),[move.description],'exactly one canonical description');
  assert.equal(await popup.locator('button,select,input,.battle-basic-damage,.battle-move-scenario-controls').count(),0);
  assert.doesNotMatch(await popup.innerText(),/Damage unavailable|No matching Frontier sets|Move effect/);
 };
 const statuses=Object.keys(moveResources).map(Number).map(battleMove).filter(m=>m.power===0);
 assert.equal(statuses.length,138);
 for(const [i,move] of statuses.entries()) {
  await choose(move.id);await page.getByLabel('Test context',{exact:true}).selectOption(['none','valid','missing'][i%3]);await resetCalls();
  await open(i%2?'opponent':'player');await clean(move);assert.deepEqual(await calls(),{},`${move.name}: no calculation or scenario orchestration`);
  await page.keyboard.press('Escape');assert.equal(await popup.count(),0);
 }
 console.log('PASS all 138 status moves: canonical metadata once, no PP/damage/scenario calls, both directions and direct/Frontier/missing contexts');
 // Canonical routing/content survives altered supplied metadata, in both directions.
 for(const name of ['Pain Split','Curse','Nature Power','Metronome','Toxic','Swagger'])for(const side of ['player','opponent']) {
  const move=battleMove(name);await choose(move.id);await page.getByLabel('Override supplied metadata').check();await resetCalls();
  await open(side);await clean(move);assert.deepEqual(await calls(),{});await page.keyboard.press('Escape');
 }
 await page.getByLabel('Override supplied metadata').uncheck();await page.getByLabel('Test context',{exact:true}).selectOption('none');
 const exceptions=Object.keys(moveResources).map(Number).map(battleMove).filter(m=>m.power===1);
 const names=[...exceptions.map(m=>m.name),'Beat Up','Future Sight','Doom Desire','Spit Up','Weather Ball','Eruption','Water Spout','Rollout','Triple Kick','Tackle'];
 for(const name of names) {
  await choose(battleMove(name).id);await resetCalls();await open('player');
  assert.equal(await popup.getByRole('region',{name:'Damage Calculation',exact:true}).count(),1,name);
  assert.ok((await calls()).ability>0,`${name}: damage path retained`);
  if(['Counter','Mirror Coat','Bide','Beat Up','Future Sight','Doom Desire','Spit Up'].includes(name))assert.match(await popup.innerText(),/requires special battle-state handling/);
  await page.keyboard.press('Escape');
 }
 await choose(33);await page.getByLabel('Override supplied metadata').check();await resetCalls();await open('player');
 assert.ok((await calls()).ability>0,'canonical damaging move is not status when supplied power is zero');await page.keyboard.press('Escape');
 await page.getByLabel('Override supplied metadata').uncheck();
 await page.getByLabel('Test context',{exact:true}).selectOption('valid');await resetCalls();await open('player');
 assert.ok((await calls()).frontier>0,'damaging moves retain Frontier evaluation');await page.keyboard.press('Escape');
 console.log('PASS all 22 power-one moves plus variable/multi-hit and unsupported damaging exceptions; canonical routing and Frontier evaluation');
 // Exercise the mounted BattleMatchup move controls on each side.
 const snapshot=await page.getByLabel('Battle snapshot').textContent();
 for(const [group,name] of [['My matchup Pokémon','Growl'],['Opponent matchup Pokémon','Roar']]) {
  const control=page.getByRole('group',{name:group,exact:true}).getByRole('button',{name:`Move information: ${name}`,exact:true});
  await resetCalls();await control.click();await clean(battleMove(name));assert.deepEqual(await calls(),{});await page.keyboard.press('Escape');
 }
 for(const width of [320,375,430]) {
  await page.setViewportSize({width,height:568});await choose(220);await open('player');await clean(battleMove('Pain Split'));
  const panel=popup.locator('.battle-move-dialog'),box=await panel.boundingBox();
  assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=568);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.evaluate(()=>document.body.style.position),'fixed');
  // A scroll gesture must leave the popup open and the document pinned.
  await panel.evaluate(el=>{
   el.style.maxHeight='70px';
   el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,isPrimary:true,pointerId:1,button:0,clientX:20,clientY:20}));
   el.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,isPrimary:true,pointerId:1,clientX:20,clientY:60}));
   el.scrollTop=30;el.dispatchEvent(new Event('scroll',{bubbles:true}));
   el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,isPrimary:true,pointerId:1,button:0,clientX:20,clientY:60}));
   el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));
  });
  assert.equal(await popup.count(),1);assert.ok(await panel.evaluate(el=>el.scrollTop>0));await page.keyboard.press('Escape');
  await open('player');await popup.locator('.battle-move-description').tap();assert.equal(await popup.count(),0);
  await open('player');await page.touchscreen.tap(2,2);assert.equal(await popup.count(),0);
  assert.notEqual(await page.evaluate(()=>document.body.style.position),'fixed');
 }
 const trigger=page.getByRole('group',{name:'My matchup Pokémon',exact:true}).getByRole('button',{name:'Move information: Growl',exact:true});
 await trigger.focus();await page.keyboard.press('Enter');await clean(battleMove('Growl'));await page.keyboard.press('Escape');
 assert.equal(await trigger.evaluate(el=>document.activeElement===el),true);
 assert.equal(await page.getByLabel('Battle snapshot').textContent(),snapshot);assert.deepEqual(errors,[]);
 console.log('PASS actual player/opponent move controls; 320/375/430px fit, scrolling, tap/backdrop/Escape dismissal, focus restoration and unchanged battle state');
} finally {await browser?.close();await server.close();}
