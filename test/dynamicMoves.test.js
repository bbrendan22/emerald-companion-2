import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveConventionalMove,lowKickPower} from '../src/battle/dynamicMoves.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {battleMove} from '../src/battle/reference.js';
import {opponentMoveInputs} from '../src/battle/opponentStats.js';
import {frontierPokemon} from '../src/battle/data/frontierPokemon.js';
import {towerBrainSets,createTowerRules} from '../src/battle/towerRules.js';
const ivs=value=>Object.fromEntries(['hp','attack','defense','speed','spAttack','spDefense'].map(k=>[k,value]));
const mon={dex:1,level:50,types:['NORMAL'],ability:'Overgrow',item:'None',friendship:255,ivs:ivs(31),stats:{hp:200,attack:150,defense:100,spAttack:90,spDefense:120}};
const resolve=(name,a=mon,d=mon)=>resolveConventionalMove(battleMove(name),a,d);
const damage=(name,a=mon,d=mon,...args)=>calculateCoreDamage(battleMove(name),a,d,...args);
test('friendship extremes, intermediate, missing and both attack directions',()=>{
 for(const [friendship,ret,frust] of [[0,1,102],[255,102,1],[100,40,62],[1,1,101],[3,1,100]]) {
  const a={...mon,friendship};
  for(const [name,power] of [['Return',ret],['Frustration',frust]]) {
   assert.equal(resolve(name,a).power,power);
   if(power>1) {
    const expected=calculateCoreDamage({...battleMove('Tackle'),power},a,mon);
    assert.deepEqual(damage(name,a).rolls,expected.rolls);
   }
   assert.equal(damage(name,mon,a).rolls.length,16);
  }
 }
 for(const friendship of [null,undefined,-1,256,'255'])assert.equal(damage('Return',{...mon,friendship}),null);
 assert.deepEqual(damage('Return',{...mon,friendship:0}).rolls,[3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,4]);
});
test('Hidden Power IV bit order, physical and special categories and independently computed rolls',()=>{
 assert.deepEqual([resolve('Hidden Power',{...mon,ivs:ivs(0)}).type,resolve('Hidden Power',{...mon,ivs:ivs(0)}).power],['FIGHTING',30]);
 assert.deepEqual([resolve('Hidden Power').type,resolve('Hidden Power').power],['DARK',70]);
 const physical=damage('Hidden Power',{...mon,ivs:ivs(0),types:['FIGHTING']});
 assert.equal(physical.category,'Physical');assert.equal(physical.base,21);assert.equal(physical.stab,1.5);assert.equal(physical.effectiveness,2);
 assert.deepEqual(physical.rolls,[52,53,53,54,55,55,56,57,57,58,58,59,60,60,61,62]);
 assert.equal(damage('Hidden Power').category,'Special');assert.equal(damage('Hidden Power').base,25);
 const spread={hp:31,attack:30,defense:31,speed:30,spAttack:31,spDefense:30};
 assert.equal(resolve('Hidden Power',{...mon,ivs:spread}).type,'BUG');
 for(const iv of [null,{}, {...ivs(31),speed:undefined}])assert.equal(damage('Hidden Power',{...mon,ivs:iv}),null);
});
test('resolved Hidden Power feeds abilities, held items, weather and exact scenario grouping',()=>{
 // All even second bits: Fighting 70. All odd second bits: Dark 70.
 const physical={...mon,ivs:ivs(2),item:'Choice Band'};
 assert.ok(damage('Hidden Power',physical).max>damage('Hidden Power',{...physical,item:'None'}).max);
 // Type index 8 (Fire): bit total 34, second bits all set for 70 power.
 const fire={...mon,ivs:{...ivs(2),attack:3,spDefense:3},types:['FIRE']};
 assert.equal(resolve('Hidden Power',fire).type,'FIRE');
 assert.equal(damage('Hidden Power',fire,{...mon,ability:'Flash Fire'}).max,0);
 assert.ok(damage('Hidden Power',fire,mon,'sun').max>damage('Hidden Power',fire).max);
 assert.ok(damage('Hidden Power',{...fire,item:'Charcoal'}).max>damage('Hidden Power',fire).max);
 const defender={...mon,abilityOptions:{status:'uncertain',values:['Immunity','Thick Fat'],source:'species'}};
 const scenarios=calculateAbilityScenarios(battleMove('Hidden Power'),fire,defender);
 assert.equal(scenarios.groups.length,2);assert.ok(scenarios.groups.every(g=>g.rolls.length===16));
 assert.equal(calculateAbilityScenarios(battleMove('Return'),mon,defender).groups.length,1);
});
test('Low Kick thresholds, canonical species, both directions and Fighting immunity',()=>{
 for(const [weight,power] of [[9.9,20],[10,40],[24.9,40],[25,60],[49.9,60],[50,80],[99.9,80],[100,100],[199.9,100],[200,120]])assert.equal(lowKickPower(weight),power);
 // Caterpie 2.9, Metapod 9.9, Kakuna 10, Pikachu 6, Venusaur 100, Snorlax 460.
 for(const [dex,power] of [[10,20],[11,20],[14,40],[25,20],[3,100],[143,120],[135,40],[117,60],[106,60],[107,80],[154,100]]) {
  assert.equal(resolve('Low Kick',mon,{...mon,dex}).power,power);
  assert.equal(damage('Low Kick',mon,{...mon,dex}).rolls.length,16);
  assert.equal(damage('Low Kick',{...mon,dex},mon).rolls.length,16);
 }
 assert.equal(resolve('Low Kick',mon,{name:'Snorlax',weight:460}),null);
 assert.equal(damage('Low Kick',mon,{...mon,types:['GHOST']}).max,0);
});
test('Tower and Anabel provenance, agreement and unknown opponent IVs',()=>{
 const state={rules:createTowerRules(),selectedTrainer:null};
 const ret=frontierPokemon.find(s=>s.moves.includes('Return'));
 const frust=frontierPokemon.find(s=>s.moves.includes('Frustration'));
 assert.equal(opponentMoveInputs(state,[ret]).friendship,255);
 assert.equal(opponentMoveInputs(state,[frust]).friendship,0);
 assert.equal(opponentMoveInputs(state,[ret,frust]).friendship,null);
 assert.equal(opponentMoveInputs(state,[ret]).ivs,null);
 assert.deepEqual(opponentMoveInputs(state,[{...ret}]),{friendship:null,ivs:null});
 assert.deepEqual(opponentMoveInputs({...state,rules:{facility:'Factory'}},[ret]),{friendship:null,ivs:null});
 const brain=towerBrainSets.find(s=>s.brainSet==='Anabel Silver');
 const ordinary=opponentMoveInputs({...state,selectedTrainer:'Youngster:BRADY'},[frontierPokemon.find(s=>s.species==='Sunkern')]);
 assert.deepEqual(ordinary.ivs,ivs(3));
 const inputs=opponentMoveInputs({...state,selectedTrainer:'Anabel',selectedBrainSymbol:'Silver'},[brain]);
 assert.deepEqual(inputs.ivs,ivs(24));assert.equal(inputs.friendship,255);
 assert.equal(damage('Hidden Power',{...mon,...inputs}).rolls.length,16);
 assert.equal(damage('Hidden Power',{...mon,...opponentMoveInputs(state,[ret])}),null);
});
test('scope guard keeps deferred moves unavailable; conventional Facade and Dig remain available',()=>{
 for(const name of ['Counter'])assert.equal(damage(name),null,name);
 for(const name of ['Tackle','Facade','Dig'])assert.equal(damage(name).rolls.length,16);
});
