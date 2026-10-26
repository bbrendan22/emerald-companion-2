import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateFrontierCandidates} from '../src/battle/frontierCandidateDamage.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {battleMove,speciesByName} from '../src/battle/reference.js';
import {towerTrainerEntries} from '../src/battle/towerTrainers.js';
import {towerSetById,possibleMatchupSets} from '../src/battle/towerSets.js';
import {abilityConditionContext} from '../src/battle/conditionalAbilities.js';
import {playerAbilityOptions} from '../src/battle/abilityScenarios.js';
import {frontierMatchupCandidates} from '../src/battle/frontierCandidates.js';
import {alexasState,swampert,observe} from './fixtures/alexasAerodactyl.js';

const calc=(state,name,options={},player=swampert)=>evaluateFrontierCandidates(state,player,battleMove(name),options);
const branches=entry=>entry.abilityDamage.conditions
  ?entry.abilityDamage.conditions.flatMap(condition=>condition.abilityDamage.scenarios):entry.abilityDamage.scenarios;
const ranges=result=>result.evaluations.map(entry=>branches(entry).map(s=>[s.result?.min,s.result?.max]));
const patch=(state,side,values)=>({...state,matchupConditions:{...state.matchupConditions,
  [side]:{...state.matchupConditions?.[side],0:{currentHp:null,status:'none',stages:{},helpingHand:false,
    ...state.matchupConditions?.[side]?.[0],...values}}}});
const screen=(state,side,screens)=>({...state,matchupSides:{...state.matchupSides,
  [side]:{activeCount:2,...state.matchupSides?.[side],screens}}});
const weather=(state,value)=>({...state,field:{...state.field,weather:value}});
function opponentState(name,format='Singles',move) {
  const trainer=towerTrainerEntries.findLast(entry=>entry.trainer!=='Anabel'&&entry.setIds.some(id=>{
    const set=towerSetById(id);return set.species===name&&(!move||set.moves.includes(move));
  }));
  assert.ok(trainer,`${name} ${move}`);
  let state=battleReducer(createBattleState(),{type:'rules',patch:{format}});
  state=battleReducer(state,{type:'opponentTrainer',key:trainer.key});
  const speciesId=speciesByName.get(name.toLowerCase()).internalSpeciesId;
  state=battleReducer(state,{type:'assignOpponentSpecies',slot:0,speciesId});
  state=battleReducer(state,{type:'matchupOpponent',speciesId});
  state={...state,team:[swampert.identity],matchup:{...state.matchup,player:swampert.identity}};
  return move?observe(state,0,move):state;
}
function abilityState(state,side,mon,copiedAbility,flashFireActivated=false) {
  return patch(state,side,{abilityState:{context:abilityConditionContext(mon),copiedAbility,flashFireActivated}});
}

