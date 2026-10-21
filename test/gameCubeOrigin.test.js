import test from 'node:test';
import assert from 'node:assert/strict';
import {identifyGameCubeOrigin} from '../src/pokemon/gameCubeOrigin.js';
import {pokemonOrigin} from '../src/ui/pokemonOrigin.js';
import {readPokemon} from '../src/save/readPokemon.js';
import {makePokemon} from './fixtures/synthetic.js';
import reference from '../src/data/reference.json' with {type:'json'};
import catalog from '../src/data/gameCubeEncounters.json' with {type:'json'};
import {NATURES} from '../src/save/stats.js';

const internalIds = new Map(Object.entries(reference.species).map(([id,p])=>[p.nationalDexId,Number(id)]));
function mon(dex,location,level,{xd=false,shadow=true,ball=4,pid=100,...overrides}={}) {
  return {...readPokemon(makePokemon({species:internalIds.get(dex),pid,otId:0xabcd3039,
    origins:level|(15<<7)|(ball<<11),metLocationId:location,ribbonRaw:((xd?0x80000000:0)|(shadow?0x1000000:0))>>>0})),...overrides};
}

test('shared IDs select the encounter game, including evolved species, without changing raw metadata',()=>{
  for(const [dex,loc,level,game,location] of [
    [243,69,40,'colosseum','Laboratory'],[168,69,43,'colosseum','Laboratory'],
    [244,76,40,'colosseum','Mt. Battle'],[20,76,34,'xd','Citadark Isle'],
    [225,109,45,'colosseum','Realgamtwr Dome'],[37,109,18,'xd','Pyrite Town'],
    [181,15,30,'colosseum','Pyrite Town'],[181,11,17,'xd','Cipher Lab'],
    [248,118,55,'colosseum','Tower Colosseum'],
  ]) {
    const pokemon=mon(dex,loc,level,{xd:game==='xd'}),before=structuredClone(pokemon);
    assert.equal(identifyGameCubeOrigin(pokemon),game);
    assert.equal(pokemonOrigin(pokemon).metLocation,location);
    assert.equal(pokemonOrigin(pokemon).game,game==='xd'?'XD':'Colosseum');
    assert.deepEqual(pokemon,before);
  }
});
test('starters and their evolutions preserve met levels and special markers',()=>{
  for(const [dex,level] of [[196,25],[197,26]]) {
    const pokemon=mon(dex,254,level,{shadow:false});
    assert.equal(identifyGameCubeOrigin(pokemon),'colosseum');
    assert.equal(pokemonOrigin(pokemon).metLocation,'In-game trade');
  }
  for(const dex of [133,134,135,136,196,197]) {
    const pokemon=mon(dex,0,10,{xd:true,shadow:false});
    assert.equal(identifyGameCubeOrigin(pokemon),'xd');
    assert.equal(pokemonOrigin(pokemon).metLocation,'Distant Land','unnamed ID 0 is not an invented physical location');
  }
  for(const dex of [152,153,154,155,156,157,158,159,160])assert.equal(identifyGameCubeOrigin(mon(dex,16,5,{xd:true,shadow:false})),'xd');
  assert.equal(identifyGameCubeOrigin(mon(196,254,26,{shadow:false})),null);
  assert.equal(identifyGameCubeOrigin(mon(134,254,25,{shadow:false})),null,'branch siblings are not ancestral encounter species');
});
test('all XD Shadow rematch locations and wild level endpoints are accepted',()=>{
  for(const loc of [59,90,91,92,113])assert.equal(identifyGameCubeOrigin(mon(373,loc,50,{xd:true})),'xd');
  for(const [dex,loc,max] of [[27,90,23],[207,90,20],[328,90,20],[187,91,20],[231,91,20],[283,91,20],[41,92,21],[304,92,21],[194,92,21]]) {
    for(const level of [10,max])assert.equal(identifyGameCubeOrigin(mon(dex,loc,level,{xd:true,shadow:false})),'xd');
    for(const level of [9,max+1])assert.equal(identifyGameCubeOrigin(mon(dex,loc,level,{xd:true,shadow:false})),null);
  }
  assert.equal(identifyGameCubeOrigin(mon(330,90,20,{xd:true,shadow:false})),'xd','evolved wild Trapinch');
});
test('fixed gifts/trades check Pokémon OT, ball and flag, not the save trainer',()=>{
  const plusle=mon(311,254,13,{shadow:false,ot:{gender:'male',name:'DUKING',trainerId:37149,secretId:0}});
  assert.equal(identifyGameCubeOrigin(plusle),'colosseum');
  for(const ot of [{...plusle.ot,name:'PLAYER'},{...plusle.ot,trainerId:1},{...plusle.ot,secretId:1},{...plusle.ot,gender:'female'}])assert.equal(identifyGameCubeOrigin({...plusle,ot}),null);
  for(const [dex,loc,name,tid] of [[239,164,'HORDEL',41400],[125,164,'HORDEL',41400],[307,116,'DUKING',37149],[308,116,'DUKING',37149],[213,116,'DUKING',37149],[246,116,'DUKING',37149],[248,116,'DUKING',37149]]) {
    const pokemon=mon(dex,loc,20,{xd:true,shadow:false,ot:{gender:'male',name,trainerId:tid,secretId:123}});
    assert.equal(identifyGameCubeOrigin(pokemon),'xd');
    assert.equal(identifyGameCubeOrigin({...pokemon,origin:{...pokemon.origin,ballId:2}}),null);
    assert.equal(identifyGameCubeOrigin({...pokemon,ot:{...pokemon.ot,trainerId:0}}),null);
  }
});
test('e-Reader records require Japanese language, zero IVs, locked nature/gender and purification',()=>{
  for(const [dex,level,nature,gender] of [[175,20,22,'female'],[179,37,16,'female'],[212,50,11,'male']]) {
    const pokemon=mon(dex,128,level,{languageId:1,nature:NATURES[nature],gender,ivs:{hp:0,attack:0,defense:0,speed:0,spAttack:0,spDefense:0}});
    assert.equal(identifyGameCubeOrigin(pokemon),'colosseum');
    for(const patch of [{languageId:2},{nature:'Hardy'},{gender:'genderless'},{ivs:{...pokemon.ivs,hp:1}},{ribbons:{raw:0}}])assert.equal(identifyGameCubeOrigin({...pokemon,...patch}),null);
  }
});
test('missing or contradictory metadata stays unresolved; no species-only or flag-only guesses',()=>{
  const pokemon=mon(243,69,40);
  for(const patch of [{origin:{...pokemon.origin,gameId:3}},{nationalDexId:1},{isEgg:true},{isEgg:undefined},{ribbons:undefined},{languageId:undefined},{ot:undefined},
    {ribbons:{raw:0x81000000}},{ribbons:{raw:0}},{ribbons:{raw:-1}},{ribbons:{raw:0x100000000}}])assert.equal(identifyGameCubeOrigin({...pokemon,...patch}),null);
  for(const [key,values] of Object.entries({metLevel:[undefined,0,41,127],metLocationId:[undefined,255,1,256],ballId:[undefined,0,5,13]})) {
    for(const value of values)assert.equal(identifyGameCubeOrigin({...pokemon,origin:{...pokemon.origin,[key]:value}}),null);
  }
  for(const dex of [175,216])assert.equal(identifyGameCubeOrigin(mon(dex,dex===175?164:143,dex===175?25:11,{xd:true,ball:2})),null);
  assert.equal(identifyGameCubeOrigin(mon(196,254,25,{shadow:false,shiny:true})),null);
  assert.equal(identifyGameCubeOrigin(mon(373,73,50,{xd:true,shiny:true})),null);
  const unknown=pokemonOrigin(mon(1,144,15,{xd:true}));
  assert.equal(unknown.game,'Colosseum / XD');assert.equal(unknown.metLocation,'Distant Land');
});

