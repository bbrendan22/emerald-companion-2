import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMove} from '../src/battle/reference.js';
import {conditionalCases,isConditionalMove,calculateConditionalDamage} from '../src/battle/conditionalDamage.js';
import {calculateCoreDamage,isConventionalDamageMove} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {coreDamageDisplayParts} from '../src/battle/coreDamagePresentation.js';
const mon={level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:100,status:'none',
 stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const calc=(name,a=mon,d=mon,w='none',c=false,context={})=>calculateCoreDamage(battleMove(name),a,d,w,c,context);
const hits=result=>result.conditions.map(condition=>condition.result);
const rolls=max=>Array.from({length:16},(_,i)=>Math.floor(max*(85+i)/100));
const options=values=>({status:values.length===1?'known':'uncertain',source:'species',values});
test('Pursuit and Revenge expose two separate canonical effective-power cases without combined ranges/probabilities',()=>{
 for(const [name,powers,category,type,ends] of [['Pursuit',[40,80],'Special','DARK',[19,38]],['Revenge',[60,120],'Physical','FIGHTING',[56,112]]]) {
  const move=battleMove(name),before=structuredClone(move),result=calc(name);
  assert.equal(isConditionalMove(move),true);assert.equal(isConventionalDamageMove(move),true);
  assert.equal(move.type,type);assert.equal(result.kind,'conditional-damage');
  assert.deepEqual(result.conditions.map(c=>c.power),powers);
  assert.deepEqual(result.conditions.map(c=>c.multiplier),[1,2]);
  assert.equal(result.rolls,undefined);assert.equal(result.min,undefined);assert.equal(result.max,undefined);
  assert.equal(coreDamageDisplayParts(result,200),null,'never format a merged conditional range');
  for(const [index,condition] of result.conditions.entries()) {
   assert.equal(condition.probability,undefined);assert.equal(condition.result.kind,'standard-damage');
   assert.equal(condition.result.category,category);assert.deepEqual(condition.result.rolls,rolls(ends[index]));
   assert.equal(condition.result.rolls.length,16);
  }
  assert.deepEqual(move,before);
 }
 assert.equal(isConditionalMove(battleMove('Facade')),false);
 assert.deepEqual(conditionalCases(battleMove('Spit Up')),[]);
 assert.equal(calculateConditionalDamage(battleMove('Strength')),null);
});
test('Emerald doubles AFTER +2, not literal base power or rounded final rolls',()=>{
 // Pursuit40: subtotal17,+2=19; script2=>38. Literal power80 gives37.
 // Revenge60: subtotal26,+2=28; script2=>56; vsNormal112.
 // Literal power120 gives54, vsNormal108. STAB must also floor AFTER script2.
 const pursuit=hits(calc('Pursuit',{...mon,types:['DARK']}));
 assert.deepEqual(pursuit.map(r=>r.max),[28,57]);
 assert.deepEqual(pursuit[1].rolls,rolls(57));assert.notDeepEqual(pursuit[1].rolls,pursuit[0].rolls.map(n=>n*2));
 const wrongP=calculateCoreDamage({...battleMove('Bite'),power:80},mon,mon);
 assert.equal(wrongP.max,37);assert.notDeepEqual(hits(calc('Pursuit'))[1].rolls,wrongP.rolls);
 const wrongR=calculateCoreDamage({...battleMove('Karate Chop'),power:120},mon,mon);
 assert.equal(wrongR.max,108);assert.notDeepEqual(hits(calc('Revenge'))[1].rolls,wrongR.rolls);
 const calls=[];
 calculateConditionalDamage(battleMove('Revenge'),mon,mon,'none',false,{},move=>{calls.push(move);return null;});
 assert.deepEqual(calls.map(m=>[m.id,m.type,m.power,m.formulaPower,m.damageMultiplier]),[[279,'FIGHTING',60,60,1],[279,'FIGHTING',120,60,2]]);
});
test('Gen III category uses appropriate stats, STAB and type effectiveness in both directions',()=>{
 const enemy={...mon,stats:{...mon.stats,attack:150,spAttack:90}};
 assert.deepEqual(hits(calc('Pursuit',mon,enemy)).map(r=>r.max),[19,38]);
 assert.deepEqual(hits(calc('Pursuit',enemy,mon)).map(r=>r.max),[17,34]);
 assert.deepEqual(hits(calc('Revenge',mon,enemy)).map(r=>r.max),[56,112]);
 assert.deepEqual(hits(calc('Revenge',enemy,mon)).map(r=>r.max),[82,164]);
 assert.deepEqual(hits(calc('Revenge',{...mon,types:['FIGHTING']})).map(r=>r.max),[84,168]);
 assert.deepEqual(hits(calc('Pursuit',mon,{...mon,types:['PSYCHIC']})).map(r=>r.max),[38,76]);
 assert.deepEqual(hits(calc('Pursuit',mon,{...mon,types:['DARK']})).map(r=>r.max),[9,19]);
 const physical={...mon,stats:{attack:100}},physicalTarget={...mon,stats:{defense:100}};
 assert.equal(calc('Revenge',physical,physicalTarget).conditions[1].result.max,112);
 const special={...mon,stats:{spAttack:100}},specialTarget={...mon,stats:{spDefense:100}};
 assert.equal(calc('Pursuit',special,specialTarget).conditions[1].result.max,38);
});
test('burn, Guts, abilities and held items retain raw-operand and script multiplier order',()=>{
 assert.deepEqual(hits(calc('Revenge',{...mon,status:'burn'})).map(r=>r.max),[30,60]);
 assert.deepEqual(hits(calc('Revenge',{...mon,status:'burn',ability:'Guts'})).map(r=>r.max),[82,164]);
 assert.deepEqual(hits(calc('Pursuit',{...mon,status:'burn',ability:'Guts'})).map(r=>r.max),[19,38],'Dark is Special');
 assert.deepEqual(hits(calc('Revenge',{...mon,item:'Choice Band'})).map(r=>r.max),[82,164]);
 assert.deepEqual(hits(calc('Revenge',{...mon,item:'Black Belt'})).map(r=>r.max),[62,124]);
 assert.deepEqual(hits(calc('Pursuit',{...mon,item:'BlackGlasses'})).map(r=>r.max),[21,42]);
 assert.deepEqual(hits(calc('Pursuit',{...mon,item:'Choice Band'})).map(r=>r.max),[19,38]);
 assert.deepEqual(hits(calc('Revenge',mon,{...mon,ability:'Marvel Scale',status:'poison'})).map(r=>r.max),[38,76]);
 assert.deepEqual(hits(calc('Revenge',mon,{...mon,dex:132,item:'Metal Powder',transformed:false})).map(r=>r.max),[30,60]);
 assert.deepEqual(hits(calc('Pursuit',mon,{...mon,dex:366,item:'DeepSeaScale'})).map(r=>r.max),[10,20]);
});
test('Reflect/Light Screen, stages and criticals are evaluated before conditional doubling',()=>{
 assert.deepEqual(hits(calc('Revenge',mon,{...mon,screens:{reflect:true}})).map(r=>r.max),[30,60]);
 assert.deepEqual(hits(calc('Revenge',{...mon,status:'burn'},{...mon,screens:{reflect:true}})).map(r=>r.max),[16,32]);
 assert.deepEqual(hits(calc('Pursuit',mon,{...mon,screens:{lightScreen:true}})).map(r=>r.max),[10,20]);
 assert.deepEqual(calc('Revenge',mon,{...mon,screens:{lightScreen:true}}),calc('Revenge'));
 assert.deepEqual(calc('Pursuit',mon,{...mon,screens:{reflect:true}}),calc('Pursuit'));
 assert.deepEqual(hits(calc('Revenge',mon,{...mon,screens:{reflect:true}},'none',true)).map(r=>r.max),[112,224]);
 assert.deepEqual(hits(calc('Pursuit',mon,{...mon,screens:{lightScreen:true}},'none',true)).map(r=>r.max),[38,76]);
 for(const name of ['Pursuit','Revenge'])for(const critical of [false,true])for(const sign of [-2,2]) {
  const a={...mon,stages:{attack:sign,spAttack:sign}},d={...mon,stages:{defense:sign,spDefense:sign}};
  const result=hits(calc(name,a,d,'none',critical));
  // A separate ordinary move at the same formula power verifies stage handling;
  // the boosted branch is independently pinned to the cartridge's script stage.
  const reference=calculateCoreDamage({...battleMove(name==='Pursuit'?'Bite':'Karate Chop'),power:name==='Pursuit'?40:60},a,d,'none',critical);
  assert.deepEqual(result[0].rolls,reference.rolls);
  assert.equal(result[1].base,reference.base);
  assert.ok(result[1].max>result[0].max);
 }
});
test('conditions are never inferred from HP loss, status, fake switching or turn history',()=>{
 for(const name of ['Pursuit','Revenge']) {
  const before=structuredClone(mon),result=calc(name);
  assert.deepEqual(calc(name,{...mon,currentHp:1,damageTakenThisTurn:true},{...mon,switching:true}),result);
  assert.deepEqual(calc(name,{...mon,currentHp:undefined}),result);
  assert.deepEqual(mon,before);
  for(const weather of ['none','rain','sun','sand','hail'])assert.deepEqual(calc(name,mon,mon,weather),result);
 }
});
test('immunity, prevention and unavailable cases remain separate in BOTH condition sections',()=>{
 for(const result of hits(calc('Revenge',mon,{...mon,types:['GHOST']})))assert.equal(result.effectiveness,0);
 for(const name of ['Pursuit','Revenge']) {
  const denied=hits(calc(name,mon,{...mon,types:['WATER'],ability:'Wonder Guard'}));
  assert.ok(denied.every(r=>r.outcome==='blocked'&&r.reason==='wonder-guard'&&r.rolls===undefined));
  const weak=name==='Pursuit'?'PSYCHIC':'NORMAL';
  assert.deepEqual(calc(name,mon,{...mon,types:[weak],ability:'Wonder Guard'}),calc(name,mon,{...mon,types:[weak]}));
  const bad={...mon,stats:{defense:'100–120',spDefense:'100–120'}};
  assert.deepEqual(hits(calc(name,mon,bad)),[null,null]);
  const unknown=calculateAbilityScenarios(battleMove(name),{...mon,ability:null},mon);
  assert.deepEqual(unknown.conditions.map(c=>c.abilityDamage.groups[0].availability),['unavailable','unavailable']);
  const unsupported=calculateAbilityScenarios(battleMove(name),mon,{...mon,screens:{reflect:true,lightScreen:true}},{battleContext:{format:'Doubles'}});
  assert.deepEqual(unsupported.conditions.map(c=>c.abilityDamage.groups[0].availability),['unsupported','unsupported']);
 }
});
test('ability uncertainty groups within each condition, preserving all pinned branches and both directions',()=>{
 const a={...mon,abilityOptions:options(['Immunity','Huge Power'])};
 const result=calculateAbilityScenarios(battleMove('Revenge'),a,mon);
 assert.equal(result.kind,'conditional-ability-scenarios');assert.equal(result.groups,undefined);
 assert.deepEqual(result.conditions.map(c=>c.abilityDamage.groups.map(g=>g.max)),[[56,108],[112,216]]);
 for(const condition of result.conditions)assert.deepEqual(condition.abilityDamage.groups.map(g=>g.label),['Immunity','Huge Power']);
 const same=calculateAbilityScenarios(battleMove('Pursuit'),a,mon);
 assert.equal(same.conditions.length,2);
 assert.ok(same.conditions.every(c=>c.abilityDamage.groups.length===1&&c.abilityDamage.groups[0].scenarios.length===2));
 const target={...mon,abilityOptions:options(['Immunity','Wonder Guard']),types:['WATER']};
 for(const name of ['Pursuit','Revenge']) {
  const incoming=calculateAbilityScenarios(battleMove(name),mon,target);
  assert.ok(incoming.conditions.every(c=>JSON.stringify(c.abilityDamage.groups.map(g=>g.availability))===JSON.stringify(['available','blocked'])));
  const reversed=calculateAbilityScenarios(battleMove(name),target,mon);
  assert.ok(reversed.conditions.every(c=>c.abilityDamage.groups.length===1));
 }
 const immune=calculateAbilityScenarios(battleMove('Revenge'),mon,{...target,types:['GHOST']});
 assert.equal(immune.conditions.length,2,'identical immunity conditions are never collapsed');
});
test('full outcome grouping and formatter remain exact, without merging overlapping conditions',()=>{
 const d={...mon,abilityOptions:options(['Immunity','Thick Fat'])},calls=[];
 const calculate=(_move,a,d)=>{
  calls.push([a.ability,d.ability]);
  return {kind:'conditional-damage',conditions:conditionalCases(battleMove('Pursuit')).map(c=>({...c,
   result:{kind:'standard-damage',min:1,max:3,rolls:Array.from({length:16},(_,i)=>i===0?1:i===15?3:d.ability==='Immunity'?2:1)},
  }))};
 };
 const result=calculateAbilityScenarios(battleMove('Pursuit'),mon,d,{calculate});
 assert.equal(calls.length,2,'one calculation per pinned pair, not per displayed condition');
 assert.equal(result.conditions.length,2);
 for(const c of result.conditions) {
  assert.equal(c.abilityDamage.groups.length,2);assert.equal(c.abilityDamage.groups[0].hp,c.abilityDamage.groups[1].hp);
  assert.notDeepEqual(c.abilityDamage.groups[0].rolls,c.abilityDamage.groups[1].rolls);
 }
 const parts=hits(calc('Pursuit')).map(r=>coreDamageDisplayParts(r,200));
 assert.deepEqual(parts,[{percentage:'8.0% – 9.5%',hp:'16–19 HP damage'},{percentage:'16.0% – 19.0%',hp:'32–38 HP damage'}]);
});
test('prior conventional, deterministic, aggregate, dynamic, weather and prevention result contracts remain unchanged',()=>{
 assert.equal(calc('Strength').rolls.length,16);assert.equal(calc('Seismic Toss').kind,'deterministic-damage');
 assert.equal(calc('Double Kick').totalOutcomes,256);assert.equal(calc('DoubleSlap').totalOutcomes,8388608);assert.equal(calc('Triple Kick').totalOutcomes,4096);
 assert.equal(calc('Weather Ball',mon,{...mon,ability:'Cloud Nine'},'rain').category,'Physical');
 assert.equal(calc('Hyper Voice',mon,{...mon,ability:'Soundproof'}).reason,'soundproof');
 assert.equal(calc('Explosion',mon,{...mon,ability:'Damp'}).reason,'damp');
 for(const name of ['Counter','Mirror Coat'])assert.equal(calc(name),null);
});