for(const format of ['Singles','Doubles']) {
  test(`${format}: each selected canonical ALEXAS candidate calculates Ice Beam, Surf and Earthquake`,()=>{
    // Lv47 factor20: Ice95/SpD95 ->40,+2=42,Ice×2=84.
    // Surf: Singles40+2=42,STAB63,Rock×2=126; Doubles40/2+2=22,STAB33,×2=66.
    for(const [index,set] of possibleMatchupSets(alexasState(format)).entries())
    for(const [name,min,max] of [['Ice Beam',71,84],['Surf',format==='Singles'?107:56,format==='Singles'?126:66],['Earthquake',0,0]]) {
      const state=battleReducer(alexasState(format),{type:'selectOpponentSet',setId:set.id}),result=calc(state,name);
      assert.equal(result.evaluations.length,1);assert.equal(result.construction.candidates.length,1);
      const entry=result.evaluations[0];
      assert.equal(entry.sourceSet,set);assert.equal(entry.candidate,result.construction.candidates[0]);
      assert.equal(entry.setId,`Aerodactyl ${index+1}`);assert.equal(entry.availability,'available');
      assert.equal(entry.constructionAvailability,'available');assert.equal(entry.constructionReason,null);
      assert.equal(entry.defenderMaximumHp,index<2?176:155);assert.equal(entry.candidateMaximumHp,entry.defenderMaximumHp);
      assert.equal(entry.defender.item,index===1?'Choice Band':'Kings Rock');
      assert.deepEqual(branches(entry).map(branch=>branch.defenderAbility),['Rock Head','Pressure']);
      for(const branch of branches(entry)) {
        assert.deepEqual([branch.result.min,branch.result.max],[min,max]);
        assert.deepEqual(branch.result.rolls,Array.from({length:16},(_,i)=>Math.floor(max*(85+i)/100)));
        assert.equal(Object.hasOwn(branch,'percentage'),false);assert.equal(Object.hasOwn(branch,'hp'),false);
      }
    }
  });
  test(`${format}: reverse Earthquake keeps each selected set's correlated stats and item`,()=>{
    const base=observe(alexasState(format),0,'Earthquake');
    assert.deepEqual(possibleMatchupSets(base).map(set=>set.id),['Aerodactyl 2','Aerodactyl 4']);
    for(const [setId,attack,item,max] of [['Aerodactyl 2',160,'Choice Band',107],['Aerodactyl 4',157,'Kings Rock',71]]) {
      // Lv50 factor22; CB Attack240: floor(22*100*240/100/50)+2=107; Attack157 ->71.
      const state=battleReducer(base,{type:'selectOpponentSet',setId}),result=calc(state,'Earthquake',{direction:'enemy'});
      assert.deepEqual(result.evaluations.map(entry=>entry.setId),[setId]);
      const entry=result.evaluations[0];assert.equal(entry.attacker,entry.opponent);assert.equal(entry.defenderMaximumHp,180);
      assert.equal(entry.attacker.stats.attack,attack);assert.equal(entry.attacker.item,item);
      assert.equal(entry.attacker.friendship,255);assert.equal(entry.attacker.ivs.attack,31);
      assert.deepEqual(ranges(result),[[[Math.floor(max*.85),max],[Math.floor(max*.85),max]]]);
      for(const branch of branches(entry))assert.deepEqual(branch.result.rolls,Array.from({length:16},(_,i)=>Math.floor(max*(85+i)/100)));
    }
  });
  test(`${format}: reverse Aerial Ace uses actual per-set offensive item effects`,()=>{
    const base=observe(alexasState(format),0,'Aerial Ace');
    for(const [setId,max] of [['Aerodactyl 1',66],['Aerodactyl 2',97]]) {
      // Attack160: subtotal42,+2=44,STAB66; CB Attack240: subtotal63,+2=65,STAB97.
      const state=battleReducer(base,{type:'selectOpponentSet',setId}),result=calc(state,'Aerial Ace',{direction:'enemy'});
      assert.deepEqual(result.evaluations.map(entry=>entry.setId),[setId]);
      assert.deepEqual(ranges(result),[[[Math.floor(max*.85),max],[Math.floor(max*.85),max]]]);
      for(const branch of branches(result.evaluations[0]))assert.deepEqual(branch.result.rolls,Array.from({length:16},(_,i)=>Math.floor(max*(85+i)/100)));
    }
  });
}

test('null HP resolves independently to each selected candidate maximum; explicit HP stays unchanged in both directions',()=>{
  for(const format of ['Singles','Doubles'])for(const [index,set] of possibleMatchupSets(alexasState(format)).entries()) {
    const selected=battleReducer(alexasState(format),{type:'selectOpponentSet',setId:set.id});
    const full=calc(selected,'Ice Beam');
    assert.equal(full.evaluations.length,1);assert.equal(full.evaluations[0].opponent.currentHp,index<2?176:155);
    for(const direction of ['player','enemy']) {
      const state=patch(patch(selected,'enemy',{currentHp:123}),'player',{currentHp:111});
      const result=calc(state,direction==='enemy'?set.moves[0]:'Ice Beam',{direction});
      assert.equal(result.evaluations.length,1);assert.equal(result.evaluations[0].availability,'available');
      assert.equal(result.evaluations[0].opponent.currentHp,123);
      assert.equal((direction==='player'?result.evaluations[0].attacker:result.evaluations[0].defender).currentHp,111);
    }
  }
});

