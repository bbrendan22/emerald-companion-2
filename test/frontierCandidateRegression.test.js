import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {auditFrontierCandidates,createAuditDiagnostics,auditDiagnosticMessage,compareFrontierCase,
  auditPlayer,auditPartner,referenceNullReason} from '../tools/auditFrontierCandidates.mjs';
import {towerTrainerEntries} from '../src/battle/towerTrainers.js';
import {towerSetById,possibleMatchupSets,frontierSetId} from '../src/battle/towerSets.js';
import {evaluateFrontierCandidates} from '../src/battle/frontierCandidateDamage.js';
import {aggregateFrontierDamage} from '../src/battle/frontierDamageAggregation.js';
import {frontierDamageDisplayParts} from '../src/battle/frontierDamagePresentation.js';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {battleMove,speciesByName} from '../src/battle/reference.js';
import {alexasState,swampert,observe} from './fixtures/alexasAerodactyl.js';
import {pairMaxima,numericalPlayerData} from './fixtures/doublesNumericalCases.js';
const choose=(state,setId)=>battleReducer(state,{type:'selectOpponentSet',setId});
const evaluate=(state,name,direction='player',player=swampert,selection)=>evaluateFrontierCandidates(state,player,battleMove(name),{direction,selection});
const leaves=entry=>entry.abilityDamage?.conditions?.flatMap(c=>c.abilityDamage.scenarios)??entry.abilityDamage?.scenarios??[];
const clean=report=>assert.equal(report.mismatchCount,0,auditDiagnosticMessage(report));
function saveReport(name,report) {
 if(process.env.EMERALD_AUDIT_REPORT_DIR)writeFileSync(join(process.env.EMERALD_AUDIT_REPORT_DIR,name+'.json'),JSON.stringify(report,null,2)+'\n');
}
const compact=r=>({contexts:r.contexts,selectedContexts:r.selectedContexts,evaluations:r.evaluations,branches:r.branches,
 expectedBranches:r.expectedBranches,directComparisons:r.directComparisons,checks:r.checks,mismatchCount:r.mismatchCount});

test('bounded diagnostic retention preserves every mismatch count without canonical-object output',()=>{
 const diagnostics=createAuditDiagnostics(3);
 for(let i=0;i<1000;i++)diagnostics.equal(i,-1,'injected-mismatch','a'.repeat(1000));
 assert.equal(diagnostics.report.checks,1000);assert.equal(diagnostics.report.mismatchCount,1000);
 assert.equal(diagnostics.report.mismatchesByCheck['injected-mismatch'],1000);
 assert.equal(diagnostics.report.examples.length,3);assert.ok(auditDiagnosticMessage(diagnostics.report).length<2000);
 const zero=createAuditDiagnostics(0);zero.equal(1,2,'count-only','case');
 assert.equal(zero.report.mismatchCount,1);assert.equal(zero.report.examples.length,0);
});

test('bounded reference sample covers selected Sets, Brain IVs, formats and field scenarios',t=>{
 const keys=['Expert (M):ALEXAS','Youngster:BRADY','Anabel Silver','Anabel Gold'];
 const report=auditFrontierCandidates({trainers:towerTrainerEntries.filter(t=>keys.includes(t.key)),levels:[50],
  speciesNames:['Aerodactyl','Aggron','Gardevoir','Breloom','Snorlax','Sunkern']});
 saveReport('sample-audit',report);t.diagnostic(JSON.stringify(compact(report)));clean(report);
 assert.ok(report.coverage.brainContexts>0);assert.ok(report.coverage.fullFields>0);
 assert.ok(report.byFormat.Singles>0&&report.byFormat.Doubles>0);
 assert.equal(report.branches,report.expectedBranches);assert.equal(report.directComparisons,report.expectedBranches);
});

