import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregateFrontierDamage} from '../src/battle/frontierDamageAggregation.js';
import {evaluateFrontierCandidates} from '../src/battle/frontierCandidateDamage.js';
import {battleReducer} from '../src/battle/battleState.js';
import {towerSetById} from '../src/battle/towerSets.js';
import {battleMove} from '../src/battle/reference.js';
import {alexasState,swampert,observe} from './fixtures/alexasAerodactyl.js';

const evaluate=(name,state=alexasState(),options={},player=swampert)=>evaluateFrontierCandidates(state,player,battleMove(name),options);
const choose=(state,setId)=>battleReducer(state,{type:'selectOpponentSet',setId});
const standard=(min,max,extra={})=>({kind:'standard-damage',min,max,
  rolls:Array.from({length:16},(_,index)=>Math.floor(min+(max-min)*index/15)),effectiveness:1,...extra});
// Synthetic branches are independent of selected-Set evaluation cardinality.
// Clone one valid entry per specification and assign explicit source provenance.
function fixture(specs) {
  const original=evaluate('Ice Beam');
  const evaluations=specs.map((spec,index)=>{
    const entry=structuredClone(original.evaluations[0]);
    const setId=`Aerodactyl ${index+1}`,sourceSet=towerSetById(setId),hp=spec.hp??100;
    const opponent={...entry.opponent,setId,stats:{...entry.opponent.stats,hp},maximumHp:hp,currentHp:hp};
    const candidate={...entry.candidate,setId,sourceSet,opponent};
    const scenarios=spec.scenarios??[{...entry.abilityDamage.scenarios[0],
      availability:spec.availability??'available',reason:spec.reason??null,
      result:spec.result??standard(spec.min??10,spec.max??20),
      moveMetadata:Object.hasOwn(spec,'metadata')?spec.metadata:{type:'ICE',power:95}}];
    return {...entry,candidate,setId,sourceSet,opponent,defender:opponent,
      candidateMaximumHp:hp,defenderMaximumHp:hp,abilityDamage:{scenarios},...spec.entry};
  });
  return {...original,construction:{...original.construction,candidates:evaluations.map(entry=>entry.candidate)},evaluations};
}