test('HP above a candidate maximum retains the candidate with a specific invalid-condition result',()=>{
  for(const format of ['Singles','Doubles'])for(const setId of ['Aerodactyl 1','Aerodactyl 2','Aerodactyl 3','Aerodactyl 4']) {
    const state=battleReducer(alexasState(format),{type:'selectOpponentSet',setId});
    for(const direction of ['player','enemy']) {
      // Inject after selection so reducer clamping cannot hide invalid input.
      const name=direction==='enemy'?towerSetById(setId).moves[0]:'Ice Beam';
      const result=calc(patch(state,'enemy',{currentHp:160}),name,{direction});
      assert.equal(result.evaluations.length,1);
      const entry=result.evaluations[0],maximumHp=setId.endsWith('1')||setId.endsWith('2')?176:155;
      assert.equal(entry.setId,setId);assert.equal(entry.opponent.currentHp,160);
      assert.equal(entry.availability,maximumHp===176?'available':'unavailable');
      if(maximumHp===155) {
        assert.equal(entry.reason,'invalid-condition-current-hp');assert.equal(entry.abilityDamage,null);
        assert.deepEqual(entry.details,{side:'enemy',currentHp:160,maximumHp});
      }
    }
  }
});

test('invalid player HP remains explicit, including fractional/negative HP; zero is retained',()=>{
  for(const value of [181,-1,2.5]) {
    const result=calc(patch(alexasState(),'player',{currentHp:value}),'Ice Beam');
    assert.ok(result.evaluations.every(entry=>entry.reason==='invalid-condition-current-hp'&&entry.details.side==='player'));
  }
  assert.ok(calc(patch(alexasState(),'enemy',{currentHp:0}),'Ice Beam').evaluations.every(entry=>entry.opponent.currentHp===0));
});

test('manual ability knowledge refines only ability scenarios, never candidate eligibility',()=>{
  for(const format of ['Singles','Doubles']) {
    const base=alexasState(format);
    const state=battleReducer(base,{type:'observeOpponentAbility',slot:0,speciesId:142,value:'Pressure'});
    const result=calc(state,'Ice Beam');assert.equal(result.evaluations.length,1);
    assert.deepEqual(possibleMatchupSets(state),possibleMatchupSets(base));
    assert.deepEqual(result.evaluations.map(entry=>entry.setId),calc(base,'Ice Beam').evaluations.map(entry=>entry.setId));
    for(const entry of result.evaluations)assert.deepEqual(branches(entry).map(branch=>branch.defenderAbility),['Pressure']);
  }
});

test('unresolved player Trace uses neutral damage; copied ability and activation project from valid context',()=>{
  const trace={...swampert,name:'Gardevoir',dex:282,ability:'Trace'};
  const state=alexasState();
  for(const entry of calc(state,'Ice Beam',{},trace).evaluations) {
    assert.equal(entry.availability,'available');assert.deepEqual(entry.reasons,[]);
    assert.ok(branches(entry).every(branch=>branch.availability==='available'));
  }
  const mon={...trace,abilityOptions:playerAbilityOptions(trace)};
  const copied=abilityState(state,'player',mon,'Flash Fire',true);
  for(const entry of calc(copied,'Flamethrower',{},trace).evaluations) {
    assert.equal(entry.attacker.copiedAbility,'Flash Fire');assert.equal(entry.attacker.flashFireActivated,true);
    assert.equal(entry.availability,'available');
  }
  const stale=patch(copied,'player',{abilityState:{context:'old',copiedAbility:'Flash Fire',flashFireActivated:true}});
  assert.ok(calc(stale,'Ice Beam',{},trace).evaluations.every(entry=>entry.availability==='available'));
  assert.deepEqual(calc(stale,'Ice Beam',{},trace).evaluations.map(entry=>branches(entry).map(branch=>branch.result)),calc(state,'Ice Beam',{},trace).evaluations.map(entry=>branches(entry).map(branch=>branch.result)));
});

