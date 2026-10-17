import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSave, makePokemon} from './fixtures/synthetic.js';
import {readSave} from '../src/save/readSave.js';
import {readTrainer} from '../src/save/readTrainer.js';
import {readTrainerSnapshot} from '../src/save/readTrainerSnapshot.js';
import {importSave, loadStoredSave} from '../src/storage/saveStorage.js';

function memoryStorage() {
  const data = new Map();
  return {getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value)};
}

// Literal protocol offsets are independent of the production extraction.
test('Trainer gender and spendable BP use raw fields, not the card lifetime BP', () => {
  for (const [raw, expected] of [[0, 'male'], [1, 'female'], [2, null]]) {
    const b2 = new Uint8Array(3884);
    b2[8] = raw;
    b2[3768] = 0x34; b2[3769] = 0x12;
    b2[3770] = 0xff; b2[3771] = 0xff;
    const trainer = readTrainer(readSave(makeSave({blocks: {saveBlock2: b2}})));
    assert.equal(trainer.gender, expected);
    assert.equal(trainer.battlePoints, 4660);
  }
});

test('Owned retains duplicates and eggs across party, PC boundaries, and Day Care; Caught stays unique', () => {
  const b1 = new Uint8Array(15752), b2 = new Uint8Array(3884), pc = new Uint8Array(33744);
  new DataView(b1.buffer).setUint32(564, 1, true);
  b1.set(makePokemon({party: true}), 568);
  pc.set(makePokemon(), 4); // Identical PID and OT retained.
  pc.set(makePokemon({egg: true, pid: 8}), 4 + 419 * 80); // Non-shiny egg.
  b1.set(makePokemon({pid: 1}), 12336); // Shiny deposited Pokémon.
  b1.set(makePokemon({pid: 8}), 12476);
  b2[40] = 1; b2[92] = 1; b1[2440] = 1; b1[15140] = 1;
  const snapshot = readTrainerSnapshot(makeSave({blocks: {saveBlock1: b1, saveBlock2: b2, storage: pc}}));
  assert.equal(snapshot.owned, 5);
  assert.equal(snapshot.shinies, 3);
  assert.equal(snapshot.trainer.pokedex.caughtCount, 1);
  assert.equal(snapshot.trainer.pokedex.seenCount, 1);
});

test('local import survives a new load and invalid saves cannot replace it', () => {
  const storage = memoryStorage();
  assert.equal(loadStoredSave(storage), null);
  const first = importSave(makeSave(), storage);
  assert.deepEqual(loadStoredSave(storage), first);
  for (const invalid of [new Uint8Array(12), new Uint8Array(131072)]) {
    assert.throws(() => importSave(invalid, storage));
    assert.deepEqual(loadStoredSave(storage), first);
  }
});

test('corrupt Pokémon and empty occupied party slots cannot replace a stored import', () => {
  const storage = memoryStorage();
  const first = importSave(makeSave(), storage);
  const b1 = new Uint8Array(15752), pc = new Uint8Array(33744);
  pc.set(makePokemon(), 4); pc[36] ^= 1;
  assert.throws(() => importSave(makeSave({blocks: {storage: pc}}), storage), /could not be decoded/);
  new DataView(b1.buffer).setUint32(564, 1, true);
  assert.throws(() => importSave(makeSave({blocks: {saveBlock1: b1}}), storage), /empty occupied/);
  assert.deepEqual(loadStoredSave(storage), first);
});

test('corrupt Day Care record rejects import rather than undercounting owned Pokémon', () => {
  const b1 = new Uint8Array(15752);
  b1.set(makePokemon(), 12336); b1[12368] ^= 1;
  assert.throws(() => readTrainerSnapshot(makeSave({blocks: {saveBlock1: b1}})), /checksum/);
});

test('storage write failure preserves the previous saved data', () => {
  const storage = memoryStorage();
  const first = importSave(makeSave(), storage);
  storage.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
  assert.throws(() => importSave(makeSave({counters: [30, 31]}), storage), {name: 'QuotaExceededError'});
  assert.deepEqual(loadStoredSave(storage), first);
});

test('bad stored data fails explicitly and valid backup slot imports retain a warning', () => {
  assert.throws(() => loadStoredSave({getItem: () => 'invalid!'}));
  const snapshot = readTrainerSnapshot(makeSave({counters: [10, null]}));
  assert.ok(snapshot.warnings.some(warning => warning.includes('save slot')));
});
