import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {battleMove} from '../src/battle/reference.js';
const mon={level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:200,status:'none',stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const context={format:'Doubles',defenderSideAlive:2};
const calc=(name,a=mon,d=mon,weather='none',ctx=context)=>calculateCoreDamage(battleMove(name),a,d,weather,false,ctx);
const weatherUnknown={availability:'unsupported',reason:'unknown-weather-suppression-field'};
const known=ability=>({status:'known',source:'test',values:[ability]});
const uncertain=values=>({status:'uncertain',source:'test',values});
for(const ability of ['Cloud Nine','Air Lock'])test(`${ability}: either represented side resolves suppression, including copied abilities`,()=>{
 for(const side of ['attacker','defender']) {
  const a=side==='attacker'?{...mon,ability}:mon,d=side==='defender'?{...mon,ability}:mon;
  assert.deepEqual(calc('Surf',a,d,'rain'),calc('Surf',a,d));
  assert.deepEqual(calc('Weather Ball',a,d,'hail'),calc('Weather Ball',a,d));
  const copied={ability:'Trace',copiedAbility:ability};
  assert.deepEqual(calc('Heat Wave',side==='attacker'?{...a,...copied}:a,side==='defender'?{...d,...copied}:d,'sun'),calc('Heat Wave',a,d));
 }
});
test('only materially different weather damage becomes unavailable; clear weather stays numerical',()=>{
 for(const [name,weather] of [['Surf','rain'],['Surf','sun'],['Heat Wave','rain'],['Flamethrower','sun'],['SolarBeam','rain'],['SolarBeam','sand'],['SolarBeam','hail']])assert.deepEqual(calc(name,mon,mon,weather),weatherUnknown,name);
 for(const weather of ['none','sun','rain','hail','sand'])for(const name of ['Strength','Rock Slide','Earthquake','Ice Beam','Thunderbolt','Dragon Rage','Psywave','Fissure','DoubleSlap','Triple Kick'])assert.deepEqual(calc(name,mon,mon,weather),calc(name),`${name}/${weather}`);
 for(const name of ['Surf','Flamethrower','SolarBeam'])assert.ok(calc(name).rolls);
 assert.deepEqual(calc('SolarBeam',mon,mon,'sun'),calc('SolarBeam'));
});
test('rounding-identical and immunity-proven damage stays available',()=>{
 const tiny={...mon,level:1,stats:{...mon.stats,spAttack:1}};
 assert.deepEqual(calc('Surf',tiny,mon,'rain'),calc('Surf',tiny));
 for(const weather of ['rain','sun']) {
  assert.equal(calc('Surf',mon,{...mon,ability:'Water Absorb'},weather).max,0);
  assert.equal(calc('Flamethrower',mon,{...mon,ability:'Flash Fire'},weather).max,0);
  assert.equal(calc('Surf',mon,{...mon,ability:'Wonder Guard'},weather).outcome,'blocked');
 }
 assert.deepEqual(calc('Flamethrower',mon,{...mon,ability:'Flash Fire',status:'freeze'},'sun'),weatherUnknown);
 assert.deepEqual(calc('False Swipe',mon,{...mon,currentHp:1},'sun'),calc('False Swipe',mon,{...mon,currentHp:1}));
});
test('Weather Ball metadata remains unknown even if every possible type deals zero damage',()=>{
 const a={...mon,abilityOptions:known('Immunity')},d={...mon,ability:'Wonder Guard',abilityOptions:known('Wonder Guard')};
 for(const weather of ['sun','rain','sand','hail']) {
  const result=calculateAbilityScenarios(battleMove('Weather Ball'),a,d,{weather,battleContext:context});
  assert.equal(result.groups.length,1);assert.equal(result.groups[0].reason,'unknown-weather-suppression-field');assert.equal(result.groups[0].moveMetadata,null);
 }
 const d2={...d,ability:'Cloud Nine',abilityOptions:known('Cloud Nine')};
 const knownResult=calculateAbilityScenarios(battleMove('Weather Ball'),a,d2,{weather:'rain',battleContext:context});
 assert.deepEqual(knownResult.groups[0].moveMetadata,{type:'NORMAL',power:50});assert.equal(knownResult.groups[0].availability,'available');
});
test('Forecast affects STAB and incoming immunity only when the change matters',()=>{
 const cast={...mon,dex:351,ability:'Forecast'};
 for(const weather of ['sun','rain','hail']) {
  assert.deepEqual(calc('Strength',cast,mon,weather),weatherUnknown);
  assert.deepEqual(calc('Night Shade',mon,cast,weather),weatherUnknown);
  assert.deepEqual(calc('Fissure',mon,cast,weather),calc('Fissure',mon,cast));
  assert.deepEqual(calc('Dragon Rage',mon,cast,weather),calc('Dragon Rage',mon,cast));
 }
 assert.deepEqual(calc('Strength',cast,mon,'sand'),calc('Strength',cast));
 assert.deepEqual(calc('Strength',{...cast,ability:'Trace',copiedAbility:'Forecast'},mon,'sun'),weatherUnknown);
 assert.deepEqual(calc('Strength',{...cast,ability:'Immunity'},mon,'sun'),calc('Strength'));
 assert.deepEqual(calc('Strength',{...mon,dex:282,ability:'Trace',copiedAbility:'Forecast'},mon,'sun'),calc('Strength')); 
 for(const ability of ['Cloud Nine','Air Lock'])assert.deepEqual(calc('Night Shade',{...mon,ability},cast,'rain'),calc('Night Shade',{...mon,ability},cast));
});
test('different HP filters: fainted represented suppressor blocks base weather but not Forecast/Weather Ball scripts',()=>{
 const fainted={...mon,ability:'Cloud Nine',currentHp:0};
 assert.deepEqual(calc('Surf',mon,fainted,'rain'),calc('Surf',mon,fainted));
 assert.equal(calc('Weather Ball',mon,fainted,'hail').reason,'unknown-weather-suppression-field');
 assert.deepEqual(calc('Weather Ball',mon,{...fainted,currentHp:1},'hail'),calc('Weather Ball',mon,{...fainted,currentHp:1}));
 const singles={format:'Singles'};
 assert.equal(calc('Weather Ball',mon,fainted,'hail',singles).max,48,'living-only weather script still doubles Ice50, base unaffected by hail');
 assert.equal(calc('Weather Ball',mon,fainted,'rain',singles).max,48,'base weather sees fainted suppressor while the script still doubles Water50');
 assert.equal(calc('Strength',{...mon,dex:351,ability:'Forecast'},fainted,'sun',singles).max,37,'Forecast still changes typing without a living suppressor');
 assert.equal(calc('Strength',{...mon,dex:351,ability:'Forecast',currentHp:0},mon,'sun',singles).max,55,'Forecast does not change a zero-HP Castform’s supplied types');
});
test('active counts are not ability-record knowledge; no inference from reserve slots',()=>{
 const oneEach={...context,attackerSideAlive:1,defenderSideAlive:1};
 assert.deepEqual(calc('Flamethrower',mon,mon,'sun',oneEach),weatherUnknown);
 assert.equal(calc('Weather Ball',mon,mon,'hail',oneEach).reason,'unknown-weather-suppression-field');
 for(const name of ['Explosion','Self Destruct'])assert.equal(calc(name,mon,mon,'none',oneEach).reason,'unknown-damp-field');
});
for(const name of ['Explosion','Self Destruct'])test(`${name}: unseen Damp is unavailable only when it can change damage`,()=>{
 assert.equal(calc(name).reason,'unknown-damp-field');
 assert.equal(calc(name,mon,mon,'none',{format:'Singles'}).kind,'standard-damage');
 for(const own of [true,false])for(const currentHp of [0,200]) {
  const damp={...mon,ability:'Damp',currentHp};
  assert.equal(calc(name,own?damp:mon,own?mon:damp).reason,'damp');
 }
 const ghost={...mon,types:['GHOST']};assert.equal(calc(name,mon,ghost).max,0);
 assert.equal(calc(name,mon,{...mon,ability:'Wonder Guard'}).outcome,'blocked');
 const copied={...mon,ability:'Trace',copiedAbility:'Damp'};assert.equal(calc(name,copied).reason,'damp');
});
test('Damp does not affect unrelated, conditional, fixed, multi-hit or OHKO paths',()=>{
 for(const name of ['Strength','Surf','Magnitude','DoubleSlap','Dragon Rage','Psywave','Fissure'])assert.deepEqual(calc(name,{...mon,ability:'Damp'}),calc(name),name);
});
test('Plus/Minus keeps unknown-field safeguards while unresolved Trace stays neutral',()=>{
 assert.equal(calc('Surf',{...mon,ability:'Plus'}).reason,'unknown-plus-minus-field');
 assert.deepEqual(calc('Surf',{...mon,ability:'Trace'}),calc('Surf'));
 const a={...mon,ability:'Trace',copiedAbility:'Plus'},d={...mon,ability:'Minus'};
 assert.ok(calc('Surf',a,d).rolls);assert.deepEqual(calc('Surf',a,d,'rain'),weatherUnknown);
 assert.ok(calc('Strength',a).rolls);assert.ok(calc('Dragon Rage',{...mon,ability:'Trace'}).damage);
});
test('known/uncertain abilities remain separate, copied abilities replace Trace, no duplicate groups',()=>{
 const a={...mon,abilityOptions:known('Immunity')},d={...mon,ability:'Trace',copiedAbility:'Cloud Nine',abilityOptions:uncertain(['Trace','Synchronize'])};
 for(const [attacker,defender] of [[a,d],[d,a]]) {
  const r=calculateAbilityScenarios(battleMove('Flamethrower'),attacker,defender,{weather:'sun',battleContext:context});
  assert.deepEqual(r.groups.map(g=>g.availability),['available','unsupported']);assert.equal(r.scenarios.length,2);
  assert.equal(r.groups[1].reason,'unknown-weather-suppression-field');
 }
 const damp={...d,copiedAbility:'Damp'};
 const r=calculateAbilityScenarios(battleMove('Explosion'),a,damp,{battleContext:context});assert.deepEqual(r.groups.map(g=>g.availability),['blocked','unsupported']);
 const unchanged=structuredClone({a,d});calc('Weather Ball',a,d,'rain');assert.deepEqual({a,d},unchanged);
});
test('conditional cases and multi-hit distributions are guarded independently without removing existing safeguards',()=>{
 const cast={...mon,dex:351,ability:'Forecast'};
 const r=calc('Magnitude',mon,cast,'sun');assert.ok(r.conditions.every(c=>c.result.reason==='unknown-weather-suppression-field'));
 assert.equal(calc('Bullet Seed',mon,{...cast,types:['NORMAL']},'sun').reason,'unknown-weather-suppression-field');
 assert.equal(calc('DoubleSlap',mon,{...mon,ability:'Color Change'},'rain').reason,'unmodeled-multi-hit-ability');
 for(const name of ['Counter','Future Sight','Growl'])assert.equal(calc(name,mon,mon,'rain'),null);
});
test('usability sweep: neutral matchup keeps the great majority of moves free of new field guards',()=>{
 const a={...mon,friendship:255,ivs:{hp:31,attack:31,defense:31,spAttack:31,spDefense:31,speed:31}};
 for(const weather of ['none','sun','rain','sand','hail']) {
  const guarded=[];
  for(let id=1;id<=354;id++) {
   const move=battleMove(id),r=calculateCoreDamage(move,a,a,weather,false,{...context,hitCount:3});
   if(['unknown-weather-suppression-field','unknown-damp-field'].includes(r?.reason))guarded.push(id);
  }
  assert.ok(guarded.length<=31,`${weather}: guards must stay targeted`);
  if(weather==='none')assert.deepEqual(guarded,[120,153]);
 }
});
