import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readFrontierSymbols} from '../src/save/readFrontierSymbols.js';
import {readTrainerSnapshot} from '../src/save/readTrainerSnapshot.js';
import {importSave, loadStoredSave} from '../src/storage/saveStorage.js';
import {makeSave} from './fixtures/synthetic.js';

// Independently transcribed SaveBlock1 byte offsets and masks from the game sources.
const bits = [[0x1388,16,32],[0x1388,64,128],[0x1389,1,2],
  [0x1389,4,8],[0x1389,16,32],[0x1389,64,128],[0x138a,1,2]];
const expected = [['tower','Battle Tower','Ability'],['dome','Battle Dome','Tactics'],
  ['palace','Battle Palace','Spirits'],['arena','Battle Arena','Guts'],
  ['factory','Battle Factory','Knowledge'],['pike','Battle Pike','Luck'],['pyramid','Battle Pyramid','Brave']];
const decode = block => readFrontierSymbols({blocks:{saveBlock1:block}});

test('Frontier unearned states ignore neighboring flags and preserve input', () => {
  const block = new Uint8Array(15752);
  block[0x1388] = 15; block[0x138a] = 252;
  const before = block.slice(), frontier = decode(block);
  assert.equal(frontier.silverCount,0); assert.equal(frontier.goldCount,0);
  assert.ok(frontier.symbols.every(s => s.status === 'unearned' && !s.silver && !s.gold));
  assert.deepEqual(frontier.symbols.map(s => [s.id,s.facility,s.symbol]),expected);
  assert.deepEqual(block,before);
  assert.throws(() => decode(new Uint8Array(100)),/validated/);
});

test('every facility independently decodes silver, gold, and both flags; gold has priority', () => {
  bits.forEach(([offset,silverMask,goldMask],index) => {
    for (const [mask,silver,gold,status] of [[silverMask,true,false,'silver'],[goldMask,false,true,'gold'],[silverMask|goldMask,true,true,'gold']]) {
      const block = new Uint8Array(15752); block[offset] = mask;
      const frontier = decode(block), symbol = frontier.symbols[index];
      assert.deepEqual([symbol.silver,symbol.gold,symbol.status],[silver,gold,status]);
      assert.equal(frontier.silverCount,Number(silver)); assert.equal(frontier.goldCount,Number(gold));
      assert.ok(frontier.symbols.every((s,i) => i === index || s.status === 'unearned'));
    }
  });
});

test('all seven silver and gold totals survive rotated save import and persistence', () => {
  const block = new Uint8Array(15752);
  for (const [offset,silver,gold] of bits) block[offset] |= silver|gold;
  const bytes = makeSave({rotations:[5,11],blocks:{saveBlock1:block}});
  const snapshot = readTrainerSnapshot(bytes);
  assert.equal(snapshot.frontier.silverCount,7); assert.equal(snapshot.frontier.goldCount,7);
  assert.ok(snapshot.frontier.symbols.every(s => s.status === 'gold'));
  let stored;
  const storage = {getItem: () => stored ?? null, setItem: (_,value) => {stored=value;}};
  importSave(bytes,storage);
  assert.deepEqual(loadStoredSave(storage).frontier,snapshot.frontier);
});

test('all fourteen mapped symbol assets exist', () => {
  for (const [id] of expected) for (const tier of ['silver','gold']) {
    assert.ok(existsSync(new URL(`../public/frontier-symbols/${id}-${tier}.png`,import.meta.url)));
  }
});
