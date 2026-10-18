import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateBasicDamage,prepareBasicDamage,formatBasicDamage} from '../src/battle/basicDamage.js';
import {battleMove} from '../src/battle/reference.js';
const a={level:50,types:['ELECTRIC'],stats:{hp:200,attack:101,defense:100,spAttack:103,spDefense:100}};
const d={...a,types:['NORMAL'],stats:{...a.stats,attack:100,spAttack:100}};
const calc=(name='Strength',conditions={},own=a,other=d)=>calculateBasicDamage(battleMove(name),own,other,conditions);
const range=r=>[r.min,r.max];

test('six stage ratios floor raw stats once and produce independently derived physical/special bases',()=>{
 const cases=[
  // stage, Attack101, SpA103, physical base, special base, Def stage base, SpD stage base
  [1,151,154,55,66,25,30],[2,202,206,73,88,19,23],[-1,67,68,25,30,55,67],
  [-2,50,51,19,23,73,88],[6,404,412,144,174,10,12],[-6,25,25,10,12,144,174],
 ];
 for(const [stage,attack,spAttack,physical,special,defense,spDefense] of cases){
  const conditions={attacker:{stages:{attack:stage,spAttack:stage}}};
  assert.equal(prepareBasicDamage(battleMove('Strength'),a,d,conditions).attack,attack);
  assert.equal(prepareBasicDamage(battleMove('Surf'),a,d,conditions).attack,spAttack);
  assert.equal(calc('Strength',conditions).base,physical);assert.equal(calc('Surf',conditions).base,special);
  assert.equal(calc('Strength',{defender:{stages:{defense:stage}}}).base,defense);
  assert.equal(calc('Surf',{defender:{stages:{spDefense:stage}}}).base,spDefense);
 }
 // +1 Attack151/Def150 => floor(265760/150)=1771; /50 =>35; +2=37.
 assert.deepEqual(range(calc('Strength',{attacker:{stages:{attack:1}},defender:{stages:{defense:1}}})),[31,37]);
});
test('only relevant attacking/defending stages apply; HP/Speed do not affect damage',()=>{
 const physical={attacker:{stages:{spAttack:6,speed:6,hp:6}},defender:{stages:{spDefense:-6,speed:-6,hp:-6}}};
 assert.deepEqual(calc('Strength',physical),calc());
 const special={attacker:{stages:{attack:6,speed:-6}},defender:{stages:{defense:-6,speed:6}}};
 assert.deepEqual(calc('Surf',special),calc('Surf'));
});
test('rain/sun modify Water and Fire subtotal before +2; sand/hail do not boost ordinary damage',()=>{
 // Surf/Flamethrower: subtotal43. Boost floor(43*1.5)=64,+2=66; reduce floor43/2=21,+2=23.
 for(const [move,boost,reduce] of [['Surf','rain','sun'],['Flamethrower','sun','rain']]){
  assert.deepEqual(range(calc(move,{weather:boost})),[56,66]);
  assert.deepEqual(range(calc(move,{weather:reduce})),[19,23]);
  for(const weather of ['none','sand','hail'])assert.deepEqual(range(calc(move,{weather})),[38,45]);
 }
 for(const weather of ['rain','sun','sand','hail'])assert.deepEqual(calc('Strength',{weather}),calc());
});
test('manual Gen 3 critical is x2 after +2, independently ignores adverse stages and keeps favorable stages',()=>{
 // Strength base37 =>74, random gives62–74. Surf base45 =>90, gives76–90.
 assert.deepEqual(range(calc('Strength',{critical:true})),[62,74]);
 assert.deepEqual(range(calc('Surf',{critical:true})),[76,90]);
 for(const move of ['Strength','Surf']){
  const attack=move==='Strength'?'attack':'spAttack',defense=move==='Strength'?'defense':'spDefense';
  for(const patch of [{attacker:{stages:{[attack]:-6}}},{defender:{stages:{[defense]:6}}},{attacker:{stages:{[attack]:-6}},defender:{stages:{[defense]:6}}}])
   assert.deepEqual(calc(move,{critical:true,...patch}),calc(move,{critical:true}));
 }
 // Favorable stage +1 Attack remains151 even with +6 opposing Defense ignored: base55 doubled110.
 assert.deepEqual(range(calc('Strength',{critical:true,attacker:{stages:{attack:1}},defender:{stages:{defense:6}}})),[93,110]);
 // -6 Attack ignored while favorable -1 Defense remains66: also base55 doubled110.
 assert.deepEqual(range(calc('Strength',{critical:true,attacker:{stages:{attack:-6}},defender:{stages:{defense:-1}}})),[93,110]);
});
test('burn and Singles screens halve subtotal separately; crit bypasses screens but retains burn',()=>{
 // Physical subtotal35 =>burn17,+2=19 (not floor37/2=18); both reductions35->17->8,+2=10.
 const burn={attacker:{status:'burn'}},reflect={defender:{screens:{reflect:true}}};
 assert.deepEqual(range(calc('Strength',burn)),[16,19]);assert.deepEqual(range(calc('Strength',reflect)),[16,19]);
 assert.deepEqual(range(calc('Strength',{...burn,...reflect})),[8,10]);
 assert.deepEqual(range(calc('Strength',{critical:true,...burn,...reflect})),[32,38]);
 assert.deepEqual(calc('Surf',burn),calc('Surf'));
 assert.deepEqual(range(calc('Surf',{defender:{screens:{lightScreen:true}}})),[19,23]);
 for(const move of ['Strength','Surf'])assert.deepEqual(calc(move,{critical:true,defender:{screens:{reflect:true,lightScreen:true}}}),calc(move,{critical:true}));
 assert.deepEqual(calc('Strength',{defender:{screens:{lightScreen:true}}}),calc());
 assert.deepEqual(calc('Surf',reflect),calc('Surf'));
});
test('combined special stages/screen/rain/STAB/dual weakness maintain cartridge rounding order',()=>{
 const own={...a,types:['WATER']},other={...d,types:['ROCK','FIRE']};
 const conditions={weather:'rain',attacker:{stages:{spAttack:1},status:'burn'},defender:{stages:{spDefense:-1},screens:{lightScreen:true}}};
 // SA154/SD66 =>subtotal97; screen48; rain72; +2=74; STAB111; Rock/Fire: Fire222, Rock444.
 assert.deepEqual(range(calc('Surf',conditions,own,other)),[377,444]);
 // Crit keeps favorable stages, ignores screen:97->rain145->+2=147->crit294->STAB441->4x1764.
 assert.deepEqual(range(calc('Surf',{...conditions,critical:true},own,other)),[1499,1764]);
});
test('combined physical stages/burn/Reflect/STAB/resistance retain critical stage interactions',()=>{
 const own={...a,types:['NORMAL']},other={...d,types:['ROCK']};
 const conditions={attacker:{stages:{attack:1},status:'burn'},defender:{stages:{defense:1},screens:{reflect:true}}};
 // A151/D150 subtotal35, burn17, Reflect8,+2=10,STAB15,Rock7 =>5–7.
 assert.deepEqual(range(calc('Strength',conditions,own,other)),[5,7]);
 // Crit uses A151/D100 subtotal53,burn26,+2=28,crit56,STAB84,Rock42 =>35–42.
 assert.deepEqual(range(calc('Strength',{...conditions,critical:true},own,other)),[35,42]);
});
test('conditions stay explicit and inputs stay immutable with neutral abilities/items',()=>{
 const own={...a,ability:'None',item:'None',stages:{attack:6},status:'burn',weather:'rain',critical:true,currentHp:1};
 const other={...d,ability:'None',item:'Focus Band',stages:{defense:6},screens:{reflect:true},currentHp:1};
 const conditions={critical:true,attacker:{status:'burn'}},before=structuredClone({own,other,conditions});
 assert.deepEqual(calc('Strength',{},own,other),calc());
 assert.deepEqual(range(calc('Strength',conditions,own,other)),[32,38]);
 assert.equal(formatBasicDamage(calc('Strength',conditions,own,other)),'16.0–19.0% · 32–38 HP');
 assert.deepEqual({own,other,conditions},before);
 for(const status of ['poison','toxic','paralysis','sleep','freeze'])assert.deepEqual(calc('Strength',{attacker:{status}}),calc());
 assert.deepEqual(calc('Surf',{weather:'rain'}, {...a,ability:'Cloud Nine'},other),calc('Surf'));
 for(const name of ['Explosion'])assert.equal(calc(name,{weather:'rain',critical:true}),null);
});
