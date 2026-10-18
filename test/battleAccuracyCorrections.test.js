import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateBasicDamage,basicDamageScenarios,prepareBasicDamage} from '../src/battle/basicDamage.js';
import {battleTypes,battleTypeValues} from '../src/battle/battleConditions.js';
import {battleMove} from '../src/battle/reference.js';
import {effectiveFasterSide,stagedMatchupStats,matchupEffectiveness,movePopupValues} from '../src/battle/matchupPresentation.js';
const mon={name:'Fixture',dex:1,level:50,types:['NORMAL'],ability:'None',item:'None',stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100,speed:100},currentHp:200,status:'none'};
const conditions=(a,d)=>({weather:a.weather,critical:a.critical,attacker:{stages:a.stages,status:a.status,currentHp:a.currentHp},defender:{stages:d.stages,status:d.status,currentHp:d.currentHp,screens:d.screens}});
const result=(move,a=mon,d=mon)=>calculateBasicDamage(move,a,d,conditions(a,d));
const prepared=(move,a=mon,d=mon)=>prepareBasicDamage(move,a,d,conditions(a,d));
const castform={...mon,name:'Castform',dex:351,ability:'Forecast'};
const water=battleMove('Water Pulse');

test('H01 Forecast types cover every weather without mutating species or saved inputs',()=>{
 const original=structuredClone(castform);
 for(const [weather,type] of [['none','NORMAL'],['sun','FIRE'],['rain','WATER'],['hail','ICE'],['sand','NORMAL']]){
  assert.deepEqual(battleTypes(castform,weather),[type]);
  assert.deepEqual(battleTypeValues({...castform,weather},mon),[[type]]);
  assert.deepEqual(battleTypes({...castform,ability:'None'},weather),['NORMAL']);
  assert.deepEqual(battleTypes({...castform,dex:1},weather),['NORMAL']);
 }
 assert.deepEqual(castform,original);
});
test('H01 Forecast STAB and defensive effectiveness use effective weather in both directions',()=>{
 // Water Pulse: base floor(100*60*22/100/50)=26; rain=39; +2=41;
 // Forecast Water STAB=floor(41*1.5)=61. Grass into rain Castform is x2.
 assert.equal(result(water,{...castform,weather:'rain'}).max,61);
 assert.equal(result(water,{...castform,weather:'rain',ability:'None'}).max,41);
 const grass={...battleMove('Razor Leaf'),power:100};
 assert.equal(result(grass,{...mon,weather:'rain'},castform).max,92);
 assert.equal(matchupEffectiveness(grass,{...mon,weather:'rain'},{...castform,weather:'rain'}).label,'2x');
 for(const ability of ['Cloud Nine','Air Lock']){
  assert.deepEqual(battleTypeValues({...castform,weather:'rain'},{...mon,ability}),[['NORMAL']]);
  assert.equal(result(water,{...castform,weather:'rain'},{...mon,ability}).max,28);
  assert.equal(result(grass,{...mon,weather:'rain',ability},castform).max,46);
 }
 const uncertain={...mon,ability:'Cloud Nine / Damp'};
 assert.deepEqual(battleTypeValues({...castform,weather:'rain'},uncertain),[['NORMAL'],['WATER']]);
 assert.deepEqual(basicDamageScenarios(water,{...castform,weather:'rain'},uncertain,{weather:'rain'}).map(g=>g.result.max),[28,61]);
});
test('H04 Weather Ball independent cartridge-position fixtures for all weather and suppression',()=>{
 const move=battleMove('Weather Ball');
 // At 50 power the unmodified quotient is 22. Rain/sun: (33+2)*2=70;
 // hail/sand: (22+2)*2=48; no weather: 22+2=24. No STAB here.
 for(const [weather,type,min,max] of [['rain','WATER',59,70],['sun','FIRE',59,70],['hail','ICE',40,48],['sand','ROCK',40,48],['none','NORMAL',30,36]]){
  const a={...mon,weather},s=result(move,a); // Normal STAB only for the no-weather case.
  assert.equal(prepared(move,a).type,type);assert.equal(s.min,min);assert.equal(s.max,max);
  assert.equal(prepared(move,a).category,type==='ROCK'||type==='NORMAL'?'Physical':'Special');
  if(weather!=='none')for(const ability of ['Cloud Nine','Air Lock']){
   const blocked=result(move,a,{...mon,ability});assert.equal(prepared(move,a,{...mon,ability}).type,'NORMAL');assert.equal(blocked.min,30);assert.equal(blocked.max,36);
  }
 }
 assert.equal(move.power,50);assert.equal(move.type,'NORMAL');
});
test('H04 Weather Ball combines screens, crit, Forecast STAB and type modifiers with independent rounding',()=>{
 const move=battleMove('Weather Ball'),rain={...mon,weather:'rain'};
 // Screen: floor(22/2)=11; rain=floor(11*1.5)=16; (+2)*2=36.
 assert.equal(result(move,rain,{...mon,screens:{lightScreen:true}}).max,36);
 // Crit bypasses screen: (33+2)*2 crit*2 Weather Ball=140.
 assert.equal(result(move,{...rain,critical:true},{...mon,screens:{lightScreen:true}}).max,140);
 assert.equal(result(move,{...castform,weather:'rain'}).max,105); // floor(70*1.5)
 assert.equal(result(move,{...castform,weather:'rain'},{...mon,types:['ROCK']}).max,210);
 const sand={...mon,weather:'sand',stages:{attack:1}};
 // Physical Rock: Attack150 -> quotient33 -> +2 -> x2=70; Reflect:
 // floor(33/2)=16 -> +2 -> x2=36. Sand grants no Rock SpD bonus.
 assert.equal(result(move,sand,{...mon,screens:{reflect:true}}).max,36);
});
test('H05 Ice Beam versus Charizard uses cartridge type order, independent of displayed type order',()=>{
 const a={...mon,types:['ICE'],stats:{...mon.stats,spAttack:103}},d={...mon,types:['FIRE','FLYING'],currentHp:67};
 // floor(103*95*22/100/50)+2=45; STAB67; Flying134; Fire67.
 for(const types of [['FIRE','FLYING'],['FLYING','FIRE']]){
  const s=result(battleMove('Ice Beam'),a,{...d,types});
  assert.equal(s.min,56);assert.equal(s.max,67);
  assert.deepEqual(s.rolls,[56,57,58,58,59,60,60,61,62,62,63,64,64,65,66,67]);
  assert.equal(matchupEffectiveness(battleMove('Ice Beam'),a,{...d,types}).label,'1x');
 }
 assert.equal(result(battleMove('Earthquake'),mon,{...mon,types:['STEEL','FLYING']}).max,0);
 assert.equal(result(battleMove('Surf'),mon,{...mon,ability:'Water Absorb'}).max,0);
 assert.equal(result(battleMove('Tackle'),mon,{...mon,types:['GHOST','NORMAL']}).max,0);
});
test('H03 green Speed uses effective values without altering stage-only numbers or raw stats',()=>{
 const opponent={...mon,stats:{...mon.stats,speed:90}};
 assert.equal(effectiveFasterSide(mon,opponent),'player');
 assert.equal(effectiveFasterSide({...mon,status:'paralysis'},opponent),'enemy');
 assert.equal(effectiveFasterSide({...mon,item:'Macho Brace'},opponent),'enemy');
 assert.equal(effectiveFasterSide({...mon,stats:{...mon.stats,speed:60},ability:'Swift Swim',weather:'rain'},opponent),'player');
 assert.equal(effectiveFasterSide({...mon,stats:{...mon.stats,speed:60},ability:'Chlorophyll',weather:'sun'},opponent),'player');
 assert.equal(effectiveFasterSide({...mon,stats:{...mon.stats,speed:60},ability:'Swift Swim',weather:'rain'},{...opponent,ability:'Cloud Nine',weather:'rain'}),'enemy');
 assert.equal(effectiveFasterSide({...mon,stages:{speed:-1}},opponent),'enemy');
 assert.equal(effectiveFasterSide(mon,{...mon}),null);assert.equal(effectiveFasterSide(mon,null),null);
 const modified={...mon,status:'paralysis',item:'Macho Brace',stages:{speed:2}};
 assert.equal(stagedMatchupStats(modified,modified.stages).speed,200);assert.equal(modified.stats.speed,100);
});
test('H03 uncertain Speed scenarios suppress false certainty and retain correlated weather comparisons',()=>{
 const slower={...mon,stats:{...mon.stats,speed:90},ability:'Swift Swim / Rain Dish',weather:'rain'};
 assert.equal(effectiveFasterSide({...mon,weather:'rain'},slower),null);
 assert.equal(effectiveFasterSide({...mon,weather:'rain',ability:'Air Lock'},slower),'player');
 assert.equal(effectiveFasterSide({...mon,ability:'Swift Swim',weather:'rain'},{...slower,ability:'Cloud Nine / Swift Swim'}),'player');
});
test('M02 Weather Ball icons/effectiveness share engine projection while reference move stays unchanged',()=>{
 const move=battleMove('Weather Ball'),target={...mon,types:['ROCK']};
 for(const [weather,type,label] of [['rain','WATER','2x'],['sun','FIRE','.5x'],['hail','ICE','1x'],['sand','ROCK','1x'],['none','NORMAL','.5x']]){
  const a={...mon,weather};
  assert.equal(matchupEffectiveness(move,a,target).type,type);assert.equal(matchupEffectiveness(move,a,target).label,label);
  assert.equal(movePopupValues(move,a,target).type,type);assert.equal(prepared(move,a,target).type,type);
  assert.equal(movePopupValues(move,a).type,type);
 }
 const a={...mon,weather:'rain'},suppressed={...target,ability:'Cloud Nine'};
 assert.equal(movePopupValues(move,a,suppressed).type,'NORMAL');assert.equal(matchupEffectiveness(move,a,suppressed).label,'.5x');
 assert.equal(matchupEffectiveness(move,a,{...target,ability:'Cloud Nine / Damp'}).label,'*');
 assert.equal(move.type,'NORMAL');assert.equal(move.power,50);
});

test('H01 all Forecast weather forms apply offensive STAB and defensive typing numerically',()=>{
 const grass={...battleMove('Razor Leaf'),power:100};
 for(const [weather,name,max,defensiveMax] of [['sun','Ember',40,23],['rain','Water Pulse',61,92],['hail','Ice Beam',64,46],['sand','Tackle',25,46],['none','Tackle',25,46]]){
  assert.equal(result(battleMove(name),{...castform,weather}).max,max,weather);
  assert.equal(result(grass,{...mon,weather},castform).max,defensiveMax,weather);
 }
});
