import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateBasicDamage,basicDamageScenarios,prepareBasicDamage,formatBasicDamage} from '../src/battle/basicDamage.js';
import {battleMove} from '../src/battle/reference.js';
const a={level:50,dex:1,types:['ELECTRIC'],ability:'None',item:'None',stats:{hp:100,attack:101,defense:100,spAttack:101,spDefense:100}};
const d={...a,types:['NORMAL']};
const calc=(name='Strength',own=a,other=d,conditions={})=>calculateBasicDamage(battleMove(name),own,other,conditions);
const range=r=>[r.min,r.max];
const prepared=(name,own,other=d,conditions={})=>prepareBasicDamage(battleMove(name),own,other,conditions);

test('Choice Band modifies Attack before stages and never boosts special damage',()=>{
 assert.deepEqual(range(calc('Strength',{...a,item:'Choice Band'})),[46,55]); // A151 =>base55.
 assert.deepEqual(calc('Surf',{...a,item:'Choice Band'}),calc('Surf'));
 assert.equal(prepared('Strength',{...a,item:'Choice Band'},d,{attacker:{stages:{attack:1}}}).attack,226);
});
test('all Gen 3 type boosters boost the relevant stat by10%, Sea Incense by5%',()=>{
 const items={NORMAL:'Silk Scarf',FIGHTING:'Black Belt',FLYING:'Sharp Beak',POISON:'Poison Barb',GROUND:'Soft Sand',ROCK:'Hard Stone',BUG:'SilverPowder',GHOST:'Spell Tag',STEEL:'Metal Coat',FIRE:'Charcoal',WATER:'Mystic Water',GRASS:'Miracle Seed',ELECTRIC:'Magnet',PSYCHIC:'TwistedSpoon',ICE:'NeverMeltIce',DRAGON:'Dragon Fang',DARK:'BlackGlasses'};
 for(const [type,item] of Object.entries(items))assert.equal(prepareBasicDamage({...battleMove('Strength'),type}, {...a,item},d).attack,111,item);
 // Surf base42+2=44; MysticWaterSpA111=>46+2=48; SeaIncenseSpA106=>44+2=46.
 assert.deepEqual(range(calc('Surf',{...a,item:'Mystic Water'})),[40,48]);
 assert.deepEqual(range(calc('Surf',{...a,item:'Sea Incense'})),[39,46]);
 assert.deepEqual(calc('Strength',{...a,item:'Mystic Water'}),calc());
});
test('Light Ball and DeepSeaTooth are special-only and species-restricted',()=>{
 for(const [dex,item] of [[25,'Light Ball'],[366,'DeepSeaTooth']]){
  assert.deepEqual(range(calc('Surf',{...a,dex,item})),[73,86]); // SpA202=>base86.
  assert.deepEqual(calc('Strength',{...a,dex,item}),calc());
  assert.deepEqual(calc('Surf',{...a,item}),calc('Surf'));
 }
});
test('Thick Club, DeepSeaScale, Metal Powder and Frontier Soul Dew obey species/stat restrictions',()=>{
 for(const dex of [104,105])assert.deepEqual(range(calc('Strength',{...a,dex,item:'Thick Club'})),[62,73]);
 assert.deepEqual(calc('Strength',{...a,item:'Thick Club'}),calc());
 assert.deepEqual(range(calc('Surf',a,{...d,dex:366,item:'DeepSeaScale'})),[19,23]);
 assert.deepEqual(calc('Strength',a,{...d,dex:366,item:'DeepSeaScale'}),calc());
 assert.deepEqual(calc('Surf',a,{...d,item:'DeepSeaScale'}),calc('Surf'));
 assert.deepEqual(range(calc('Strength',a,{...d,dex:132,item:'Metal Powder'})),[16,19]);
 assert.deepEqual(calc('Surf',a,{...d,dex:132,item:'Metal Powder'}),calc('Surf'));
 assert.deepEqual(calc('Strength',a,{...d,item:'Metal Powder'}),calc());
 for(const dex of [380,381]){
  assert.deepEqual(calc('Surf',{...a,dex,item:'Soul Dew'}),calc('Surf'));
  assert.deepEqual(calc('Surf',a,{...d,dex,item:'Soul Dew'}),calc('Surf'));
 }
});
test('Huge/Pure Power and Hustle use cartridge stat order including item and stage floors',()=>{
 for(const ability of ['Huge Power','Pure Power'])assert.deepEqual(range(calc('Strength',{...a,ability})),[62,73]);
 assert.deepEqual(range(calc('Strength',{...a,ability:'Hustle'})),[46,55]);
 for(const ability of ['Huge Power','Pure Power','Hustle'])assert.deepEqual(calc('Surf',{...a,ability}),calc('Surf'));
 const own={...a,ability:'Huge Power',item:'Choice Band'},conditions={attacker:{stages:{attack:1}}};
 //101*2=202; Band303; stage454. Staging raw first would incorrectly yield453.
 assert.equal(prepared('Strength',own,d,conditions).attack,454);
 assert.deepEqual(range(calc('Strength',own,d,conditions)),[136,161]);
 // Huge Power then type item:105*2=210;110%=231 (not floor105*1.1*2=230).
 assert.equal(prepared('Strength',{...a,item:'Silk Scarf',ability:'Huge Power',stats:{...a.stats,attack:105}}).attack,231);
});
test('Guts boosts for primary statuses and removes burn penalty; Marvel Scale boosts Defense only',()=>{
 for(const status of ['burn','poison','toxic','paralysis','sleep','freeze'])
  assert.deepEqual(range(calc('Strength',{...a,ability:'Guts'},d,{attacker:{status}})),[46,55]);
 assert.deepEqual(range(calc('Strength',a,d,{attacker:{status:'burn'}})),[16,19]);
 assert.deepEqual(range(calc('Strength',{...a,ability:'Guts',item:'Choice Band'},d,{attacker:{status:'burn'}})),[68,81]); //101->Band151->Guts226=>base81.
 assert.deepEqual(range(calc('Strength',a,{...d,ability:'Marvel Scale'},{defender:{status:'burn'}})),[21,25]);
 assert.deepEqual(calc('Surf',a,{...d,ability:'Marvel Scale'},{defender:{status:'burn'}}),calc('Surf'));
 assert.deepEqual(calc('Strength',{...a,ability:'Intimidate'}),calc());
});
test('Torrent/Blaze/Overgrow/Swarm use floor(maxHP/3) and floor1.5power, never consume HP',()=>{
 for(const [ability,name,power] of [['Torrent','Surf',142],['Blaze','Flamethrower',142],['Overgrow','Razor Leaf',82],['Swarm','Silver Wind',90]]){
  const own={...a,ability,stats:{...a.stats,hp:101}};
  assert.equal(prepared(name,own,d,{attacker:{currentHp:33}}).power,power);
  assert.equal(prepared(name,own,d,{attacker:{currentHp:34}}).power,battleMove(name).power);
  assert.equal(prepared('Strength',own,d,{attacker:{currentHp:1}}).power,80);
 }
 assert.deepEqual(range(calc('Surf',{...a,ability:'Torrent'},d,{attacker:{currentHp:33}})),[55,65]);
});
test('Thick Fat halves special attack before stages, not final damage; Marvel Scale precedes stages',()=>{
 const own={...a,stats:{...a.stats,spAttack:103}},other={...d,ability:'Thick Fat'};
 assert.deepEqual(range(calc('Flamethrower',own,other)),[19,23]); // SA51=>base23, not floor45/2.
 assert.equal(prepared('Ice Beam',own,other,{attacker:{stages:{spAttack:1}}}).attack,76); //103/2=51 then*1.5=76, not77.
 assert.deepEqual(range(calc('Flamethrower',{...own,item:'Charcoal'},other)),[21,25]); //103->113->56=>base25.
 assert.deepEqual(calc('Surf',own,other),calc('Surf',own,d));
 assert.equal(prepared('Strength',a,{...d,ability:'Marvel Scale'},{defender:{status:'poison',stages:{defense:-1}}}).defense,100); //100*1.5=150 then2/3=100.
});
test('known direct immunities are sixteen zeros with no absorb healing; frozen Flash Fire does not block Fire in Gen3',()=>{
 for(const [ability,name] of [['Levitate','Mud Shot'],['Water Absorb','Surf'],['Volt Absorb','Thunderbolt'],['Flash Fire','Flamethrower']]){
  const other={...d,ability,currentHp:10},before=structuredClone(other),r=calc(name,a,other);
  assert.deepEqual(r.rolls,Array(16).fill(0));assert.equal(formatBasicDamage(r),'0.0% · 0 HP');assert.deepEqual(other,before);
 }
 assert.ok(calc('Flamethrower',a,{...d,ability:'Flash Fire'},{defender:{status:'freeze'}}).min>0);
});
test('Battle/Shell Armor cancel selected crit before stage and screen rules; status and checkbox remain untouched',()=>{
 const conditions={critical:true,attacker:{stages:{attack:-2}},defender:{stages:{defense:2},screens:{reflect:true}}};
 for(const ability of ['Battle Armor','Shell Armor'])assert.deepEqual(range(calc('Strength',a,{...d,ability},conditions)),[5,6]);
 assert.deepEqual(range(calc('Strength',a,d,conditions)),[62,74]);assert.equal(conditions.critical,true);
});
test('Cloud Nine/Air Lock suppress weather from either side without clearing selected weather',()=>{
 const conditions={weather:'rain'};
 for(const ability of ['Cloud Nine','Air Lock']){
  assert.deepEqual(calc('Flamethrower',{...a,ability},d,conditions),calc('Flamethrower'));
  assert.deepEqual(calc('Flamethrower',a,{...d,ability},conditions),calc('Flamethrower'));
 }
 assert.equal(conditions.weather,'rain');
});
test('Forecast uses the same effective weather for STAB and defensive typing, including suppression',()=>{
 const cast={...a,dex:351,types:['NORMAL'],ability:'Forecast'};
 for(const [weather,name,expected] of [['sun','Flamethrower',[82,97]],['rain','Surf',[82,97]],['hail','Ice Beam',[56,66]],['sand','Strength',[46,55]]])
  assert.deepEqual(range(calc(name,cast,d,{weather})),expected);
 for(const [weather,expected] of [['sun',[27,32]],['rain',[9,11]],['hail',[74,88]]])assert.deepEqual(range(calc('Flamethrower',a,cast,{weather})),expected);
 assert.deepEqual(calc('Flamethrower',cast,{...d,ability:'Cloud Nine'},{weather:'sun'}),calc('Flamethrower'));
 assert.deepEqual(calc('Flamethrower',{...a,ability:'Air Lock'},cast,{weather:'sun'}),calc('Flamethrower'));
});
test('uncertain abilities group identical rolls and split differences in either attack direction',()=>{
 const fat={...d,ability:'Thick Fat / Huge Power'};
 assert.equal(basicDamageScenarios(battleMove('Strength'),a,fat).length,1);
 const defensive=basicDamageScenarios(battleMove('Ice Beam'),a,fat);
 assert.deepEqual(defensive.map(g=>[g.label,g.result.min,g.result.max]),[['Thick Fat',18,22],['Huge Power',37,44]]);
 const offensive=basicDamageScenarios(battleMove('Strength'),{...a,ability:'Thick Fat / Huge Power'},d);
 assert.deepEqual(offensive.map(g=>[g.label,g.result.min,g.result.max]),[['Thick Fat',31,37],['Huge Power',62,73]]);
 assert.equal(calc('Ice Beam',a,fat),null); // A single-range API cannot silently choose one.
 const suppressed=basicDamageScenarios(battleMove('Surf'),{...a,dex:351,types:['NORMAL'],ability:'Forecast'},{...d,ability:'Cloud Nine / Damp'},{weather:'rain'});
 assert.deepEqual(suppressed.map(g=>[g.label,...range(g.result)]),[['Cloud Nine',37,44],['Damp',82,97]]);
});
test('unsupported activation/copy states omit output; Focus Band and unconsumed stat berries never fabricate modifiers',()=>{
 for(const own of [{...a,ability:'Trace'},{...a,ability:'Flash Fire'},{...a,item:'Enigma Berry'}])assert.equal(calc('Flamethrower',own),null);
 for(const ability of ['Trace','Wonder Guard'])assert.equal(calc('Strength',a,{...d,ability}),null);
 for(const [own,other] of [['Plus','Minus'],['Minus','Plus']])assert.equal(calc('Surf',{...a,ability:own},{...d,ability:other}),null);
 assert.equal(calc('Hyper Voice',a,{...d,ability:'Soundproof'}),null);
 assert.deepEqual(calc('Strength',a,{...d,ability:'Soundproof'}),calc());
 assert.equal(basicDamageScenarios(battleMove('Flamethrower'),a,{...d,ability:'Trace / Thick Fat'}).length,0);
 assert.deepEqual(calc('Strength',a,{...d,item:'Focus Band'}),calc());
 for(const item of ['Liechi Berry','Petaya Berry','Shell Bell','Leftovers'])assert.deepEqual(calc('Strength',{...a,item}),calc());
 const own={...a,ability:'Guts',item:'Choice Band'},other={...d,ability:'Marvel Scale',item:'Focus Band'},conditions={attacker:{status:'burn'},defender:{status:'poison'}};
 const before=structuredClone({own,other,conditions});calc('Strength',own,other,conditions);assert.deepEqual({own,other,conditions},before);
});
