import test from 'node:test';
import assert from 'node:assert/strict';
import {alexasState,alexasInputs,observe} from './fixtures/alexasAerodactyl.js';
import {battleMove} from '../src/battle/reference.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {coreDamageDisplayParts} from '../src/battle/coreDamagePresentation.js';
import {matchupBattleContext} from '../src/battle/matchupConditions.js';
import {battleReducer} from '../src/battle/battleState.js';
import {possibleMatchupSets,towerSetById} from '../src/battle/towerSets.js';
import {towerOpponentIVs} from '../src/battle/towerRules.js';
import {opponentMoveInputs,opponentStatRanges} from '../src/battle/opponentStats.js';
const calculate=(state,name,reverse=false)=>{const {player,opponent}=alexasInputs(state);return calculateAbilityScenarios(battleMove(name),reverse?opponent:player,reverse?player:opponent,{weather:state.field.weather,battleContext:matchupBattleContext(state,reverse?'enemy':'player')});};
test('ALEXAS has four canonical Aerodactyl sets, known trainer IV31, and correlated stat/item differences',()=>{
 for(const format of ['Singles','Doubles']) {
  const base=alexasState(format),sets=possibleMatchupSets(base);
  assert.deepEqual(sets.map(s=>s.id),['Aerodactyl 1','Aerodactyl 2','Aerodactyl 3','Aerodactyl 4']);
  assert.deepEqual(sets.map(s=>s.item),['Kings Rock','Choice Band','Kings Rock','Kings Rock']);
  assert.deepEqual(towerOpponentIVs('Expert (M):ALEXAS'),{value:31,source:'trainer',assumed:false});
  for(const [index,set] of sets.entries()) {
   const state=battleReducer(base,{type:'selectOpponentSet',setId:set.id});
   const {identification,ranges,opponent}=alexasInputs(state);
   assert.deepEqual(identification.sets,[set]);assert.equal(identification.sets[0],towerSetById(set.id));
   // Gen III: EV170 -> 42 stat points before level scaling, EV255 -> 63.
   // Adamant Attack: floor((floor((210+31+42)/2)+5)*1.1)=160.
   const stats=index<2?{hp:176,attack:160,defense:85,spAttack:72,spDefense:95,speed:171}
    :{hp:155,attack:157,defense:85,spAttack:112,spDefense:95,speed:150};
   assert.deepEqual(ranges,Object.fromEntries(Object.entries(stats).map(([key,value])=>[key,{min:value,max:value}])));
   assert.deepEqual(opponent.stats,stats);assert.equal(opponent.item,set.item);
   assert.deepEqual(opponent.ivs,{hp:31,attack:31,defense:31,spAttack:31,spDefense:31,speed:31});
   assert.deepEqual(opponent.abilityOptions.values,['Rock Head','Pressure']);
  }
 }
});
for(const format of ['Singles','Doubles']) {
 for(const name of ['Ice Beam','Surf','Earthquake'])test(`${format} ALEXAS/Aerodactyl ${name}: selected canonical inputs calculate without manual evidence`,()=>{
  for(const setId of ['Aerodactyl 1','Aerodactyl 2','Aerodactyl 3','Aerodactyl 4']) {
   const state=battleReducer(alexasState(format),{type:'selectOpponentSet',setId}),result=calculate(state,name);
   const maximum={'Ice Beam':84,Surf:format==='Singles'?126:66,Earthquake:0}[name];
   assert.equal(result.scenarios.length,2);assert.equal(result.groups.length,1);
   assert.equal(result.groups[0].availability,'available');
   for(const scenario of result.scenarios)
    assert.deepEqual(scenario.result.rolls,Array.from({length:16},(_,i)=>Math.floor(maximum*(85+i)/100)));
   for(const weather of ['rain','sun','sand','hail']) {
    const changed=calculate({...state,field:{...state.field,weather}},name).groups[0];
    if(format==='Doubles'&&name==='Surf'&&['rain','sun'].includes(weather))assert.equal(changed.reason,'unknown-weather-suppression-field');
    else assert.equal(changed.availability,'available');
   }
  }
 });
 test(`${format}: selected Kings Rock set supplies exact HP and percentage`,()=>{
  const base=observe(alexasState(format),'item','Kings Rock');
  for(const [setId,hp,percentage] of [['Aerodactyl 1',176,'40.3% – 47.7%'],['Aerodactyl 3',155,'45.8% – 54.2%'],['Aerodactyl 4',155,'45.8% – 54.2%']]) {
   const state=battleReducer(base,{type:'selectOpponentSet',setId}),inputs=alexasInputs(state),result=calculate(state,'Ice Beam');
   assert.deepEqual(inputs.identification.sets.map(set=>set.id),[setId]);assert.equal(inputs.opponent.stats.hp,hp);
   assert.equal(result.groups[0].availability,'available');assert.equal(result.groups[0].percentage,percentage);
   for(const scenario of result.scenarios)assert.deepEqual(coreDamageDisplayParts(scenario.result,hp),{percentage,hp:'71–84 HP damage'});
  }
 });
 test(`${format}: genuine Choice Band observation identifies set2 and restores ordinary calculations`,()=>{
  const state=observe(alexasState(format),'item','Choice Band'),inputs=alexasInputs(state);
  assert.deepEqual(inputs.identification.sets.map(s=>s.id),['Aerodactyl 2']);assert.equal(inputs.opponent.stats.hp,176);
  // Independent fixture arithmetic: Lv47 factor20; Ice95/SpD95 =>subtotal40,+2=42,Ice×2=84.
  // Surf same subtotal40; Singles+2=42,STAB63,Rock×2=126.
  // Doubles2:subtotal40/2=20,+2=22,STAB33,Rock×2=66. Earthquake is chart-immune.
  for(const [name,min,max] of [['Ice Beam',71,84],['Surf',format==='Singles'?107:56,format==='Singles'?126:66],['Earthquake',0,0]]) {
   const result=calculate(state,name);assert.equal(result.groups.length,1);assert.equal(result.scenarios.length,2);assert.equal(result.groups[0].availability,'available');assert.deepEqual([result.groups[0].min,result.groups[0].max],[min,max]);
  }
  for(const weather of ['none','sun','rain','sand','hail'])assert.equal(calculate({...state,field:{...state.field,weather}},'Ice Beam').groups[0].availability,'available');
  const wet={...state,field:{...state.field,weather:'rain'}};
  assert.equal(calculate(wet,'Surf').groups[0].reason,format==='Doubles'?'unknown-weather-suppression-field':null);
 });
 test(`${format}: ability evidence preserves selected-set item and HP inputs`,()=>{
  let state=alexasState(format);state=battleReducer(state,{type:'observeOpponentAbility',slot:0,speciesId:142,value:'Pressure'});
  const before=alexasInputs(state);
  assert.equal(calculate(state,'Ice Beam').scenarios.length,1);assert.equal(calculate(state,'Ice Beam').groups[0].reason,null);
  assert.equal(before.opponent.item,'Kings Rock');assert.equal(before.opponent.stats.hp,176);
  state=observe(observe(state,'item','Kings Rock'),0,'Double Edge');
  const inputs=alexasInputs(state);assert.deepEqual(inputs.identification.sets.map(s=>s.id),['Aerodactyl 3']);assert.equal(inputs.opponent.stats.hp,155);
  const result=calculate(state,'Ice Beam');assert.equal(result.groups[0].availability,'available');assert.equal(result.groups[0].percentage,'45.8% – 54.2%');
  assert.deepEqual(calculate(state,'Fire Blast',true).groups.map(g=>[g.min,g.max]),[[25,30]]);
 });
 test(`${format}: reverse direction uses selected canonical inputs before and after observations`,()=>{
  assert.deepEqual(calculate(alexasState(format),'AncientPower',true).groups.map(g=>[g.min,g.max]),[[28,33]]);
  const state=observe(alexasState(format),'item','Choice Band');
  assert.deepEqual(calculate(state,'Earthquake',true).groups.map(g=>[g.min,g.max]),[[90,107]]);
  assert.deepEqual(calculate(state,'AncientPower',true).groups.map(g=>[g.min,g.max]),[[40,48]]);
 });
}

