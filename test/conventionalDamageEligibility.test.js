import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMove} from '../src/battle/reference.js';
import {isConventionalDamageMove,calculateCoreDamage} from '../src/battle/coreDamage.js';
import {prepareBasicDamage,calculateBasicDamage} from '../src/battle/basicDamage.js';
import {calculateAbilityScenarios,opponentAbilityOptions} from '../src/battle/abilityScenarios.js';
const mon={level:50,ability:'Immunity',item:'None',types:['WATER'],stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const calc=(name,a=mon,d=mon,w='none',c=false)=>calculateCoreDamage(battleMove(name),a,d,w,c);

test('Facade70 and Dig60 pass both eligibility paths and use literal Gen III base damage',()=>{
 // Emerald battle_moves.h: Facade NORMAL70 / FACADE; Dig GROUND60 / SEMI_INVULNERABLE.
 // Lv50 100 ATK vs100 DEF: floor(22*power/50)+2 =>32 /28.
 for(const [name,power,base,min,max] of [['Facade',70,32,27,32],['Dig',60,28,23,28]]) {
  const move=battleMove(name);
  assert.equal(move.power,power);assert.equal(isConventionalDamageMove(move),true);
  assert.equal(prepareBasicDamage(move,mon,mon).power,power);
  assert.deepEqual([calc(name).base,calc(name).min,calc(name).max],[base,min,max]);
  assert.deepEqual(calculateBasicDamage(move,mon,mon).rolls,calc(name).rolls);
  const scenarios=calculateAbilityScenarios(move,mon,mon);
  assert.equal(scenarios.groups[0].availability,'available');assert.deepEqual(scenarios.groups[0].rolls,calc(name).rolls);
 }
});

test('Facade retains reference70 and pre-script base; burn and Guts rules still apply',()=>{
 const facade=battleMove('Facade');
 for(const status of ['none','poison','toxic','paralysis','sleep','freeze'])
  assert.equal(calc('Facade',{...mon,status}).base,32);
 assert.equal(calc('Facade',{...mon,status:'burn'}).base,17);
 assert.equal(calc('Facade',{...mon,ability:'Guts',status:'burn'}).base,48);
 assert.equal(facade.power,70,'reference move data is never mutated');
});

test('related conditional and charge-turn effects allow baseline connected-hit damage at reference power',()=>{
 const names=['Fly','Dive','Bounce','Razor Wind','Skull Bash','Sky Attack','SolarBeam','Focus Punch',
  'Snore','Dream Eater','Fake Out','Uproar','SmellingSalt','Brick Break'];
 for(const name of names) {
  const move=battleMove(name);assert.ok(move,name);assert.equal(isConventionalDamageMove(move),true,name);
  const baseline=calculateCoreDamage({...move,effect:'HIT'},mon,mon);
  assert.deepEqual(calc(name),baseline,name);
  assert.ok(prepareBasicDamage(move,mon,mon),`legacy: ${name}`);
  assert.equal(calculateAbilityScenarios(move,mon,mon).groups[0].availability,'available',name);
 }
});

test('shared pipeline preserves stages, critical bypass, abilities, burn, STAB, typing and weather',()=>{
 const a={...mon,types:['NORMAL','GROUND'],ability:'Huge Power',status:'burn',stages:{attack:2}};
 const d={...mon,types:['ROCK'],stages:{defense:2}};
 // ATK100*2*2=400; critical ignores DEF+2. Facade subtotal123 ->burn61,+2=63;
 // crit126 ->Facade252 ->STAB378 ->Rock189 ->160..189. Dig105 ->burn52,+2=54 ->crit108 ->STAB162 ->Rock324.
 for(const [name,min,max] of [['Facade',160,189],['Dig',275,324]]) {
  const result=calc(name,a,d,'rain',true);
  assert.deepEqual([result.min,result.max],[min,max]);
  assert.deepEqual(result,calc(name,a,d,'none',true),'weather has no direct Physical modifier');
 }
 const ghost={...mon,types:['GHOST']},flying={...mon,types:['FLYING']};
 assert.deepEqual(calc('Facade',a,ghost,'sun',true).rolls,Array(16).fill(0));
 assert.deepEqual(calc('Dig',a,flying,'sun',true).rolls,Array(16).fill(0));
 // No underground-target bonus or side effects are introduced.
 assert.deepEqual(calc('Dig',mon,{...mon,underground:true}),calc('Dig'));
 assert.deepEqual(calc('Earthquake',mon,{...mon,underground:true}),calc('Earthquake'));
});

test('both directions and unknown offensive ability scenarios work for newly eligible moves',()=>{
 const opponent={...mon,name:'Azumarill',dex:184,abilityOptions:opponentAbilityOptions({dex:184})};
 for(const name of ['Facade','Dig']) {
  const incoming=calculateAbilityScenarios(battleMove(name),opponent,mon);
  assert.equal(incoming.groups.length,2);assert.deepEqual(incoming.groups.map(g=>g.label),['Thick Fat','Huge Power']);
  const outgoing=calculateAbilityScenarios(battleMove(name),mon,opponent);
  assert.equal(outgoing.groups.length,1);assert.equal(outgoing.groups[0].availability,'available');
 }
});

test('genuinely unresolved damage and invalid inputs remain unavailable',()=>{
 assert.equal(calc('Fissure').kind,'ohko');
 for(const name of ['Growl','Counter',
  'Hidden Power','Return','Spit Up','Future Sight'])
  assert.equal(calc(name),null,name);
 for(const name of ['Facade','Dig']) {
  assert.equal(calc(name,mon,null),null);
  assert.equal(calc(name,mon,{...mon,stats:{defense:'100–120'}}),null);
 }
});