test('bounded null-result safeguards identify transformation uncertainty and reject unexplained nulls',t=>{
 assert.equal(referenceNullReason(battleMove('Earthquake'),{dex:132,item:'Metal Powder'}),'unknown-metal-powder-transformation');
 for(const defender of [{dex:132,item:'None'},{dex:132,item:'Metal Powder',transformed:false},{dex:143,item:'Metal Powder'}])
  assert.equal(referenceNullReason(battleMove('Earthquake'),defender),'unexplained-null');
 const report=auditFrontierCandidates({speciesNames:['Ditto']});
 saveReport('null-guard-audit',report);clean(report);
 assert.ok(report.knownTransformationGuards>0);
 assert.equal(report.knownTransformationGuards,report.unavailableReasons['missing-damage-data']);
 t.diagnostic(JSON.stringify({...compact(report),knownTransformationGuards:report.knownTransformationGuards}));
});

test('complete trainer roster audit exercises both formats, levels, directions and Brain IVs',t=>{
 const report=auditFrontierCandidates({onProgress:progress=>{
  if(process.env.EMERALD_AUDIT_REPORT_DIR)writeFileSync(join(process.env.EMERALD_AUDIT_REPORT_DIR,'audit-progress.json'),JSON.stringify(progress)+'\n');
 }});
 saveReport('complete-audit',report);t.diagnostic(JSON.stringify(compact(report)));clean(report);
 assert.equal(report.trainers,towerTrainerEntries.length);
 assert.equal(report.directComparisons,report.branches);assert.equal(report.branches,report.expectedBranches);
 assert.ok(report.contexts>100);assert.ok(report.selectedContexts>=report.contexts);
 assert.ok(report.byFormat.Singles&&report.byFormat.Doubles);assert.ok(report.byLevel[50]&&report.byLevel[85]);
 assert.ok(report.byDirection.player&&report.byDirection.enemy);
 for(const [key,value] of Object.entries(report.coverage))assert.ok(value>0,key);
});

test('observation combinations and clearing retain eligible Sets but calculate each explicit selection without mutation',()=>{
 for(const format of ['Singles','Doubles']) {
  let state=alexasState(format);
  for(const [field,value,ids] of [
   ['item','Kings Rock',[1,3,4]],[0,'Double Edge',[3,4]],[1,'Earthquake',[4]],
   [1,'',[3,4]],[0,'',[1,3,4]],['item','',[1,2,3,4]],
  ]) {
   state=observe(state,field,value);
   assert.deepEqual(possibleMatchupSets(state).map(set=>set.id),ids.map(id=>`Aerodactyl ${id}`));
   for(const id of ids) {
    const selected=choose(state,`Aerodactyl ${id}`),before=structuredClone(selected),result=evaluate(selected,'Ice Beam');
    assert.equal(result.evaluations.length,1);assert.equal(result.evaluations[0].sourceSet,towerSetById(`Aerodactyl ${id}`));
    assert.deepEqual(result.evaluations.map(e=>e.setId),[`Aerodactyl ${id}`]);assert.deepEqual(selected,before);
   }
  }
  const known=battleReducer(state,{type:'observeOpponentAbility',slot:0,speciesId:142,value:'Pressure'});
  assert.deepEqual(possibleMatchupSets(known),possibleMatchupSets(state));
  assert.equal(leaves(evaluate(known,'Ice Beam').evaluations[0]).length,1);
  const conflict={...known,opponentObservations:{0:{moves:['Surf','Earthquake','',''],item:'Choice Band',ability:'Pressure'}}};
  const summary=aggregateFrontierDamage(evaluate(conflict,'Ice Beam'));
  assert.equal(summary.kind,'no-candidates');assert.equal(summary.candidateCount,0);assert.equal(summary.hp,null);
 }
});

