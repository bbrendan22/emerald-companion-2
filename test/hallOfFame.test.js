import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSave} from './fixtures/synthetic.js';
import {addHallOfFame} from './fixtures/hallOfFame.js';
import {readHallOfFame} from '../src/save/readHallOfFame.js';
import {readTrainerSnapshot} from '../src/save/readTrainerSnapshot.js';
import {importSave, loadStoredSave} from '../src/storage/saveStorage.js';

const team = [{species: 277, level: 45, personality: 7}, {species: 25, level: 51, personality: 8}, {species: 411, level: 46}];

test('HOF preserves oldest recorded team and order, compact level bits, internal IDs, names, and shiny boundary', () => {
  const data = addHallOfFame(makeSave(), [team, [{species: 150}]]), before = data.slice();
  const record = readHallOfFame(data);
  assert.equal(record.status, 'available'); assert.equal(record.teamIndex, 0);
  assert.deepEqual(record.team.map(p => [p.slot, p.internalSpeciesId, p.nationalDexId, p.level, p.shiny]), [[0,277,252,45,true], [1,25,25,51,false], [2,411,358,46,true]]);
  assert.equal(record.team[0].nickname, 'ABC');
  assert.deepEqual(readHallOfFame(data.buffer), record);
  const wrapped = new Uint8Array(data.length + 10); wrapped.set(data, 5);
  assert.deepEqual(readHallOfFame(wrapped.subarray(5, 5 + data.length)), record);
  assert.deepEqual(data, before);
});

test('HOF checks both signatures and checksums in the special section-ID field', () => {
  const original = addHallOfFame(makeSave(), [team]);
  for (const sector of [28, 29]) for (const offset of [0, 4084, 4088]) {
    const corrupt = original.slice(); corrupt[sector * 4096 + offset] ^= 1;
    assert.equal(readHallOfFame(corrupt).status, 'unavailable');
  }
  // The ordinary checksum/counter fields are unused by HOF saves.
  original[28 * 4096 + 4086] = 255; original[29 * 4096 + 4092] = 255;
  assert.equal(readHallOfFame(original).status, 'available');
});

test('absent, empty, truncated, and corrupt HOF have honest states without borrowing current party', () => {
  assert.equal(readHallOfFame(makeSave()).status, 'empty');
  assert.equal(readHallOfFame(addHallOfFame(makeSave())).status, 'empty');
  assert.equal(readHallOfFame(new Uint8Array(64)).status, 'unavailable');
  assert.equal(readHallOfFame(addHallOfFame(makeSave(), [[{species: 511}]] )).team, null);
  assert.equal(readHallOfFame(addHallOfFame(makeSave(), [[{level: 0}]] )).status, 'unavailable');
  assert.equal(readHallOfFame(addHallOfFame(makeSave(), [[{level: 101}]] )).status, 'unavailable');
});

test('earliest valid retained team can follow malformed entries and span the sector boundary', () => {
  const teams = Array.from({length: 33}, () => [{species: 511}]);
  teams.push(team);
  const record = readHallOfFame(addHallOfFame(makeSave(), teams));
  assert.equal(record.teamIndex, 33);
  assert.equal(record.team[0].internalSpeciesId, 277);
  assert.equal(record.team[0].level, 45);
  assert.equal(record.team.length, 3);
  assert.ok(record.warnings.length);
});

test('HOF honors the empty-team sentinel and the 50-team retention limit', () => {
  assert.equal(readHallOfFame(addHallOfFame(makeSave(), [[], team])).status, 'empty');
  const teams = Array.from({length: 50}, () => team);
  assert.equal(readHallOfFame(addHallOfFame(makeSave(), teams)).teamIndex, 0);
});

test('HOF rejects partial teams with gaps, preserves egg records, and derives shiny from full PID/OT', () => {
  const data = addHallOfFame(makeSave(), [[team[0], null, team[1]], [{species: 412, otId: 0x12345678, personality: 0x12345678}]]);
  const record = readHallOfFame(data);
  assert.equal(record.teamIndex, 1);
  assert.equal(record.team[0].isEgg, true);
  assert.equal(record.team[0].nationalDexId, null);
  assert.equal(record.team[0].shiny, true);
});

test('badge flags remain ordered and Champion status is independent of badges and recorded team', () => {
  const b1 = new Uint8Array(15752);
  // Badges 1, 3, and 8 cross a byte boundary; nearby linking flag is not game-clear.
  for (const flag of [2151, 2153, 2158, 2175]) b1[4720 + Math.floor(flag / 8)] |= 1 << (flag % 8);
  let snapshot = readTrainerSnapshot(addHallOfFame(makeSave({blocks:{saveBlock1:b1}}), [team]));
  assert.deepEqual(snapshot.trainer.badges, [true,false,true,false,false,false,false,true]);
  assert.equal(snapshot.trainer.badgeCount, 3);
  assert.equal(snapshot.trainer.isChampion, false);
  assert.equal(snapshot.hallOfFame.status, 'available');
  b1[4988] |= 16; // FLAG_SYS_GAME_CLEAR = 2148.
  snapshot = readTrainerSnapshot(makeSave({blocks:{saveBlock1:b1}}));
  assert.equal(snapshot.trainer.isChampion, true);
  assert.equal(snapshot.hallOfFame.status, 'empty');
});

test('HOF history survives persistence; damaged history leaves valid Stage 1 data usable', () => {
  let saved;
  const storage = {getItem: () => saved ?? null, setItem: (_, value) => { saved = value; }};
  const data = addHallOfFame(makeSave(), [team]);
  importSave(data, storage);
  assert.deepEqual(loadStoredSave(storage).hallOfFame.team.map(p => p.internalSpeciesId), [277,25,411]);
  data[28 * 4096] ^= 1;
  const snapshot = importSave(data, storage);
  assert.equal(snapshot.owned, 0);
  assert.equal(snapshot.hallOfFame.status, 'unavailable');
  assert.equal(loadStoredSave(storage).hallOfFame.status, 'unavailable');
});
