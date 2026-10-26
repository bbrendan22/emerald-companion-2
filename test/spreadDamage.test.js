import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {battleMove} from '../src/battle/reference.js';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {matchupBattleContext} from '../src/battle/matchupConditions.js';
const mon={level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:200,stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const calc=(name,a=mon,d=mon,count=2,weather='none',critical=false,context={})=>calculateCoreDamage(typeof name==='string'?battleMove(name):name,a,d,weather,critical,{format:'Doubles',defenderSideAlive:count,...context});
const rolls=max=>Array.from({length:16},(_,i)=>Math.max(1,Math.floor(max*(85+i)/100)));
const spread=Array.from({length:354},(_,i)=>battleMove(i+1)).filter(m=>m.power>0&&m.target==='MOVE_TARGET_BOTH');
for(const move of spread)test(`${move.name}: canonical two-opponent damage is halved before +2; Singles/one defender stay full`,()=>{
 assert.equal(spread.length,17);
 // Independent neutral level50 formula, stats100: subtotal=floor(22*P/50).
 const subtotal=Math.floor(22*move.power/50),base=Math.floor(subtotal/2)+2;
 const max=move.type==='NORMAL'?Math.floor(base*3/2):base;
 assert.deepEqual(calc(move).rolls,rolls(max));assert.equal(calc(move).base,base);
 assert.deepEqual(calc(move,mon,mon,1),calc(move,mon,mon,2,'none',false,{format:'Singles'}));
});
test('odd subtotals divide before +2, rather than halving final damage or multiplying move power',()=>{
 assert.deepEqual(calc('Surf').rolls,rolls(22));assert.equal(calc('Surf',mon,mon,1).max,43);
 assert.deepEqual(calc('Rock Slide').rolls,rolls(18));assert.equal(calc('Rock Slide',mon,mon,1).max,35);
 // Swift:26 ->13 ->+2=15 ->STAB22 (full damage max42).
 assert.deepEqual(calc('Swift').rolls,rolls(22));assert.equal(calc('Swift',mon,mon,1).max,42);
 assert.equal(calc('Surf',{...mon,level:1,stats:{...mon.stats,spAttack:1}}).base,2,'Special zero subtotal stays zero before +2');
 assert.equal(calc('Swift',{...mon,level:1,stats:{...mon.stats,attack:1}}).base,3,'Physical minimum-one occurs after spread');
});
test('both side directions use only the defending active count',()=>{
 let s={...createBattleState(),team:['a','b'],opponentSpecies:[1,2],rules:{...createBattleState().rules,format:'Doubles',teamSize:4}};
 s={...s,matchupConditions:{...s.matchupConditions,player:{1:{currentHp:0}}}};
 assert.equal(calculateCoreDamage(battleMove('Surf'),mon,mon,'none',false,matchupBattleContext(s,'player')).max,22);
 assert.equal(calculateCoreDamage(battleMove('Surf'),mon,mon,'none',false,matchupBattleContext(s,'enemy')).max,43);
 s={...s,matchupConditions:{...s.matchupConditions,enemy:{1:{currentHp:0}}}};
 assert.equal(calculateCoreDamage(battleMove('Surf'),mon,mon,'none',false,matchupBattleContext(s,'player')).max,43);
});
test('screen division precedes spread for both categories and criticals retain spread',()=>{
 // Surf:41 -> Light Screen26 -> spread13 ->+2=15. Rock Slide:33 ->Reflect22 ->spread11 ->+2=13.
 const d={...mon,screens:{reflect:true,lightScreen:true}};
 assert.deepEqual(calc('Surf',mon,d).rolls,rolls(15));assert.deepEqual(calc('Rock Slide',mon,d).rolls,rolls(13));
 assert.equal(calc('Surf',mon,d,1).max,22);assert.equal(calc('Rock Slide',mon,d,1).max,18);
 assert.deepEqual(calc('Surf',mon,d,2,'none',true).rolls,rolls(44));assert.deepEqual(calc('Rock Slide',mon,d,2,'none',true).rolls,rolls(36));
 for(const ability of ['Battle Armor','Shell Armor'])assert.deepEqual(calc('Surf',mon,{...d,ability},2,'none',true),calc('Surf',mon,{...d,ability},2,'none',false));
});
test('physical burn/Guts order stays before screens and spread',()=>{
 const d={...mon,screens:{reflect:true}};
 // Razor Wind:35 ->burn17 ->screen10 ->spread5 ->+2=7 ->STAB10.
 assert.deepEqual(calc('Razor Wind',{...mon,status:'burn'},d).rolls,rolls(10));
 // Guts raw Atk150 ->subtotal52 ->screen34 ->spread17 ->+2=19 ->STAB28.
 assert.deepEqual(calc('Razor Wind',{...mon,status:'burn',ability:'Guts'},d).rolls,rolls(28));
});
test('STAB and ordered weaknesses/resistances apply after the spread-adjusted base',()=>{
 assert.deepEqual(calc('Rock Slide',{...mon,types:['ROCK']},{...mon,types:['FIRE','FLYING']}).rolls,rolls(108));
 assert.deepEqual(calc('Surf',{...mon,types:['WATER']},{...mon,types:['GRASS']}).rolls,rolls(16));
 assert.equal(calc('Surf',mon,{...mon,ability:'Water Absorb'}).max,0);
 assert.equal(calc('Hyper Voice',mon,{...mon,ability:'Soundproof'}).outcome,'blocked');
 assert.equal(calc('Surf',mon,{...mon,ability:'Wonder Guard'}).outcome,'blocked');
});
test('weather, Charcoal, activated/copied Flash Fire and screens keep independent flooring',()=>{
 const a={...mon,types:['FIRE'],ability:'Flash Fire',flashFireActivated:true,item:'Charcoal'},d={...mon,screens:{lightScreen:true}};
 // SpA110 ->subtotal48 ->screen32 ->spread16 ->sun24 ->FF36 ->+2=38 ->STAB57.
 assert.equal(calc('Heat Wave',a,d,2,'sun').reason,'unknown-weather-suppression-field');
 assert.equal(calc('Heat Wave',a,d,2,'sun',true).reason,'unknown-weather-suppression-field');
 assert.deepEqual(calc('Heat Wave',{...a,ability:'Trace',copiedAbility:'Flash Fire'},d,2,'sun'),calc('Heat Wave',a,d,2,'sun'));
 assert.deepEqual(calc('Heat Wave',a,{...d,ability:'Cloud Nine'},2,'sun').rolls,rolls(39));
 assert.equal(calc('Heat Wave',a,d,2,'rain').reason,'unknown-weather-suppression-field');
 // SpA105 Surf:subtotal43 ->spread21 ->rain31 ->+2=33. Weather before spread would34.
 assert.equal(calc('Surf',{...mon,stats:{...mon.stats,spAttack:105}},mon,2,'rain').reason,'unknown-weather-suppression-field');
});
test('Forecast typing and both weather suppressors stay consistent with spread',()=>{
 const cast={...mon,dex:351,ability:'Forecast'};
 assert.equal(calc('Heat Wave',cast,mon,2,'sun').reason,'unknown-weather-suppression-field');
 for(const ability of ['Cloud Nine','Air Lock']) {
  assert.deepEqual(calc('Heat Wave',cast,{...mon,ability},2,'sun').rolls,rolls(24));
  assert.deepEqual(calc('Surf',{...mon,ability},cast,2,'rain').rolls,rolls(22));
 }
});
test('Eruption and Water Spout resolve HP power before exactly one spread division',()=>{
 for(const name of ['Eruption','Water Spout'])for(const hp of [1,66,100,133,200]) {
  const a={...mon,currentHp:hp},power=Math.max(1,Math.floor(150*hp/200)),subtotal=Math.floor(22*power/50);
  assert.deepEqual(calc(name,a).rolls,rolls(Math.floor(subtotal/2)+2));
  assert.deepEqual(calc(name,a,mon,1).rolls,rolls(subtotal+2));
 }
});
test('Earthquake, Magnitude, Explosion and Selfdestruct never receive this modifier',()=>{
 for(const name of ['Earthquake','Magnitude','Explosion','Self Destruct']) {
  assert.equal(battleMove(name).target,'MOVE_TARGET_FOES_AND_ALLY');
  assert.deepEqual(calc(name),calc(name,mon,mon,1));if(!['Explosion','Self Destruct'].includes(name))assert.deepEqual(calc(name),calc(name,mon,mon,2,'none',false,{format:'Singles'}));
  else assert.equal(calc(name).reason,'unknown-damp-field');
 }
 assert.equal(calc('Earthquake').max,46);assert.equal(calc('Explosion',mon,mon,2,'none',false,{format:'Singles'}).max,333);
});
test('canonical targets cannot be forged by move payloads or inferred from type/power/descriptions',()=>{
 assert.deepEqual(calc({...battleMove('Surf'),target:'MOVE_TARGET_FOES_AND_ALLY'}),calc('Surf'));
 assert.deepEqual(calc({...battleMove('Earthquake'),target:'MOVE_TARGET_BOTH'}),calc('Earthquake'));
 assert.equal(calc('Weather Ball',mon,mon,2,'rain').reason,'unknown-weather-suppression-field');
 assert.equal(calc('Weather Ball',mon,mon,2,'rain',false,{format:'Singles'}).max,70);
});
test('conditional and selected multi-hit paths stay full; existing between-hit safeguards stay explicit',()=>{
 for(const name of ['Rollout','Ice Ball','Fury Cutter','Magnitude','Present','Pursuit','Revenge','DoubleSlap','Bullet Seed','Triple Kick'])
  assert.deepEqual(calc(name,mon,mon,2,'none',false,{hitCount:3}),calc(name,mon,mon,1,'none',false,{hitCount:3}),name);
 assert.equal(calc('DoubleSlap',mon,{...mon,ability:'Color Change'},2,'none',false,{hitCount:3}).availability,'unsupported');
});
test('ability scenarios apply spread once and preserve legitimate attacker and defender alternatives',()=>{
 const options={status:'uncertain',source:'species',values:['Trace','Synchronize']};
 const armor={...mon,ability:'Trace',copiedAbility:'Shell Armor',abilityOptions:options,screens:{reflect:true}};
 const incoming=calculateAbilityScenarios(battleMove('Razor Wind'),mon,armor,{critical:true,battleContext:{format:'Doubles',defenderSideAlive:2}});
 assert.deepEqual(incoming.groups.map(g=>g.max),[19,57]);
 const fire={...mon,dex:282,types:['PSYCHIC'],ability:'Trace',copiedAbility:'Flash Fire',flashFireActivated:true,abilityOptions:options};
 const outgoing=calculateAbilityScenarios(battleMove('Heat Wave'),fire,mon,{weather:'sun',battleContext:{format:'Doubles',defenderSideAlive:2}});
 assert.equal(outgoing.groups.length,1);assert.equal(outgoing.groups[0].reason,'unknown-weather-suppression-field');
 assert.equal(outgoing.groups[0].scenarios.length,2);
 const plus={...mon,ability:'Trace',copiedAbility:'Plus'};assert.equal(calc('Heat Wave',plus,{...mon,ability:'Minus'}).max,35);
});
test('only qualifying Doubles moves require a known count; exclusions/fixed/OHKO/status guards remain',()=>{
 for(const count of [undefined,null,0,3,'2']) {
  const context={format:'Doubles',defenderSideAlive:count};
  for(const critical of [false,true])assert.deepEqual(calculateCoreDamage(battleMove('Surf'),mon,mon,'none',critical,context),{availability:'unsupported',reason:'unknown-defender-side-count'});
 }
 for(const name of ['Flamethrower','Earthquake','Dragon Rage','Psywave','Fissure'])assert.ok(calculateCoreDamage(battleMove(name),mon,mon,'none',false,{format:'Doubles'}));
 for(const name of ['Growl','Helping Hand','Counter','Beat Up','Future Sight','Spit Up'])assert.equal(calc(name),null);
});
