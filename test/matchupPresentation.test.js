import test from 'node:test';
import assert from 'node:assert/strict';
import {frontierStatRanges, matchupBarPercent, stagedMatchupStats, fasterSide, movePpLabel, matchupEffectiveness, movePopupValues, matchupStats} from '../src/battle/matchupPresentation.js';
import {frontierPokemon} from '../src/battle/data/frontierPokemon.js';
import {towerBrainSets,createTowerRules} from '../src/battle/towerRules.js';
import {toTowerOpponent} from '../src/battle/frontierAdapter.js';
import {battleMove} from '../src/battle/reference.js';
const rules=createTowerRules(), mon={types:['NORMAL'],ability:'None',ivs:Object.fromEntries(matchupStats.map(([key])=>[key,31]))};
test('reference distribution includes all migrated ordinary and Tower Brain sets through existing stats rules',()=>{
 const ranges=frontierStatRanges(rules), mons=[...frontierPokemon,...towerBrainSets].map(s=>toTowerOpponent(s,rules));
 for(const [key] of matchupStats){assert.equal(ranges[key].min,Math.min(...mons.map(m=>m.stats[key])));assert.equal(ranges[key].max,Math.max(...mons.map(m=>m.stats[key])));}
 assert.equal(frontierStatRanges(rules),ranges);
 const high=frontierStatRanges(createTowerRules({levelMode:'open',openLevel:100}));assert.ok(high.hp.max>ranges.hp.max);
 const trainer=frontierStatRanges(rules,'Youngster:BRADY');assert.ok(trainer.attack.max<ranges.attack.max);
 assert.equal(frontierStatRanges(rules,'Anabel'),ranges);
});
test('bar endpoints, intermediate scaling, clamping and degenerate ranges',()=>{
 const r={min:20,max:120};for(const [v,p] of [[20,5],[120,100],[70,52.5],[-10,5],[999,100]])assert.equal(matchupBarPercent(v,r),p);
 assert.equal(matchupBarPercent(20,{min:20,max:20}),5);
});
test('Speed compares only displayed numbers and requires both selections',()=>{
 const m=speed=>({stats:{speed}});assert.equal(fasterSide(m(100),m(90)),'player');assert.equal(fasterSide(m(90),m(100)),'enemy');assert.equal(fasterSide(m(100),m(100)),null);assert.equal(fasterSide(m(100),null),null);assert.equal(fasterSide(null,m(100)),null);
});
test('PP resolves base data despite adapter maximum override, with actual PP Ups and remaining PP',()=>{
 const move={...battleMove('Tackle'),pp:56,ppUps:3,currentPp:17};assert.equal(movePpLabel(move,true),'17/56');assert.equal(movePpLabel(battleMove('Tackle'),false),'PP 35');
 for(let ups=0;ups<=3;ups++)assert.equal(movePpLabel({...battleMove('Thunder'),ppUps:ups,currentPp:2},true),`2/${10+2*ups}`);
});
test('effectiveness convention, status moves, special moves, missing target and uncertain abilities',()=>{
 const check=(name,types,label,ability='None')=>assert.equal(matchupEffectiveness(battleMove(name),mon,{types,ability}).label,label);
 check('Tackle',['GHOST'],'0x');check('Ember',['WATER','DRAGON'],'.25x');check('Ember',['WATER'],'.5x');check('Tackle',['NORMAL'],'1x');check('Ember',['GRASS'],'2x');check('Ember',['GRASS','BUG'],'4x');
 check('Growl',['NORMAL'],'-');check('Counter',['NORMAL'],'*');check('Struggle',['GHOST'],'*');check('Future Sight',['NORMAL'],'*');check('Water Gun',['WATER','GROUND'],'*','Damp / Water Absorb');
 assert.equal(matchupEffectiveness(battleMove('Tackle'),mon,null).label,'-');assert.equal(matchupEffectiveness(battleMove('Hidden Power'),mon,{types:['PSYCHIC']}).label,'2x');
 assert.equal(matchupEffectiveness(battleMove('Hidden Power'),{...mon,ivs:{}},mon).label,'*');
});
test('popup Gen 3 power, accuracy, secondary effects and variable cases',()=>{
 assert.deepEqual(movePopupValues(battleMove('Flamethrower'),mon),{power:95,accuracy:'100%',effect:'10%',type:'FIRE'});
 assert.equal(movePopupValues(battleMove('Swift'),mon).accuracy,'—');assert.equal(movePopupValues(battleMove('Toxic'),mon).effect,'—');
 for(const name of ['Pay Day','Bind','Thrash','Thief','Overheat'])assert.equal(movePopupValues(battleMove(name),mon).effect,'—');
 assert.equal(movePopupValues(battleMove('Hidden Power'),mon).power,70);assert.equal(movePopupValues(battleMove('Low Kick'),mon).power,'20–120');assert.equal(movePopupValues(battleMove('Guillotine'),mon).accuracy,'Level-based');assert.equal(movePopupValues(battleMove('Growl'),mon).power,'—');
});

test('display stages use Gen 3 integer truncation, leave HP/base stats intact and apply once',()=>{
 const original=Object.freeze({hp:175,attack:101,defense:99,spAttack:103,spDefense:97,speed:81}),mon=Object.freeze({stats:original});
 for(const [stage,expected] of [[0,101],[1,151],[2,202],[-1,67],[-2,50],[6,404],[-6,25]])assert.equal(stagedMatchupStats(mon,{attack:stage}).attack,expected);
 const display=stagedMatchupStats(mon,{hp:6,attack:2,defense:-1,spAttack:1,spDefense:-2,speed:6});
 assert.deepEqual(display,{hp:175,attack:202,defense:66,spAttack:154,spDefense:48,speed:324});assert.equal(mon.stats,original);assert.equal(mon.stats.attack,101);assert.notEqual(display,original);
 assert.deepEqual(stagedMatchupStats(mon),original);assert.equal(stagedMatchupStats(null),null);
});
test('Speed highlighting uses adjusted display numbers, including ties and missing selections',()=>{
 const player={stats:{hp:100,attack:100,defense:100,spAttack:100,spDefense:100,speed:60}},opponent={stats:{...player.stats,speed:90}};
 const own=stagedMatchupStats(player,{speed:1}),other=stagedMatchupStats(opponent);
 assert.equal(fasterSide(player,opponent,own,other),null);
 assert.equal(fasterSide(player,opponent,stagedMatchupStats(player,{speed:2}),other),'player');
 assert.equal(fasterSide(player,opponent,own,stagedMatchupStats(opponent,{speed:1})),'enemy');
 assert.equal(fasterSide(player,null,own,null),null);assert.equal(fasterSide(null,opponent,null,other),null);
});
