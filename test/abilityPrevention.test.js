import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMove} from '../src/battle/reference.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {coreDamageDisplayParts} from '../src/battle/coreDamagePresentation.js';
import {isDeterministicResult,calculateDeterministicDamage} from '../src/battle/deterministicDamage.js';
import {isAggregateResult} from '../src/battle/twoHitDamage.js';
import {isEmeraldSoundMove} from '../src/battle/abilityPrevention.js';
const mon={level:50,types:['NORMAL'],ability:'Immunity',item:'None',status:'none',currentHp:50,
 stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const target={...mon,currentHp:101};
const wg={...target,ability:'Wonder Guard'};
const options=values=>({status:values.length===1?'known':'uncertain',source:'species',values});
const calc=(name,a=mon,d=target,w='none',c=false)=>calculateCoreDamage(battleMove(name),a,d,w,c);
const blocked=(result,reason)=>{
 assert.deepEqual(result,{kind:'deterministic-damage',outcome:'blocked',damage:0,reason});
 assert.equal(isDeterministicResult(result),true);
 assert.equal(result.rolls,undefined);assert.equal(result.distribution,undefined);
};
test('Wonder Guard: neutral, resistance, dual neutral cancellation, weakness and chart immunity',()=>{
 // Cmd_typecalc's super-effective flag is cancelled by a resistance. Combined
 // type effectiveness must exceed1; a weakness to just one type is insufficient.
 for(const types of [['NORMAL'],['WATER'],['DRAGON'],['GRASS','WATER']])
  blocked(calc('Flamethrower',mon,{...wg,types}),'wonder-guard');
 for(const types of [['BUG'],['BUG','GRASS']]) {
  const result=calc('Flamethrower',mon,{...wg,types});
  assert.deepEqual(result,calc('Flamethrower',mon,{...target,types}));
  assert.equal(result.effectiveness,types.length===1?2:4);
 }
 const immune=calc('Thunderbolt',mon,{...wg,types:['GROUND']});
 assert.equal(immune.effectiveness,0);assert.deepEqual(immune.rolls,Array(16).fill(0));
 assert.notEqual(immune.outcome,'blocked','ordinary chart immunity remains distinct');
 assert.deepEqual(calc('Struggle',mon,{...wg,types:['GHOST']}),calc('Struggle',mon,{...target,types:['GHOST']}));
});
test('Wonder Guard uses Hidden Power IV type and every resolved Weather Ball type',()=>{
 const ivs={hp:31,attack:31,defense:31,speed:31,spAttack:31,spDefense:31}; //Dark70
 const a={...mon,ivs};
 assert.equal(calc('Hidden Power',a,{...wg,types:['PSYCHIC']}).effectiveness,2);
 blocked(calc('Hidden Power',a,{...wg,types:['DARK']}),'wonder-guard');
 assert.equal(calc('Hidden Power',mon,wg),null,'unresolved IVs never guessed');
 for(const [weather,weak,resisted] of [['sun','GRASS','WATER'],['rain','FIRE','GRASS'],['sand','FLYING','GROUND'],['hail','DRAGON','WATER']]) {
  assert.deepEqual(calc('Weather Ball',mon,{...wg,types:[weak]},weather),calc('Weather Ball',mon,{...target,types:[weak]},weather));
  blocked(calc('Weather Ball',mon,{...wg,types:[resisted]},weather),'wonder-guard');
 }
 blocked(calc('Weather Ball',mon,wg),'wonder-guard');
 assert.equal(calc('Weather Ball',mon,wg,'unknown'),null);
});
test('Emerald fixed/level/HP-damage scripts retain Wonder Guard flags before replacing damage',()=>{
 for(const name of ['Seismic Toss','Night Shade','Dragon Rage','SonicBoom','Super Fang','Endeavor']) {
  const types=name==='Seismic Toss'?['WATER']:name==='Night Shade'?['WATER']:['NORMAL'];
  blocked(calc(name,mon,{...wg,types}),'wonder-guard');
  blocked(calculateDeterministicDamage(battleMove(name),mon,{...wg,types}),'wonder-guard');
 }
 for(const [name,types,damage] of [['Seismic Toss',['NORMAL'],50],['Night Shade',['GHOST'],50],['Dragon Rage',['DRAGON'],40]]) {
  const result=calc(name,mon,{...wg,types});assert.equal(result.outcome,'damage');assert.equal(result.damage,damage);
 }
 for(const name of ['SonicBoom','Super Fang','Endeavor'])assert.equal(calc(name,mon,{...wg,types:['GHOST']}).outcome,'immune');
 assert.equal(calc('Night Shade',mon,wg).outcome,'immune');
 assert.equal(calc('Endeavor',{...mon,currentHp:101},wg).outcome,'failed','HP failure precedes Wonder Guard');
 assert.equal(calc('Endeavor',{...mon,currentHp:undefined},wg),null);
 assert.equal(calc('Super Fang',mon,{...wg,currentHp:undefined}),null);
});
test('Wonder Guard multi-hit branches preserve complete distributions for allowed attacks',()=>{
 const cases=[['Double Kick','NORMAL','WATER'],['Twineedle','PSYCHIC','WATER'],['Bonemerang','FIRE','WATER'],
  ['DoubleSlap',null,'WATER'],['Bullet Seed','WATER','FIRE'],['Icicle Spear','GRASS','WATER'],['Rock Blast','FLYING','GROUND'],['Triple Kick','NORMAL','WATER']];
 for(const [name,weak,neutral] of cases) {
  blocked(calc(name,mon,{...wg,types:[neutral]}),'wonder-guard');
  if(!weak)continue;
  for(const critical of [false,true]) {
   const result=calc(name,mon,{...wg,types:[weak]},'none',critical);
   assert.equal(isAggregateResult(result),true,name);
   assert.deepEqual(result,calc(name,mon,{...target,types:[weak]},'none',critical));
  }
 }
});
test('Soundproof uses the exact ten-move Gen III table, with separate nondamaging exceptions excluded',()=>{
 const ids=[45,46,47,48,103,173,253,319,320,304];
 for(let id=1;id<=354;id++)assert.equal(isEmeraldSoundMove(battleMove(id)),ids.includes(id),`move${id}`);
 for(const name of ['Snore','Uproar','Hyper Voice']) {
  blocked(calc(name,mon,{...target,ability:'Soundproof'}),'soundproof');
  blocked(calc(name,mon,{...target,ability:'Soundproof',types:['GHOST']}),'soundproof','attackcanceler precedes type immunity');
 }
 for(const name of ['SonicBoom','Strength','Surf','Seismic Toss','Struggle','DoubleSlap','Triple Kick'])
  assert.deepEqual(calc(name,mon,{...target,ability:'Soundproof'}),calc(name));
 for(const name of ['Growl','Roar','Sing','Supersonic','Screech','Metal Sound','Grass Whistle','Heal Bell','Perish Song'])
  assert.equal(calc(name,mon,{...target,ability:'Soundproof'}),null,'no new status-move simulator');
 assert.equal(isEmeraldSoundMove({name:'Hyper Voice',id:33}),false,'identity, not supplied name/type');
 assert.equal(isEmeraldSoundMove({id:304,type:'FIRE'}),true);
});
test('Damp stops both explosions from either active Pokémon before type immunity or screens',()=>{
 for(const name of ['Explosion','Self Destruct'])for(const side of ['attacker','defender','both']) {
  const a={...mon,...(side!=='defender'?{ability:'Damp'}:{})};
  const d={...target,types:['GHOST'],screens:{reflect:true},...(side!=='attacker'?{ability:'Damp'}:{})};
  blocked(calc(name,a,d),'damp');
  blocked(calculateCoreDamage(battleMove(name),a,d,'rain',true,{format:'Doubles'}),'damp');
 }
 blocked(calc('Explosion',{...mon,ability:'Trace'},{...target,ability:'Damp'}),'damp');
 for(const name of ['Strength','Surf','Struggle','Seismic Toss','Super Fang','Endeavor','Double Kick','DoubleSlap','Triple Kick'])
  assert.deepEqual(calc(name,{...mon,ability:'Damp'},{...target,ability:'Damp'}),calc(name));
 assert.equal(calc('Explosion',mon,{...target,ability:'Damp / Water Absorb'}),null,'no scalar ability list selection');
});
test('known/uncertain abilities work in both directions, preserving prevention reasons and available outcomes',()=>{
 for(const [name,ability,types] of [['Strength','Wonder Guard',['WATER']],['Hyper Voice','Soundproof',['WATER']],['Explosion','Damp',['WATER']]]) {
  const d={...target,types,abilityOptions:options(['Immunity',ability])};
  const result=calculateAbilityScenarios(battleMove(name),mon,d);
  assert.deepEqual(result.groups.map(g=>g.availability),['available','blocked']);
  assert.deepEqual(result.groups.map(g=>g.label),['Immunity',ability]);
  assert.equal(result.groups[1].rolls,null);assert.equal(result.groups[1].percentage,null);
  const reversed=calculateAbilityScenarios(battleMove(name),d,mon);
  if(ability==='Damp')assert.deepEqual(reversed.groups.map(g=>g.availability),['available','blocked']);
  else assert.equal(reversed.groups.length,1,'own Soundproof/Wonder Guard does not stop its attack');
  const incoming=calculateAbilityScenarios(battleMove(name),target,{...mon,types,abilityOptions:options(['Immunity',ability])});
  assert.deepEqual(incoming.groups.map(g=>g.availability),['available','blocked']);
 }
 const both={...target,abilityOptions:options(['Damp','Immunity'])};
 const result=calculateAbilityScenarios(battleMove('Explosion'),{...mon,abilityOptions:options(['Damp','Immunity'])},both);
 assert.equal(result.scenarios.length,4);assert.equal(result.groups.length,2);
 assert.equal(result.groups.find(g=>g.availability==='blocked').scenarios.length,3,'same Damp outcome grouped regardless holder');
 const reasons=calculateAbilityScenarios(battleMove('Hyper Voice'),mon,{...target,abilityOptions:options(['Wonder Guard','Soundproof'])});
 assert.equal(reasons.groups.length,2);assert.deepEqual(reasons.groups.map(g=>g.reason),['wonder-guard','soundproof']);
 const immunity=calculateAbilityScenarios(battleMove('Hyper Voice'),mon,{...target,types:['GHOST'],abilityOptions:options(['Wonder Guard','Soundproof'])});
 assert.equal(immunity.groups.length,2);assert.equal(immunity.groups[0].result.effectiveness,0);assert.equal(immunity.groups[1].availability,'blocked');
});
test('prevention presentation has no HP/percentage roll range; malformed and missing ability outcomes stay unavailable',()=>{
 for(const [name,ability,message] of [['Strength','Wonder Guard','Blocked by Wonder Guard'],['Hyper Voice','Soundproof','Blocked by Soundproof'],['Explosion','Damp','Prevented by Damp']]) {
  const r=calc(name,mon,{...target,ability});assert.deepEqual(coreDamageDisplayParts(r,undefined),{message});
  const group=calculateAbilityScenarios(battleMove(name),mon,{...target,ability}).groups[0];
  assert.equal(group.message,message);assert.equal(group.availability,'blocked');
  assert.equal(calculateAbilityScenarios(battleMove(name),mon,{...target,ability:null}).groups[0].availability,'unavailable');
  assert.equal(isDeterministicResult({...r,rolls:Array(16).fill(0)}),false);
  assert.equal(isDeterministicResult({...r,reason:'invented'}),false);
 }
 assert.equal(calculateAbilityScenarios(battleMove('Strength'),mon,{...target,ability:'Wonder Guard / Soundproof'}).groups[0].availability,'unavailable');
 assert.equal(calculateAbilityScenarios(battleMove('Hidden Power'),mon,wg).groups[0].availability,'unavailable');
});
test('Wonder Guard does not change allowed stats/modifiers, and no battle state is mutated',()=>{
 const a={...mon,ability:'Guts',status:'burn',item:'Choice Band',stages:{attack:-2}};
 const d={...wg,types:['NORMAL'],screens:{reflect:true},stages:{defense:2},item:'Leftovers'};
 const before=structuredClone({a,d});
 for(const critical of [false,true])assert.deepEqual(calc('Brick Break',a,d,'sun',critical),calc('Brick Break',a,{...d,ability:'Immunity'},'sun',critical));
 assert.deepEqual({a,d},before);
 assert.equal(calc('Strength').rolls.length,16);assert.equal(calc('Seismic Toss').damage,50);
 assert.equal(calc('Double Kick').totalOutcomes,256);assert.equal(calc('DoubleSlap').totalOutcomes,8388608);assert.equal(calc('Triple Kick').totalOutcomes,4096);
 assert.equal(calc('Fissure',mon,wg).outcome,'immune','OHKO retains Wonder Guard prevention');
 assert.equal(calc('Counter',mon,wg),null,'unsupported retaliation stays unavailable');
});
