import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMove} from '../src/battle/reference.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {aggregateFrontierDamage,frontierAbilityResults} from '../src/battle/frontierDamageAggregation.js';
import {evaluateFrontierCandidates} from '../src/battle/frontierCandidateDamage.js';
import {doublesBattlefieldContext} from '../src/battle/battlefieldContext.js';
import {matchupDisplayStats} from '../src/battle/matchupDisplayStats.js';
import {battleReducer as reduce} from '../src/battle/battleState.js';
import {analysisMatchupSets,possibleMatchupSets,frontierSetId} from '../src/battle/towerSets.js';
import {alexasState,swampert} from './fixtures/alexasAerodactyl.js';
const known=ability=>({status:'known',source:'test',values:[ability]});
const base={name:'Test',level:50,dex:143,types:['NORMAL'],ability:'Immunity',abilityOptions:known('Immunity'),item:'None',currentHp:200,status:'none',stats:{hp:200,attack:100,defense:100,spAttack:101,spDefense:100,speed:100}};
const mon=(ability,extra={})=>({...base,ability,abilityOptions:known(ability),...extra});
const slot=pokemon=>pokemon?{pokemon,liveness:pokemon.currentHp===0?'fainted':'active'}:null;
function context(partner=mon('Immunity'),other=mon('Immunity'),a=base,d=base) {
 return {format:'Doubles',defenderSideAlive:2,battlefield:{player:[slot(a),slot(partner)],enemy:[slot(d),slot(other)],viewed:{player:0,opponent:0},attacking:{side:'player',slot:0},defending:{side:'enemy',slot:0}}};
}
const calc=(name,ctx,a=base,d=base,weather='none')=>calculateCoreDamage(battleMove(name),a,d,weather,false,ctx);
const scenarios=(name,ctx,a=base,d=base,weather='none')=>calculateAbilityScenarios(battleMove(name),a,d,{weather,battleContext:ctx});

for(const ability of ['Cloud Nine','Air Lock'])for(const owner of ['player','enemy'])test(`${ability} on unviewed ${owner}: weather base, scripts, metadata and selected weather`,()=>{
 const holder=mon(ability),ctx=context(owner==='player'?holder:mon('Immunity'),owner==='enemy'?holder:mon('Immunity'));
 const before=structuredClone(ctx);
 assert.deepEqual(calc('Surf',ctx,base,base,'rain'),calc('Surf',ctx));
 assert.deepEqual(calc('Weather Ball',ctx,base,base,'rain'),calc('Weather Ball',ctx));
 const result=scenarios('Weather Ball',ctx,base,base,'rain');
 assert.ok(result.scenarios.every(s=>s.moveMetadata.type==='NORMAL'&&s.moveMetadata.power===50));
 assert.deepEqual(ctx,before);
});

test('fainted weather suppressors affect base damage but not Weather Ball/Forecast scripts',()=>{
 const ctx=context(mon('Cloud Nine',{currentHp:0}));
 assert.equal(calc('Surf',ctx,base,base,'rain').max,calc('Surf',ctx).max);
 assert.equal(calc('Weather Ball',ctx,base,base,'rain').max,48);
 assert.deepEqual(scenarios('Weather Ball',ctx,base,base,'rain').scenarios[0].moveMetadata,{type:'WATER',power:100});
 const cast=mon('Forecast',{dex:351});
 assert.equal(calc('Strength',context(mon('Cloud Nine',{currentHp:0}),mon('Immunity'),cast),cast,base,'sun').stab,1);
 assert.equal(calc('Strength',context(mon('Cloud Nine'),mon('Immunity'),cast),cast,base,'sun').stab,1.5);
});