for(const format of ['Singles','Doubles']) {
  test(`${format}: ALEXAS Ice Beam aggregates the selected Set's HP and percentages with provenance`,()=>{
    for(const [setId,hp,item,attack,spAttack] of [
      ['Aerodactyl 1',176,'Kings Rock',160,72],['Aerodactyl 2',176,'Choice Band',160,72],
      ['Aerodactyl 3',155,'Kings Rock',157,112],['Aerodactyl 4',155,'Kings Rock',157,112],
    ]) {
      const input=evaluate('Ice Beam',choose(alexasState(format),setId)),summary=aggregateFrontierDamage(input);
      assert.equal(summary.availability,'available');assert.equal(summary.kind,'damage-envelope');assert.equal(summary.reason,null);
      // Lv47 factor20: subtotal40,+2=42,Ice×2=84. Rolls floor84*r/100 (r85..100).
      assert.deepEqual(summary.hp,{min:71,max:84});assert.deepEqual(summary.percentage,{min:7100/hp,max:8400/hp});
      assert.equal(summary.candidateCount,1);assert.equal(summary.branches.length,2);assert.deepEqual(summary.setIds,[setId]);
      assert.equal(summary.groups.length,1);assert.equal(summary.groups[0].contributors.length,2);
      assert.equal(summary.evaluation,input);
      const entry=input.evaluations[0];
      assert.equal(entry.sourceSet,towerSetById(setId));assert.equal(entry.opponent.item,item);
      assert.deepEqual(entry.opponent.stats,{hp,attack,defense:85,spAttack,spDefense:95,speed:hp===176?171:150});
      for(const branch of summary.branches) {
        assert.equal(branch.candidate,entry.candidate);assert.equal(branch.evaluation,entry);
        assert.equal(branch.result,branch.scenario.result);assert.equal(branch.result.rolls,branch.scenario.result.rolls);
        assert.deepEqual(branch.result.rolls,Array.from({length:16},(_,i)=>Math.floor(84*(85+i)/100)));
        assert.equal(branch.defenderMaximumHp,hp);assert.equal(branch.defenderCurrentHp,hp);
        assert.equal(branch.scenario.defenderAbility==='Pressure'||branch.scenario.defenderAbility==='Rock Head',true);
      }
      // Two hits cannot reach176 HP; exactly128/256 roll pairs reach155 HP. Three hits always KO.
      assert.equal(summary.ko.availability,'available');
      assert.deepEqual(summary.ko.chances.map(({min,max})=>[min.probability,max.probability]),hp===176?[[0,0],[0,0],[1,1]]:[[0,0],[0.5,0.5],[1,1]]);
      if(hp===155)assert.deepEqual(summary.ko.chances[1].min,{attacks:2,numerator:128n,denominator:256n,probability:0.5});
    }
  });
  test(`${format}: Surf and Earthquake preserve format-specific damage and certain immunity`,()=>{
    for(const [setId,hp] of [['Aerodactyl 1',176],['Aerodactyl 3',155]]) {
      const state=choose(alexasState(format),setId),surf=aggregateFrontierDamage(evaluate('Surf',state));
      // Singles40+2=42,STAB63,Rock×2=126. Doubles40/2+2=22,STAB33,×2=66.
      const [min,max]=format==='Singles'?[107,126]:[56,66];
      assert.deepEqual(surf.setIds,[setId]);assert.deepEqual(surf.hp,{min,max});
      assert.deepEqual(surf.percentage,{min:100*min/hp,max:100*max/hp});
      const ground=aggregateFrontierDamage(evaluate('Earthquake',state));
      assert.deepEqual(ground.setIds,[setId]);assert.deepEqual(ground.hp,{min:0,max:0});assert.deepEqual(ground.percentage,{min:0,max:0});
      assert.deepEqual(ground.categories,['immune']);assert.ok(ground.notes.includes('all-possibilities-prevent-damage'));
    }
  });
  test(`${format}: reverse Earthquake retains only the selected Set's correlated item and stats`,()=>{
    const base=observe(alexasState(format),0,'Earthquake');
    for(const [setId,min,max,item,attack] of [['Aerodactyl 2',90,107,'Choice Band',160],['Aerodactyl 4',60,71,'Kings Rock',157]]) {
      const input=evaluate('Earthquake',choose(base,setId),{direction:'enemy'}),summary=aggregateFrontierDamage(input);
      assert.deepEqual(summary.setIds,[setId]);assert.equal(summary.candidateCount,1);
      assert.deepEqual(summary.hp,{min,max});assert.deepEqual(summary.percentage,{min:100*min/180,max:100*max/180});
      assert.equal(summary.groups.length,1);assert.equal(summary.groups[0].contributors.length,2);
      assert.ok(summary.branches.every(branch=>branch.defenderMaximumHp===180));
      assert.equal(input.evaluations[0].attacker.item,item);assert.equal(input.evaluations[0].attacker.stats.attack,attack);
    }
  });
}

test('one complete candidate preserves scalar bounds and ability contributors',()=>{
  const summary=aggregateFrontierDamage(evaluate('Ice Beam',observe(alexasState(),'item','Choice Band')));
  assert.equal(summary.candidateCount,1);assert.equal(summary.groups.length,1);
  assert.equal(summary.groups[0].contributors.length,2);assert.deepEqual(summary.hp,{min:71,max:84});
  assert.deepEqual(summary.percentage,{min:7100/176,max:8400/176});
});

test('zero matching candidates returns no numerical bounds or fallback',()=>{
  const summary=aggregateFrontierDamage(evaluate('Ice Beam',{...alexasState(),opponentSpecies:[]}));
  assert.equal(summary.availability,'unavailable');assert.equal(summary.kind,'no-candidates');
  assert.equal(summary.reason,'no-matching-frontier-sets');assert.equal(summary.candidateCount,0);
  assert.deepEqual(summary.setIds,[]);assert.equal(summary.hp,null);assert.equal(summary.percentage,null);
});