test('pinned catalog covers all 154 acquisition types with valid rules and rejects a flipped fateful bit',()=>{
  assert.equal(catalog.source.revision,'0a7854f64e118ad228513f3cf4b84c308dac2fdc');
  assert.equal(catalog.colosseum.length,54);assert.equal(catalog.xd.length,100);
  for(const game of ['colosseum','xd'])for(const e of catalog[game]) {
    const shadow=['shadow','ereader'].includes(e.kind),loc=e.locations[0]??90;
    const pokemon=mon(e.species,loc,e.levels[0],{xd:game==='xd',shadow,
      languageId:e.language??2,nature:NATURES[e.nature??0],gender:e.gender??'male',shiny:false,
      ...(e.zeroIvs?{ivs:{hp:0,attack:0,defense:0,speed:0,spAttack:0,spDefense:0}}:{}),
      ...(e.ot?{ot:{gender:'male',name:catalog.otNames[e.ot][2],trainerId:e.tid,secretId:e.sid??123}}:{})});
    assert.equal(identifyGameCubeOrigin(pokemon),game,`${game} ${e.kind} ${e.species}`);
    assert.equal(identifyGameCubeOrigin({...pokemon,ribbons:{raw:(pokemon.ribbons.raw^0x80000000)>>>0}}),null);
  }
});