test('opponent Trace alternatives are preserved before and after choosing a copied ability',()=>{
  const state=opponentState('Gardevoir');
  const initial=calc(state,'Ice Beam');
  assert.ok(initial.evaluations.length>0);
  for(const entry of initial.evaluations) {
    const trace=branches(entry).find(branch=>branch.defenderAbility==='Trace');
    assert.equal(trace.availability,'available');
    assert.deepEqual(trace.result,branches(entry).find(branch=>branch.defenderAbility==='Synchronize').result);
    assert.ok(branches(entry).some(branch=>branch.defenderAbility==='Synchronize'&&branch.availability==='available'));
  }
  const mon=frontierMatchupCandidates(state).candidates[0].opponent;
  const copied=calc(abilityState(state,'enemy',mon,'Thick Fat'),'Ice Beam');
  for(const entry of copied.evaluations)assert.equal(entry.availability,'available');
});

test('explicit player ability alternatives survive projection in both attack directions',()=>{
  const player={...swampert,name:'Gardevoir',dex:282,ability:'Trace',
    abilityOptions:{status:'uncertain',source:'species',values:['Trace','Synchronize']}};
  const state=observe(alexasState(),0,'Earthquake');
  for(const direction of ['player','enemy'])for(const entry of calc(state,'Earthquake',{direction},player).evaluations) {
    assert.equal(branches(entry).length,4);
    const key=direction==='player'?'attackerAbility':'defenderAbility';
    assert.deepEqual([...new Set(branches(entry).map(branch=>branch[key]))],['Trace','Synchronize']);
    assert.ok(branches(entry).every(branch=>branch.availability==='available'));
    assert.ok(branches(entry).some(branch=>branch.availability==='available'));
  }
});

test('Doubles rain Surf preserves unknown weather suppression, while clear Surf and rain Ice Beam calculate',()=>{
  const state=alexasState('Doubles');
  for(const entry of calc(weather(state,'rain'),'Surf').evaluations) {
    assert.equal(entry.reason,'incomplete-ability-scenarios');
    assert.deepEqual(entry.reasons,['unknown-weather-suppression-field']);
  }
  assert.ok(calc(state,'Surf').evaluations.every(entry=>entry.availability==='available'));
  assert.ok(calc(weather(state,'rain'),'Ice Beam').evaluations.every(entry=>entry.availability==='available'));
  assert.ok(calc(weather(alexasState(),'rain'),'Surf').evaluations.every(entry=>entry.availability==='available'));
});

test('represented Cloud Nine and Air Lock suppress weather through the existing engine',()=>{
  for(const [name,dex,ability] of [['Golduck',55,'Cloud Nine'],['Rayquaza',384,'Air Lock']]) {
    const player={...swampert,name,dex,ability};
    const state=weather(alexasState('Doubles'),'rain');
    for(const entry of calc(state,'Surf',{},player).evaluations) {
      assert.equal(entry.availability,'available');
      assert.equal(entry.attacker.ability,ability);
    }
  }
});