test('correlated denominators prevent impossible extrema combinations',()=>{
  const summary=aggregateFrontierDamage(fixture([{min:10,max:10,hp:20},{min:80,max:80,hp:200}]));
  assert.deepEqual(summary.hp,{min:10,max:80});assert.deepEqual(summary.percentage,{min:40,max:50});
  assert.notEqual(summary.percentage.min,100*summary.hp.min/200);
  assert.notEqual(summary.percentage.max,100*summary.hp.max/20);
  assert.equal(summary.candidateCount,2);
  assert.notEqual(summary.branches[0].candidate,summary.branches[1].candidate);
  assert.notEqual(summary.branches[0].evaluation.defender,summary.branches[1].evaluation.defender);
  assert.deepEqual(summary.branches.map(branch=>branch.defenderCurrentHp),[20,200]);
  assert.equal(summary.ko.availability,'available');
  assert.deepEqual(summary.ko.chances.map(({min,max})=>[min.probability,max.probability]),[[0,0],[0,1],[1,1]]);
});

test('percentages retain full precision; final one-decimal rounding matches the existing convention',()=>{
  const summary=aggregateFrontierDamage(fixture([{min:1,max:2,hp:3},{min:2,max:3,hp:7}]));
  assert.equal(summary.percentage.min,200/7);assert.equal(summary.percentage.max,200/3);
  assert.equal(summary.percentage.min.toFixed(1),'28.6');assert.equal(summary.percentage.max.toFixed(1),'66.7');
  const actual=aggregateFrontierDamage(evaluate('Ice Beam'));
  assert.equal(actual.percentage.min.toFixed(1),'40.3');assert.equal(actual.percentage.max.toFixed(1),'47.7');
  assert.equal(Object.hasOwn(actual,'rolls'),false);assert.equal(Object.hasOwn(actual,'distribution'),false);
});

test('equivalent full outcomes collapse while preserving all set/ability contributors',()=>{
  const summary=aggregateFrontierDamage(fixture([{hp:100},{hp:100}]));
  assert.equal(summary.groups.length,1);assert.equal(summary.groups[0].contributors.length,2);
  assert.deepEqual(summary.groups[0].setIds,['Aerodactyl 1','Aerodactyl 2']);
});

test('equal damage ranges with different denominators are separate outcomes',()=>{
  const summary=aggregateFrontierDamage(fixture([{hp:100},{hp:200}]));
  assert.equal(summary.groups.length,2);assert.deepEqual(summary.percentage,{min:5,max:20});
});

test('same endpoints with different roll distributions never collapse',()=>{
  const a=standard(10,20),b={...a,rolls:[10,...Array(14).fill(10),20]};
  const summary=aggregateFrontierDamage(fixture([{result:a},{result:b}]));
  assert.equal(summary.groups.length,2);assert.deepEqual(summary.hp,{min:10,max:20});
});

test('equivalent final distributions collapse even when intermediate base arithmetic differs',()=>{
  const summary=aggregateFrontierDamage(fixture([
    {result:standard(10,20,{base:30})},{result:standard(10,20,{base:31})},
  ]));
  assert.equal(summary.groups.length,1);assert.equal(summary.groups[0].contributors.length,2);
  assert.deepEqual(summary.groups[0].contributors.map(branch=>branch.result.base),[30,31]);
});

test('outcome reasons, metadata and conditional assumptions participate in equivalence',()=>{
  for(const [a,b] of [
    [{metadata:{type:'ICE',power:95}},{metadata:{type:'FIRE',power:95}}],
    [{result:standard(10,20,{reason:'a'})},{result:standard(10,20,{reason:'b'})}],
    [{entry:{hitCount:2}},{entry:{hitCount:3}}],
  ])assert.equal(aggregateFrontierDamage(fixture([a,b])).groups.length,2);
});

test('mixed damage and explicit prevention includes zero with an explanatory note',()=>{
  const blocked={kind:'deterministic-damage',outcome:'blocked',damage:0,reason:'soundproof'};
  const summary=aggregateFrontierDamage(fixture([{min:20,max:30},{result:blocked,availability:'blocked',reason:'soundproof'}]));
  assert.equal(summary.availability,'available');assert.deepEqual(summary.hp,{min:0,max:30});
  assert.deepEqual(summary.percentage,{min:0,max:30});assert.ok(summary.categories.includes('prevented'));
  assert.ok(summary.notes.includes('some-possibilities-prevent-damage'));assert.ok(summary.reasons.includes('soundproof'));
});

