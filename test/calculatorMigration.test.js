// Independent literal fixtures retained from the retired engine's tests.
// Only supported single-use damage is migrated; no old engine/API or KO adapter.
import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateBasicDamage,basicDamageScenarios,prepareBasicDamage} from '../src/battle/basicDamage.js';
import {resolveVariableMove} from '../src/battle/variableDamage.js';
import {battleMove} from '../src/battle/reference.js';
import {battleMoveEffectiveness} from '../src/battle/battleMoveEffectiveness.js';
const mon={name:'Test',dex:1,level:50,types:['NORMAL'],ability:'Overgrow',item:'None',stats:{hp:100,attack:100,defense:100,spAttack:100,spDefense:100}};
// This synthetic HIT100 operand fixture is intentional, not reference Strength80.
const hit={name:'Fixture hit',type:'NORMAL',power:100,effect:'HIT'};
const conditions=(a,d)=>({weather:a.weather,critical:a.critical,
 attacker:{currentHp:a.currentHp,status:a.status,stages:a.stages},
 defender:{currentHp:d.currentHp,status:d.status,stages:d.stages,screens:d.screens}});
const calc=(move=hit,a=mon,d=mon)=>calculateBasicDamage(move,a,d,conditions(a,d));
const groups=(move,a=mon,d=mon)=>basicDamageScenarios(move,a,d,conditions(a,d));

