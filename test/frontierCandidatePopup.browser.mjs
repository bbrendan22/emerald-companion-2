import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5312,strictPort:true},plugins:[{
 name:'frontier-candidate-popup',configureServer(s){s.middlewares.use('/__candidates',(_req,res)=>{
  res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/frontierCandidatePopup.jsx"></script>');
 });},
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});await mkdir('artifacts/frontier-candidate-popup',{recursive:true});
 const widths=process.env.BROWSER_WIDTH?[Number(process.env.BROWSER_WIDTH)]:[320,375,390,430];
 assert.ok(widths.every(width=>Number.isInteger(width)&&width>0),'valid viewport width');
 for(const width of widths) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
  await page.goto(`${server.resolvedUrls.local[0]}__candidates`);
  const dialog=page.getByRole('dialog');
  const dispatch=action=>page.evaluate(action=>window.frontierFixture.dispatch(action),action);
  const text=async(selector,value)=>{await page.waitForFunction(({selector,value})=>document.querySelector(`dialog ${selector}`)?.textContent===value,{selector,value});};
  const open=(name,side='My')=>page.getByRole('group',{name:`${side} matchup Pokémon`,exact:true}).getByRole('button',{name:`Move information: ${name}`,exact:true}).tap();
  const close=async()=>{await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog'));};
  const hp=(range)=>text('.battle-core-damage-hp',`${range} HP damage`);
  const percent=value=>text('.battle-core-damage-percent',value);
  const condition=(side,field,value,extra={})=>dispatch({type:'matchupCondition',side,slot:0,field,value,...extra});
  const observe=(field,value)=>dispatch({type:'observeOpponent',field,value});
  const format=value=>dispatch({type:'rules',patch:{format:value}});
  const setWeather=value=>dispatch({type:'conditionField',key:'weather',value});
  const unavailable=async pattern=>{await page.waitForFunction(()=>document.querySelector('dialog .battle-damage-unavailable'));
   assert.match(await dialog.locator('.battle-damage-unavailable').innerText(),pattern);
   assert.equal(await dialog.locator('.battle-core-damage-percent,.battle-core-damage-hp').count(),0);
   assert.equal(await dialog.locator('.battle-core-damage-ko').count(),0);};
  for(const mode of ['Singles','Doubles']) {
   await format(mode);
   await open('Ice Beam');await hp('71–84');await percent('40.3% – 54.2%');
   assert.doesNotMatch(await dialog.innerText(),/Across \d+ possible sets/);
   assert.deepEqual(await dialog.locator('.battle-core-damage-ko > span').allTextContents(),['0.0–50.0% 2HKO','Guaranteed 3HKO']);
   assert.equal(await dialog.locator('.battle-core-damage-hp').evaluate(node=>node.previousElementSibling.className),'battle-core-damage-percent');
   await page.screenshot({path:`artifacts/frontier-candidate-popup/${mode}-${width}.png`});
   await observe('item','Choice Band');await percent('40.3% – 47.7%');assert.doesNotMatch(await dialog.innerText(),/Across \d+ possible sets/);
   assert.deepEqual(await dialog.locator('.battle-core-damage-ko > span').allTextContents(),['Guaranteed 3HKO']);
   await observe('item','Kings Rock');await percent('40.3% – 54.2%');assert.doesNotMatch(await dialog.innerText(),/Across \d+ possible sets/);
   await dispatch({type:'observeOpponentAbility',slot:0,speciesId:142,value:'Pressure'});await hp('71–84');
   await observe(0,'Double Edge');await percent('45.8% – 54.2%');assert.doesNotMatch(await dialog.innerText(),/Across \d+ possible sets/);
   await observe(0,'');await observe('item','');
   await condition('enemy','currentHp',160,{max:176});await unavailable(/Entered HP is invalid/);
   await condition('enemy','currentHp',null);await hp('71–84');
   await dispatch({type:'rules',patch:{levelMode:'open',openLevel:85}});
   await page.waitForFunction(()=>document.querySelector('dialog .battle-core-damage-hp')?.textContent!=='71–84 HP damage');
   await dispatch({type:'rules',patch:{levelMode:'50'}});await hp('71–84');
   await close();
   await open('Surf');await hp(mode==='Singles'?'107–126':'56–66');
   // Dispatch the same reducer action used by the existing weather control.
   await setWeather('rain');
   if(mode==='Doubles')await unavailable(/Unseen abilities may suppress the weather/);
   else await page.waitForFunction(()=>document.querySelector('dialog .battle-core-damage-hp')?.textContent!=='107–126 HP damage');
   await setWeather('none');
   await hp(mode==='Singles'?'107–126':'56–66');
   if(mode==='Singles') {await format('Doubles');await hp('56–66');await format('Singles');await hp('107–126');}
   else {
    await condition('enemy','screen',true,{screen:'lightScreen'});await condition('player','helpingHand',true);await hp('56–66');
    await dispatch({type:'matchupActiveCount',side:'enemy',value:1});await hp('83–98');
    await condition('enemy','screen',false,{screen:'lightScreen'});await condition('player','helpingHand',false);
    await dispatch({type:'matchupActiveCount',side:'enemy',value:2});await hp('56–66');
   }
   await close();await open('Earthquake');await hp('0–0');assert.equal(await dialog.locator('.battle-core-damage-ko').count(),0);await close();
   await observe(0,'Earthquake');await open('Earthquake','Opponent');await hp('60–107');await percent('33.3% – 59.4%');
   await observe('item','Choice Band');await hp('90–107');await observe('item','Kings Rock');await hp('60–71');
   await observe('item','');
   await condition('enemy','stage',2,{stat:'attack'});
   await page.waitForFunction(()=>document.querySelector('dialog .battle-core-damage-hp')?.textContent!=='60–107 HP damage');
   await condition('enemy','stage',0,{stat:'attack'});await hp('60–107');
   await condition('enemy','status','burn');
   await page.waitForFunction(()=>document.querySelector('dialog .battle-core-damage-hp')?.textContent!=='60–107 HP damage');
   await condition('enemy','status','none');await hp('60–107');
   await dispatch({type:'conditionField',key:'critical',value:true});
   await page.waitForFunction(()=>document.querySelector('dialog .battle-core-damage-hp')?.textContent!=='60–107 HP damage');
   await dispatch({type:'conditionField',key:'critical',value:false});await hp('60–107');
   await condition('player','screen',true,{screen:'reflect'});
   await page.waitForFunction(()=>document.querySelector('dialog .battle-core-damage-hp')?.textContent!=='60–107 HP damage');
   await condition('player','screen',false,{screen:'reflect'});await hp('60–107');
   await close();await observe(0,'');
  }
  // Deliberately conflicting observations exercise zero-candidate presentation.
  await open('Ice Beam');
  await page.evaluate(()=>{const f=window.frontierFixture;f.dispatch({type:'fixtureReplace',state:{...f.state,opponentObservations:{0:{moves:['Surf','','',''],item:''}}}});});
  await unavailable(/No matching Frontier sets/);await close();
  await page.evaluate(()=>{const f=window.frontierFixture;f.dispatch({type:'fixtureReplace',state:{...f.state,opponentObservations:{}}});});
  await open('Ice Beam');await hp('71–84');
  const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
  assert.equal(await dialog.evaluate(node=>node.scrollWidth>node.clientWidth),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await dialog.getByRole('heading',{name:'Damage Calculation',exact:true}).tap();assert.equal(await dialog.count(),0);
  // Swap only the diagnostic player's moves; production selection still opens
  // the actual BattleMatchup controls and candidate-aware move popup.
  await page.evaluate(async()=>{const {battleMove}=await import('/src/battle/reference.js');const f=window.frontierFixture;
   f.setPlayer({...f.player,level:50,friendship:255,ivs:{hp:31,attack:31,defense:31,spAttack:31,spDefense:31,speed:31},
    moves:['Hidden Power','Weather Ball','Eruption','Guillotine'].map(battleMove)});});
  await open('Hidden Power');await text('dd','70');assert.equal(await dialog.locator('header img').getAttribute('alt'),'dark type');await close();
  await format('Singles');await open('Weather Ball');await text('dd','50');await setWeather('sun');await text('dd','100');
  assert.equal(await dialog.locator('header img').getAttribute('alt'),'fire type');
  await format('Doubles');await unavailable(/Unseen abilities may suppress the weather/);await text('dd','—');
  assert.match(await dialog.innerText(),/Type\/power unavailable/);await close();await setWeather('none');await format('Singles');
  await open('Eruption');await text('dd','150');await condition('player','currentHp',90,{max:180});await text('dd','75');await close();
  await condition('player','currentHp',null);await open('Guillotine');
  await page.waitForFunction(()=>document.querySelector('dialog .battle-core-damage-outcome')?.textContent==='OHKO');
  assert.equal(await dialog.locator('.battle-core-damage-percent').count(),0);await close();
  await page.evaluate(async()=>{const {battleMove}=await import('/src/battle/reference.js');const f=window.frontierFixture;
   f.setPlayer({...f.player,moves:['Counter','Roar','Surf','Ice Beam'].map(battleMove)});});
  await open('Counter');assert.match(await dialog.innerText(),/requires special battle-state handling/);await close();
  await open('Roar');assert.match(await dialog.innerText(),/Move effect/);await close();
  // Real Lapras candidates retain Water Absorb / Shell Armor alternatives.
  await dispatch({type:'opponentTrainer',key:'Beauty:DAWN'});
  await dispatch({type:'assignOpponentSpecies',slot:0,speciesId:131});await dispatch({type:'matchupOpponent',speciesId:131});
  await open('Surf');await page.waitForFunction(()=>document.querySelector('dialog .battle-core-damage-percent')?.textContent.startsWith('0.0%'));
  assert.match(await dialog.innerText(),/Some possibilities prevent damage/);await close();
  await page.evaluate(async()=>{const {battleMove}=await import('/src/battle/reference.js');const f=window.frontierFixture;
   f.setPlayer({...f.player,moves:['Rollout','DoubleSlap','Surf','Ice Beam'].map(battleMove)});});
  await open('Rollout');await text('dd','30');
  await dialog.getByRole('combobox',{name:'Turn',exact:true}).selectOption('stage-3');await text('dd','120');
  await dialog.getByRole('checkbox',{name:'Defense Curl',exact:true}).check();await text('dd','240');
  assert.match(await dialog.innerText(),/DEFENSE CURL/);await close();
  await open('DoubleSlap');await dialog.getByRole('combobox',{name:'Hits',exact:true}).selectOption('5');
  assert.equal(await dialog.locator('.battle-core-damage-percent').count(),1);assert.match(await dialog.innerText(),/If all 5 hits connect/);await close();
  assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: ALEXAS both formats/directions, live observations/HP/level/weather/screens/Helping Hand/counts, zero/incomplete results, dismissal, percentage-first and no overflow`);
 }
} finally {await browser?.close();await server.close();}
