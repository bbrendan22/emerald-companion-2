import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateStats,statInputs,searchSpecies,statEVError,validStatInput,natures} from '../src/resources/calculators/statCalculator.js';
import {speciesBarPercents} from '../src/pokemon/statBars.js';
import reference from '../src/data/reference.json' with {type:'json'};
const p=searchSpecies('Bulbasaur')[0], iv=statInputs('31'),ev=statInputs('0');
const calc=(pokemon=p,level='50',nature='',ivs=iv,evs=ev)=>calculateStats(pokemon,level,nature,ivs,evs);
test('literal Gen 3 values, nature flooring, EV quarters, levels and special species',()=>{
 assert.deepEqual(calc().map(r=>r.value),[120,69,69,85,85,65]);
 assert.deepEqual(calc(p,'50','Adamant').map(r=>r.value),[120,75,69,76,85,65]);
 for(const n of ['Hardy','Docile','Serious','Bashful','Quirky'])assert.deepEqual(calc(p,'50',n),calc());
 assert.equal(calc(p,'50','',iv,{...ev,attack:'3'})[1].value,69);
 assert.equal(calc(p,'50','',iv,{...ev,attack:'4'})[1].value,70);
 assert.equal(calc(p,'1')[0].value,12);assert.equal(calc(p,'100')[0].value,231);
 assert.equal(calc(searchSpecies('Shedinja')[0])[0].value,1);
 const deoxys=searchSpecies('Deoxys')[0];assert.equal(deoxys.baseStats.speed,180);assert.equal(calc(deoxys)[5].value,200);
});
test('missing and invalid inputs never invent results; EV allocation blocks all results',()=>{
 for(const rows of [calc(null),calc(p,''),calc(p,'101')])assert.ok(rows.every(r=>r.value===null && r.bar===null));
 for(const value of ['-1','32','1.5','abc',' ']) {
  const rows=calc(p,'50','',{...iv,attack:value});assert.equal(rows[1].value,null);assert.equal(rows[0].value,120);
 }
 for(const value of ['-1','256','1.5','abc'])assert.ok(calc(p,'50','',iv,{...ev,hp:value}).every(r=>r.value===null));
 assert.equal(statEVError({...ev,hp:'255',attack:'255'}),null);
 assert.equal(statEVError({...ev,hp:'255',attack:'255',speed:'1'}),'Total EVs cannot exceed 510.');
 assert.ok(calc(p,'50','',iv,{...ev,hp:'255',attack:'255',speed:'1'}).every(r=>r.value===null));
 assert.equal(validStatInput('0',31),true);
});
test('species bar scaling and data reuse',()=>{
 const id=Object.keys(reference.species).find(id=>reference.species[id].nationalDexId===p.nationalDexId);
 assert.deepEqual(Object.fromEntries(calc().map(r=>[r.key,r.bar])),speciesBarPercents(id));
 assert.deepEqual(calc(p,'100','Adamant').map(r=>r.bar),calc().map(r=>r.bar));
 assert.equal(natures.length,25);assert.deepEqual(natures,[...natures].sort());assert.deepEqual(searchSpecies(''),[]);assert.equal(searchSpecies('char').length,1);
});

test('empty fields calculate with placeholder defaults',()=>{assert.deepEqual(calc(p,'50','',statInputs(''),statInputs('')),calc());assert.equal(statEVError(statInputs('')),null);});
