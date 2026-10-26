import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {battleMove,speciesByName} from '../src/battle/reference.js';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {slotConditions} from '../src/battle/matchupConditions.js';
const mon={level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:200,stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const calc=(name,a={},d={},context={},critical=false,weather='none')=>calculateCoreDamage(battleMove(name),{...mon,...a},{...mon,...d},weather,critical,{format:'Doubles',defenderSideAlive:2,...context});
const rolls=max=>Array.from({length:16},(_,i)=>Math.floor(max*(85+i)/100));
test('Helping Hand floors after +2 and critical, before STAB/type/random',()=>{
 assert.deepEqual(calc('Flamethrower').rolls,rolls(43));
 assert.deepEqual(calc('Flamethrower',{helpingHand:true}).rolls,rolls(64));
 assert.deepEqual(calc('Flamethrower',{helpingHand:true},{},{},true).rolls,rolls(129));
 assert.deepEqual(calc('Strength',{helpingHand:true},{types:['ROCK']}).rolls,rolls(41));
 assert.deepEqual(calc('Strength',{helpingHand:true}).rolls,rolls(82));
});
test('Singles ignores stored boost; defender flag never boosts attacker',()=>{
 assert.deepEqual(calc('Strength',{helpingHand:true},{},{format:'Singles'}),calc('Strength',{},{},{format:'Singles'}));
 assert.deepEqual(calc('Strength',{}, {helpingHand:true}),calc('Strength'));
});
test('spread and both screens precede Helping Hand; critical armor restores screens',()=>{
 assert.deepEqual(calc('Surf',{helpingHand:true}).rolls,rolls(33));
 assert.deepEqual(calc('Surf',{helpingHand:true},{screens:{lightScreen:true}}).rolls,rolls(22));
 assert.deepEqual(calc('Strength',{helpingHand:true},{screens:{reflect:true}}).rolls,rolls(54));
 for(const ability of ['Battle Armor','Shell Armor'])assert.deepEqual(calc('Strength',{helpingHand:true},{ability,screens:{reflect:true}},{},true),calc('Strength',{helpingHand:true},{ability,screens:{reflect:true}}));
});
test('weather, item, copied Flash Fire preserve their earlier flooring',()=>{
 const a={types:['FIRE'],ability:'Trace',copiedAbility:'Flash Fire',flashFireActivated:true,item:'Charcoal',helpingHand:true};
 assert.equal(calc('Heat Wave',a,{screens:{lightScreen:true}},{},false,'sun').reason,'unknown-weather-suppression-field');
 assert.deepEqual(calc('Heat Wave',a,{screens:{lightScreen:true}},{format:'Singles'},false,'sun').rolls,rolls(84));
 assert.deepEqual(calc('Heat Wave',a,{screens:{lightScreen:true}},{format:'Singles'},true,'sun').rolls,rolls(330));
 assert.deepEqual(calc('Heat Wave',a,{ability:'Cloud Nine',screens:{lightScreen:true}},{},false,'sun').rolls,rolls(58));
 for(const ability of ['Cloud Nine','Air Lock'])assert.deepEqual(calc('Heat Wave',a,{ability},{},false,'sun'),calc('Heat Wave',a,{ability}));
});
test('conditional script multipliers and successful multi-hits receive boost once per hit',()=>{
 for(const name of ['Rollout','Ice Ball','Fury Cutter','Magnitude','Present','Pursuit','Revenge','Eruption','Water Spout','Weather Ball']){const a=calc(name,{helpingHand:true}),b=calc(name);if(a.conditions)a.conditions.forEach((c,i)=>assert.ok(c.result.max>b.conditions[i].result.max,name));else assert.ok(a.max>b.max,name);}
 const normal=calc('Comet Punch',{},{},{hitCount:3}),helped=calc('Comet Punch',{helpingHand:true},{},{hitCount:3});
 assert.deepEqual([normal.min,normal.max],[33,39]);assert.deepEqual([helped.min,helped.max],[48,57]);
 assert.notEqual(helped.max,Math.floor(normal.max*3/2));
 for(const name of ['DoubleSlap','Comet Punch','Fury Attack','Pin Missile','Spike Cannon','Barrage','Fury Swipes','Bone Rush','Arm Thrust','Bullet Seed','Icicle Spear','Rock Blast','Double Kick','Bonemerang'])assert.ok(calc(name,{helpingHand:true},{},{hitCount:3}).max>calc(name,{},{},{hitCount:3}).max,name);
 for(const hitCount of [1,2,3])assert.ok(calc('Triple Kick',{helpingHand:true},{},{hitCount}).max>calc('Triple Kick',{},{},{hitCount}).max);
 assert.equal(calc('DoubleSlap',{helpingHand:true},{ability:'Color Change'},{hitCount:3}).availability,'unsupported');
});
test('fixed damage, OHKO, status and unavailable specialized paths remain unchanged',()=>{
 for(const name of ['Dragon Rage','Sonic Boom','Seismic Toss','Night Shade','Psywave','Super Fang','Fissure','Guillotine','Horn Drill','Sheer Cold','Growl','Helping Hand','Counter','Mirror Coat','Bide','Beat Up','Future Sight','Doom Desire','Spit Up'])assert.deepEqual(calc(name,{helpingHand:true}),calc(name),name);
});
test('copied ability alternatives remain distinct and unresolved Trace stays neutral',()=>{
 const d={...mon,ability:'Trace',copiedAbility:'Shell Armor',screens:{reflect:true},abilityOptions:{status:'uncertain',source:'species',values:['Trace','Synchronize']}};
 const result=calculateAbilityScenarios(battleMove('Strength'),{...mon,helpingHand:true},d,{critical:true,battleContext:{format:'Doubles',defenderSideAlive:2}});
 assert.deepEqual(result.groups.map(g=>g.max),[54,166]);
 assert.deepEqual(calc('Strength',{helpingHand:true,ability:'Trace'}),calc('Strength',{helpingHand:true}));
});
const id=speciesByName.get('gardevoir').internalSpeciesId;
const initial=()=>({...createBattleState(),team:['a','b'],opponentSpecies:[id],matchup:{player:'a',opponent:id},rules:{...createBattleState().rules,format:'Doubles'}});
const edit=(s,side,value)=>battleReducer(s,{type:'matchupCondition',side,slot:side==='player'?s.team.indexOf(s.matchup.player):0,field:'helpingHand',value});
test('recipient state survives views and collapse; format change clears every slot',()=>{
 let s=initial();s=edit(s,'player',true);s=edit(s,'enemy',true);
 s=battleReducer(s,{type:'viewDoublesSlot',side:'player',slot:1});s=edit(s,'player',true);
 s=battleReducer(s,{type:'conditionsOpen',open:false});
 assert.equal(slotConditions(s,'player',0).helpingHand,true);assert.equal(slotConditions(s,'player',1).helpingHand,true);
 s=battleReducer(s,{type:'resetMatchupConditions'});
 assert.equal(slotConditions(s,'player',1).helpingHand,false);assert.equal(slotConditions(s,'player',0).helpingHand,true);
 s=battleReducer(s,{type:'rules',patch:{format:'Singles'}});
 for(const side of ['player','enemy'])for(const slot of [0,1])assert.equal(slotConditions(s,side,slot).helpingHand,false);
});
