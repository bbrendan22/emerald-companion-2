import test from 'node:test';
import assert from 'node:assert/strict';
import {filterDetails} from '../src/ui/collectionFilters.js';
import {filterPokemon} from '../src/storage/pokemonRoles.js';
const records = [
  {identity:'a',nationalDexId:1,speciesName:'Bulbasaur',nickname:'Leaf',shiny:true},
  {identity:'b',nationalDexId:4,speciesName:'Charmander',nickname:'Ember',shiny:false},
  {identity:'c',nationalDexId:7,speciesName:'Squirtle',nickname:'Wave',shiny:true},
  {identity:'d',nationalDexId:152,speciesName:'Chikorita',nickname:'Leaf',shiny:false},
];
const roles = {a:'Frontier',b:'Utility',d:'Utility'};
const ids = rows => rows.map(row=>row.identity);
test('single category filtering selects Frontier, Utility, Shiny or All without overlap unions',()=>{
  assert.deepEqual(ids(filterPokemon(records,roles)),['a','b','c','d']);
  assert.deepEqual(ids(filterPokemon(records,roles,'','Frontier')),['a']);
  assert.deepEqual(ids(filterPokemon(records,roles,'','Utility')),['b','d']);
  assert.deepEqual(ids(filterPokemon(records,roles,'','Shinies')),['a','c']);
  assert.deepEqual(ids(filterPokemon(records,{},'','Frontier')),[]);
});
test('a single category combines with nickname search, type, and generation',()=>{
  const matched=filterPokemon(records,roles,'Leaf','Utility');
  assert.deepEqual(ids(filterDetails(matched,{type:'grass',generation:'2'})),['d']);
  assert.deepEqual(ids(filterDetails(matched,{type:'grass',generation:'1'})),[]);
  assert.deepEqual(ids(filterDetails(matched,{type:'fire'})),[]);
});
