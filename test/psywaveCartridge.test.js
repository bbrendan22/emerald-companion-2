import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMove} from '../src/battle/reference.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {calculatePsywaveDamage,isLevelDamageResult} from '../src/battle/deterministicDamage.js';
import {coreDamageDisplayParts} from '../src/battle/coreDamagePresentation.js';
import baseline from './fixtures/damageFinalizationBaseline.json' with {type:'json'};
const own={...baseline.mon,currentHp:50},target={...own,types:['WATER'],currentHp:101};
const move=battleMove('Psywave');
const calc=level=>calculateCoreDamage(move,{...own,level},target);

// Verified against Cmd_psywavedamageeffect, Cmd_adjustsetdamage and
// Cmd_datahpupdate in pret/pokeemerald src/battle_script_commands.c.
test('Emerald level1 Psywave keeps all eleven rolls: zero5/11 and one6/11',()=>{
 const r=calc(1);
 assert.deepEqual(r.rolls,[0,0,0,0,0,1,1,1,1,1,1]);
 assert.deepEqual(r.distribution,[{damage:0,count:5},{damage:1,count:6}]);
 assert.equal(r.totalOutcomes,11);assert.deepEqual([r.min,r.max],[0,1]);
 assert.equal(isLevelDamageResult(r),true);
 assert.deepEqual(calculatePsywaveDamage(move,{...own,level:1},target),r);
 assert.deepEqual(coreDamageDisplayParts(r,200),{percentage:'0.0% – 0.5%',hp:'0–1 HP damage',note:'11 possible level-based damage rolls'});
 for(const patch of [{rolls:[-1,...r.rolls.slice(1)]},{distribution:[{damage:0,count:6},{damage:1,count:5}]},{min:1},{max:0}])assert.equal(isLevelDamageResult({...r,...patch}),false);
});

test('level50 and100 retain literal cartridge distributions and min/max',()=>{
 for(const [level,expected] of [[50,[25,30,35,40,45,50,55,60,65,70,75]],[100,[50,60,70,80,90,100,110,120,130,140,150]]]){
  const r=calc(level);assert.deepEqual(r.rolls,expected);
  assert.deepEqual(r.distribution,expected.map(damage=>({damage,count:1})));
  assert.deepEqual([r.min,r.max],[expected[0],expected.at(-1)]);
  assert.equal(r.totalOutcomes,11);
 }
 // Removing the old floor changes only level1, not ANY other legal level.
 for(let level=2;level<=100;level++){
  const r=calc(level),previous=Array.from({length:11},(_,i)=>Math.max(1,Math.floor(level*(50+10*i)/100)));
  assert.deepEqual(r.rolls,previous,`level ${level}`);
  assert.equal(r.min,Math.floor(level/2));assert.equal(r.max,Math.floor(level*3/2));
  assert.equal(r.distribution.reduce((sum,e)=>sum+e.count,0),11);
 }
});

test('zero boundary remains a damage outcome distinct from immunity, prevention and unresolved ability state',()=>{
 const a={...own,level:1},dark={...target,types:['DARK']},wg={...target,ability:'Wonder Guard'};
 assert.equal(calculateCoreDamage(move,a,dark).outcome,'immune');
 assert.equal(calculateCoreDamage(move,a,wg).reason,'wonder-guard');
 assert.deepEqual(calculateCoreDamage(move,a,{...wg,types:['FIGHTING']}).rolls,calc(1).rolls,'super-effective Psychic passes Wonder Guard without scaling fixed damage');
 assert.deepEqual(calculateCoreDamage(move,a,{...target,ability:'Trace'}),calculateCoreDamage(move,a,target));
 const enemy={...target,abilityOptions:{status:'uncertain',source:'species',values:['Immunity','Wonder Guard']}};
 const groups=calculateAbilityScenarios(move,a,enemy).groups;
 assert.deepEqual(groups.map(g=>g.availability),['available','blocked']);
 assert.equal(groups[0].hp,'0–1 HP damage');assert.equal(groups[1].message,'Blocked by Wonder Guard');
 const immune=calculateAbilityScenarios(move,a,{...enemy,types:['DARK']}).groups;
 assert.equal(immune.length,1);assert.equal(immune[0].availability,'immune');assert.equal(immune[0].message,'Immune.');
});

test('other fixed/current-HP moves retain exact damage including their own minimum-one rule',()=>{
 for(const level of [1,50,100])for(const [name,damage] of [
  ['Seismic Toss',level],['Night Shade',level],['SonicBoom',20],['Dragon Rage',40],['Super Fang',50],['Endeavor',51],
 ]){
  const r=calculateCoreDamage(battleMove(name),{...own,level},target);
  assert.equal(r.kind,'deterministic-damage');assert.equal(r.damage,damage,name);assert.equal(r.rolls,undefined);
 }
 const superFang=calculateCoreDamage(battleMove('Super Fang'),{...own,level:1},{...target,currentHp:1});
 assert.equal(superFang.damage,1,'Psywave correction does not remove Super Fang minimum-one rule');
 assert.equal(calculateCoreDamage(battleMove('Dragon Rage'),own,{...target,types:['GHOST']}).damage,40);
 for(const name of ['SonicBoom','Super Fang','Endeavor'])assert.equal(calculateCoreDamage(battleMove(name),own,{...target,types:['GHOST']}).outcome,'immune');
});
