import test from 'node:test';
import assert from 'node:assert/strict';
import {playerAbilityOptions,opponentAbilityOptions,calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {coreDamageDisplayParts} from '../src/battle/coreDamagePresentation.js';
import {battleMove,speciesByName} from '../src/battle/reference.js';
import {towerSetById} from '../src/battle/towerSets.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
import {readPokemon} from '../src/save/readPokemon.js';
import {makePokemon} from './fixtures/synthetic.js';
const mon={name:'Snorlax',dex:143,level:50,ability:'Immunity',types:['NORMAL'],stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const enemy={...mon,abilityOptions:opponentAbilityOptions(mon)};
const move=battleMove('Strength');
const options=values=>({status:values.length===1?'known':'uncertain',source:'species',values});

test('player uses exactly its imported save ability, never species alternatives',()=>{
 const player=toBattlePokemon({...readPokemon(makePokemon({species:1,pid:0,experience:117360})),identity:'p'});
 assert.deepEqual(playerAbilityOptions(player),{status:'known',source:'save',values:[player.ability]});
 assert.deepEqual(playerAbilityOptions(mon).values,['Immunity']);
 assert.equal(playerAbilityOptions({...mon,ability:undefined}).status,'missing');
 assert.equal(playerAbilityOptions({...mon,ability:'Immunity / Thick Fat'}).status,'missing');
 assert.equal(playerAbilityOptions({...mon,ability:'Gluttony'}).status,'missing');
});
test('opponents use Gen III species data, one/two abilities, and reliable selected set ability',()=>{
 assert.deepEqual(opponentAbilityOptions({dex:94}).values,['Levitate']);
 assert.deepEqual(opponentAbilityOptions(mon),{status:'uncertain',source:'species',values:['Immunity','Thick Fat']});
 const set=towerSetById('Snorlax 1');
 assert.deepEqual(opponentAbilityOptions(mon,[set]).values,['Immunity','Thick Fat']);
 assert.deepEqual(opponentAbilityOptions(mon,[{...set,possibleAbility:'Thick Fat'}]),{status:'known',source:'frontier-set',values:['Thick Fat']});
 assert.equal(opponentAbilityOptions(mon,[{...set,possibleAbility:'Gluttony'}]).status,'uncertain');
 assert.equal(opponentAbilityOptions(mon,[{...set,possibleAbility:'Thick Fat'},{...set}]).status,'uncertain');
 assert.deepEqual(opponentAbilityOptions({id:speciesByName.get('gengar').internalSpeciesId}).values,['Levitate']);
 assert.equal(opponentAbilityOptions({name:'Unknown'}).status,'missing');
});
test('baseline scenarios keep abilities and all display data, collapsing identical rolls without labels',()=>{
 const before=structuredClone({mon,enemy});
 const {scenarios,groups}=calculateAbilityScenarios(move,mon,enemy);
 assert.equal(scenarios.length,2);assert.equal(groups.length,1);assert.equal(groups[0].label,'');
 assert.deepEqual(scenarios.map(s=>s.attackerAbility),['Immunity','Immunity']);
 assert.deepEqual(scenarios.map(s=>s.defenderAbility),['Immunity','Thick Fat']);
 for(const scenario of scenarios) {
  const baseline=calculateCoreDamage(move,mon,enemy);
  assert.deepEqual(scenario.result,baseline);assert.deepEqual(scenario.rolls,baseline.rolls);
  assert.equal(scenario.min,baseline.min);assert.equal(scenario.max,baseline.max);
  assert.deepEqual({percentage:scenario.percentage,hp:scenario.hp},coreDamageDisplayParts(baseline,200));
  assert.equal(scenario.availability,'available');assert.equal(scenario.calculationMode,'abilities-and-items');
 }
 assert.deepEqual({mon,enemy},before);
 const reverse=calculateAbilityScenarios(move,enemy,mon);
 assert.equal(reverse.scenarios.length,2);assert.equal(reverse.groups.length,1);
});
test('different rolls split results using controlled calculators, even with matching endpoints/percentages',()=>{
 const calculate=(move,a,d,w,c)=>{
  const result=calculateCoreDamage(move,a,d,w,c);
  // Test-only change to an interior roll: endpoints and formatted ranges agree.
  return {...result,rolls:result.rolls.map((roll,i)=>i===1 && d.ability==='Thick Fat'?roll+1:roll)};
 };
 const {groups}=calculateAbilityScenarios(move,mon,enemy,{calculate});
 assert.equal(groups.length,2);assert.deepEqual(groups.map(g=>g.label),['Immunity','Thick Fat']);
 assert.equal(groups[0].percentage,groups[1].percentage);assert.equal(groups[0].hp,groups[1].hp);
 assert.notDeepEqual(groups[0].rolls,groups[1].rolls);
});
test('both uncertain sides enumerate all combinations, grouping identical distributions with pair labels',()=>{
 const attacker={...mon,abilityOptions:options(['Thick Fat','Immunity'])};
 const calculate=(move,a,d,w,c)=>{
  const r=calculateCoreDamage(move,a,d,w,c);
  return a.ability==='Immunity' && d.ability==='Thick Fat' ? {...r,rolls:r.rolls.map(x=>x+1),min:r.min+1,max:r.max+1} : r;
 };
 const {scenarios,groups}=calculateAbilityScenarios(move,attacker,enemy,{calculate});
 assert.equal(scenarios.length,4);assert.equal(groups.length,2);
 assert.deepEqual(groups.map(g=>g.scenarios.length),[3,1]);
 assert.match(groups[0].label,/Thick Fat → Immunity/);
 assert.equal(groups[1].label,'Immunity → Thick Fat');
});
test('missing abilities/data and future unsupported branches stay explicit and are never discarded',()=>{
 const absent=calculateAbilityScenarios(move,{...mon,ability:null},enemy);
 assert.ok(absent.scenarios.every(s=>s.availability==='unavailable' && s.reason==='missing-ability'));
 for(const [m,a,d] of [[null,mon,enemy],[battleMove('Growl'),mon,enemy],[move,mon,null],[move,null,enemy],
  [move,mon,{...enemy,stats:{...enemy.stats,hp:'100–200'}}]]) {
  assert.ok(calculateAbilityScenarios(m,a,d).scenarios.every(s=>s.availability==='unavailable'));
 }
 const calculate=(m,a,d,w,c)=>d.ability==='Thick Fat' ? {availability:'unsupported',reason:'conditional-effect'} : calculateCoreDamage(m,a,d,w,c);
 const {scenarios,groups}=calculateAbilityScenarios(move,mon,enemy,{calculate});
 assert.equal(scenarios.length,2);assert.deepEqual(groups.map(g=>g.availability),['available','unsupported']);
 assert.equal(groups[1].reason,'conditional-effect');
});
