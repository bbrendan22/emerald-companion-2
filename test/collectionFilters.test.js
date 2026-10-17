import test from 'node:test';
import assert from 'node:assert/strict';
import {filterDetails, representedGames, typeOptions, collectionImage} from '../src/ui/collectionFilters.js';
import {identifyPokemon, filterPokemon} from '../src/storage/pokemonRoles.js';
import {readFileSync} from 'node:fs';
const mon = (pid,dex,game,shiny=false) => ({personality:pid,ot:{id:42},nationalDexId:dex,speciesName:dex===260?'Swampert':'Bulbasaur',nickname:'Buddy',origin:game == null?undefined:{gameId:game},shiny});
test('generation boundaries and either type match without losing duplicate occurrences',()=>{
  const records=[151,152,251,252].map((dex,i)=>mon(i,dex,3));
  assert.deepEqual(filterDetails(records,{generation:'1'}).map(p=>p.nationalDexId),[151]);
  assert.deepEqual(filterDetails(records,{generation:'2'}).map(p=>p.nationalDexId),[152,251]);
  assert.deepEqual(filterDetails(records,{generation:'3'}).map(p=>p.nationalDexId),[252]);
  const duplicates=identifyPokemon([mon(1,260,3),mon(2,260,3)]);
  for(const type of ['water','ground']) assert.equal(filterDetails(duplicates,{type}).length,2);
  assert.equal(filterDetails(duplicates,{type:'fire'}).length,0);
  assert.equal(typeOptions.length,17);
});
test('all dropdowns combine with nickname search, role and shiny filters, retaining Dex order',()=>{
  const records=identifyPokemon([mon(1,260,3,true),mon(2,1,3,true),mon(3,260,1,true),mon(4,260,3),mon(5,260,3,true)]);
  const assigned={[records[0].identity]:'Utility',[records[2].identity]:'Utility'};
  const options={generation:'3',type:'ground',game:'3'};
  assert.deepEqual(filterDetails(filterPokemon(records,assigned,' BuDdY ','Utility'),options).map(p=>p.identity),[records[0].identity]);
  assert.deepEqual(filterDetails(filterPokemon(records,assigned,'swamp','Shinies'),options).map(p=>p.identity),[records[0].identity,records[4].identity]);
  assert.equal(filterDetails(filterPokemon(records,assigned,'missing','All'),options).length,0);
  assert.deepEqual(filterDetails(filterPokemon(records,{},'','All')).map(p=>p.nationalDexId),[1,260,260,260,260]);
});
test('game options derive only from represented origins; unknown origins are not invented',()=>{
  const records=[mon(1,1,15),mon(2,1,3),mon(3,1,1),mon(4,1,3),mon(5,1,0),mon(6,1,null)];
  assert.deepEqual(representedGames(records),[{id:'1',name:'Sapphire'},{id:'3',name:'Emerald'},{id:'15',name:'Colosseum / XD'}]);
  assert.equal(filterDetails(records,{game:'3'}).length,2);
  assert.equal(filterDetails(records).length,6);
  assert.deepEqual(representedGames([mon(1,1,null)]),[]);
});
test('Gallery uses high-resolution normal/shiny artwork and Box uses available Gen 3 icons',()=>{
  for(let dex=1;dex<=386;dex++) for(const shiny of [false,true]) {
    const p=mon(1,dex,3,shiny);
    const path=collectionImage(p,'Gallery');
    assert.equal(path,`/pokemon/artwork/${shiny?'shiny':'normal'}/${dex}.png`);
    const data=readFileSync(new URL(`../public${path}`,import.meta.url));
    assert.equal(data.readUInt32BE(16),475);
    assert.equal(collectionImage(p,'Box'),`/pokemon/box/${dex}.png`);
  }
  assert.equal(collectionImage({...mon(1,1,3),isEgg:true},'Gallery'),'/pokemon/egg.png');
});