test('migration: HIT100 base44 +2, Normal STAB69, sixteen literal rolls58–69',()=>{
 assert.deepEqual(calc().rolls,[58,59,60,60,61,62,62,63,64,64,65,66,66,67,68,69]);
 assert.equal(calc().min,58);assert.equal(calc().max,69);
});
test('migration: physical Ghost and special Dark categories use separate raw operands',()=>{
 const a={...mon,stats:{...mon.stats,attack:200,spAttack:50}};
 assert.equal(prepareBasicDamage({...hit,type:'GHOST'},a,{...mon,types:['PSYCHIC']}).category,'Physical');
 assert.equal(prepareBasicDamage({...hit,type:'DARK'},a,mon).category,'Special');
});
test('migration: Thick Fat24 and Flash Fire0 stay distinct; chart immunity is zero',()=>{
 assert.deepEqual(groups({...hit,type:'FIRE'},mon,{...mon,ability:'Thick Fat / Flash Fire'}).map(g=>g.result.max),[24,0]);
 assert.equal(calc(hit,mon,{...mon,types:['GHOST']}).max,0);
});
test('migration: Choice Band changes the pre-base operand, yielding102 not a final multiplier',()=>{
 assert.equal(calc(hit,{...mon,item:'Choice Band'}).max,102);
});
test('migration: unsupported/status/missing target inputs never receive ordinary damage',()=>{
 assert.equal(calc({...hit,power:0}),null);
 assert.equal(calc(battleMove('Counter')),null);
 assert.equal(calculateBasicDamage(hit,mon,null),null);
});
test('migration: ordinary raw range and max-HP denominator are independent of target current HP',()=>{
 const full=calc(),damaged=calc(hit,mon,{...mon,currentHp:50});
 assert.deepEqual(damaged,full);assert.equal(full.maximumHp,100);
 assert.equal('koChance' in damaged,false);
});
test('migration: Eruption power150/75/1 at full/half/one HP',()=>{
 for(const [currentHp,power] of [[100,150],[50,75],[1,1]]){
  const a={...mon,currentHp};
  assert.equal(prepareBasicDamage(battleMove('Eruption'),a,mon,conditions(a,mon)).power,power);
  assert.ok(calc(battleMove('Eruption'),a));
 }
});
test('migration: original Flail480-HP bracket fixtures retain20/40/80/100/150/200',()=>{
 for(const [currentHp,power] of [[480,20],[329,40],[169,80],[99,100],[49,150],[10,200]]){
  const a={...mon,stats:{...mon.stats,hp:480},currentHp};
  assert.equal(resolveVariableMove(battleMove('Flail'),a,mon,conditions(a,mon)).power,power);
 }
});
test('migration: Overgrow threshold is33HP, not34, for maxHP100',()=>{
 assert.equal(calc({...hit,type:'GRASS'},{...mon,currentHp:33}).max,68);
 assert.equal(calc({...hit,type:'GRASS'},{...mon,currentHp:34}).max,46);
});
test('migration: +2 Attack135, +2 Defense36, equal stages cancel69',()=>{
 assert.equal(calc(hit,{...mon,stages:{attack:2}}).max,135);
 assert.equal(calc(hit,mon,{...mon,stages:{defense:2}}).max,36);
 assert.equal(calc(hit,{...mon,stages:{attack:2}},{...mon,stages:{defense:2}}).max,69);
});
test('migration: burn36, Guts102 for all six statuses, special damage ignores burn',()=>{
 assert.equal(calc(hit,{...mon,status:'burn'}).max,36);
 for(const status of ['burn','paralysis','poison','toxic','sleep','freeze'])assert.equal(calc(hit,{...mon,ability:'Guts',status}).max,102);
 assert.deepEqual(calc({...hit,type:'WATER'},{...mon,status:'burn'}),calc({...hit,type:'WATER'}));
});
test('migration: Marvel Scale physical46 only while statused',()=>{
 assert.equal(calc(hit,mon,{...mon,ability:'Marvel Scale',status:'poison'}).max,46);
 assert.equal(calc(hit,mon,{...mon,ability:'Marvel Scale',status:'none'}).max,69);
});
test('migration: weather before +2 yields Water68/24 and Fire68',()=>{
 assert.equal(calc({...hit,type:'WATER'},{...mon,weather:'rain'}).max,68);
 assert.equal(calc({...hit,type:'WATER'},{...mon,weather:'sun'}).max,24);
 assert.equal(calc({...hit,type:'FIRE'},{...mon,weather:'sun'}).max,68);
});
test('migration: independent Reflect36 and Light Screen24 fixture values',()=>{
 const d={...mon,screens:{reflect:true,lightScreen:true}};
 assert.equal(calc(hit,mon,d).max,36);
 assert.equal(calc({...hit,type:'WATER'},mon,d).max,24);
});
test('migration: weather suppression from either side yields46; uncertainty preserves46/68',()=>{
 const move={...hit,type:'WATER'},a={...mon,weather:'rain'};
 assert.equal(calc(move,a,{...mon,ability:'Cloud Nine'}).max,46);
 assert.equal(calc(move,{...a,ability:'Air Lock'}).max,46);
 assert.deepEqual(groups(move,a,{...mon,ability:'Cloud Nine / Run Away'}).map(g=>g.result.max),[46,68]);
});
test('migration: sand grants no Rock special-defense boost',()=>{
 const d={...mon,types:['ROCK']},move={...hit,type:'WATER'};
 assert.deepEqual(calc(move,{...mon,weather:'sand'},d),calc(move,mon,d));
});
test('migration: fixed50/40/20 ignore ordinary stat/status/weather/screen boosts',()=>{
 const a={...mon,level:50,status:'burn',item:'Choice Band',weather:'rain',stages:{attack:6}},d={...mon,types:['WATER'],screens:{reflect:true,lightScreen:true},stages:{defense:6}};
 for(const [name,value] of [['Seismic Toss',50],['Dragon Rage',40],['SonicBoom',20]]){
  assert.equal(calc(battleMove(name),a,d).min,value);assert.equal(calc(battleMove(name),a,d).max,value);
 }
});
test('migration: fixed chart immunity0 and SonicBoom Soundproof exception20',()=>{
 assert.equal(calc(battleMove('Seismic Toss'),mon,{...mon,types:['GHOST']}).max,0);
 assert.equal(calc(battleMove('SonicBoom'),mon,{...mon,ability:'Soundproof'}).max,20);
});
test('migration: Super Fang floors51HP to25 and retains minimum1 on a living target',()=>{
 assert.equal(calc(battleMove('Super Fang'),mon,{...mon,currentHp:51}).max,25);
 assert.equal(calc(battleMove('Super Fang'),mon,{...mon,currentHp:1}).max,1);
});
test('migration: all original Low Kick weight boundaries and Aggron/Shroomish species fixtures',()=>{
 for(const [weight,power] of [[9.9,20],[10,40],[24.9,40],[25,60],[49.9,60],[50,80],[99.9,80],[100,100],[199.9,100],[200,120]])
  assert.equal(resolveVariableMove(battleMove('Low Kick'),mon,{...mon,dex:undefined,weight}).power,power);
 assert.equal(resolveVariableMove(battleMove('Low Kick'),mon,{...mon,dex:306}).power,120);
 assert.equal(resolveVariableMove(battleMove('Low Kick'),mon,{...mon,dex:285}).power,20);
});
test('migration: exact friendship0/100/255 preserves both Return and Frustration powers',()=>{
 for(const [friendship,ret,frustration] of [[0,1,102],[100,40,62],[255,102,1]]){
  assert.equal(resolveVariableMove(battleMove('Return'),{...mon,friendship},mon).power,ret);
  assert.equal(resolveVariableMove(battleMove('Frustration'),{...mon,friendship},mon).power,frustration);
 }
 for(const friendship of [null,undefined])for(const name of ['Return','Frustration'])assert.equal(resolveVariableMove(battleMove(name),{...mon,friendship},mon).power,102);
});
test('migration: critical138 and armor69 retain distinct ability scenarios',()=>{
 const a={...mon,critical:true};assert.equal(calc(hit,a).max,138);
 for(const ability of ['Shell Armor','Battle Armor'])assert.equal(calc(hit,a,{...mon,ability}).max,69);
 assert.deepEqual(groups(hit,a,{...mon,ability:'Shell Armor / Water Absorb'}).map(g=>g.result.max),[69,138]);
});
test('migration: critical adverse/favorable stages, screens and burn retain138/534/72/92',()=>{
 const a={...mon,critical:true,stages:{attack:-6}},d={...mon,stages:{defense:6},screens:{reflect:true,lightScreen:true}};
 assert.equal(calc(hit,a,d).max,138);
 assert.equal(calc(hit,{...a,stages:{attack:2}},{...d,stages:{defense:-2}}).max,534);
 assert.equal(calc(hit,{...a,status:'burn'},d).max,72);
 assert.equal(calc({...hit,type:'WATER'},a,d).max,92);
 assert.equal(calc(battleMove('Seismic Toss'),a,d).max,50);
});
test('migration: row Thick Fat effectiveness stays separate from damage operand rounding',()=>{
 const move={...hit,type:'FIRE'},d={...mon,ability:'Thick Fat'};
 assert.equal(battleMoveEffectiveness(move,d).label,'.5×');assert.equal(calc(move,mon,d).max,24);
});
test('migration: Frontier Soul Dew is inactive; Pikachu Light Ball is special-only69/90',()=>{
 const latios={...mon,dex:381,item:'Soul Dew'},move={...hit,type:'PSYCHIC'};
 assert.deepEqual(calc(move,latios),calc(move,{...latios,item:'None'}));
 const pikachu={...mon,dex:25,item:'Light Ball'};
 assert.equal(calc(hit,pikachu).max,69);assert.equal(calc({...hit,type:'ELECTRIC'},pikachu).max,90);
});
