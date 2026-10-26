import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveEffectiveWeather} from '../src/battle/battleConditions.js';
import {resolveConventionalMove} from '../src/battle/dynamicMoves.js';
import {calculateCoreDamage,neutralBaseDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {battleMove} from '../src/battle/reference.js';
const mon={level:50,types:['NORMAL'],ability:'Immunity',item:'None',status:'none',currentHp:50,
 stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const target={...mon,currentHp:101};
const weathers=['none','sun','rain','sand','hail'];
const options=values=>({status:values.length===1?'known':'uncertain',source:'species',values});
const calc=(name,weather='none',a=mon,d=target,critical=false,context={})=>calculateCoreDamage(battleMove(name),a,d,weather,critical,context);
const rolls=max=>Array.from({length:16},(_,i)=>Math.floor(max*(85+i)/100));
test('shared effective weather suppresses from either scalar ability, without mutating weather or masking invalid data',()=>{
 for(const weather of weathers)for(const own of ['Immunity','Cloud Nine','Air Lock'])for(const other of ['Immunity','Cloud Nine','Air Lock'])
  assert.equal(resolveEffectiveWeather(weather,own,other),own==='Immunity'&&other==='Immunity'?weather:'none');
 for(const weather of [null,'Rain','snow','',0,{},'toString']) {
  assert.equal(resolveEffectiveWeather(weather,'Cloud Nine','Air Lock'),null);
  assert.equal(calc('Weather Ball',weather,{...mon,ability:'Cloud Nine'}),null);
  assert.equal(calc('Surf',weather,{...mon,ability:'Air Lock'}),null);
 }
 assert.equal(resolveEffectiveWeather('rain','Cloud Nine / Damp','Immunity'),null);
 assert.equal(calc('Surf','rain',{...mon,ability:'Cloud Nine / Damp'}),null);
 assert.equal(resolveEffectiveWeather('rain','Cloud Nine / Damp','Air Lock'),'none','known suppression is sufficient');
});
test('Rain/Sun Water and Fire modifiers use clear damage with either suppressor on either participant',()=>{
 // Independent Emerald: Lv50, P95, SpA/SpD100 =>subtotal41,+2=43.
 // Boost:floor41*1.5+2=63. Reduction:floor41/2+2=22.
 for(const [name,weather,max] of [['Surf','rain',63],['Surf','sun',22],['Flamethrower','sun',63],['Flamethrower','rain',22]]) {
  assert.deepEqual(calc(name,weather).rolls,rolls(max));
  for(const ability of ['Cloud Nine','Air Lock'])for(const side of ['attacker','defender','both']) {
   const a={...mon,...(side!=='defender'?{ability}:{})},d={...target,...(side!=='attacker'?{ability}:{})};
   assert.deepEqual(calc(name,weather,a,d).rolls,rolls(43));
   assert.deepEqual(calc(name,weather,d,a).rolls,rolls(43),'reverse attacking direction');
   assert.deepEqual(calc(name,weather,a,d),calc(name,'none',a,d));
  }
 }
 const a={...mon,ability:'Cloud Nine'},d={...target,ability:'Air Lock'},before=structuredClone({a,d});
 for(const weather of weathers)calc('Surf',weather,a,d);
 assert.deepEqual({a,d},before);
 assert.deepEqual(calc('Surf','rain').rolls,rolls(63),'weather effects resume with neither suppressor');
});
test('SolarBeam adverse-weather reduction is suppressed in all five conditions with exact truncation',()=>{
 // Emerald P120 gives floor(22*120/50)=52 subtotal,+2=54;
 // rain/sand/hail floor52/2+2=28, with no Grass weather boost in sun.
 for(const weather of weathers) {
  assert.deepEqual(calc('SolarBeam',weather).rolls,rolls(['rain','sand','hail'].includes(weather)?28:54));
  for(const ability of ['Cloud Nine','Air Lock']) {
   assert.deepEqual(calc('SolarBeam',weather,{...mon,ability}).rolls,rolls(54));
   assert.deepEqual(calc('SolarBeam',weather,mon,{...target,ability}).rolls,rolls(54));
  }
 }
 const base={level:50,power:120,moveId:76,type:'GRASS',spAttack:101,spDefense:103};
 for(const weather of weathers)assert.deepEqual(neutralBaseDamage({...base,weather,defenderAbility:'Cloud Nine'}),neutralBaseDamage({...base,weather:'none'}));
});
test('Weather Ball suppression resolves Normal50 BEFORE category, stages, STAB, screens and integer damage',()=>{
 const a={...mon,stats:{hp:200,attack:151,spAttack:81},stages:{attack:1,spAttack:-1}};
 const d={...target,ability:'Cloud Nine',stats:{hp:200,defense:103,spDefense:201},stages:{defense:1,spDefense:2}};
 // Atk226 vsDef154, P50 =>floor(floor(22*50*226/154)/50)+2=34;
 // Normal STAB51; no weather/script doubling.
 for(const weather of weathers) {
  const move=resolveConventionalMove(battleMove('Weather Ball'),a,d,weather);
  assert.deepEqual([move.type,move.power,move.formulaPower,move.damageMultiplier],['NORMAL',50,50,1]);
  const result=calc('Weather Ball',weather,a,d);assert.equal(result.category,'Physical');assert.deepEqual(result.rolls,rolls(51));
  assert.deepEqual(calc('Weather Ball',weather,a,{...d,screens:{lightScreen:true}}),result,'Light Screen irrelevant after suppression');
  assert.ok(calc('Weather Ball',weather,a,{...d,screens:{reflect:true}}).max<51);
 }
 for(const [weather,type,category] of [['rain','WATER','Special'],['sun','FIRE','Special'],['sand','ROCK','Physical'],['hail','ICE','Special']]) {
  assert.equal(calc('Weather Ball',weather,a,{...d,ability:'Immunity'}).category,category);
  assert.equal(resolveConventionalMove(battleMove('Weather Ball'),a,{...d,ability:'Immunity'},weather).type,type);
 }
});
test('suppressed Weather Ball uses its Normal type for effectiveness, abilities and held items',()=>{
 const d={...target,ability:'Air Lock'};
 assert.equal(calc('Weather Ball','rain',mon,{...d,types:['GHOST']}).effectiveness,0);
 assert.equal(calc('Weather Ball','sand',mon,{...d,types:['ROCK','STEEL']}).max,9);
 assert.deepEqual(calc('Weather Ball','sun',{...mon,item:'Silk Scarf'},d).rolls,rolls(39));
 assert.deepEqual(calc('Weather Ball','sun',{...mon,item:'Charcoal'},d).rolls,rolls(36));
 assert.deepEqual(calc('Weather Ball','sun',{...mon,item:'Choice Band'},d).rolls,rolls(52));
 for(const [ability,weather] of [['Blaze','sun'],['Torrent','rain']]) {
  const a={...mon,ability,currentHp:1};
  assert.deepEqual(calc('Weather Ball',weather,a,d).rolls,rolls(36),'pinch abilities see Normal, not selected-weather type');
 }
 for(const ability of ['Thick Fat','Water Absorb','Flash Fire','Wonder Guard']) {
  const a={...mon,ability:'Cloud Nine'},other={...target,ability};
  assert.deepEqual(calc('Weather Ball','rain',a,other),calc('Weather Ball','none',a,other));
 }
});
test('uncertain abilities resolve independently in both directions and group full distributions',()=>{
 const uncertain={...target,abilityOptions:options(['Damp','Cloud Nine'])};
 const groups=calculateAbilityScenarios(battleMove('Surf'),mon,uncertain,{weather:'rain'}).groups;
 assert.deepEqual(groups.map(g=>[g.label,g.max]),[['Damp',63],['Cloud Nine',43]]);
 assert.deepEqual(calculateAbilityScenarios(battleMove('Surf'),uncertain,mon,{weather:'rain'}).groups.map(g=>g.max),[63,43]);
 for(const abilities of [['Cloud Nine','Air Lock'],['Immunity','Damp']]) {
  const result=calculateAbilityScenarios(battleMove('Surf'),mon,{...target,abilityOptions:options(abilities)},{weather:'rain'});
  assert.equal(result.groups.length,1);assert.equal(result.groups[0].scenarios.length,2);
 }
 const both=calculateAbilityScenarios(battleMove('Surf'),{...mon,abilityOptions:options(['Damp','Cloud Nine'])},{...target,abilityOptions:options(['Immunity','Air Lock'])},{weather:'rain'});
 assert.equal(both.scenarios.length,4);assert.deepEqual(both.groups.map(g=>g.scenarios.length),[1,3]);
 assert.equal(calculateAbilityScenarios(battleMove('Surf'),{...mon,ability:null},target,{weather:'rain'}).groups[0].availability,'unavailable');
 // Same range, different frequencies: suppression cannot weaken full-array grouping.
 const calculate=(_m,_a,d)=>({kind:'standard-damage',min:1,max:3,rolls:Array.from({length:16},(_,i)=>i===0?1:i===15?3:d.ability==='Cloud Nine'?2:1)});
 assert.equal(calculateAbilityScenarios(battleMove('Surf'),mon,uncertain,{weather:'rain',calculate}).groups.length,2);
});
test('Weather Ball metadata follows each pinned ability branch, even when damage outcomes coincide',()=>{
 const d={...target,abilityOptions:options(['Damp','Cloud Nine'])};
 const result=calculateAbilityScenarios(battleMove('Weather Ball'),mon,d,{weather:'rain'});
 assert.deepEqual(result.groups.map(g=>g.moveMetadata),[{type:'WATER',power:100},{type:'NORMAL',power:50}]);
 assert.ok(result.groups.every(g=>g.showMoveMetadata));
 const known=calculateAbilityScenarios(battleMove('Weather Ball'),mon,{...target,ability:'Air Lock'},{weather:'sun'}).groups[0];
 assert.deepEqual(known.moveMetadata,{type:'NORMAL',power:50});assert.equal(known.showMoveMetadata,undefined);
 const both=calculateAbilityScenarios(battleMove('Weather Ball'),mon,{...target,abilityOptions:options(['Air Lock','Cloud Nine'])},{weather:'sun'});
 assert.equal(both.groups.length,1);assert.deepEqual(both.groups[0].moveMetadata,{type:'NORMAL',power:50});
 const calculate=()=>({kind:'standard-damage',rolls:Array(16).fill(0),min:0,max:0});
 assert.equal(calculateAbilityScenarios(battleMove('Weather Ball'),mon,d,{weather:'rain',calculate}).groups.length,2,'different metadata must remain attributable despite equal rolls');
 const unknown=calculateAbilityScenarios(battleMove('Weather Ball'),mon,{...target,ability:null},{weather:'rain'}).groups[0];
 assert.equal(unknown.moveMetadata,null);assert.equal(unknown.availability,'unavailable');
});
test('screens, criticals, burn, Guts and defensive items retain their formula ordering under suppression',()=>{
 for(const critical of [false,true])for(const weather of weathers) {
  const a={...mon,ability:'Guts',status:'burn',item:'Choice Band',stages:{attack:-2,spAttack:-1}};
  const d={...target,ability:'Cloud Nine',screens:{reflect:true,lightScreen:true},stages:{defense:2,spDefense:1}};
  for(const name of ['Strength','Surf','SolarBeam','Weather Ball','Triple Kick'])
   assert.deepEqual(calc(name,weather,a,d,critical),calc(name,'none',a,d,critical));
 }
 const a={...mon,ability:'Cloud Nine'},d={...target,dex:366,item:'DeepSeaScale',ability:'Thick Fat'};
 assert.deepEqual(calc('Flamethrower','sun',a,d),calc('Flamethrower','none',a,d));
 assert.equal(calc('Surf','rain',a,{...target,screens:{lightScreen:true}}).base,22);
 assert.equal(calc('Weather Ball','rain',a,{...target,screens:{reflect:true}}).base,13);
 assert.equal(calc('Surf','rain',a,{...target,screens:{lightScreen:true}},false,{format:'Doubles'}).reason,'unknown-defender-side-count');
});
test('all multi-hit modes, deterministic outcomes and prevention retain their existing contracts',()=>{
 for(const name of ['Double Kick','Twineedle','Bonemerang','DoubleSlap','Icicle Spear','Bullet Seed','Triple Kick']) {
  const a={...mon,ability:'Cloud Nine'};
  const result=calc(name,'sun',a);assert.deepEqual(result,calc(name,'none',a));
  assert.equal(result.distribution.reduce((n,e)=>n+e.count,0),result.totalOutcomes);
 }
 for(const name of ['Seismic Toss','Night Shade','Dragon Rage','SonicBoom','Super Fang','Endeavor'])for(const weather of weathers) {
  const a={...mon,ability:'Air Lock'};assert.deepEqual(calc(name,weather,a),calc(name,'none',a));
 }
 for(const [name,ability,reason] of [['Hyper Voice','Soundproof','soundproof'],['Explosion','Damp','damp'],['Weather Ball','Wonder Guard','wonder-guard']]) {
  const a={...mon,ability:'Cloud Nine'};
  assert.equal(calc(name,'rain',a,{...target,ability}).reason,reason);
 }
 const d={...target,abilityOptions:options(['Air Lock','Soundproof'])};
 assert.deepEqual(calculateAbilityScenarios(battleMove('Hyper Voice'),mon,d,{weather:'rain'}).groups.map(g=>g.availability),['available','blocked']);
 assert.equal(calculateAbilityScenarios(battleMove('Seismic Toss'),mon,{...target,abilityOptions:options(['Cloud Nine','Air Lock'])},{weather:'sun'}).groups.length,1);
});
test('Forecast uses Normal typing when weather is suppressed',()=>{
 const castform={...target,dex:351,ability:'Forecast'},a={...mon,ability:'Cloud Nine'};
 assert.deepEqual(calc('Surf','rain',a,castform),calc('Surf','none',a,castform));
 assert.deepEqual(calc('Surf','rain',castform,a),calc('Surf','none',castform,a));
 assert.equal(calc('Dragon Rage','rain',a,castform).damage,40,'form-independent fixed damage remains supported');
});