test('Doubles Plus/Minus and unseen Damp safeguards are not erased',()=>{
  for(const [name,dex,ability] of [['Plusle',311,'Plus'],['Minun',312,'Minus']]) {
    const result=calc(alexasState('Doubles'),'Thunderbolt',{}, {...swampert,name,dex,ability});
    assert.ok(result.evaluations.every(entry=>entry.reasons.includes('unknown-plus-minus-field')));
  }
  const damp=calc(alexasState('Doubles'),'Explosion');
  assert.ok(damp.evaluations.every(entry=>entry.reasons.includes('unknown-damp-field')));
  const player={...swampert,name:'Golduck',dex:55,ability:'Damp'};
  for(const entry of calc(alexasState('Doubles'),'Explosion',{},player).evaluations)
    assert.ok(branches(entry).every(branch=>branch.result.outcome==='blocked'&&branch.result.damage===0));
});

test('Forecast and Weather Ball metadata follow pinned weather/suppression branches',()=>{
  const player={...swampert,name:'Castform',dex:351,ability:'Forecast',types:['NORMAL']};
  const result=calc(weather(alexasState(),'sun'),'Weather Ball',{},player);
  for(const entry of result.evaluations)for(const branch of branches(entry)) {
    assert.deepEqual(branch.moveMetadata,{type:'FIRE',power:100,formulaPower:50,damageMultiplier:2});assert.ok(branch.result.rolls);
  }
  const guarded=calc(weather(alexasState('Doubles'),'sun'),'Weather Ball',{},player);
  for(const entry of guarded.evaluations)for(const branch of branches(entry)) {
    assert.equal(branch.moveMetadata,null);assert.equal(branch.result.reason,'unknown-weather-suppression-field');
  }
});

test('screens, spread and Helping Hand retain exact Doubles rounding and directional count ownership',()=>{
  let state=screen(alexasState('Doubles'),'enemy',{lightScreen:true});
  state=patch(state,'player',{helpingHand:true});
  // Surf: subtotal40 -> screen26 -> spread13 -> +2=15 -> HH22 -> STAB33 -> Rock66.
  for(const entry of calc(state,'Surf').evaluations)for(const branch of branches(entry))assert.deepEqual([branch.result.min,branch.result.max],[56,66]);
  state={...state,matchupConditions:{...state.matchupConditions,enemy:{...state.matchupConditions.enemy,1:{currentHp:0}}}};
  // subtotal40 -> screen20 -> +2=22 -> HH33 -> STAB49 -> Rock98.
  for(const entry of calc(state,'Surf').evaluations)for(const branch of branches(entry))assert.deepEqual([branch.result.min,branch.result.max],[83,98]);
  const reverse=calc(screen(observe(state,0,'Earthquake'),'player',{reflect:true}),'Earthquake',{direction:'enemy'});
  for(const entry of reverse.evaluations)assert.equal(entry.battleContext.defenderSideAlive,1,'only one player slot is populated');
});

test('critical, status, stages, screens and Helping Hand project on both owned slots',()=>{
  let state=observe(alexasState('Doubles'),0,'Earthquake');
  state=patch(state,'enemy',{status:'burn',stages:{attack:2},helpingHand:true});
  state=patch(state,'player',{status:'poison',stages:{defense:1},helpingHand:false});
  state=screen(state,'player',{reflect:true});state={...state,field:{...state.field,critical:true}};
  for(const entry of calc(state,'Earthquake',{direction:'enemy'}).evaluations) {
    assert.equal(entry.critical,true);assert.equal(entry.attacker.status,'burn');assert.equal(entry.defender.status,'poison');
    assert.deepEqual(entry.attacker.stages,{attack:2});assert.deepEqual(entry.defender.stages,{defense:1});
    assert.equal(entry.attacker.helpingHand,true);assert.deepEqual(entry.defender.screens,{reflect:true});
    for(const branch of branches(entry))assert.deepEqual(branch.result,calculateCoreDamage(battleMove('Earthquake'),
      {...entry.attacker,ability:branch.attackerAbility},{...entry.defender,ability:branch.defenderAbility},'none',true,entry.battleContext));
  }
});