test('Damp on either hidden side blocks Explosion/Selfdestruct, including retained fainted records and chart immunity',()=>{
 for(const owner of ['player','enemy'])for(const currentHp of [0,200])for(const name of ['Explosion','Self Destruct']) {
  const damp=mon('Damp',{currentHp}),ctx=context(owner==='player'?damp:mon('Immunity'),owner==='enemy'?damp:mon('Immunity'));
  const result=calc(name,ctx,base,mon('Levitate',{types:['GHOST']}));
  assert.equal(result.outcome,'blocked');assert.equal(result.reason,'damp');assert.equal(result.damage,0);
 }
 const clean=calc('Explosion',context());assert.equal(clean.kind,'standard-damage');assert.ok(clean.max>0);
});

test('Plus/Minus finds the opposite on either hidden side, including fainted records, before stages and screens',()=>{
 for(const own of ['Plus','Minus'])for(const owner of ['player','enemy'])for(const currentHp of [0,200]) {
  const a=mon(own,{item:'Mystic Water',stages:{spAttack:1}}),opposite=mon(own==='Plus'?'Minus':'Plus',{currentHp});
  const d=mon('Immunity',{screens:{lightScreen:true}});
  const ctx=context(owner==='player'?opposite:mon('Immunity'),owner==='enemy'?opposite:mon('Immunity'),a,d);
  // SpA101 -> item111 -> Plus166 -> stage249 -> subtotal104 -> screen68 -> spread34 -> +2=36.
  assert.equal(calc('Surf',ctx,a,d).max,36);
  assert.equal(calc('Strength',ctx,a,d).max,calc('Strength',context(),a,d).max);
 }
 const a=mon('Plus');assert.equal(calc('Surf',context(mon('Plus'),mon('Plus'),a),a).max,23,'same-sign abilities do not boost');
});

test('empty slots retain conservative guards because cartridge lookups ignore absence flags',()=>{
 const ctx=context(null,null);
 assert.equal(calc('Weather Ball',ctx,base,base,'hail').reason,'unknown-weather-suppression-field');
 assert.equal(scenarios('Weather Ball',ctx,base,base,'hail').scenarios[0].moveMetadata,null);
 assert.equal(calc('Surf',ctx,base,base,'rain').reason,'unknown-weather-suppression-field');
 assert.equal(calc('Explosion',ctx).reason,'unknown-damp-field');
 const a=mon('Plus');assert.equal(calc('Surf',context(null,null,a),a).reason,'unknown-plus-minus-field');
 assert.equal(calc('Explosion',context(mon('Damp'),null)).reason,'damp');
});

test('hidden legal alternatives branch without unavailable results; known suppression resolves weather despite other unknown slots',()=>{
 const uncertain=mon('Damp',{name:'Golduck',abilityOptions:{status:'uncertain',source:'species',values:['Damp','Cloud Nine']}});
 let result=scenarios('Explosion',context(uncertain));
 assert.deepEqual(result.scenarios.map(s=>s.availability),['blocked','available']);
 const ghost=scenarios('Explosion',context(uncertain),base,mon('Levitate',{types:['GHOST']}));
 assert.equal(ghost.scenarios[0].result.outcome,'blocked');
 assert.equal(ghost.scenarios[1].result.effectiveness,0);
 assert.ok(result.groups.some(g=>g.label.includes('Golduck: Damp')));
 result=scenarios('Surf',context(uncertain),base,base,'rain');
 assert.ok(result.scenarios.every(s=>s.availability==='available'));
 assert.equal(new Set(result.scenarios.map(s=>s.max)).size,2);
 result=scenarios('Surf',context(mon('Cloud Nine'),null),base,base,'rain');
 assert.ok(result.scenarios.every(s=>s.availability==='available'));
 const trace=mon('Trace');assert.deepEqual(calc('Surf',context(trace),base,base,'rain'),calc('Surf',context(),base,base,'rain'));
 assert.equal(calc('Ice Beam',context(trace)).kind,'standard-damage');
 assert.deepEqual(calc('Surf',context(mon('Trace',{copiedAbility:'Cloud Nine'})),base,base,'rain'),calc('Surf',context()));
});

