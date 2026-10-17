import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
test('every National Dex sprite used by collection exists and is static PNG',()=>{
  for (const directory of ['bdsp/normal','bdsp/shiny','box']) {
    for (let dex=1; dex<=386; dex++) {
      const bytes=readFileSync(new URL(`../public/pokemon/${directory}/${dex}.png`,import.meta.url));
      assert.equal(bytes.subarray(1,4).toString(),'PNG');
      let offset=8;
      while(offset<bytes.length) {
        const length=bytes.readUInt32BE(offset);
        assert.notEqual(bytes.subarray(offset+4,offset+8).toString(),'acTL');
        offset+=12+length;
      }
    }
  }
  assert.ok(existsSync(new URL('../public/pokemon/egg.png',import.meta.url)));
});
