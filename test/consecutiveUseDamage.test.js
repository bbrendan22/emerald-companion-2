import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMove} from '../src/battle/reference.js';
import {conditionalCases,conditionalPowerLabel,isConsecutiveUsePower,calculateConditionalDamage} from '../src/battle/conditionalDamage.js';
import {calculateCoreDamage,isConventionalDamageMove,neutralBaseDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {coreDamageDisplayParts} from '../src/battle/coreDamagePresentation.js';
const mon={level:50,types:['NORMAL'],ability:'Immunity',item:'None',status:'none',currentHp:100,
 stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const names=['Rollout','Ice Ball','Fury Cutter'];
const powers=[30,60,120,240,480],furyPowers=[10,20,40,80,160];
const calc=(name,a=mon,d=mon,w='none',c=false,context={})=>calculateCoreDamage(battleMove(name),a,d,w,c,context);
const values=result=>result.conditions.map(c=>c.result);
const rolls=max=>Array.from({length:16},(_,i)=>Math.floor(max*(85+i)/100));
const options=values=>({status:values.length===1?'known':'uncertain',source:'species',values});
test('all three canonical progressions preserve ordered stages, types, categories and complete16-roll results',()=>{
 for(const [name,type,category,ends] of [['Rollout','ROCK','Physical',[15,28,28,54,54,107,107,213,213,424]],
  ['Ice Ball','ICE','Special',[15,28,28,54,54,107,107,213,213,424]],['Fury Cutter','BUG','Physical',[6,10,19,37,72]]]) {
  const move=battleMove(name),before=structuredClone(move),result=calc(name),curl=name!=='Fury Cutter';
  assert.equal(move.type,type);assert.equal(move.power,curl?30:10);
  assert.equal(result.kind,'conditional-damage');assert.equal(result.conditions.length,curl?10:5);
  assert.deepEqual(result.conditions.filter(c=>!c.defenseCurl).map(c=>c.power),curl?powers:furyPowers);
  if(curl)assert.deepEqual(result.conditions.filter(c=>c.defenseCurl).map(c=>c.power),powers.map(p=>p*2));
  assert.deepEqual(result.conditions.map(c=>c.stage),curl?[1,1,2,2,3,3,4,4,5,5]:[1,2,3,4,5]);
  for(const [i,c] of result.conditions.entries()) {
   assert.equal(c.formulaPower,c.power);assert.equal(c.multiplier,1);assert.equal(c.probability,undefined);
   assert.equal(c.result.category,category);assert.deepEqual(c.result.rolls,rolls(ends[i]));
   assert.equal(c.result.rolls.length,16);
  }
  assert.equal(result.rolls,undefined);assert.equal(result.distribution,undefined);assert.equal(result.min,undefined);
  assert.equal(coreDamageDisplayParts(result,200),null,'no giant merged range');
  assert.equal(isConventionalDamageMove(move),false,'ordinary effect/power gate remains strict');
  assert.deepEqual(move,before);
 }
 assert.equal(conditionalCases(battleMove('Fury Cutter')).at(-1).label,'HIT 5+');
 assert.equal(conditionalPowerLabel(battleMove('Fury Cutter')),'10–160');
 assert.equal(conditionalPowerLabel(battleMove('Rollout')),'30–480 / 60–960');
});
test('Defense Curl and streaks modify dynamic power before division/+2, never rounded damage',()=>{
 // Independent Emerald: Lv50, Atk/Def100, power30 =>floor(22*30/50)+2=15;
 // power60=>28 (not30), power480=>213, Curl power960=>424 (not426).
 for(const name of ['Rollout','Ice Ball']) {
  const r=values(calc(name));
  assert.equal(r[0].base,15);assert.equal(r[1].base,28);assert.equal(r[8].base,213);assert.equal(r[9].base,424);
  assert.notDeepEqual(r[1].rolls,r[0].rolls.map(n=>n*2));
  assert.notDeepEqual(r[9].rolls,r[8].rolls.map(n=>n*2));
  const calls=[];
  calculateConditionalDamage(battleMove(name),mon,mon,'none',false,{},move=>{calls.push(move);return null;});
  assert.deepEqual(calls.map(m=>m.formulaPower),[30,60,60,120,120,240,240,480,480,960]);
  assert.ok(calls.every(m=>m.damageMultiplier===1));
 }
 const fury=values(calc('Fury Cutter'));
 assert.deepEqual(fury.map(r=>r.base),[6,10,19,37,72]);assert.equal(fury.length,5,'maximum16x, no extra doubling');
 assert.notEqual(fury[4].max,fury[0].max*16);
});
test('high dynamic powers are admitted narrowly, without a global power or effect relaxation',()=>{
 const base={level:50,type:'ROCK',attack:100,defense:100};
 for(const id of [205,301])for(const power of [480,960]) {
  assert.equal(isConsecutiveUsePower(id,power),true);
  assert.ok(neutralBaseDamage({...base,moveId:id,power}));
 }
 for(const id of [undefined,1,210,228,279,311])for(const power of [480,960])
  assert.equal(neutralBaseDamage({...base,moveId:id,power}),null);
 for(const power of [256,300,479,481,959,961,1920,65535,NaN,'480'])
  assert.equal(neutralBaseDamage({...base,moveId:205,power}),null);
 for(const name of ['Spit Up','Counter','Bide'])assert.equal(calc(name),null);
});
test('correct physical/special stats are used in both attack directions at every stage',()=>{
 const enemy={...mon,stats:{...mon.stats,attack:150,spAttack:90}};
 assert.deepEqual(values(calc('Rollout',enemy,mon)).map(r=>r.max),[21,41,41,81,81,160,160,318,318,635]);
 assert.deepEqual(values(calc('Ice Ball',enemy,mon)).map(r=>r.max),[13,25,25,49,49,97,97,192,192,382]);
 assert.deepEqual(values(calc('Fury Cutter',enemy,mon)).map(r=>r.max),[8,15,28,54,107]);
 for(const name of names) {
  const special=name==='Ice Ball',a={...mon,stats:{[special?'spAttack':'attack']:100}},d={...mon,stats:{[special?'spDefense':'defense']:100}};
  assert.deepEqual(values(calc(name,a,d)).map(r=>r.rolls),values(calc(name)).map(r=>r.rolls));
  const unknown={...mon,stats:{[special?'spDefense':'defense']:'100–120'}};
  assert.ok(values(calc(name,mon,unknown)).every(r=>r===null));
 }
});
test('every stage respects STAB and cartridge effectiveness, including high powers and Ghosts',()=>{
 for(const [name,type,weak] of [['Rollout','ROCK','FLYING'],['Ice Ball','ICE','DRAGON'],['Fury Cutter','BUG','PSYCHIC']]) {
  const r=calc(name,{...mon,types:[type]},{...mon,types:[weak]});
  const ordinary=values(calc(name));
  for(const [index,hit] of values(r).entries()) {
   assert.deepEqual(hit.rolls,rolls(Math.floor(ordinary[index].base*3/2)*2));
   assert.equal(hit.effectiveness,2);
  }
  assert.ok(values(calc(name,mon,{...mon,types:['GHOST']})).every(r=>r.max>0),'none of these types has chart immunity in Gen III');
 }
 assert.equal(values(calc('Rollout',mon,{...mon,types:['FIRE','FLYING']})).at(-1).max,1696);
 assert.equal(values(calc('Ice Ball',mon,{...mon,types:['WATER','ICE']})).at(-1).max,106);
});
test('held items, abilities, burn and Swarm use full stage power before the integer formula',()=>{
 for(const name of names)for(const [a,d] of [
  [{...mon,item:name==='Rollout'?'Hard Stone':name==='Ice Ball'?'NeverMeltIce':'SilverPowder'},mon],
  [{...mon,ability:'Guts',status:'burn',item:'Choice Band'},{...mon,ability:'Marvel Scale',status:'poison'}],
  [{...mon,ability:'Huge Power',status:'burn'},mon],
  [mon,{...mon,ability:'Thick Fat'}],
 ]) {
  // Same formula power on a supported ordinary move is an independent path for
  // <=255 cases; large stages are checked with the direct base operand API.
  const result=calc(name,a,d);
  for(const c of result.conditions.filter(c=>c.power<=255)) {
   const reference=calculateCoreDamage({...battleMove(name==='Ice Ball'?'Ice Beam':name==='Rollout'?'Rock Throw':'Twineedle'),id:1,effect:'HIT',power:c.power},a,d);
   assert.deepEqual(c.result.rolls,reference.rolls);
  }
 }
 assert.equal(values(calc('Rollout',{...mon,status:'burn'})).at(-1).base,213);
 assert.equal(values(calc('Ice Ball',{...mon,status:'burn'})).at(-1).base,424,'Ice is Special');
 assert.equal(values(calc('Ice Ball',mon,{...mon,ability:'Thick Fat'})).at(-1).base,213);
 const swarm={...mon,ability:'Swarm',currentHp:60,types:['BUG']};
 assert.deepEqual(values(calc('Fury Cutter',swarm)).map(r=>r.max),[12,22,42,81,160]);
});
test('screens, stat stages, criticals and weather retain per-stage truncation',()=>{
 for(const name of names)for(const critical of [false,true])for(const sign of [-2,2]) {
  const a={...mon,stages:{attack:sign,spAttack:sign},status:'burn'};
  const d={...mon,screens:{reflect:true,lightScreen:true},stages:{defense:sign,spDefense:sign}};
  const reference=calc(name,a,d,'none',critical);
  for(const weather of ['none','sun','rain','sand','hail'])assert.deepEqual(calc(name,a,d,weather,critical),reference,'Rock/Ice/Bug have no direct weather damage boost');
  for(const c of reference.conditions)assert.equal(c.result.rolls.length,16);
 }
 const d={...mon,screens:{reflect:true,lightScreen:true}};
 assert.equal(values(calc('Rollout',mon,d)).at(-1).base,213);
 assert.equal(values(calc('Ice Ball',mon,d)).at(-1).base,213);
 assert.equal(values(calc('Rollout',{...mon,status:'burn'},d)).at(-1).base,107);
 for(const name of names)assert.deepEqual(calc(name,mon,d,'none',true),calc(name,mon,mon,'none',true),'crit skips screens');
});
test('ability uncertainty and complete result grouping stay independent within every stage',()=>{
 const enemy={...mon,abilityOptions:options(['Immunity','Huge Power'])};
 for(const name of names) {
  const own=calculateAbilityScenarios(battleMove(name),enemy,mon);
  assert.equal(own.conditions.length,name==='Fury Cutter'?5:10);
  assert.ok(own.conditions.every(c=>c.abilityDamage.groups.length===(name==='Ice Ball'?1:2)));
  const incoming=calculateAbilityScenarios(battleMove(name),mon,enemy);
  assert.ok(incoming.conditions.every(c=>c.abilityDamage.groups.length===1));
  assert.equal(own.conditions[0].abilityDamage.scenarios.length,2);
 }
 const target={...mon,abilityOptions:options(['Immunity','Thick Fat'])};
 assert.ok(calculateAbilityScenarios(battleMove('Ice Ball'),mon,target).conditions.every(c=>c.abilityDamage.groups.length===2));
 let calls=0;
 const calculate=(move,_a,d)=>{calls++;return {kind:'conditional-damage',conditions:conditionalCases(move).map(c=>({...c,
  result:{kind:'standard-damage',min:1,max:3,rolls:Array.from({length:16},(_,i)=>i===0?1:i===15?3:d.ability==='Immunity'?2:1)},
 }))};};
 const result=calculateAbilityScenarios(battleMove('Rollout'),mon,target,{calculate});
 assert.equal(calls,2,'calculate all stages only once per ability pair');
 assert.ok(result.conditions.every(c=>c.abilityDamage.groups.length===2),'same endpoints never erase distribution differences');
 assert.equal(result.conditions.length,10,'equal-power stages and Curl alternatives never merge');
});
test('Wonder Guard prevention, unavailable, immunity and unsupported results preserve every ordered hypothesis',()=>{
 for(const [name,weak] of [['Rollout','FLYING'],['Ice Ball','DRAGON'],['Fury Cutter','PSYCHIC']]) {
  const blocked=calc(name,mon,{...mon,ability:'Wonder Guard'});
  assert.ok(values(blocked).every(r=>r.outcome==='blocked'&&r.reason==='wonder-guard'&&r.rolls===undefined));
  assert.deepEqual(calc(name,mon,{...mon,ability:'Wonder Guard',types:[weak]}),calc(name,mon,{...mon,types:[weak]}));
  const d={...mon,abilityOptions:options(['Immunity','Wonder Guard'])};
  assert.ok(calculateAbilityScenarios(battleMove(name),mon,d).conditions.every(c=>JSON.stringify(c.abilityDamage.groups.map(g=>g.availability))===JSON.stringify(['available','blocked'])));
  assert.ok(calculateAbilityScenarios(battleMove(name),{...mon,ability:null},mon).conditions.every(c=>c.abilityDamage.groups[0].availability==='unavailable'));
 }
 const target={...mon,abilityOptions:options(['Immunity','Thick Fat'])};
 const calculate=move=>({kind:'conditional-damage',conditions:conditionalCases(move).map(c=>({...c,result:{kind:'deterministic-damage',outcome:'immune',damage:0,reason:'type-immunity'}}))});
 const result=calculateAbilityScenarios(battleMove('Ice Ball'),mon,target,{calculate});
 assert.equal(result.conditions.length,10);assert.ok(result.conditions.every(c=>c.abilityDamage.groups[0].availability==='immune'));
 const unsupported=calculateAbilityScenarios(battleMove('Rollout'),mon,{...mon,screens:{reflect:true}},{battleContext:{format:'Doubles'}});
 assert.ok(unsupported.conditions.every(c=>c.abilityDamage.groups[0].reason==='unknown-defender-side-count'));
});
test('no history/Defense Curl stage mutation, no cumulative attack totals, and prior result contracts persist',()=>{
 const before=structuredClone(mon);
 for(const name of names) {
  assert.deepEqual(calc(name,{...mon,rolloutCount:4,furyCutterCount:5,defenseCurl:true,currentHp:1}),calc(name));
  assert.deepEqual(mon,before);
 }
 for(const name of ['Pursuit','Revenge'])assert.equal(calc(name).conditions.length,2);
 assert.equal(calc('Strength').rolls.length,16);assert.equal(calc('Seismic Toss').kind,'deterministic-damage');
 assert.equal(calc('Double Kick').totalOutcomes,256);assert.equal(calc('DoubleSlap').totalOutcomes,8388608);assert.equal(calc('Triple Kick').totalOutcomes,4096);
 assert.equal(coreDamageDisplayParts(values(calc('Rollout'))[0],200).hp,'12–15 HP damage');
});