test('integrated independent-reference matrix preserves stages, STAB, weather, screens, criticals, liveness and Helping Hand',t=>{
 const diagnostics=createAuditDiagnostics();let comparisons=0,cases=0;
 for(const format of ['Singles','Doubles'])for(const direction of ['player','enemy'])
 for(const setId of direction==='player'?['Aerodactyl 1','Aerodactyl 2','Aerodactyl 3','Aerodactyl 4']:['Aerodactyl 2','Aerodactyl 4'])
 for(const name of direction==='player'?['Ice Beam','Surf','Earthquake','DoubleSlap','Seismic Toss','Rollout','Eruption','Hidden Power','Return','Frustration','Guillotine']:['Earthquake'])
 for(const weather of ['none','sun','rain','hail','sand'])for(const critical of [false,true])for(const count of format==='Doubles'?[1,2]:[1]) {
  let state=choose(alexasState(format),setId);
  const player={...auditPlayer};
  state={...state,team:format==='Doubles'?[player.identity,auditPartner.identity]:[player.identity],field:{...state.field,weather,critical},
   // Legacy counts deliberately disagree when a hidden slot is fainted.
   matchupSides:{player:{activeCount:2,screens:{reflect:true,lightScreen:true}},enemy:{activeCount:2,screens:{reflect:true,lightScreen:true}}},
   matchupConditions:{player:{0:{currentHp:60,status:'burn',stages:{attack:-1,spAttack:1,defense:2,spDefense:1},helpingHand:true},
     ...(format==='Doubles'?{1:{currentHp:count===1?0:null}}:{})},
    enemy:{0:{currentHp:100,status:'poison',stages:{attack:1,spAttack:-1,defense:1,spDefense:2},helpingHand:true},
     ...(format==='Doubles'?{1:{currentHp:count===1?0:null}}:{})}}};
  const result=compareFrontierCase({state,player,records:[player,auditPartner],move:battleMove(name),direction,selection:'3',
   expectedSet:towerSetById(setId),diagnostics,label:`${format} ${direction} ${setId} ${name} ${weather} ${critical} ${count}`});
  comparisons+=result.comparisons;cases++;
 }
 t.diagnostic(JSON.stringify({matrixCases:cases,comparisons,...diagnostics.report}));saveReport('condition-matrix',{cases,comparisons,...diagnostics.report});
 clean(diagnostics.report);assert.ok(comparisons>2000);
});

test('independent valid and invalid HP evaluations never become an apparently complete reverse range',()=>{
 for(const format of ['Singles','Doubles']) {
  const inputs=[2,4].map(index=>{
   const state=choose(alexasState(format),`Aerodactyl ${index}`);
   state.matchupConditions.enemy[0]={currentHp:160,status:'none',stages:{}};
   return evaluate(state,'Earthquake','enemy');
  });
  // Explicit independent synthetic candidates retain the cross-candidate safeguard.
  const evaluated={...inputs[0],construction:{...inputs[0].construction,candidates:inputs.map(input=>input.construction.candidates[0])},
   evaluations:inputs.map(input=>input.evaluations[0])},summary=aggregateFrontierDamage(evaluated);
  assert.deepEqual(evaluated.evaluations.map(e=>e.availability),['available','unavailable']);
  assert.equal(summary.candidateCount,2);assert.equal(summary.hp,null);assert.equal(summary.percentage,null);
  assert.match(frontierDamageDisplayParts(summary).message,/Entered HP is invalid/);
  assert.equal(evaluated.evaluations[1].opponent.currentHp,160);assert.equal(summary.ko.chances,null);
 }
});

