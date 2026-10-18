import test from 'node:test';
import assert from 'node:assert/strict';
import {species,natures,searchSpecies,evError,calculateIVRows,fields} from '../src/resources/calculators/ivCalculator.js';
const values = value=>Object.fromEntries(fields.map(([key])=>[key,value]));
const bulba=searchSpecies('Bulbasaur')[0];
const calc=(p=bulba,l='50',n='',o=values(''),e=values('0'),enabled=false)=>calculateIVRows(p,l,n,o,e,enabled);
test('canonical species, mapping, and alphabetical natures',()=>{
 assert.equal(species.length,386);assert.equal(new Set(species.map(p=>p.nationalDexId)).size,386);
 assert.equal(bulba.name,'Bulbasaur');assert.equal(searchSpecies('Pika')[0].name,'Pikachu');assert.equal(searchSpecies('swamp')[0].nationalDexId,260);
 assert.equal(natures.length,25);assert.deepEqual(natures,[...natures].sort());
 assert.deepEqual(searchSpecies('Deoxys')[0].baseStats,{hp:50,attack:95,defense:90,speed:180,spAttack:95,spDefense:90});
});
test('progressive base and ranges, neutral and nature flooring',()=>{
 assert.equal(calc(null)[0].base,null);assert.equal(calc(bulba,'')[0].base,45);assert.equal(calc(bulba,'')[0].range,null);
 assert.deepEqual(calc().map(r=>r.range),[[105,120],[54,69],[54,69],[70,85],[70,85],[50,65]]);
 assert.deepEqual(calc(bulba,'50','Adamant')[1].range,[59,75]);assert.deepEqual(calc(bulba,'50','Adamant')[3].range,[63,76]);
 for(const n of ['Hardy','Docile','Serious','Bashful','Quirky']) assert.deepEqual(calc(bulba,'50',n),calc());
 assert.deepEqual(calc(bulba,'1')[0].range,[11,12]);assert.deepEqual(calc(bulba,'100')[0].range,[200,231]);
});
test('independent partial IV inference and invalid stats',()=>{
 let rows=calc(bulba,'50','',{...values(''),hp:'120',attack:'54',defense:'999',speed:'-1'});
 assert.deepEqual(rows[0].iv,[30,31]);assert.deepEqual(rows[1].iv,[0,1]);assert.equal(rows[2].iv,'No valid IV');assert.equal(rows[3].iv,null);assert.equal(rows[5].iv,'Enter a positive whole stat');
 const complete=Object.fromEntries(calc().map(r=>[r.key,String(r.range[1])]));assert.ok(calc(bulba,'50','',complete).every(r=>Array.isArray(r.iv)));
});
test('EV floor, bounds, total and disabled values',()=>{
 const e={...values('0'),hp:'255',attack:'255'};assert.equal(evError(e,true),null);
 assert.deepEqual(calc(bulba,'50','',values(''),{...values('0'),hp:'4'},true)[0].range,[105,121]);
 for(const hp of ['256','-1','1.5',''])assert.ok(evError({...values('0'),hp},true));
 assert.ok(evError({...e,speed:'1'},true));assert.equal(evError({...e,speed:'1'},false),null);
 assert.deepEqual(calc(bulba,'50','',values(''),{hp:'bad'},false),calc());
 assert.equal(calc(bulba,'50','',values(''),{hp:'bad'},true)[0].range,null);
});
test('Shedinja HP cannot identify IV and impossible HP is rejected',()=>{
 const p=searchSpecies('Shedinja')[0];assert.deepEqual(calc(p)[0].range,[1,1]);
 assert.equal(calc(p,'50','',{hp:'1'})[0].iv,'Cannot determine from HP');assert.equal(calc(p,'50','',{hp:'2'})[0].iv,'No valid IV');
});

test('one name suggestion ranked by prefix, substring, and National Dex',()=>{
 for (const query of ['', ' ', 'no such pokemon', '#025', '025']) assert.deepEqual(searchSpecies(query),[]);
 for (const [query,name] of [['char','Charmander'],['charmel','Charmeleon'],['chari','Charizard'],['king','Kingler'],['saur','Bulbasaur'],[' BULB ','Bulbasaur']]) {
  const matches=searchSpecies(query);assert.equal(matches.length,1);assert.equal(matches[0].name,name);
 }
});