test('item uncertainty and maximum-HP uncertainty are independent blockers; required stat ranges still fail safely',()=>{
 const {player,opponent}=alexasInputs(alexasState());const m=battleMove('Ice Beam');
 const knownItem={...opponent,ability:'Pressure',item:'Kings Rock'};
 assert.equal(calculateCoreDamage(m,player,{...knownItem,item:null}),null,'known HP alone does not repair an explicitly unknown item');
 const damage=calculateCoreDamage(m,player,knownItem);
 assert.deepEqual([damage.min,damage.max],[71,84]);
 assert.equal(coreDamageDisplayParts(damage,'155–176'),null,'a ranged HP denominator cannot produce a percentage');
 assert.ok(calculateCoreDamage(m,player,{...knownItem,stats:{...knownItem.stats,attack:'157–160'}}).rolls,'irrelevant ranges do not block exact SpD');
 assert.equal(calculateCoreDamage(m,player,{...knownItem,stats:{...knownItem.stats,spDefense:'90–95'}}),null,'never parse or choose a range endpoint');
});
test('absent trainer knowledge does not turn assumed IV31 into known opponent stats',()=>{
 const state=alexasState(),sets=alexasInputs(state).identification.sets,unknown={...state,selectedTrainer:null};
 assert.equal(opponentMoveInputs(unknown,sets).ivs,null);assert.equal(opponentStatRanges(unknown,sets),null);
});
