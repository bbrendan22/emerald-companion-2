import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {readSave} from '../src/save/readSave.js';
import {readTrainer} from '../src/save/readTrainer.js';
import {readCollection} from '../src/save/readCollection.js';
import {readPokemon} from '../src/save/readPokemon.js';
import {readHallOfFame} from '../src/save/readHallOfFame.js';
import {NATURES} from '../src/save/stats.js';
import {identifyGameCubeOrigin} from '../src/pokemon/gameCubeOrigin.js';
import {pokemonOrigin} from '../src/ui/pokemonOrigin.js';
import {earnedRibbons} from '../src/pokemon/profile.js';
const dir=fileURLToPath(new URL('./fixtures/real/',import.meta.url));
const manifest=join(dir,'expected.private.json');
const hasFixture=Boolean(process.env.EMERALD_REAL_SAVE)||readdirSync(dir).some(f=>/\.sav$/i.test(f));
const options={skip:hasFixture ? false:'Private real-save fixture unavailable; synthetic tests still run'};
const hash=value=>createHash('sha256').update(value).digest('hex');
let loaded;
function fixture() {
  if(loaded)return loaded;
  assert.ok(existsSync(manifest),'Private independent-reader expectations are required; do not generate from production output');
  const expected=JSON.parse(readFileSync(manifest,'utf8'));
  const data=readFileSync(process.env.EMERALD_REAL_SAVE ?? join(dir,expected.fixtureFile));
  assert.equal(hash(data),expected.sha256,'Save changed; independently review expectations before replacing the manifest');
  loaded={expected,data,save:readSave(data)};return loaded;
}
const rawFields=p=>({source:p.source,internalSpeciesId:p.internalSpeciesId,nickname:p.nickname,
  experience:p.experience,natureIndex:NATURES.indexOf(p.nature),abilitySlot:p.ability.slot,heldItemId:p.heldItemId,
  ivs:p.ivs,evs:p.evs,moves:p.moves.map(({id,currentPp,ppUps})=>({id,currentPp,ppUps})),isEgg:p.isEgg,headerIsEgg:p.headerIsEgg,
  origin:p.origin,pokerus:p.pokerus,ribbonRaw:p.ribbons.raw,recorded:p.recorded});

test('real save: all 51 GameCube origins and locations match the reviewed research independently',options,()=>{
  const {save,data}=fixture();
  const expectations=JSON.parse(readFileSync(join(dir,'gamecube-origin.expected.private.json'),'utf8'));
  assert.equal(hash(data),expectations.sha256);
  const records=readCollection(save).records.filter(p=>p.origin.gameId===15);
  assert.equal(records.length,51);
  const before=structuredClone(records);
  for(const pokemon of records)assert.equal(identifyGameCubeOrigin(pokemon),'colosseum');
  assert.deepEqual(records.map(p=>({species:p.speciesName,metLocationId:p.origin.metLocationId,metLevel:p.origin.metLevel,location:pokemonOrigin(p).metLocation})),expectations.records);
  assert.ok(records.every(p=>pokemonOrigin(p).game==='Colosseum'));
  assert.deepEqual(records,before);
});

test('real save: ribbon ownership matches saved award bits, including all 48 purified Pokémon',options,()=>{
  const {save,expected}=fixture();
  const records=readCollection(save).records;
  const awards=records.map(p=>earnedRibbons(p.ribbons.raw).map(r=>r.file));
  assert.equal(awards.filter(r=>r.length===0).length,16);
  assert.equal(awards.filter(r=>r.includes('champion-ribbon')).length,6);
  assert.equal(awards.filter(r=>r.includes('national-ribbon')).length,48);
  for(const [i,names] of awards.entries()) {
    const raw=expected.records[i].ribbonRaw;
    assert.equal(names.includes('champion-ribbon'),Boolean(raw & (1<<15)));
    assert.equal(names.includes('national-ribbon'),Boolean(raw & (1<<24)));
  }
});

