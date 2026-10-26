import test from 'node:test';
import assert from 'node:assert/strict';
import {pairMaxima,canonicalOperands,mechanicCases} from './fixtures/doublesNumericalCases.js';
import {battleMove,speciesByName} from '../src/battle/reference.js';
import {createBattleState,battleReducer as reduce} from '../src/battle/battleState.js';
import {evaluateFrontierCandidates} from '../src/battle/frontierCandidateDamage.js';
import {aggregateFrontierDamage} from '../src/battle/frontierDamageAggregation.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {calculateKoProbabilities} from '../src/battle/koProbability.js';
import {possibleMatchupSets,matchupObservations} from '../src/battle/towerSets.js';
import {slotConditions,livingBattlefieldCount} from '../src/battle/matchupConditions.js';
import {numericalPlayerData} from './fixtures/doublesNumericalCases.js';
const numericalPlayers=numericalPlayerData.map(mon=>({...mon,moves:['Surf','Rock Slide','Earthquake'].map(battleMove)}));
const view=(s,player,opponent)=>reduce(reduce(s,{type:'viewDoublesSlot',side:'player',slot:player}),{type:'viewDoublesSlot',side:'opponent',slot:opponent});
function setup() {
 let s=reduce(createBattleState(),{type:'rules',patch:{format:'Doubles'}});
 s=reduce(s,{type:'opponentTrainer',key:'Expert (M):ALEXAS'});
 for(const slot of [0,1]) {
  s=reduce(s,{type:'selectDoublesPlayer',slot,identity:numericalPlayers[slot].identity,pool:numericalPlayers});
  s=reduce(s,{type:'selectDoublesOpponent',slot,speciesId:speciesByName.get(slot===0?'aggron':'aerodactyl').internalSpeciesId});
  s=reduce(s,{type:'selectOpponentSet',slot,setId:slot===0?'Aggron 3':'Aerodactyl 4'});
 }
 return s;
}
const rolls=max=>Array.from({length:16},(_,index)=>Math.floor(max*(85+index)/100));
// Deliberately enumerate all 16^n outcomes independently, without production KO
// or convolution helpers. These expected counts come only from fixture rolls.
function koCounts(values,hp) {
 return [1,2,3].map(hits=>{
  let count=0;const visit=(depth,sum)=>{if(depth===hits){if(sum>=hp)count++;return;}for(const value of values)visit(depth+1,sum+value);};
  visit(0,0);return {numerator:BigInt(count),denominator:16n**BigInt(hits)};
 });
}
for(const pair of pairMaxima)for(const direction of ['player','enemy'])for(const [move,max] of Object.entries(direction==='player'?pair.attacks:pair.incoming)) {
 test(`canonical P${pair.player+1}/O${pair.opponent+1} ${direction} ${move}: exact 16 rolls and KO counts`,()=>{
  const s=view(setup(),pair.player,pair.opponent),before=structuredClone(s);
  const evaluated=evaluateFrontierCandidates(s,numericalPlayers[pair.player],battleMove(move),{direction,records:numericalPlayers});
  const entry=evaluated.evaluations[0],summary=aggregateFrontierDamage(evaluated),expected=rolls(max);
  assert.equal(evaluated.evaluations.length,1);assert.equal(entry.availability,'available');
  const canonical=canonicalOperands[entry.setId];assert.deepEqual(entry.opponent.stats,canonical.stats);assert.equal(entry.opponent.item,canonical.item);assert.equal(entry.opponent.nature,canonical.nature);
  assert.deepEqual(entry.opponent.moves.map(move=>move.name),canonical.moves);assert.ok(Object.values(entry.opponent.ivs).every(iv=>iv===31));
  assert.deepEqual(entry.opponent.abilityOptions.values,canonical.abilities);
  for(const scenario of entry.abilityDamage.scenarios)assert.deepEqual(scenario.result.rolls,expected,pair.note);
  assert.deepEqual(summary.hp,{min:expected[0],max});
  const hp=direction==='player'?canonical.stats.hp:numericalPlayers[pair.player].stats.hp;
  const counts=koCounts(expected,hp);assert.equal(summary.ko.availability,'available');
  for(const [i,chance] of summary.ko.chances.entries())for(const bound of ['min','max']) {
   assert.equal(chance[bound].numerator,counts[i].numerator);assert.equal(chance[bound].denominator,counts[i].denominator);
  }
  assert.deepEqual(s,before);
 });
}
const known=ability=>({status:'known',source:'fixture',values:[ability]});
const model=ability=>({name:ability,level:50,dex:143,types:['NORMAL'],ability,abilityOptions:known(ability),item:'None',currentHp:200,status:'none',stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100,speed:100}});
for(const fixture of mechanicCases)test(`full-field arithmetic ${fixture.id}: ${fixture.note}`,()=>{
 const a={...model(fixture.attackerAbility??'Immunity'),currentHp:fixture.attackerHp??200,status:fixture.status??'none',helpingHand:fixture.helpingHand??false,stages:{attack:fixture.attackStage??0,spAttack:fixture.attackStage??0}};
 const d={...model(fixture.defenderAbility??'Immunity'),currentHp:fixture.defenderHp??200,screens:fixture.screen?{[fixture.screen]:true}:{},stages:{defense:fixture.defenseStage??0,spDefense:fixture.defenseStage??0}};
 let ally=model('Immunity'),other={...model('Immunity'),currentHp:fixture.defenders===1?0:200};
 if(fixture.partnerAbility) {
  const partner={...model(fixture.partnerAbility),currentHp:fixture.partnerHp??200};
  if(fixture.partnerSide==='enemy')other=partner;else ally=partner;
 }
 if(fixture.redirected)other={...other,name:'Manectric',dex:310,types:['ELECTRIC']};
 const slot=pokemon=>pokemon?{pokemon,liveness:pokemon.currentHp===0?'fainted':'active'}:null;
 const ctx={format:'Doubles',defenderSideAlive:1+(!fixture.empty&&other.currentHp>0?1:0),battlefield:{player:[slot(a),slot(ally)],enemy:[slot(d),fixture.empty?null:slot(other)],viewed:{player:0,opponent:0},attacking:{side:'player',slot:0},defending:{side:'enemy',slot:0}}};
 const result=calculateAbilityScenarios(battleMove(fixture.move),a,d,{weather:fixture.weather??'none',critical:fixture.critical??false,battleContext:ctx});
 for(const scenario of result.scenarios) {
  if(fixture.blocked){assert.equal(scenario.result.outcome,'blocked');assert.equal(scenario.result.reason,fixture.blocked);continue;}
  assert.equal(scenario.availability,'available');assert.deepEqual(scenario.result.rolls,rolls(fixture.max),fixture.note);
  if(fixture.metadata)assert.deepEqual([scenario.moveMetadata.type,scenario.moveMetadata.power],fixture.metadata);
  if(fixture.redirected)assert.equal(scenario.target.name,'Manectric');
  const hp=scenario.target?.pokemon?.currentHp??d.currentHp;
  const actualKo=calculateKoProbabilities(scenario.result,hp,battleMove(fixture.move));
  const expected=koCounts(rolls(fixture.max),hp);
  assert.equal(actualKo.availability,'available');
  for(const [i,chance] of actualKo.chances.entries())assert.deepEqual([chance.numerator,chance.denominator],[expected[i].numerator,expected[i].denominator]);
 }
});