test('all prevented or immune outcomes retain zero envelopes and distinct explanations',()=>{
  const summary=aggregateFrontierDamage(fixture([
    {result:standard(0,0,{effectiveness:0})},
    {result:{kind:'deterministic-damage',outcome:'blocked',damage:0,reason:'damp'},availability:'blocked',reason:'damp'},
  ]));
  assert.equal(summary.availability,'available');assert.deepEqual(summary.hp,{min:0,max:0});
  assert.deepEqual(summary.categories,['immune','prevented']);assert.equal(summary.groups.length,2);
  assert.ok(summary.notes.includes('all-possibilities-prevent-damage'));
});

test('legitimate zero rolls are numerical damage and do not become immunity',()=>{
  const input=evaluate('Psywave',alexasState(),{}, {...swampert,level:1});
  const summary=aggregateFrontierDamage(input);
  assert.equal(summary.availability,'available');assert.deepEqual(summary.hp,{min:0,max:1});
  assert.deepEqual(summary.categories,['damage']);assert.ok(summary.notes.includes('eleven-level-based-rolls'));
  assert.equal(summary.notes.includes('all-possibilities-prevent-damage'),false);
});

test('failed deterministic moves stay distinct from immunity',()=>{
  const summary=aggregateFrontierDamage(fixture([{result:{kind:'deterministic-damage',outcome:'failed',damage:0,reason:'hp-not-lower'},availability:'failed'}]));
  assert.deepEqual(summary.categories,['failed']);assert.ok(summary.notes.includes('move-fails'));
  assert.deepEqual(summary.hp,{min:0,max:0});
});

test('any unavailable ability branch suppresses the overall envelope while retaining complete leaves',()=>{
  const player={...swampert,name:'Gardevoir',dex:282,ability:'Trace',
    abilityOptions:{status:'uncertain',source:'species',values:['Trace','Synchronize']}};
  const summary=aggregateFrontierDamage(evaluate('Ice Beam',alexasState(),{},player));
  assert.equal(summary.availability,'unavailable');assert.equal(summary.kind,'incomplete');
  assert.equal(summary.hp,null);assert.equal(summary.percentage,null);assert.ok(summary.reasons.includes('unresolved-trace'));
  assert.ok(summary.branches.some(branch=>branch.availability==='available'));
  assert.ok(summary.branches.some(branch=>branch.availability==='unavailable'));
});

test('Doubles unseen-field safeguards remain unavailable rather than contributing zero',()=>{
  const state=alexasState('Doubles');state.field.weather='rain';
  const summary=aggregateFrontierDamage(evaluate('Surf',state));
  assert.equal(summary.hp,null);assert.ok(summary.reasons.includes('unknown-weather-suppression-field'));
  assert.ok(summary.branches.every(branch=>branch.min===null));
});

test('invalid selected construction and HP retain identity and suppress incomplete summaries',()=>{
  for(const format of ['Singles','Doubles']) {
    const missing=aggregateFrontierDamage(evaluate('Ice Beam',{...choose(alexasState(format),'Aerodactyl 4'),selectedTrainer:null}));
    assert.equal(missing.candidateCount,1);assert.deepEqual(missing.setIds,['Aerodactyl 4']);
    assert.equal(missing.hp,null);assert.equal(missing.percentage,null);assert.ok(missing.reasons.includes('missing-trainer-ivs'));
    const valid=alexasState(format);valid.matchupConditions.enemy[0]={currentHp:160,status:'none',stages:{}};
    assert.equal(aggregateFrontierDamage(evaluate('Ice Beam',valid)).availability,'available','160 HP is valid for selected Set 1');
    const state=choose(alexasState(format),'Aerodactyl 3');
    // Inject after selection so reducer HP clamping cannot repair the malformed input.
    state.matchupConditions.enemy[0]={currentHp:160,status:'none',stages:{}};
    const invalid=aggregateFrontierDamage(evaluate('Ice Beam',state));
    assert.equal(invalid.candidateCount,1);assert.deepEqual(invalid.setIds,['Aerodactyl 3']);
    assert.equal(invalid.hp,null);assert.equal(invalid.percentage,null);assert.ok(invalid.reasons.includes('invalid-condition-current-hp'));
    assert.equal(invalid.branches.filter(branch=>branch.availability==='available').length,0);
    assert.equal(invalid.ko.availability,'unavailable');assert.equal(invalid.ko.chances,null);
    const selected=choose(alexasState(format),'Aerodactyl 4'),set=towerSetById('Aerodactyl 4'),previous=set.item;
    try {
      set.item=null;
      const corrupt=aggregateFrontierDamage(evaluate('Ice Beam',selected));
      assert.equal(corrupt.candidateCount,1);assert.deepEqual(corrupt.setIds,['Aerodactyl 4']);
      assert.ok(corrupt.reasons.includes('missing-or-invalid-candidate-item'));
      assert.equal(corrupt.hp,null);assert.equal(corrupt.percentage,null);assert.equal(corrupt.ko.chances,null);
    } finally {set.item=previous;}
  }
  // Preserve the multi-source safeguard with independent synthetic evaluations.
  const mixed=aggregateFrontierDamage(fixture([{hp:176},{hp:155,entry:{availability:'unavailable',
    reason:'invalid-condition-current-hp',abilityDamage:null,defender:{currentHp:160}}}]));
  assert.equal(mixed.candidateCount,2);assert.equal(mixed.branches.filter(branch=>branch.availability==='available').length,1);
  assert.ok(mixed.reasons.includes('invalid-condition-current-hp'));assert.equal(mixed.hp,null);assert.equal(mixed.percentage,null);
  assert.equal(mixed.ko.availability,'unavailable');assert.equal(mixed.ko.chances,null);
});

