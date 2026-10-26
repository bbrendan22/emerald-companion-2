import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {heldItemAttack,heldItemDefense,heldItemSpecies} from '../src/battle/heldItemModifiers.js';
import {battleItemId} from '../src/battle/itemLookup.js';
import {battleMove} from '../src/battle/reference.js';
import {battleFacilities,createTowerRules} from '../src/battle/towerRules.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
const mon={dex:143,level:50,ability:'Immunity',types:['NORMAL'],currentHp:200,stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const calc=(name,a=mon,d=mon,context={},critical=false,weather='none')=>calculateCoreDamage(battleMove(name),a,d,weather,critical,context);
// Independent hand calculations verified against Emerald CalculateBaseDamage:
// specialized item operands precede Thick Fat/Marvel Scale and stat stages.
// https://github.com/pret/pokeemerald/blob/master/src/pokemon.c

test('Light Ball doubles Pikachu SPA only; Pichu/Raichu and names alone do not qualify',()=>{
 const pika={...mon,dex:25,item:'Light Ball'};
 assert.equal(calc('Thunderbolt',pika).base,85); // factor22*P95*SPA200/100/50 +2=85.
 assert.deepEqual(calc('Strength',pika),calc('Strength',{...pika,item:'None'}));
 for(const dex of [26,172,143])assert.deepEqual(calc('Thunderbolt',{...pika,dex}),calc('Thunderbolt',{...pika,dex,item:'None'}));
 assert.deepEqual(calc('Thunderbolt',{...mon,name:'Pikachu',item:'Light Ball'}),calc('Thunderbolt',mon));
 assert.equal(calc('Thunderbolt',{...mon,dex:undefined,item:'Light Ball'}),null);
 assert.equal(heldItemSpecies({species:25}),25);assert.equal(heldItemSpecies({dex:26,species:25}),null);
 assert.equal(calc('Thunderbolt',{...pika,item:Number(battleItemId('Light Ball'))}).base,85);
});
test('Thick Club doubles Cubone/Marowak ATK only, before stages and burn',()=>{
 for(const dex of [104,105]) {
  const a={...mon,dex,item:'Thick Club'};
  assert.equal(calc('Earthquake',a).base,90); // factor22*P100*ATK200/100/50 +2=90.
  assert.deepEqual(calc('Surf',a),calc('Surf',{...a,item:'None'}));
  assert.equal(calc('Earthquake',{...a,stages:{attack:2}}).base,178);
  assert.equal(calc('Earthquake',{...a,status:'burn'}).base,46);
 }
 assert.deepEqual(calc('Earthquake',{...mon,item:'Thick Club'}),calc('Earthquake'));
});
test('DeepSeaTooth/DeepSeaScale affect only Clamperl and the Special operand',()=>{
 const tooth={...mon,dex:366,item:'DeepSeaTooth'},scale={...mon,dex:366,item:'DeepSeaScale'};
 assert.equal(calc('Surf',tooth).base,85);assert.equal(calc('Surf',mon,scale).base,22);
 assert.deepEqual(calc('Strength',tooth),calc('Strength',{...tooth,item:'None'}));
 assert.deepEqual(calc('Strength',mon,scale),calc('Strength'));
 for(const dex of [367,368,143]) {
  assert.deepEqual(calc('Surf',{...tooth,dex}),calc('Surf',{...tooth,dex,item:'None'}));
  assert.deepEqual(calc('Surf',mon,{...scale,dex}),calc('Surf'));
 }
 // Both doubles cancel before formula truncation, in either direction.
 assert.equal(calc('Surf',tooth,scale).base,43);
 assert.equal(calc('Surf',mon,{...scale,stages:{spDefense:2}},{},true).max,44);
 assert.equal(calc('Surf',scale,tooth).base,43);
});
test('Soul Dew is suppressed in every Frontier facility, including conflicting override attempts',()=>{
 for(const dex of [380,381]) {
  const dew={...mon,dex,item:'Soul Dew'};
  for(const facility of new Set([...battleFacilities,'Tower','Dome','Palace','Arena','Factory','Pike','Pyramid'])) {
   for(const context of [{facility},{facility,frontier:false}]) {
    assert.deepEqual(calc('Surf',dew,mon,context),calc('Surf',{...dew,item:'None'}));
    assert.deepEqual(calc('Surf',mon,dew,context),calc('Surf'));
   }
  }
  for(const facility of battleFacilities)assert.deepEqual(calc('Surf',dew,mon,createTowerRules({facility})),calc('Surf',mon));
  assert.equal(calc('Surf',dew).base,43,'default context stays Frontier');
 }
});
test('explicit standalone non-Frontier context applies normal Soul Dew SPA/SPD boosts',()=>{
 const ordinary={frontier:false};
 for(const dex of [380,381]) {
  const dew={...mon,dex,item:'Soul Dew'};
  assert.equal(calc('Surf',dew,mon,ordinary).base,64); // SPA150 gives subtotal62,+2.
  assert.equal(calc('Surf',mon,dew,ordinary).base,29); // SPD150 gives subtotal27,+2.
  assert.deepEqual(calc('Strength',dew,mon,ordinary),calc('Strength'));
  assert.deepEqual(calc('Strength',mon,dew,ordinary),calc('Strength'));
 }
 assert.deepEqual(calc('Surf',{...mon,item:'Soul Dew'},mon,ordinary),calc('Surf'));
 assert.deepEqual(calc('Surf',mon,{...mon,item:'Soul Dew'},ordinary),calc('Surf'));
});
test('Metal Powder requires known untransformed Ditto, boosts DEF only, and never guesses',()=>{
 const ditto={...mon,dex:132,item:'Metal Powder',transformed:false};
 assert.equal(calc('Strength',mon,ditto).base,19); // ATK100 vsDEF200: subtotal17,+2.
 assert.deepEqual(calc('Surf',mon,ditto),calc('Surf'));
 assert.deepEqual(calc('Strength',mon,{...ditto,transformed:true}),calc('Strength'));
 for(const transformed of [undefined,null,'false',0])assert.equal(calc('Strength',mon,{...ditto,transformed}),null);
 assert.deepEqual(calc('Strength',mon,{...ditto,dex:25,transformed:undefined}),calc('Strength'));
 assert.deepEqual(calc('Strength',ditto,mon),calc('Strength'),"holder's offensive stats are unaffected");
 const options={status:'known',source:'species',values:['Limber']};
 const unresolved=calculateAbilityScenarios(battleMove('Strength'),mon,{...ditto,transformed:undefined,abilityOptions:options});
 assert.equal(unresolved.groups[0].availability,'unavailable');
});
test('item operands truncate before stages and persist through critical stage bypass, abilities and weather',()=>{
 const dew={dex:380};
 assert.equal(heldItemAttack(101,'Soul Dew','WATER',false,dew,{frontier:false}),151);
 assert.equal(heldItemDefense(101,'Soul Dew',false,dew,{frontier:false}),151);
 // SPA101 ->Dew151 ->+2 stage302; Surf95 versusSPD101: subtotal124,+2=126.
 const a={...mon,dex:380,item:'Soul Dew',stats:{...mon.stats,spAttack:101},stages:{spAttack:2}};
 assert.equal(calc('Surf',a,{...mon,stats:{...mon.stats,spDefense:101}},{frontier:false}).base,126);
 const pika={...mon,dex:25,item:'Light Ball',types:['ELECTRIC'],stages:{spAttack:-2}};
 // SPA200, crit ignores -SPA/+SPD: base85 ->crit170 ->STAB255.
 assert.equal(calc('Thunderbolt',pika,{...mon,stages:{spDefense:2}},{},true).max,255);
 const club={...mon,dex:104,item:'Thick Club',ability:'Guts',status:'burn'};
 assert.equal(calc('Earthquake',club).base,134); // ATK100 ->club200 ->Guts300; no burn.
 const fat={...mon,ability:'Thick Fat'};
 assert.equal(calc('Flamethrower',{...pika,types:['FIRE'],stages:{}},fat,{},true,'sun').max,189);
 const scale={...mon,dex:132,item:'Metal Powder',transformed:false,ability:'Marvel Scale',status:'poison',stages:{defense:2}};
 assert.equal(calc('Strength',mon,scale,{},true).base,13); // crit keeps DEF200*1.5=300, ignores +2.
});
test('specialized items stay pinned across ability scenarios; irrelevant items preserve existing results',()=>{
 const a={...mon,dex:104,item:'Thick Club',status:'burn',abilityOptions:{status:'uncertain',source:'species',values:['Huge Power','Guts']}};
 const result=calculateAbilityScenarios(battleMove('Earthquake'),a,mon);
 assert.deepEqual(result.groups.map(g=>g.label),['Huge Power','Guts']);assert.deepEqual(result.groups.map(g=>g.max),[90,134]);
 const clam={...mon,dex:366,item:'DeepSeaTooth'};
 const defender={...mon,abilityOptions:{status:'uncertain',source:'species',values:['Immunity','Thick Fat']}};
 assert.equal(calculateAbilityScenarios(battleMove('Surf'),clam,defender).groups.length,1);
 const before=structuredClone({clam,defender});calc('Surf',clam,defender);assert.deepEqual({clam,defender},before);
});
