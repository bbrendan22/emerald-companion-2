import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {pokemonOrigin} from '../src/ui/pokemonOrigin.js';
import {readPokemon} from '../src/save/readPokemon.js';
import {makePokemon} from './fixtures/synthetic.js';

const mon=(gameId,metLocationId,metLevel=25,ballId=4)=>readPokemon(makePokemon({origins:metLevel|(gameId<<7)|(ballId<<11),metLocationId,otId:0xabcd3039}));
test('origin metadata comes from the Pokémon secure word and its own OT, not the save trainer',()=>{
  const pokemon=mon(4,129,16,11);
  assert.deepEqual(pokemon.origin,{gameId:4,metLevel:16,metLocationId:129,ballId:11});
  assert.deepEqual(pokemonOrigin(pokemon),{ot:'C',tid:'12345',game:'FireRed',ball:'Luxury Ball',ballItemId:11,metLocation:'Underground Path',metLevel:16});
});
test('location decoding is game-aware, including shared IDs with different meanings',()=>{
  for(const game of [1,2])assert.equal(pokemonOrigin(mon(game,58)).metLocation,'Battle Tower');
  assert.equal(pokemonOrigin(mon(3,58)).metLocation,'Battle Frontier');
  assert.equal(pokemonOrigin(mon(3,209)).metLocation,'Desert Underpass');
  for(const game of [4,5])assert.equal(pokemonOrigin(mon(game,196)).metLocation,'Celadon Dept.');
  assert.equal(pokemonOrigin(mon(3,196)).metLocation,'Special Area');
  assert.equal(pokemonOrigin(mon(1,0)).metLocation,'Littleroot Town');
  assert.equal(pokemonOrigin(mon(2,209)).metLocation,null);
  assert.equal(pokemonOrigin(mon(4,12)).metLocation,null);
  assert.equal(pokemonOrigin(mon(15,12)).metLocation,'Distant Land','Orre IDs must never be mistaken for Hoenn IDs');
  assert.equal(pokemonOrigin(mon(15,12)).game,'Colosseum / XD');
});
test('special met-location markers and the GBA hatch-level sentinel are decoded explicitly',()=>{
  for(const [id,name] of [[253,'Special egg'],[254,'In-game trade'],[255,'Fateful encounter']])assert.equal(pokemonOrigin(mon(3,id)).metLocation,name);
  assert.equal(pokemonOrigin(mon(3,12,0)).metLevel,5);
  assert.equal(pokemonOrigin({...mon(3,12,0),isEgg:true}).metLevel,null);
  assert.equal(pokemonOrigin(mon(3,255,0)).metLevel,null);
  assert.equal(pokemonOrigin(mon(3,87,0)).metLevel,null);
  assert.equal(pokemonOrigin(mon(3,87)).metLocation,null);
  assert.equal(pokemonOrigin(mon(3,250)).metLocation,null);
});
test('all 12 Gen 3 ball IDs reuse existing item names and sprites; invalid values remain unknown',()=>{
  const names=['Master Ball','Ultra Ball','Great Ball','Poké Ball','Safari Ball','Net Ball','Dive Ball','Nest Ball','Repeat Ball','Timer Ball','Luxury Ball','Premier Ball'];
  for(let i=1;i<=12;i++) {const data=pokemonOrigin(mon(3,12,25,i));assert.equal(data.ball,names[i-1]);assert.ok(existsSync(new URL(`../public/items/${data.ballItemId}.png`,import.meta.url)));}
  for(const id of [0,13,14,15])assert.equal(pokemonOrigin(mon(3,12,25,id)).ball,null);
});
test('missing, invalid and unsupported text metadata is never replaced with invented data',()=>{
  assert.deepEqual(pokemonOrigin({}),{ot:null,tid:null,game:null,ball:null,ballItemId:null,metLocation:null,metLevel:null});
  assert.equal(pokemonOrigin(mon(0,12,127)).metLevel,null);assert.equal(pokemonOrigin(mon(0,12)).game,null);
  assert.equal(pokemonOrigin({...mon(3,12),ot:{name:'�',trainerId:0}}).ot,null);
  assert.equal(pokemonOrigin({...mon(3,12),languageId:1}).ot,null);
  assert.equal(pokemonOrigin({...mon(3,12),ot:{name:'ALICE',trainerId:0}}).tid,'00000');
});

test('unmatched GameCube records use neutral locations even when a table names the ID',()=>{
  for(const id of [0,1,5,12,22,90,143,144,200,208,229,253,255]) {
    const pokemon=mon(15,id); // Bulbasaur is not a native C/XD encounter.
    assert.equal(pokemonOrigin(pokemon).metLocation,'Distant Land');
    assert.equal(pokemonOrigin(pokemon).game,'Colosseum / XD');
  }
  assert.equal(pokemonOrigin(mon(15,254)).metLocation,'In-game trade','shared special marker is preserved without inventing a physical place');
  for(const id of [undefined,-1,256,NaN])assert.equal(pokemonOrigin({origin:{gameId:15,metLocationId:id}}).metLocation,'Distant Land');
  assert.equal(pokemonOrigin(mon(3,12)).metLocation,'Lilycove City');
  assert.equal(pokemonOrigin(mon(3,255)).metLocation,'Fateful encounter');
});