test('unsupported and status moves preserve policy without fabricated damage',()=>{
  for(const format of ['Singles','Doubles'])for(const [name,kind,reason] of [['Counter','unsupported','unsupported-move'],['Roar','status','status-move-no-damage']]) {
    const summary=aggregateFrontierDamage(evaluate(name,choose(alexasState(format),'Aerodactyl 4')));
    assert.equal(summary.kind,kind);assert.equal(summary.reason,reason);assert.equal(summary.availability,'unavailable');
    assert.equal(summary.hp,null);assert.equal(summary.percentage,null);assert.equal(summary.candidateCount,1);assert.deepEqual(summary.setIds,['Aerodactyl 4']);
  }
});

test('OHKO outcomes stay categorical, including mixed success and immunity',()=>{
  const summary=aggregateFrontierDamage(evaluate('Guillotine',alexasState(),{}, {...swampert,level:50}));
  assert.equal(summary.kind,'categorical-ohko');assert.equal(summary.availability,'available');
  assert.equal(summary.hp,null);assert.equal(summary.percentage,null);assert.deepEqual(summary.categories,['ohko-ohko']);
  const mixed=aggregateFrontierDamage(fixture([
    {result:{kind:'ohko',outcome:'ohko',reason:null},availability:'ohko'},
    {result:{kind:'ohko',outcome:'immune',reason:'sturdy'},availability:'immune',reason:'sturdy'},
  ]));
  assert.equal(mixed.kind,'categorical-ohko');assert.deepEqual(mixed.categories,['ohko-ohko','ohko-immune']);
  assert.ok(mixed.reasons.includes('sturdy'));assert.equal(mixed.hp,null);assert.equal(Object.hasOwn(mixed,'probability'),false);
});

test('dynamic metadata retains Hidden Power, Return, Frustration and HP-dependent power',()=>{
  const player={...swampert,ivs:{hp:31,attack:31,defense:31,spAttack:31,spDefense:31,speed:31},friendship:255};
  for(const [name,type,power] of [['Hidden Power','DARK',70],['Return','NORMAL',102],['Frustration','NORMAL',1],['Eruption','FIRE',150]]) {
    const summary=aggregateFrontierDamage(evaluate(name,alexasState(),{},player));
    assert.equal(summary.metadata.status,'known');assert.equal(summary.metadata.type,type);assert.equal(summary.metadata.power,power);
  }
});