test('real save: size, both slot diagnostics and newest valid selection match independent reader',options,()=>{
  const {expected:e,data,save:s}=fixture();assert.equal(data.length,e.size);assert.deepEqual(s.slots,e.slots);
  assert.equal(s.slotIndex,e.slotIndex);assert.equal(s.saveCounter,e.saveCounter);
});
test('real save: private Trainer identity, playtime, money, badges and all Dex flags match independent reader',options,()=>{
  const {expected:e,save:s}=fixture();const t=readTrainer(s),{name,trainerId,secretId,gender,battlePoints,isChampion,warnings,...fields}=t;
  // Gender and BP have separate synthetic coverage; Champion status has a Stage 2 audit; the pinned manifest remains unchanged.
  // Only the digest can appear in assertion output; never print Trainer identifiers.
  assert.equal(hash(`${name}:${trainerId}:${secretId}`),e.trainer.identityDigest);
  const {identityDigest,...expectedFields}=e.trainer;assert.deepEqual(fields,expectedFields);assert.deepEqual(warnings,[]);
});
test('real save: every party and PC record matches independently decoded raw fields, with duplicates retained',options,()=>{
  const {expected:e,save:s}=fixture();const c=readCollection(s);
  assert.equal(c.records.length,e.records.length);assert.equal(c.issues.length,0);
  assert.deepEqual(c.records.map(rawFields),e.records);
  assert.ok(c.records.every(p=>p.checksumValid&&p.warnings.length===0&&p.moves.length===4));
});
test('real save: all occupied Pokémon checksums pass in both generations',options,()=>{
  const {expected:e,data,save:s}=fixture();
  const previous=Buffer.from(data);previous.writeUInt32LE(0,s.slotIndex*14*4096+4088);
  const backup=readSave(previous);assert.notEqual(backup.slotIndex,s.slotIndex);
  for(const generation of [s,backup]) {
    const c=readCollection(generation);assert.equal(c.issues.length,0);
    assert.equal(c.records.length,e.slotPokemonCounts[generation.slotIndex]);
    assert.ok(c.records.every(p=>p.checksumValid));
  }
});
test('real save: all party calculations equal stats independently recorded in party suffix',options,()=>{
  const {save:s}=fixture();const party=readCollection(s).records.filter(p=>p.source.kind==='party');
  assert.equal(party.length,4);
  for(const p of party){assert.equal(p.derivedLevel,p.recorded.level);assert.deepEqual(p.calculated.stats,p.recorded.stats);}
});
test('real save: both Day Care slots independently confirmed empty',options,()=>{
  const {save:s,expected:e}=fixture();assert.deepEqual(e.daycare,[null,null]);
  for(const start of [0x3030,0x30bc]) assert.equal(readPokemon(s.blocks.saveBlock1.subarray(start,start+80)),null);
});

// A separate Python audit pins the new raw fields without changing Stage 1 expectations.
test('real save: Champion status and earliest HOF team match independent Stage 2 audit', options, () => {
  const {data, save} = fixture();
  const path = join(dir, 'hall-of-fame.expected.private.json');
  assert.ok(existsSync(path), 'Independent Stage 2 HOF expectations are required');
  const expected = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(hash(data), expected.sha256);
  assert.equal(readTrainer(save).isChampion, expected.isChampion);
  const record = readHallOfFame(data);
  assert.equal(record.status, 'available');
  assert.equal(record.teamIndex, expected.teamIndex);
  const raw = record.team.map(({slot, internalSpeciesId, level, otId, personality, nickname, isEgg, shiny}) =>
    ({slot, internalSpeciesId, level, otId, personality, nickname, isEgg, shiny}));
  // Compare all raw fields without exposing private nicknames or original Trainer IDs on failure.
  assert.equal(hash(JSON.stringify(raw)), hash(JSON.stringify(expected.team)));
});
