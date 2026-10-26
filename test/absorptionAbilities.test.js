import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios,opponentAbilityOptions,playerAbilityOptions} from '../src/battle/abilityScenarios.js';
import {coreDamageDisplayParts} from '../src/battle/coreDamagePresentation.js';
import {battleMove} from '../src/battle/reference.js';
const mon={level:50,currentHp:50,ability:'Immunity',types:['NORMAL'],stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const calc=(name,a=mon,d=mon,w='none',c=false)=>calculateCoreDamage(battleMove(name),a,d,w,c);
const cases=[['Water Absorb','Surf','WATER'],['Volt Absorb','Thunderbolt','ELECTRIC'],['Flash Fire','Flamethrower','FIRE']];
// Emerald battle_util.c AbilityBattleEffects/ABILITYEFFECT_ABSORBING checks the
// incoming type. Flash Fire additionally requires the defender NOT be frozen.
// https://github.com/pret/pokeemerald/blob/master/src/battle_util.c

test('all three defensive immunities yield 16 available zero rolls and the existing zero presentation',()=>{
 for(const [ability,name] of cases) {
  for(const currentHp of [50,200]) {
   const d={...mon,ability,currentHp};
   const r=calc(name,mon,d);
   assert.deepEqual(r.rolls,Array(16).fill(0),ability);
   assert.deepEqual([r.min,r.max,r.effectiveness],[0,0,0]);
   assert.deepEqual(coreDamageDisplayParts(r,d.stats.hp),{percentage:'0% – 0%',hp:'0–0 HP damage'});
  }
 }
});
test('unrelated types retain exact previous damage; an attacker absorption ability never prevents its own attack',()=>{
 for(const [ability,name,type] of cases) {
  const d={...mon,ability};
  for(const other of ['Strength','Surf','Thunderbolt','Flamethrower','Ice Beam'])
   if(battleMove(other).type!==type)assert.deepEqual(calc(other,mon,d),calc(other));
  assert.deepEqual(calc(name,d,mon),calc(name));
 }
 // No assumed Flash Fire offensive activation, even if an unknown flag is supplied.
 assert.deepEqual(calc('Flamethrower',{...mon,ability:'Flash Fire',flashFireActive:true}),calc('Flamethrower'));
});
test('Gen III Flash Fire is disabled by freeze, while other statuses retain immunity',()=>{
 const frozen={...mon,ability:'Flash Fire',status:'freeze'};
 // Neutral Lv50 Fire95: subtotal41,+2=43, random36..43. No automatic thaw mutation.
 assert.deepEqual([calc('Flamethrower',mon,frozen).min,calc('Flamethrower',mon,frozen).max],[36,43]);
 for(const status of ['none','burn','poison','toxic','paralysis','sleep'])
  assert.equal(calc('Flamethrower',mon,{...frozen,status}).max,0);
 for(const [ability,name] of cases.slice(0,2))assert.equal(calc(name,mon,{...mon,ability,status:'freeze'}).max,0);
});
test('immunities override positive weather/critical/STAB/low-HP ability damage in both attack directions',()=>{
 for(const [ability,name,type] of cases) {
  const a={...mon,types:[type],ability:{WATER:'Torrent',FIRE:'Blaze',ELECTRIC:'Static'}[type],stages:{spAttack:6},status:'burn'};
  const d={...mon,ability,stages:{spDefense:-6}};
  const weather=type==='WATER'?'rain':'sun';
  assert.ok(calc(name,a,{...d,ability:'Immunity'},weather,true).max>0);
  assert.deepEqual(calc(name,a,d,weather,true).rolls,Array(16).fill(0));
  assert.deepEqual(calc(name,mon,{...a,ability},weather,true).rolls,Array(16).fill(0));
 }
});
test('real opponent alternatives split matching damage and combine irrelevant or already-immune distributions',()=>{
 const water={...mon,dex:186,types:['WATER'],abilityOptions:opponentAbilityOptions({dex:186})};
 const waterGroups=calculateAbilityScenarios(battleMove('Surf'),mon,water).groups;
 assert.deepEqual(waterGroups.map(g=>g.label),['Water Absorb','Damp']);
 assert.deepEqual(waterGroups.map(g=>g.max),[0,21]);
 assert.equal(calculateAbilityScenarios(battleMove('Strength'),mon,water).groups.length,1);
 const fire={...mon,dex:78,types:['FIRE'],abilityOptions:opponentAbilityOptions({dex:78})};
 const fireGroups=calculateAbilityScenarios(battleMove('Flamethrower'),mon,fire).groups;
 assert.deepEqual(fireGroups.map(g=>g.label),['Run Away','Flash Fire']);assert.deepEqual(fireGroups.map(g=>g.max),[21,0]);
 const frozenGroups=calculateAbilityScenarios(battleMove('Flamethrower'),mon,{...fire,status:'freeze'}).groups;
 assert.equal(frozenGroups.length,1);assert.equal(frozenGroups[0].label,'');
 const lanturn={...mon,dex:171,types:['WATER','ELECTRIC'],abilityOptions:opponentAbilityOptions({dex:171})};
 const voltGroups=calculateAbilityScenarios(battleMove('Thunderbolt'),mon,lanturn).groups;
 assert.deepEqual(voltGroups.map(g=>g.label),['Volt Absorb','Illuminate']);assert.deepEqual(voltGroups.map(g=>g.max),[0,43]);
 const electric={...mon,types:['GROUND'],abilityOptions:{status:'uncertain',source:'species',values:['Volt Absorb','Immunity']}};
 const electricGroups=calculateAbilityScenarios(battleMove('Thunderbolt'),mon,electric).groups;
 assert.equal(electricGroups.length,1);assert.deepEqual(electricGroups[0].rolls,Array(16).fill(0));
 // Known player ability is used exactly when defending against an opponent.
 const player={...mon,dex:134,ability:'Water Absorb'};player.abilityOptions=playerAbilityOptions(player);
 const known=calculateAbilityScenarios(battleMove('Surf'),mon,player);
 assert.equal(known.scenarios.length,1);assert.equal(known.groups[0].availability,'available');assert.equal(known.groups[0].max,0);
});
test('scenarios retain zero-damage availability, no healing/activation mutations, and missing required data remains unavailable',()=>{
 for(const [ability,name] of cases) {
  const d={...mon,ability,abilityOptions:{status:'known',source:'species',values:[ability]}};
  const before=structuredClone({mon,d});
  const result=calculateAbilityScenarios(battleMove(name),mon,d);
  assert.equal(result.groups[0].availability,'available');assert.equal(result.groups[0].hp,'0–0 HP damage');
  assert.deepEqual({mon,d},before);
  assert.equal(calc(name,mon,null),null);
  assert.equal(calc(name,mon,{...d,stats:{spDefense:undefined}}),null);
 }
});
