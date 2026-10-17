import test from 'node:test';
import assert from 'node:assert/strict';
import {identifyPokemon, filterPokemon, loadRoles, storeRole} from '../src/storage/pokemonRoles.js';
const mon = (personality, nationalDexId=1) => ({personality,ot:{id:42},nationalDexId,speciesName:nationalDexId===1?'Bulbasaur':'Pikachu',nickname:'Buddy',shiny:personality===2});
const memory = () => { const values=new Map(); return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}; };
test('roles persist through reload, reimport, movement, evolution and nickname changes',()=>{
  const storage=memory(); const [p]=identifyPokemon([mon(1)]);
  storeRole(storage,{},p.identity,'Utility');
  const [updated]=identifyPokemon([{...mon(1,25),nickname:'New name',source:{kind:'box',box:8,slot:2}}]);
  assert.equal(updated.identity,p.identity);
  assert.equal(loadRoles(storage)[updated.identity],'Utility');
  assert.equal(loadRoles(storage)[identifyPokemon([mon(3)])[0].identity],undefined);
});
test('duplicates remain individually selectable, searchable and sorted',()=>{
  const records=identifyPokemon([mon(1,25),mon(2),mon(3),mon(3)]);
  assert.equal(new Set(records.map(p=>p.identity)).size,4);
  const assigned={[records[1].identity]:'Frontier',[records[2].identity]:'Utility'};
  assert.deepEqual(filterPokemon(records,assigned).map(p=>p.nationalDexId),[1,1,1,25]);
  assert.equal(filterPokemon(records,assigned,' BULBA ').length,3);
  assert.equal(filterPokemon(records,assigned,'buddy').length,4);
  assert.equal(filterPokemon(records,assigned,'','Frontier')[0].identity,records[1].identity);
  assert.equal(filterPokemon(records,assigned,'','Utility')[0].identity,records[2].identity);
  assert.equal(filterPokemon(records,assigned,'','Shinies').length,1);
  assert.equal(filterPokemon(records,assigned,'missing').length,0);
});
test('invalid roles are ignored and failed writes preserve prior assignment',()=>{
  const storage=memory();storage.setItem('emerald-companion-2.roles.v1','{"a":"Invalid","b":"Frontier"}');
  assert.deepEqual(loadRoles(storage),{b:'Frontier'});
  const current={a:'Utility'};
  assert.throws(()=>storeRole({setItem(){throw new Error('full');}},current,'a','Frontier'),/full/);
  assert.deepEqual(current,{a:'Utility'});
  assert.throws(()=>storeRole(storage,current,'a','Invalid'),/Unknown/);
});
