import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage,lowHpMovePower} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios,opponentAbilityOptions,playerAbilityOptions} from '../src/battle/abilityScenarios.js';
import {battleMove} from '../src/battle/reference.js';
const mon={level:50,currentHp:150,types:['NORMAL'],ability:'Immunity',stats:{hp:150,attack:100,defense:100,spAttack:100,spDefense:100}};
const move=type=>({id:1,type,power:95,effect:'HIT'});
const calc=(ability,type,currentHp,extra={},d=mon,w='none',c=false)=>calculateCoreDamage(move(type),{...mon,ability,currentHp,...extra},d,w,c);
// Emerald CalculateBaseDamage changes move power before dividing by defense/50:
// https://github.com/pret/pokeemerald/blob/master/src/pokemon.c
// Lv50 P95 -> floor(95*150/100)=142. floor(22*142*100/100/50)+2=64.

test('all four abilities use the exact HP boundary, matching type and integer power flooring',()=>{
 for(const [ability,type] of [['Torrent','WATER'],['Blaze','FIRE'],['Overgrow','GRASS'],['Swarm','BUG']]) {
  for(const [hp,power,base] of [[51,95,43],[50,142,64],[49,142,64],[0,142,64]]) {
   assert.equal(lowHpMovePower(95,type,ability,hp,150),power);
   assert.equal(calc(ability,type,hp).base,base);
  }
  assert.deepEqual(calc(ability,'ICE',1),calc('Immunity','ICE',1));
  // Uneven maximum HP:50*3 <=151 but51*3 >151.
  assert.equal(calc(ability,type,50,{stats:{...mon.stats,hp:151}}).base,64);
  assert.equal(calc(ability,type,51,{stats:{...mon.stats,hp:151}}).base,43);
 }
});
test('inactive abilities preserve every roll and the defender HP never activates the attacker',()=>{
 for(const [ability,type] of [['Torrent','WATER'],['Blaze','FIRE'],['Overgrow','GRASS'],['Swarm','BUG']]) {
  assert.deepEqual(calc(ability,type,150),calc('Immunity',type,150));
  assert.deepEqual(calc(ability,type,51,{}, {...mon,currentHp:1,ability}),calc(ability,type,51));
  assert.equal(calc(ability,type,50,{}, {...mon,currentHp:150}).base,64);
 }
});
test('real move STAB/weather/critical damage follows power boost then subtotal weather and +2',()=>{
 const attacker={...mon,ability:'Torrent',types:['WATER'],currentHp:50};
 // Surf95 -> power142 -> subtotal62 -> rain93,+2=95 ->STAB142 -> random120..142.
 const rain=calculateCoreDamage(battleMove('Surf'),attacker,mon,'rain');
 assert.deepEqual([rain.base,rain.min,rain.max],[95,120,142]);
 assert.deepEqual(rain.rolls,[120,122,123,124,126,127,129,130,132,133,134,136,137,139,140,142]);
 // Sun31+2=33 ->crit66 ->STAB99 ->random84..99.
 const sun=calculateCoreDamage(battleMove('Surf'),attacker,mon,'sun',true);
 assert.deepEqual([sun.base,sun.min,sun.max],[33,84,99]);
 // Grass resistance is applied after STAB: rain142 /2=71 ->random60..71.
 const resisted=calculateCoreDamage(battleMove('Surf'),attacker,{...mon,types:['GRASS']},'rain');
 assert.deepEqual([resisted.min,resisted.max],[60,71]);
});
test('physical Swarm combines with stages, burn, STAB and critical stage bypass',()=>{
 const a={...mon,ability:'Swarm',types:['BUG'],currentHp:50,status:'burn',stages:{attack:-2}};
 const d={...mon,stages:{defense:2}};
 // Bug P95->142; critical bypasses -ATK/+DEF; subtotal62 ->burn31,+2=33;
 // crit66 ->STAB99 ->random84..99.
 const result=calculateCoreDamage(move('BUG'),a,d,'rain',true);
 assert.deepEqual([result.base,result.min,result.max],[33,84,99]);
 // +2 Attack retained: subtotal124 ->burn62,+2=64 ->crit128 ->STAB192.
 assert.equal(calculateCoreDamage(move('BUG'),{...a,stages:{attack:2}},d,'none',true).max,192);
});
test('both directions read their own HP, and uncertain ability scenarios split only when active',()=>{
 const player={...mon,dex:260,types:['WATER','GROUND'],ability:'Torrent',currentHp:50};
 const opponent={...mon,dex:267,name:'Beautifly',types:['BUG','FLYING'],ability:'Swarm',currentHp:51};
 // Swarm-only Beautifly is known from Gen III species data; outgoing Torrent activates independently.
 player.abilityOptions=playerAbilityOptions(player);opponent.abilityOptions=opponentAbilityOptions(opponent);
 const out=calculateAbilityScenarios(move('WATER'),player,opponent);
 const incoming=calculateAbilityScenarios(move('BUG'),opponent,player);
 assert.equal(out.groups[0].max,96);assert.equal(incoming.groups[0].max,64);
 const alternatives={...mon,dex:214,types:['BUG','FIGHTING'],abilityOptions:opponentAbilityOptions({dex:214})};
 const high=calculateAbilityScenarios(move('BUG'),{...alternatives,currentHp:51},mon);
 assert.equal(high.groups.length,1);assert.equal(high.groups[0].label,'');
 const low=calculateAbilityScenarios(move('BUG'),{...alternatives,currentHp:50},mon);
 assert.deepEqual(low.groups.map(g=>g.label),['Swarm','Guts']);assert.deepEqual(low.groups.map(g=>g.max),[96,64]);
 const missingHp=calculateAbilityScenarios(move('BUG'),{...alternatives,currentHp:undefined},mon);
 assert.deepEqual(missingHp.groups.map(g=>g.availability),['unavailable','available']);
});
test('missing, uncertain or invalid HP cannot silently activate/deactivate a relevant ability',()=>{
 for(const hp of [undefined,null,NaN,Infinity,-1,151,1.5,'50','50–75'])assert.equal(calc('Torrent','WATER',hp),null);
 for(const hp of [undefined,null,0,NaN,Infinity,1.5,'150','140–160'])
  assert.equal(calc('Torrent','WATER',50,{stats:{...mon.stats,hp}}),null);
 assert.equal(calc('Torrent','WATER',1,{stats:{...mon.stats,hp:1}}).base,43,'Shedinja-size HP1 needs HP0 to meet threshold');
 assert.ok(calc('Torrent','WATER',0,{stats:{...mon.stats,hp:1}}));
 assert.ok(calc('Torrent','NORMAL',undefined),'irrelevant HP does not block a nonmatching move');
 const a={...mon,ability:'Blaze',currentHp:50},before=structuredClone(a);
 calculateCoreDamage(move('FIRE'),a,mon);assert.deepEqual(a,before);
});
