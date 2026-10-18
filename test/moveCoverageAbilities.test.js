import test from 'node:test';
import assert from 'node:assert/strict';
import reference from '../src/data/reference.json' with {type:'json'};
import {coveragePokemon,groupMoveCoverage,coverageMultipliers,coverageRoster} from '../src/resources/coverage/moveCoverage.js';
import {coverageMultiplier,guaranteedCoverageAbility} from '../src/resources/coverage/defensiveAbilities.js';
import {typeMultiplier} from '../src/battle/typeMatchups.js';
import {GEN3_TYPE_DISPLAY_ORDER} from '../src/pokemon/typeDisplayOrder.js';
const mon=name=>coveragePokemon.find(p=>p.name===name);
const value=(attack,name)=>coverageMultiplier(attack,mon(name));
test('complete guaranteed holder sets come from unique nonzero standard Gen 3 slots',()=>{
 const expected={
  Levitate:['Gastly','Haunter','Gengar','Koffing','Weezing','Misdreavus','Unown','Vibrava','Flygon','Lunatone','Solrock','Baltoy','Claydol','Duskull','Chimecho','Latias','Latios'],
  'Flash Fire':['Vulpix','Ninetales','Flareon'], 'Water Absorb':['Vaporeon'], 'Volt Absorb':['Jolteon'], 'Wonder Guard':['Shedinja'],
 };
 for(const [ability,names] of Object.entries(expected))assert.deepEqual(coveragePokemon.filter(p=>guaranteedCoverageAbility(p)===ability).map(p=>p.name),names,ability);
 assert.equal(coveragePokemon.filter(p=>guaranteedCoverageAbility(p)).length,23);
 for(const p of coveragePokemon) {
  const slots=reference.species[p.id].abilities;
  assert.ok(slots.length && slots.every(id=>Number.isInteger(id) && id>=0 && (id===0 || reference.abilityNames[id])));
  if(guaranteedCoverageAbility(p))assert.equal(new Set(slots.filter(id=>id>0)).size,1);
 }
 assert.deepEqual(reference.species[mon('Flygon').id].abilities,[26,26]);
 assert.equal(guaranteedCoverageAbility({id:'missing'}),null);
});
test('guaranteed immunities and conditional abilities ignored',()=>{
 for(const name of ['Gengar','Flygon','Weezing','Claydol'])assert.equal(value('GROUND',name),0,name);
 for(const name of ['Vulpix','Ninetales','Flareon'])assert.equal(value('FIRE',name),0,name);
 for(const name of ['Growlithe','Arcanine','Ponyta','Rapidash','Houndour','Houndoom'])assert.equal(value('FIRE',name),0.5,name);
 assert.equal(value('WATER','Vaporeon'),0);assert.equal(value('WATER','Quagsire'),1);assert.equal(value('WATER','Lapras'),0.5);
 assert.equal(value('ELECTRIC','Jolteon'),0);assert.equal(value('ELECTRIC','Chinchou'),1);assert.equal(value('ELECTRIC','Lanturn'),1);
 assert.equal(value('ELECTRIC','Flygon'),0);assert.equal(value('NORMAL','Gengar'),0);
});
test('Wonder Guard allows exactly the five super-effective types after dual-type products',()=>{
 const vulnerable=['FIRE','FLYING','ROCK','GHOST','DARK'];
 for(const type of GEN3_TYPE_DISPLAY_ORDER.map(t=>t.toUpperCase()))assert.equal(value(type,'Shedinja'),vulnerable.includes(type)?2:0,type);
 assert.equal(value('ICE','Shedinja'),0); // Neutral after Bug/Ghost typing.
 assert.equal(value('GRASS','Shedinja'),0); // Resisted.
 assert.equal(value('NORMAL','Shedinja'),0); // Existing type immunity.
});
test('all irrelevant types and species keep ordinary Gen 3 type effectiveness and data stays untouched',()=>{
 const before=JSON.stringify(coveragePokemon), dataBefore=JSON.stringify(reference);
 for(const p of coveragePokemon)for(const type of GEN3_TYPE_DISPLAY_ORDER.map(t=>t.toUpperCase())) {
  const ability=guaranteedCoverageAbility(p);
  if(!ability || ability==='Levitate' && type!=='GROUND' || ability==='Flash Fire' && type!=='FIRE' || ability==='Water Absorb' && type!=='WATER' || ability==='Volt Absorb' && type!=='ELECTRIC')assert.equal(coverageMultiplier(type,p),typeMultiplier(type,p.types),`${p.name}/${type}`);
 }
 assert.equal(JSON.stringify(coveragePokemon),before);assert.equal(JSON.stringify(reference),dataBefore);
 assert.equal(typeMultiplier('GHOST',['STEEL']),0.5);assert.equal(typeMultiplier('DARK',['STEEL']),0.5);assert.equal(GEN3_TYPE_DISPLAY_ORDER.includes('fairy'),false);
});

test('grouping uses guaranteed immunities before choosing the best attack, across unchanged rosters',()=>{
 assert.deepEqual(coverageMultipliers,[0,0.25,0.5,1,2,4]);
 const inGroup=(types,multiplier,name)=>assert.ok(groupMoveCoverage(types).get(multiplier).some(p=>p.name===name),`${types}/${name}`);
 inGroup(['GROUND'],0,'Gengar');inGroup(['GROUND'],0,'Flygon');inGroup(['FIRE'],0,'Flareon');
 inGroup(['WATER'],0,'Vaporeon');inGroup(['ELECTRIC'],0,'Jolteon');inGroup(['ICE'],0,'Shedinja');
 inGroup(['GROUND','FIRE'],1,'Gengar');inGroup(['FIRE','ICE'],0.5,'Flareon');inGroup(['FIRE','ELECTRIC'],2,'Shedinja');
 for(const mode of ['all','fully','frontier']) {
  assert.ok([...groupMoveCoverage([],mode).values()].every(ps=>ps.length===0));
  for(const type of GEN3_TYPE_DISPLAY_ORDER.map(t=>t.toUpperCase())) {
   const groups=groupMoveCoverage([type],mode),members=[...groups.values()].flat();
   assert.equal(members.length,coverageRoster(mode).length);assert.equal(new Set(members.map(p=>p.id)).size,members.length);
   for(const [multiplier,ps] of groups){assert.ok(ps.every(p=>coverageMultiplier(type,p)===multiplier));assert.deepEqual(ps.map(p=>p.dex),ps.map(p=>p.dex).sort((a,b)=>a-b));}
  }
 }
});
