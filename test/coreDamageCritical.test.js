import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {battleMove} from '../src/battle/reference.js';
const mon={level:50,types:['ELECTRIC'],stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const calc=(name,a=mon,d=mon,weather='none',critical=true)=>calculateCoreDamage(battleMove(name),a,d,weather,critical);
const staged=(stat,value)=>({...mon,stages:{[stat]:value}});
// Literal hand-worked references verified against Emerald CalculateBaseDamage
// (src/pokemon.c) and Cmd_damagecalc/Cmd_typecalc/ApplyRandomDmgMultiplier
// (src/battle_script_commands.c): weather, +2, critical ×2, STAB, types, random.
// https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c

test('neutral critical doubles base before random; unchecked is exactly the prior result',()=>{
 // Strength: floor(22*80*100/100/50)+2=37; crit74, random62..74.
 assert.deepEqual(calc('Strength').rolls,[62,63,64,65,65,66,67,68,68,69,70,71,71,72,73,74]);
 assert.equal(calc('Strength').base,37);
 assert.deepEqual(calc('Strength',mon,mon,'none',false),calculateCoreDamage(battleMove('Strength'),mon,mon));
 assert.equal(calc('Strength',mon,mon,'none',false).min,31); // doubling this would incorrectly give62..74 at some rolls.
 assert.equal(calc('Strength').rolls[1],63); // normal roll31 doubled would incorrectly be62.
});

test('physical and special critical stage exceptions preserve beneficial stages independently',()=>{
 for(const [name,offense,defense] of [['Strength','attack','defense'],['Flamethrower','spAttack','spDefense']]) {
  const baseline=calc(name);
  for(const stage of [-6,-2,-1])assert.deepEqual(calc(name,staged(offense,stage)),baseline);
  for(const stage of [1,2,6])assert.deepEqual(calc(name,mon,staged(defense,stage)),baseline);
  const boosted=calc(name,staged(offense,2));
  assert.equal(boosted.base,name==='Strength'?72:85);assert.equal(boosted.max,name==='Strength'?144:170);
  const vulnerable=calc(name,mon,staged(defense,-2));
  assert.equal(vulnerable.max,boosted.max);
  // Ignore the attack penalty while retaining the defense reduction, and vice versa.
  assert.deepEqual(calc(name,staged(offense,-2),staged(defense,-2)),vulnerable);
  assert.deepEqual(calc(name,staged(offense,2),staged(defense,2)),boosted);
  assert.deepEqual(calc(name,staged(offense,-2),staged(defense,2)),baseline);
 }
});

test('Gen III Ghost is physical, Dark is special, and both attack directions select their own stages',()=>{
 const player={...mon,stages:{attack:-2,spAttack:2,defense:-2,spDefense:2}};
 const enemy={...mon,stages:{attack:2,spAttack:-2,defense:2,spDefense:-2}};
 // Shadow Ball80: outgoing ignores -ATK/+DEF; incoming retains +ATK/-DEF.
 assert.deepEqual([calc('Shadow Ball',player,enemy).max,calc('Shadow Ball',enemy,player).max],[74,284]);
 // Crunch80: outgoing retains +SPA/-SPD; incoming ignores -SPA/+SPD.
 assert.deepEqual([calc('Crunch',player,enemy).max,calc('Crunch',enemy,player).max],[284,74]);
});

test('critical multiplier precedes STAB and type truncation, and immunities remain zero',()=>{
 const normal={...mon,types:['NORMAL']};
 // Strength37 -> crit74 -> STAB111 -> Rock resistance55 -> random46..55.
 const resisted=calc('Strength',normal,{...mon,types:['ROCK']});
 assert.deepEqual([resisted.stab,resisted.effectiveness,resisted.min,resisted.max],[1.5,0.5,46,55]);
 // Without resistance/STAB rounding, doubling normal max55 would miss111.
 assert.equal(calc('Strength',normal).max,111);
 assert.deepEqual(calc('Strength',normal,{...mon,types:['GHOST']}).rolls,Array(16).fill(0));
});

test('weather and stat flooring happen before critical, STAB, types and random',()=>{
 const water={...mon,types:['WATER'],stages:{spAttack:-2}};
 const grass={...mon,types:['GRASS'],stages:{spDefense:2}};
 // Ignore -SPA/+SPD: subtotal41 -> rain61 -> +2=63 -> crit126 -> STAB189 -> resist94.
 const rain=calc('Surf',water,grass,'rain');
 assert.deepEqual([rain.base,rain.min,rain.max],[63,79,94]);
 assert.deepEqual(rain.rolls,[79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94]);
 // Sun: subtotal20+2=22 -> crit44 -> STAB66 -> resist33 -> random28..33.
 assert.deepEqual([calc('Surf',water,grass,'sun').min,calc('Surf',water,grass,'sun').max],[28,33]);
 const fire={...mon,types:['FIRE'],stages:{spAttack:2}};
 // Flamethrower subtotal83 -> sun124 +2=126 -> crit252 -> STAB378.
 assert.deepEqual([calc('Flamethrower',fire,mon,'sun').min,calc('Flamethrower',fire,mon,'sun').max],[321,378]);
});

test('critical never mutates conditions or bypasses missing data, and unchecked stages remain active',()=>{
 const a=staged('attack',-2),d=staged('defense',2),before=structuredClone({a,d});
 assert.equal(calc('Strength',a,d).max,74);assert.equal(calc('Strength',a,d,'none',false).max,10);
 assert.deepEqual({a,d},before);
 for(const stage of [null,NaN,Infinity,'-2',1.5])assert.equal(calc('Strength',staged('attack',stage)),null);
 assert.equal(calc('Strength',{...a,stats:{attack:undefined}}),null);
 assert.equal(calc('Strength',a,{...d,stats:{defense:'100–120'}}),null);
 assert.equal(calc('Strength',a,null),null);assert.equal(calc('Weather Ball').rolls.length,16);
 for(const critical of [null,0,1,'true',{}])assert.equal(calc('Strength',mon,mon,'none',critical),null);
 const guarded={...mon,ability:'Battle Armor',item:'Scope Lens',status:'poison'};
 assert.deepEqual(calc('Strength',guarded,guarded),calc('Strength',mon,mon,'none',false));
 assert.deepEqual(calc('Strength',guarded,mon),calc('Strength'),'attacker armor does not prevent its own crit');
});