test('full pipeline preserves copied abilities, field safeguards, prevention and weather metadata',t=>{
 const diagnostics=createAuditDiagnostics();let casesEvaluated=0;
 const cases=[
  {dex:282,ability:'Trace',copiedAbility:null,move:'Ice Beam',weather:'none'},
  {dex:282,ability:'Trace',copiedAbility:'Flash Fire',activated:true,move:'Flamethrower',weather:'none'},
  {dex:282,ability:'Trace',copiedAbility:'Cloud Nine',move:'Weather Ball',weather:'rain'},
  {dex:55,ability:'Cloud Nine',move:'Surf',weather:'rain'},
  {dex:384,ability:'Air Lock',move:'Weather Ball',weather:'sun'},
  {dex:351,ability:'Forecast',move:'Weather Ball',weather:'rain'},
  {dex:311,ability:'Plus',move:'Thunderbolt',weather:'none'},
  {dex:312,ability:'Minus',move:'Thunderbolt',weather:'none'},
  {dex:55,ability:'Damp',move:'Explosion',weather:'none'},
  {dex:229,ability:'Flash Fire',activated:true,move:'Flamethrower',weather:'none'},
 ];
 for(const format of ['Singles','Doubles'])for(const fullField of format==='Doubles'?[false,true]:[false])for(const choice of cases) {
  let state=alexasState(format);state.field.weather=choice.weather;
  const player={...auditPlayer,dex:choice.dex,ability:choice.ability};
  if(fullField)state={...state,team:[player.identity,auditPartner.identity]};
  state.matchupConditions.player[0]={currentHp:null,status:'none',stages:{},helpingHand:false,abilityState:{context:choice.ability,
   copiedAbility:choice.copiedAbility??null,flashFireActivated:choice.activated??false}};
  const {summary}=compareFrontierCase({state,player,records:fullField?[player,auditPartner]:[player],move:battleMove(choice.move),
   diagnostics,label:`${format} full=${fullField} ${choice.ability} ${choice.copiedAbility} ${choice.move}`});casesEvaluated++;
  if(choice.ability==='Trace'&&!choice.copiedAbility)assert.equal(summary.reasons.includes('unresolved-trace'),false);
  if(['Plus','Minus'].includes(choice.ability)&&format==='Doubles'&&!fullField)assert.ok(summary.reasons.includes('unknown-plus-minus-field'));
  if(['Plus','Minus'].includes(choice.ability)&&fullField)assert.equal(summary.availability,'available');
  if(choice.ability==='Damp'){assert.deepEqual(summary.hp,{min:0,max:0});assert.ok(summary.categories.includes('prevented'));}
  if(choice.move==='Weather Ball'&&['Cloud Nine','Air Lock'].includes(choice.copiedAbility??choice.ability)) {
   assert.equal(summary.metadata.type,'NORMAL');assert.equal(summary.metadata.power,50);
  }
  if(choice.ability==='Forecast'&&format==='Doubles'&&!fullField){assert.equal(summary.hp,null);assert.equal(summary.metadata.status,'unknown');}
  if(choice.ability==='Forecast'&&fullField){assert.equal(summary.metadata.type,'WATER');assert.equal(summary.metadata.power,100);}
 }
 saveReport('ability-matrix',{cases:casesEvaluated,...diagnostics.report});t.diagnostic(JSON.stringify({abilityCases:casesEvaluated,mismatchCount:diagnostics.report.mismatchCount}));clean(diagnostics.report);
});