test('conditional selection retains full per-ability results and selected metadata',()=>{
  const result=calc(alexasState(),'Magnitude',{selection:'magnitude-10'});
  for(const entry of result.evaluations) {
    assert.equal(entry.condition.id,'magnitude-10');assert.equal(entry.abilityDamage.conditions.length,1);
    assert.equal(entry.abilityDamage.conditions[0].power,150);
    for(const branch of branches(entry)) {
      assert.equal(branch.result.kind,'standard-damage');assert.equal(branch.moveMetadata.power,150);
      assert.deepEqual(branch.result.rolls,Array(16).fill(0));
    }
  }
  const curled=calc(alexasState(),'Rollout',{selection:'stage-3',defenseCurl:true});
  assert.ok(curled.evaluations.every(entry=>entry.condition.id==='stage-3-curl'&&entry.condition.power===240));
});

test('multi-hit selections retain complete distributions and hit assumptions',()=>{
  for(const [name,selection,count] of [['DoubleSlap','5',5],['Triple Kick','2',2],['Double Kick',undefined,2]]) {
    for(const entry of calc(alexasState(),name,{selection}).evaluations)for(const branch of branches(entry)) {
      assert.equal(branch.result.kind,'aggregate-damage');assert.equal(branch.result.hitCount,count);
      assert.ok(branch.result.distribution.length>0);assert.ok(branch.result.totalOutcomes>0);
    }
  }
});

test('canonical dynamic move inputs preserve Hidden Power IVs, Return/Frustration friendship and HP power',()=>{
  for(const [name,power] of [['Hidden Power',70],['Return',102],['Frustration',1]]) {
    const player={...swampert,ivs:{hp:31,attack:31,defense:31,spAttack:31,spDefense:31,speed:31},friendship:255};
    for(const entry of calc(alexasState(),name,{},player).evaluations)for(const branch of branches(entry)) {
      assert.equal(branch.moveMetadata.power,power);assert.ok(branch.result.rolls);
      if(name==='Hidden Power')assert.equal(branch.moveMetadata.type,'DARK');
    }
  }
  for(const entry of calc(patch(alexasState(),'player',{currentHp:90}),'Eruption').evaluations)
    for(const branch of branches(entry))assert.equal(branch.moveMetadata.power,75);
  const state=opponentState('Camerupt','Singles','Eruption');
  for(const entry of calc(state,'Eruption',{direction:'enemy'}).evaluations)
    for(const branch of branches(entry))assert.equal(branch.moveMetadata.power,150);
});

test('opponent friendship moves use their own canonical inputs',()=>{
  for(const [species,name,friendship] of [['Mightyena','Frustration',0],['Gyarados','Return',255]]) {
    const state=opponentState(species,'Singles',name);
    const result=calc(state,name,{direction:'enemy'});
    assert.ok(result.evaluations.length>0);
    for(const entry of result.evaluations) {
      assert.equal(entry.attacker.friendship,friendship);
      for(const branch of branches(entry)) {
        assert.ok(branch.result.rolls);
        assert.equal(branch.moveMetadata.power,102);
      }
    }
  }
});

test('canonical defensive held items stay attached to the corresponding candidate',()=>{
  const state=opponentState('Clamperl');
  const result=calc(state,'Ice Beam');
  assert.ok(result.evaluations.length>0);
  for(const entry of result.evaluations) {
    assert.equal(entry.defender.item,entry.sourceSet.item);
    assert.equal(entry.defender.stats.spDefense,entry.candidate.opponent.stats.spDefense);
    for(const branch of branches(entry))assert.deepEqual(branch.result,calculateCoreDamage(battleMove('Ice Beam'),
      {...entry.attacker,ability:branch.attackerAbility},{...entry.defender,ability:branch.defenderAbility},'none',false,entry.battleContext));
  }
});