test('all views preserve four distinct conditions, selected sets and observations; replacement resets one slot',()=>{
 let s=setup();
 for(const slot of [0,1]) {
  s=view(s,slot,slot);
  for(const side of ['player','enemy'])for(const [field,value] of [['currentHp',40+slot*30],['status',slot?'sleep':'burn'],['stage',slot+1]])
   s=reduce(s,{type:'matchupCondition',side,slot,field,value,...(field==='stage'?{stat:'attack'}:{})});
  const set=possibleMatchupSets(s).find(set=>set.id===s.opponentSetSelections[slot]);
  s=reduce(s,{type:'observeOpponent',slot,speciesId:s.opponentSpecies[slot],field:0,value:set.moves[0]});
 }
 const before=s;
 for(const p of [0,1])for(const e of [0,1]) {
  s=view(s,p,e);assert.equal(s.matchupConditions,before.matchupConditions);assert.equal(s.opponentObservations,before.opponentObservations);assert.equal(s.opponentSetSelections,before.opponentSetSelections);
  assert.equal(slotConditions(s,'player',p).currentHp,40+p*30);assert.equal(matchupObservations(s).moves[0],before.opponentObservations[e].moves[0]);
  assert.equal(livingBattlefieldCount(s,'player'),2);assert.equal(livingBattlefieldCount(s,'enemy'),2);
 }
 const replacement={...numericalPlayers[1],identity:'replacement'};
 s=reduce(s,{type:'selectDoublesPlayer',slot:0,identity:replacement.identity,pool:[...numericalPlayers,replacement]});
 assert.equal(slotConditions(s,'player',0).currentHp,null);assert.equal(s.matchupConditions.player[1],before.matchupConditions.player[1]);assert.equal(s.matchupConditions.enemy,before.matchupConditions.enemy);
});