function numericalField() {
 let state=battleReducer(createBattleState(),{type:'rules',patch:{format:'Doubles'}});
 state=battleReducer(state,{type:'opponentTrainer',key:'Expert (M):ALEXAS'});
 for(const slot of [0,1]) {
  state=battleReducer(state,{type:'selectDoublesPlayer',slot,identity:numericalPlayerData[slot].identity,pool:numericalPlayerData});
  state=battleReducer(state,{type:'selectDoublesOpponent',slot,speciesId:speciesByName.get(slot===0?'aggron':'aerodactyl').internalSpeciesId});
  state=battleReducer(state,{type:'selectOpponentSet',slot,setId:slot===0?'Aggron 3':'Aerodactyl 4'});
 }
 return state;
}
test('bounded four-slot reference probes match independent literal rolls, hidden abilities and redirect targets',t=>{
 const diagnostics=createAuditDiagnostics();let cases=0;
 for(const pair of pairMaxima)for(const direction of ['player','enemy'])for(const [name,max] of Object.entries(direction==='player'?pair.attacks:pair.incoming)) {
  let state=numericalField();
  state=battleReducer(state,{type:'viewDoublesSlot',side:'player',slot:pair.player});
  state=battleReducer(state,{type:'viewDoublesSlot',side:'opponent',slot:pair.opponent});
  const result=compareFrontierCase({state,player:numericalPlayerData[pair.player],records:numericalPlayerData,move:battleMove(name),direction,
   diagnostics,label:`literal P${pair.player} O${pair.opponent} ${direction} ${name}`});cases++;
  for(const ref of result.expected.refs)assert.deepEqual(ref.result.rolls,Array.from({length:16},(_,i)=>Math.floor(max*(85+i)/100)),pair.note);
 }
 const state=numericalField(),player=numericalPlayerData[0];state.field.weather='rain';
 const uncertain={...numericalPlayerData[1],name:'Golduck',dex:55,ability:'Cloud Nine / Damp',
  abilityOptions:{status:'uncertain',source:'fixture',values:['Cloud Nine','Damp']}};
 const weather=compareFrontierCase({state,player,records:[player,uncertain],move:battleMove('Surf'),diagnostics,label:'hidden Cloud Nine / Damp'});cases++;
 assert.deepEqual([...new Set(weather.expected.refs.map(ref=>ref.result.max))].sort((a,b)=>a-b),[90,132]);
 const redirectState=numericalField(),rod={...numericalPlayerData[1],name:'Manectric',dex:310,types:['ELECTRIC'],ability:'Lightning Rod'};
 for(const mode of ['active','fainted','empty','missing-record']) {
  const copy={...redirectState,team:[...redirectState.team],matchupConditions:{player:{},enemy:{}}};
  if(mode==='fainted')copy.matchupConditions.player[1]={currentHp:0};
  if(mode==='empty')copy.team[1]=null;
  const result=compareFrontierCase({state:copy,player,records:mode==='missing-record'?[player]:[player,rod],move:battleMove('Thunder'),direction:'enemy',diagnostics,label:`redirect ${mode}`});cases++;
  if(mode==='active') {
   assert.ok(result.expected.refs.every(ref=>ref.target.status==='redirected'&&ref.result.max===24));
   assert.ok(result.summary.branches.every(branch=>branch.defenderMaximumHp===240));
  } else if(mode==='fainted')assert.ok(result.summary.reasons.includes('lightning-rod-fainted-target'));
  else if(mode==='empty')assert.deepEqual(result.summary.hp,{min:0,max:0});
  else assert.ok(result.summary.reasons.includes('unknown-lightning-rod-target'));
 }
 saveReport('field-probes',{cases,...diagnostics.report});t.diagnostic(JSON.stringify({fieldProbeCases:cases,mismatchCount:diagnostics.report.mismatchCount}));clean(diagnostics.report);
});

test('canonical selected-source corruption is explicit and independent synthetic siblings cannot hide it',()=>{
 for(const format of ['Singles','Doubles']) {
  const states=[1,2,3,4].map(index=>choose(alexasState(format),`Aerodactyl ${index}`));
  const set=towerSetById('Aerodactyl 4'),previous=set.item;
  try {
   set.item=null;
   const inputs=states.map(state=>evaluate(state,'Ice Beam'));
   for(const [index,input] of inputs.entries()) {
    assert.equal(input.evaluations.length,1);assert.equal(input.evaluations[0].setId,`Aerodactyl ${index+1}`);
    assert.equal(input.evaluations[0].availability,index===3?'unavailable':'available');
   }
   const result={...inputs[0],construction:{availability:'unavailable',reason:'incomplete-candidate-data',
    candidates:inputs.map(input=>input.construction.candidates[0])},evaluations:inputs.map(input=>input.evaluations[0])};
   const summary=aggregateFrontierDamage(result);
   assert.equal(summary.candidateCount,4);assert.equal(summary.hp,null);assert.ok(summary.reasons.includes('missing-or-invalid-candidate-item'));
   assert.equal(result.evaluations.filter(e=>e.availability==='available').length,3);assert.equal(summary.ko.chances,null);
  } finally {set.item=previous;}
 }
});