test('projection follows the active slots rather than reading stale slot-zero conditions',()=>{
  let state=alexasState();
  state={...state,team:['other-player',swampert.identity],opponentSpecies:[260,142],
    matchupConditions:{player:{0:{currentHp:1,status:'burn',stages:{}},1:{currentHp:111,status:'poison',stages:{attack:1}}},
      enemy:{0:{currentHp:1,status:'freeze',stages:{}},1:{currentHp:120,status:'sleep',stages:{spDefense:1}}}}};
  for(const entry of calc(state,'Ice Beam').evaluations) {
    assert.equal(entry.attacker.currentHp,111);assert.equal(entry.attacker.status,'poison');
    assert.equal(entry.defender.currentHp,120);assert.equal(entry.defender.status,'sleep');
    assert.deepEqual(entry.defender.stages,{spDefense:1});
  }
});

test('selected canonical moves calculate without observations; absent moves are explicit input inconsistencies',()=>{
  for(const format of ['Singles','Doubles']) {
    const state=alexasState(format);
    for(const name of ['Earthquake','Ice Beam','Surf']) {
      const result=calc(state,name,{direction:'enemy'});
      assert.equal(result.evaluations.length,1);assert.equal(result.evaluations[0].setId,'Aerodactyl 1');
      assert.ok(result.evaluations.every(entry=>entry.reason==='opponent-move-input-inconsistency'&&entry.abilityDamage===null));
    }
    for(const [selected,name,setId] of [[state,'Aerial Ace','Aerodactyl 1'],
      [observe(state,'item','Choice Band'),'Earthquake','Aerodactyl 2']]) {
      const result=calc(selected,name,{direction:'enemy'});
      assert.equal(result.evaluations.length,1);assert.equal(result.evaluations[0].setId,setId);
      assert.equal(result.evaluations[0].availability,'available');
      assert.ok(branches(result.evaluations[0]).every(branch=>branch.result.rolls.length===16));
    }
  }
});

test('move mismatch after selected-source construction retains an explicit input inconsistency',()=>{
  for(const format of ['Singles','Doubles']) {
    const state=battleReducer(observe(alexasState(format),0,'Earthquake'),{type:'selectOpponentSet',setId:'Aerodactyl 4'});
    const set=towerSetById('Aerodactyl 4'),previous=set.moves;
    let constructed=false;
    const constructionMoves=[...previous];
    constructionMoves.map=function(callback) {
      const mapped=Array.prototype.map.call(this,callback);constructed=true;return mapped;
    };
    // Change membership after canonical moves are copied, not after a fragile read count.
    Object.defineProperty(set,'moves',{configurable:true,get:()=>constructed?['Bite','Fire Blast','Double Edge','Roar']:constructionMoves});
    try {
      const result=calc(state,'Earthquake',{direction:'enemy'});
      assert.equal(constructed,true);assert.equal(result.evaluations.length,1);
      const entry=result.evaluations[0];assert.equal(entry.setId,'Aerodactyl 4');assert.equal(entry.sourceSet,set);
      assert.equal(entry.constructionAvailability,'available');assert.equal(entry.constructionReason,null);
      assert.equal(entry.reason,'opponent-move-input-inconsistency');assert.equal(entry.abilityDamage,null);
    } finally {Object.defineProperty(set,'moves',{configurable:true,writable:true,enumerable:true,value:previous});}
  }
});

test('construction failures and zero candidates remain explicit without calculating a subset summary',()=>{
  for(const format of ['Singles','Doubles']) {
    const state={...alexasState(format),selectedTrainer:null},result=calc(state,'Ice Beam');
    assert.equal(result.evaluations.length,1);assert.equal(result.evaluations[0].setId,'Aerodactyl 1');
    assert.ok(result.evaluations.every(entry=>entry.constructionAvailability==='unavailable'
      &&entry.reason==='missing-trainer-ivs'&&entry.abilityDamage===null));
    const empty=calc({...alexasState(format),opponentSpecies:[]},'Ice Beam');
    assert.deepEqual(empty.evaluations,[]);assert.equal(empty.construction.reason,'no-matching-frontier-sets');
  }
});