test('conditional and multi-hit calculations retain the hidden ability branches and modifier order',()=>{
 const uncertain=mon('Damp',{abilityOptions:{status:'uncertain',source:'species',values:['Damp','Cloud Nine']}});
 const a=mon('Plus'),other=mon('Trace',{copiedAbility:'Minus'}),ctx=context(other,uncertain,a);
 const result=scenarios('Magnitude',ctx,a,base,'rain');
 for(const condition of result.conditions)assert.equal(condition.abilityDamage.scenarios.length,2);
 const hits=scenarios('Bullet Seed',{...ctx,hitCount:3},a);
 assert.ok(hits.scenarios.every(s=>s.availability==='available'));
 assert.equal(new Set(hits.scenarios.map(s=>s.max)).size,1);
});

test('the candidate pipeline preserves hidden uncertainty, Set changes and ability evidence in the existing presentation',()=>{
 let s=alexasState('Doubles');
 // Legal saved Golduck partner, with its actual save ability known.
 const partner={...swampert,identity:'duck',name:'Golduck',dex:55,ability:'Cloud Nine'};
 const records=[swampert,partner];
 s=reduce(s,{type:'selectDoublesPlayer',slot:1,identity:partner.identity,pool:records});
 s=reduce(s,{type:'viewDoublesSlot',side:'player',slot:0});
 s=reduce(s,{type:'conditionField',key:'weather',value:'rain'});
 let result=evaluateFrontierCandidates(s,swampert,battleMove('Surf'),{records});
 assert.ok(result.evaluations[0].abilityDamage.scenarios.every(s=>s.availability==='available'));
 const set=possibleMatchupSets({...s,matchup:{...s.matchup,opponent:s.opponentSpecies[1]}}).at(-1);
 s=reduce(s,{type:'selectOpponentSet',slot:1,setId:frontierSetId(set)});
 result=evaluateFrontierCandidates(s,swampert,battleMove('Surf'),{records});
 assert.equal(result.battleContext.battlefield.enemy[1].pokemon.setId,frontierSetId(set));
 assert.equal(result.battleContext.battlefield.enemy[1].pokemon.abilityOptions.status,'uncertain');
 const entry=result.evaluations[0];
 // Replace only test field evidence with the legal Golduck alternatives to
 // verify the existing aggregation rows distinguish hidden Damp outcomes.
 const field=result.battleContext.battlefield;
 const ctx={...result.battleContext,battlefield:{...field,player:[field.player[0],slot(mon('Damp',{name:'Golduck',abilityOptions:{status:'uncertain',source:'species',values:['Damp','Cloud Nine']}}))]}};
 const damage=calculateAbilityScenarios(battleMove('Explosion'),entry.attacker,entry.defender,{battleContext:ctx});
 const evaluation={...result,move:battleMove('Explosion'),evaluations:[{...entry,move:battleMove('Explosion'),abilityDamage:damage}]};
 const summary=aggregateFrontierDamage(evaluation),rows=frontierAbilityResults(summary);
 assert.equal(rows.length,2);assert.ok(rows.some(row=>row.label.includes('Golduck: Damp')));
 assert.ok(rows.some(row=>row.summary.categories.includes('prevented')));
});

test('all four viewed pairings retain field suppression without changing independent indices',()=>{
 const models=[mon('Immunity'),mon('Cloud Nine'),mon('Immunity'),mon('Damp')];
 for(const player of [0,1])for(const enemy of [0,1]) {
  const a=models[player],d=models[2+enemy];
  const ctx=context(models[1],models[3],models[0],models[2]);
  ctx.battlefield.viewed={player,opponent:enemy};ctx.battlefield.attacking.slot=player;ctx.battlefield.defending.slot=enemy;
  assert.deepEqual(calc('Surf',ctx,a,d,'rain'),calc('Surf',ctx,a,d));
  assert.equal(calc('Explosion',ctx,a,d).reason,'damp');
 }
});