test('Weather Ball metadata preserves disagreement and unknown field metadata independently of bounds',()=>{
  const state=alexasState();state.field.weather='sun';
  const player={...swampert,name:'Gardevoir',dex:282,ability:'Trace',
    abilityOptions:{status:'uncertain',source:'species',values:['Trace','Synchronize']}};
  state.matchupConditions.player[0]={currentHp:null,status:'none',stages:{},abilityState:{context:'Synchronize|Trace',copiedAbility:'Cloud Nine',flashFireActivated:false}};
  const varying=aggregateFrontierDamage(evaluate('Weather Ball',state,{},player));
  assert.equal(varying.metadata.status,'varying');assert.equal(varying.metadata.type,null);assert.equal(varying.metadata.power,null);
  assert.equal(varying.metadata.alternatives.length,2);assert.equal(varying.availability,'available');
  const doubles=alexasState('Doubles');doubles.field.weather='sun';
  const unknown=aggregateFrontierDamage(evaluate('Weather Ball',doubles));
  assert.equal(unknown.metadata.status,'unknown');assert.equal(unknown.metadata.type,null);
  assert.ok(unknown.metadata.alternatives.some(value=>value.value===null));
});

test('unknown metadata is retained and does not acquire a definite type/power from known branches',()=>{
  const summary=aggregateFrontierDamage(fixture([{metadata:null},{metadata:{type:'ICE',power:95}}]));
  assert.equal(summary.availability,'available');assert.equal(summary.metadata.status,'unknown');
  assert.equal(summary.metadata.type,null);assert.equal(summary.metadata.power,null);assert.equal(summary.metadata.alternatives.length,2);
});

test('conditional and multihit assumptions and distributions survive aggregation',()=>{
  const conditional=aggregateFrontierDamage(evaluate('Rollout',alexasState(),{selection:'stage-3',defenseCurl:true}));
  assert.ok(conditional.branches.every(branch=>branch.condition.id==='stage-3-curl'));
  assert.equal(conditional.metadata.power,240);
  const multi=aggregateFrontierDamage(evaluate('Triple Kick',alexasState(),{selection:'2'}));
  assert.equal(multi.availability,'available');assert.ok(multi.notes.includes('selected-hits-connected'));
  assert.ok(multi.branches.every(branch=>branch.result.distribution.length>0&&branch.result.hitCount===2));
});

test('invalid numerical results or missing denominators cannot produce a complete envelope',()=>{
  for(const spec of [{hp:null},{hp:'155–176'},{result:standard(10,20,{rolls:[10,20]})},{result:standard(10,20,{max:21})}]) {
    const input=fixture([spec]);
    if(Object.hasOwn(spec,'hp'))input.evaluations[0].defenderMaximumHp=spec.hp;
    const summary=aggregateFrontierDamage(input);
    assert.equal(summary.availability,'unavailable');assert.equal(summary.hp,null);assert.equal(summary.percentage,null);
  }
});

test('missing evaluation coverage is unavailable and never silently reduces candidate count',()=>{
  for(const input of [evaluate('Ice Beam',alexasState()),evaluate('Ice Beam',alexasState('Doubles')),fixture([{},{}])]) {
    const count=input.construction.candidates.length,setIds=input.construction.candidates.map(candidate=>candidate.setId);
    input.evaluations.pop();
    const summary=aggregateFrontierDamage(input);
    assert.equal(summary.candidateCount,count);assert.deepEqual(summary.setIds,setIds);
    assert.equal(summary.availability,'unavailable');assert.equal(summary.hp,null);assert.equal(summary.percentage,null);
    assert.ok(summary.reasons.includes('invalid-evaluation-coverage'));
    assert.equal(summary.ko.availability,'unavailable');assert.equal(summary.ko.chances,null);
  }
});

test('aggregation is read-only, retains original provenance and never creates a pooled distribution',()=>{
  const input=evaluate('Ice Beam'),before=structuredClone(input);
  function freeze(value,seen=new Set()) {
    if(!value||typeof value!=='object'||seen.has(value))return;
    seen.add(value);Object.values(value).forEach(child=>freeze(child,seen));Object.freeze(value);
  }
  // Freeze a clone so canonical source records shared by other tests stay writable.
  const frozen=structuredClone(input);freeze(frozen);
  const summary=aggregateFrontierDamage(frozen);
  assert.equal(summary.evaluation,frozen);assert.deepEqual(input,before);assert.deepEqual(frozen,before);
  assert.equal(summary.branches[0].evaluation,frozen.evaluations[0]);
  assert.equal(summary.branches[0].scenario,frozen.evaluations[0].abilityDamage.scenarios[0]);
  assert.equal(Object.hasOwn(summary,'distribution'),false);assert.equal(Object.hasOwn(summary,'rolls'),false);
});
