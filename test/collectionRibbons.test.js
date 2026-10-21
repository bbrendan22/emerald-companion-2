import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {earnedRibbons,ribbonCatalog} from '../src/pokemon/profile.js';
import {readPokemon} from '../src/save/readPokemon.js';
import {makePokemon} from './fixtures/synthetic.js';

test('all Gen 3 ribbon sprites are local 32x32 PNGs in catalog order',()=>{
  assert.equal(ribbonCatalog.length,32);
  for(const ribbon of ribbonCatalog) {
    const png=readFileSync(new URL(`../public/ribbons/gen3/${ribbon.file}.png`,import.meta.url));
    assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),32);assert.equal(png.readUInt32BE(20),32);
  }
});
test('actual encoded records expand every contest progression independently and preserve other flags',()=>{
  for(let category=0;category<5;category++)for(let rank=0;rank<=4;rank++) {
    const pokemon=readPokemon(makePokemon({ribbonRaw:rank<<(category*3)}));
    assert.deepEqual(earnedRibbons(pokemon.ribbons.raw),ribbonCatalog.slice(category*4,category*4+rank));
  }
  for(let bit=15;bit<=26;bit++) {
    const p=readPokemon(makePokemon({ribbonRaw:2**bit}));
    assert.deepEqual(earnedRibbons(p.ribbons.raw),[ribbonCatalog[bit+5]]);
  }
  assert.deepEqual(earnedRibbons(readPokemon(makePokemon({ribbonRaw:0})).ribbons.raw),[]);
  assert.deepEqual(earnedRibbons(readPokemon(makePokemon({ribbonRaw:0xf8000000})).ribbons.raw),[]);
  assert.deepEqual(earnedRibbons(readPokemon(makePokemon({ribbonRaw:7})).ribbons.raw),[],'invalid rank does not invent awards');
});
