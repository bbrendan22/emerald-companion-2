import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregateFrontierDamage} from '../src/battle/frontierDamageAggregation.js';
import {evaluateFrontierCandidates} from '../src/battle/frontierCandidateDamage.js';
import {battleMove} from '../src/battle/reference.js';
import {alexasState,swampert} from './fixtures/alexasAerodactyl.js';

const roll=(low,high,count=8)=>({kind:'standard-damage',rolls:[...Array(count).fill(low),...Array(16-count).fill(high)],min:low,max:high});
const scenario=result=>({availability:'available',result,attackerAbility:'Torrent',defenderAbility:'Pressure'});
function fixture(specs) {
  const candidates=specs.map((_,i)=>({setId:`set-${i}`,availability:'available'}));
  const move=battleMove('Ice Beam');
  return {construction:{candidates},move,evaluations:specs.map((spec,i)=>({
    candidate:candidates[i],setId:candidates[i].setId,move,availability:'available',constructionAvailability:'available',
    defenderMaximumHp:spec.max??spec.hp,defender:{currentHp:spec.hp},
    abilityDamage:{scenarios:spec.scenarios??[scenario(spec.result)]},
  }))};
}
const bounds=summary=>summary.ko.chances.map(({min,max})=>[min.probability,max.probability]);

test('different candidate distributions produce bounds, never averages or endpoint-derived odds',()=>{
  const input=fixture([{hp:100,result:roll(40,60)},{hp:100,result:roll(50,50)}]);
  const before=structuredClone(input),summary=aggregateFrontierDamage(input);
  assert.deepEqual(bounds(summary),[[0,0],[0.75,1],[1,1]]);
  assert.deepEqual(summary.ko.chances[1].min,{attacks:2,numerator:192n,denominator:256n,probability:0.75});
  assert.equal(summary.branches[0].result,input.evaluations[0].abilityDamage.scenarios[0].result);
  assert.deepEqual(input,before);
  const sameEndpoints=aggregateFrontierDamage(fixture([
    {hp:100,result:roll(40,60,8)},{hp:100,result:roll(40,60,15)},
  ]));
  assert.deepEqual(bounds(sameEndpoints)[1],[31/256,0.75]);
});

test('each candidate uses its own current HP, including reverse direction',()=>{
  const summary=aggregateFrontierDamage(fixture([
    {hp:80,max:200,result:roll(40,40)}, {hp:100,max:100,result:roll(40,40)},
  ]));
  assert.deepEqual(bounds(summary),[[0,0],[0,1],[1,1]]);
  assert.deepEqual(summary.branches.map(branch=>branch.defenderCurrentHp),[80,100]);
  const input=evaluateFrontierCandidates(alexasState(),swampert,battleMove('Ice Beam'));
  const actual=aggregateFrontierDamage(input);
  assert.equal(actual.ko.availability,'available');
  assert.ok(actual.branches.every(branch=>branch.defenderCurrentHp===branch.evaluation.defender.currentHp));
  // Incoming attacks must use the player defender, not the opponent candidate HP.
  input.evaluations.forEach(entry=>{entry.direction='enemy';entry.defender={currentHp:1};});
  assert.deepEqual(bounds(aggregateFrontierDamage(input)),[[1,1],[1,1],[1,1]]);
});

test('ability and conditional leaves all contribute, with exact zero and guaranteed outcomes',()=>{
  const input=fixture([{hp:100,scenarios:[scenario(roll(50,50)),scenario(roll(0,0))]}]);
  assert.deepEqual(bounds(aggregateFrontierDamage(input)),[[0,0],[0,1],[0,1]]);
  input.evaluations[0].abilityDamage={conditions:[
    {id:'a',abilityDamage:{scenarios:[scenario(roll(34,34))]}},
    {id:'b',abilityDamage:{scenarios:[scenario(roll(40,40))]}},
  ]};
  const summary=aggregateFrontierDamage(input);
  assert.deepEqual(bounds(summary),[[0,0],[0,0],[1,1]]);
  assert.deepEqual(summary.branches.map(branch=>branch.condition.id),['a','b']);
});

test('unavailable branches, invalid HP and missing coverage suppress the whole KO range',()=>{
  for(const second of [
    {availability:'unavailable',reason:'unresolved-trace',result:null},
    scenario({kind:'deterministic-damage',outcome:'blocked',damage:0,reason:'soundproof'}),
    scenario({kind:'ohko',outcome:'ohko',reason:null}),
  ]) {
    const summary=aggregateFrontierDamage(fixture([{hp:100,scenarios:[scenario(roll(50,50)),second]}]));
    assert.equal(summary.ko.availability,'unavailable');
    assert.equal(summary.ko.chances,null);
    assert.equal(summary.branches[0].ko.availability,'available');
    assert.equal(summary.branches[1].ko.availability,'unavailable');
  }
  for(const hp of [0,null,undefined,101]) {
    const summary=aggregateFrontierDamage(fixture([{hp,max:100,result:roll(50,50)}]));
    assert.ok(summary.ko.reasons.includes('invalid-current-hp'));
  }
  const input=fixture([{hp:100,result:roll(50,50)},{hp:100,result:roll(50,50)}]);
  input.evaluations.pop();
  assert.ok(aggregateFrontierDamage(input).ko.reasons.includes('invalid-evaluation-coverage'));
  assert.equal(aggregateFrontierDamage(fixture([])).ko.availability,'unavailable');
});

test('fixed damage uses move provenance while HP-dependent moves remain unavailable',()=>{
  const input=fixture([{hp:100,result:{kind:'deterministic-damage',outcome:'damage',damage:50}}]);
  input.evaluations[0].move=battleMove('Seismic Toss');
  assert.deepEqual(bounds(aggregateFrontierDamage(input)),[[0,0],[1,1],[1,1]]);
  input.evaluations[0].move=battleMove('Super Fang');
  assert.equal(aggregateFrontierDamage(input).ko.availability,'unavailable');
});

test('manually selected critical results pass through without adding critical odds',()=>{
  const state=alexasState();state.field.critical=true;
  const input=evaluateFrontierCandidates(state,swampert,battleMove('Ice Beam'));
  const summary=aggregateFrontierDamage(input);
  assert.equal(summary.ko.availability,'available');
  assert.ok(summary.branches.every(branch=>branch.evaluation.critical===true));
  for(const branch of summary.branches) {
    const successes=branch.result.rolls.filter(damage=>damage>=branch.defenderCurrentHp).length;
    assert.equal(branch.ko.chances[0].numerator,BigInt(successes));
    assert.equal(branch.ko.chances[0].denominator,16n);
  }
});

test('Frontier False Swipe keeps numerical damage and explicitly excludes every KO branch',()=>{
 const state=alexasState();state.matchupConditions.enemy[0]={currentHp:20,status:'none',stages:{}};
 const input=evaluateFrontierCandidates(state,swampert,battleMove('False Swipe'));
 const before=structuredClone(input),summary=aggregateFrontierDamage(input);
 assert.deepEqual(summary.hp,{min:9,max:11});
 assert.equal(summary.availability,'available');
 assert.equal(summary.ko.availability,'unavailable');
 assert.deepEqual(summary.ko.reasons,['false-swipe-cannot-ko']);
 assert.equal(summary.ko.chances,null);
 assert.ok(summary.branches.every(branch=>branch.ko.reason==='false-swipe-cannot-ko'));
 assert.deepEqual(input,before);
});