test('effective stats display confirmed field-wide modifiers without speculative ranges',()=>{
 const a=mon('Plus',{identity:'a'}),d=mon('Immunity',{id:142,dex:142}),ctx=context(mon('Minus',{currentHp:0}),mon('Immunity'),a,d);
 const state=alexasState('Doubles');
 // Player display can be checked without replacing the canonical opponent row.
 let display=matchupDisplayStats({player:a,opponent:d,state,sets:analysisMatchupSets(state),battlefield:ctx.battlefield});
 assert.equal(display.player.spAttack,151);
 ctx.battlefield.player[1]=slot(mon('Trace'));
 display=matchupDisplayStats({player:a,opponent:d,state,sets:analysisMatchupSets(state),battlefield:ctx.battlefield});
 assert.equal(display.player.spAttack,101);
 const swimmer=mon('Swift Swim',{identity:'a'});ctx.battlefield.player=[slot(swimmer),slot(mon('Cloud Nine'))];
 display=matchupDisplayStats({player:swimmer,opponent:d,state:{...state,field:{...state.field,weather:'rain'}},sets:analysisMatchupSets(state),battlefield:ctx.battlefield});
 assert.equal(display.player.speed,100);
 ctx.battlefield.player[1]=slot(mon('Cloud Nine',{currentHp:0}));
 display=matchupDisplayStats({player:swimmer,opponent:d,state:{...state,field:{...state.field,weather:'rain'}},sets:analysisMatchupSets(state),battlefield:ctx.battlefield});
 assert.equal(display.player.speed,200);
});

test('conditional-case cache keeps field-sensitive Forecast/Helping Hand outcomes separate',()=>{
 const cast=mon('Forecast',{dex:351,helpingHand:true}),duck=mon('Damp',{abilityOptions:{status:'uncertain',source:'species',values:['Damp','Cloud Nine']}});
 const result=scenarios('Ice Ball',context(duck,mon('Immunity'),cast),cast,base,'hail');
 for(const condition of result.conditions) {
  const values=condition.abilityDamage.scenarios;
  assert.equal(values.length,2);assert.ok(values.every(value=>value.availability==='available'));
  assert.ok(values[0].max>values[1].max,'hail Forecast Ice STAB survives only the non-suppressing branch');
 }
});

test('a hidden copied opposite ability branches Plus/Minus exactly without inventing a copy',()=>{
 const a=mon('Plus'),partner=mon('Trace',{copiedAbility:'Minus',abilityOptions:{status:'uncertain',source:'species',values:['Trace','Synchronize']}});
 const result=scenarios('Ice Beam',context(partner,mon('Immunity'),a),a);
 assert.ok(result.scenarios.every(value=>value.availability==='available'));
 assert.equal(new Set(result.scenarios.map(value=>value.max)).size,2);
 const uncertain=scenarios('Ice Beam',context({...partner,copiedAbility:null},mon('Immunity'),a),a);
 assert.ok(uncertain.scenarios.every(value=>value.availability==='available'));
 assert.equal(uncertain.scenarios.length,1,'neutral Trace/Synchronize partners need no separate field branches');
});

test('reverse attacks use the same field-wide ability lookup and do not mutate input contexts',()=>{
 const a=mon('Plus'),d=base,opposite=mon('Minus');
 const ctx=context(opposite,mon('Immunity'),d,a);
 ctx.battlefield.attacking={side:'enemy',slot:0};ctx.battlefield.defending={side:'player',slot:0};
 const before=structuredClone({ctx,a,d});
 const result=calc('Surf',ctx,a,d);
 assert.equal(result.max,33); // SpA101 ->151 ->subtotal63 ->spread31 ->+2=33.
 scenarios('Surf',ctx,a,d);assert.deepEqual({ctx,a,d},before);
});