test('each selected candidate retains its source and an invalid source cannot produce damage',()=>{
  for(const format of ['Singles','Doubles']) {
    const states=[1,2,3,4].map(index=>battleReducer(alexasState(format),{type:'selectOpponentSet',setId:`Aerodactyl ${index}`}));
    const set=towerSetById('Aerodactyl 4'),previous=set.item;
    try {
      set.item=null;
      const entries=states.map(state=>{
        const result=calc(state,'Ice Beam');assert.equal(result.evaluations.length,1);
        return result.evaluations[0];
      });
      assert.deepEqual(entries.map(entry=>entry.setId),[1,2,3,4].map(index=>`Aerodactyl ${index}`));
      assert.ok(entries.slice(0,3).every(entry=>entry.availability==='available'));
      const entry=entries[3];
      assert.equal(entry.sourceSet,set);assert.equal(entry.candidate.sourceSet,set);
      assert.equal(entry.availability,'unavailable');assert.equal(entry.reason,'missing-or-invalid-candidate-item');
      assert.equal(entry.constructionReason,entry.reason);assert.equal(entry.abilityDamage,null);
    } finally {set.item=previous;}
  }
});

test('a malformed uniquely eligible move list remains a construction failure in either direction',()=>{
  const state=observe(alexasState(),'item','Choice Band'),set=towerSetById('Aerodactyl 2'),previous=set.moves;
  try {
    set.moves=null;
    for(const direction of ['player','enemy']) {
      const result=calc(state,'Ice Beam',{direction});
      assert.equal(result.evaluations.length,1);
      assert.equal(result.evaluations[0].reason,'missing-or-invalid-candidate-moves');
      assert.equal(result.evaluations[0].abilityDamage,null);
    }
  } finally {set.moves=previous;}
});

test('invalid direction, missing player and invalid selected move retain all evaluation entries',()=>{
  for(const format of ['Singles','Doubles'])for(const [move,options,player,reason] of [
    [battleMove('Ice Beam'),{direction:'invalid'},swampert,'invalid-attack-direction'],
    [null,{},swampert,'invalid-selected-move'],[battleMove('Ice Beam'),{},null,'missing-active-matchup-pokemon']]) {
    const result=evaluateFrontierCandidates(alexasState(format),player,move,options);
    assert.equal(result.evaluations.length,1);assert.equal(result.evaluations[0].setId,'Aerodactyl 1');
    assert.equal(result.evaluations[0].reason,reason);assert.equal(result.evaluations[0].abilityDamage,null);
    assert.equal(result.evaluations[0].candidate,result.construction.candidates[0]);
  }
});

test('all raw scalar results remain identical to direct engine calls across formats and supported paths',()=>{
  for(const format of ['Singles','Doubles'])for(const name of ['Ice Beam','Surf','Earthquake','Psywave','Dragon Rage','DoubleSlap','Triple Kick','Fissure','Explosion']) {
    const result=calc(alexasState(format),name,{selection:'3'});
    for(const entry of result.evaluations)for(const branch of branches(entry)) {
      assert.deepEqual(branch.result,calculateCoreDamage(battleMove(name),
        {...entry.attacker,ability:branch.attackerAbility},{...entry.defender,ability:branch.defenderAbility},
        entry.weather,entry.critical,entry.battleContext),`${format} ${name} ${entry.setId}`);
    }
  }
});

test('evaluation does not mutate state, source records, player data or candidate construction',()=>{
  const state=patch(alexasState(),'enemy',{currentHp:120,stages:{spDefense:1}});
  const before=structuredClone({state,player:swampert,sets:possibleMatchupSets(state)});
  const construction=frontierMatchupCandidates(state);
  const result=calc(state,'Ice Beam');
  assert.deepEqual({state,player:swampert,sets:possibleMatchupSets(state)},before);
  assert.deepEqual(frontierMatchupCandidates(state),construction);
  assert.deepEqual(calc(state,'Ice Beam'),result);
});
