import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5313,strictPort:true},plugins:[{
 name:'candidate-regression-instrumentation',
 transform(code,id){
  if(id.endsWith('/src/battle/frontierCandidateDamage.js')) {
   const marker='  const construction=frontierMatchupCandidates(state);';assert.ok(code.includes(marker));
   return code.replace(marker,"  window.candidateAudit.calls.push({move:selectedMove.id,direction});\n"+marker);
  }
  if(id.endsWith('/src/battle/frontierCandidates.js')) {
   const marker='  const sets=possibleMatchupSets(state);';assert.ok(code.includes(marker));
   return code.replace(marker,'  window.candidateAudit.constructions++;\n'+marker);
  }
 },
 configureServer(s){s.middlewares.use('/__candidate-regression',(_req,res)=>{
  res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/frontierCandidatePopup.jsx"></script>');
 });},
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});await mkdir('artifacts/frontier-candidate-step5',{recursive:true});
 for(const width of [320,375,390,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true}),errors=[];
  await page.addInitScript(()=>{window.candidateAudit={calls:[],constructions:0};});
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
  await page.goto(`${server.resolvedUrls.local[0]}__candidate-regression`);
  await page.waitForFunction(()=>window.frontierFixture);
  const dialog=page.getByRole('dialog');
  const dispatch=action=>page.evaluate(action=>window.frontierFixture.dispatch(action),action);
  const open=(name,side='My')=>page.getByRole('group',{name:`${side} matchup Pokémon`,exact:true}).getByRole('button',{name:`Move information: ${name}`,exact:true}).tap();
  const hp=value=>page.waitForFunction(value=>document.querySelector('dialog .battle-core-damage-hp')?.textContent===`${value} HP damage`,value);
  const absent=()=>page.waitForFunction(()=>!document.querySelector('dialog'));
  const close=async()=>{await page.keyboard.press('Escape');await absent();};
  const rendered=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.deepEqual(await page.evaluate(()=>window.candidateAudit),{calls:[],constructions:0});
  await dispatch({type:'conditionsOpen',open:true});await rendered();
  assert.equal(await page.evaluate(()=>window.candidateAudit.calls.length),0,'unopened moves are not evaluated');
  await open('Ice Beam');await hp('71–84');
  const initial=await page.evaluate(()=>structuredClone(window.candidateAudit));
  assert.equal(initial.calls.length,1);assert.equal(initial.constructions,1);
  const observations=await page.evaluate(()=>JSON.stringify(window.frontierFixture.state.opponentObservations));
  await dispatch({type:'conditionsOpen',open:false});await rendered();
  assert.deepEqual(await page.evaluate(()=>window.candidateAudit),initial,'unrelated render does not reconstruct/evaluate candidates');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.frontierFixture.state.opponentObservations)),observations);
  await dispatch({type:'observeOpponent',field:'item',value:'Choice Band'});await hp('71–84');await rendered();
  await page.waitForFunction(()=>document.querySelector('dialog .battle-core-damage-percent')?.textContent==='40.3% – 47.7%');
  assert.equal(await page.evaluate(()=>window.candidateAudit.calls.length),initial.calls.length+1);
  await dispatch({type:'observeOpponent',field:'item',value:''});await rendered();
  await close();
  const closed=await page.evaluate(()=>window.candidateAudit.calls.length);
  await dispatch({type:'conditionField',key:'weather',value:'rain'});await rendered();
  assert.equal(await page.evaluate(()=>window.candidateAudit.calls.length),closed);
  await dispatch({type:'conditionField',key:'weather',value:'none'});
  // A live player move replacement must remount only the selected move's popup.
  await open('Ice Beam');await hp('71–84');
  await page.evaluate(async()=>{const {battleMove}=await import('/src/battle/reference.js');const f=window.frontierFixture;
   f.setPlayer({...f.player,moves:['Surf','Ice Beam','Earthquake','Strength'].map(battleMove)});});
  await page.waitForFunction(()=>document.querySelector('dialog h2')?.textContent==='Surf');await hp('107–126');
  assert.ok((await page.evaluate(()=>window.candidateAudit.calls)).every(call=>[58,57].includes(call.move)));
  await close();
  // Observed moves may move between rows; identity must remain the selected move.
  await dispatch({type:'observeOpponent',field:0,value:'Earthquake'});await open('Earthquake','Opponent');await hp('60–107');
  await dispatch({type:'observeOpponent',field:0,value:''});await absent();await rendered();
  await dispatch({type:'observeOpponent',field:0,value:'Earthquake'});await rendered();assert.equal(await dialog.count(),0,'lost justification never reopens a stale popup');
  await open('Earthquake','Opponent');await hp('60–107');
  const alternate=await page.evaluate(async()=>{const {towerTrainerEntries}=await import('/src/battle/towerTrainers.js');
   const {towerSetById}=await import('/src/battle/towerSets.js');const {speciesByName}=await import('/src/battle/reference.js');
   const trainer=towerTrainerEntries.find(t=>t.key==='Expert (M):ALEXAS');
   const name=trainer.setIds.map(towerSetById).find(set=>set.species!=='Aerodactyl').species;
   return speciesByName.get(name.toLowerCase()).internalSpeciesId;});
  await dispatch({type:'assignOpponentSpecies',slot:1,speciesId:alternate});
  await dispatch({type:'matchupOpponent',speciesId:alternate});await absent();
  await dispatch({type:'matchupOpponent',speciesId:142});await open('Earthquake','Opponent');await hp('60–107');
  await dispatch({type:'opponentTrainer',key:'Beauty:DAWN'});await absent();
  assert.equal(await page.evaluate(()=>Object.keys(window.frontierFixture.state.opponentObservations).length),0);
  await dispatch({type:'assignOpponentSpecies',slot:0,speciesId:131});await dispatch({type:'matchupOpponent',speciesId:131});
  await open('Surf');await page.waitForFunction(()=>document.querySelector('dialog .battle-core-damage-percent')?.textContent.startsWith('0.0%'));
  assert.match(await dialog.innerText(),/Some possibilities prevent damage/);
  const bounds=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);
  assert.equal(await dialog.evaluate(node=>node.scrollWidth>node.clientWidth),false);
  await page.screenshot({path:`artifacts/frontier-candidate-step5/mixed-${width}.png`});await close();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  await page.close();console.log(`PASS WebKit ${width}px: instrumented lazy evaluation/memoization, live move replacement, observation invalidation, trainer/species dismissal, persistence and mixed immunity`);
 }
} finally {await browser?.close();await server.close();}
