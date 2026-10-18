import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import reference from '../src/data/reference.json' with {type:'json'};
import {internalIdForDex,pokemonMeta} from '../src/resources/locations/data/pokemonMeta.js';
import {GEN3_TYPE_DISPLAY_ORDER} from '../src/pokemon/typeDisplayOrder.js';
test('shared ID normalization retains all internal IDs for numeric and padded National IDs',()=>{
 for(const [id,species] of Object.entries(reference.species)){
  const dex=species.nationalDexId;assert.equal(internalIdForDex(dex),id);assert.equal(internalIdForDex(String(dex).padStart(3,'0')),id);assert.equal(pokemonMeta[id].name,species.name);
 }
 for(const invalid of [undefined,null,NaN,'#025','not-a-species',0,387])assert.equal(internalIdForDex(invalid),undefined);
});
test('every canonical species sprite/artwork and all 17 type icons are valid local PNG assets',()=>{
 const png=path=>{const bytes=fs.readFileSync(new URL(`../public/${path}`,import.meta.url));assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10],path);assert.equal(bytes.toString('ascii',12,16),'IHDR');assert.ok(bytes.readUInt32BE(16)>0);assert.ok(bytes.readUInt32BE(20)>0);};
 for(let dex=1;dex<=386;dex++){png(`pokemon/emerald/normal/${dex}.png`);png(`pokemon/artwork/normal/${dex===386?'deoxys-speed':dex}.png`);}
 for(const type of GEN3_TYPE_DISPLAY_ORDER)png(`types/icons/${type}.png`);
});
