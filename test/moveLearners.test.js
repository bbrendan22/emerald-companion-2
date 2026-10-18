import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {moveLearners, learnerGroups} from '../src/resources/moves/learners.js';
import {catalogEntries} from '../src/resources/search.js';
import {pokemonMeta} from '../src/resources/learnset/data/pokemonMeta.js';
import {crossGameMoves} from '../src/resources/learnset/data/crossGameMoves.js';
import {levelMoves, eggMoves} from '../src/resources/learnset/data/eggMoveResources.js';
import {machineResources} from '../src/resources/learnset/data/itemResources.js';
import {tutorResources} from '../src/resources/learnset/data/tutorResources.js';
import {moveNames} from '../src/resources/learnset/data/emeraldData.js';
const move = name => Number(Object.keys(moveNames).find(id => moveNames[id] === name));
const learner = (name, dex) => moveLearners(move(name)).flatMap(group => group.pokemon).find(p => p.dex === dex);

test('complete and filtered move catalogs use case-insensitive alphabetical order', () => {
  for (const query of ['', 'a', '  THUNDER  ']) {
    const entries = catalogEntries('moves', query);
    assert.deepEqual(entries.map(e => e.name), entries.map(e => e.name).sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase(), 'en')));
  }
  assert.equal(catalogEntries('moves').length, 354);
});
test('all 386 canonical species map once to valid names and local National Dex sprites', () => {
  const found = new Map();
  for (const entry of catalogEntries('moves')) {
    const groups = moveLearners(entry.id), seen = new Set();
    assert.deepEqual(groups.map(g => g.title), learnerGroups.filter(title => groups.some(g => g.title === title)));
    for (const group of groups) {
      assert.ok(group.pokemon.length);
      assert.deepEqual(group.pokemon.map(p => p.dex), group.pokemon.map(p => p.dex).sort((a,b) => a-b));
      for (const p of group.pokemon) {
        assert.ok(!seen.has(p.dex)); seen.add(p.dex); found.set(p.dex,p.name);
        assert.equal(group.title, learnerGroups.find(title => p.methods[title]));
      }
    }
  }
  assert.deepEqual([...found.keys()].sort((a,b) => a-b), Array.from({length:386},(_,i)=>i+1));
  for (const {dex,name} of Object.values(pokemonMeta)) {
    assert.equal(found.get(dex),name);
    assert.ok(existsSync(new URL(`../public/pokemon/emerald/normal/${dex}.png`,import.meta.url)));
  }
});
test('every direct canonical record is retained, even if another method wins presentation priority', () => {
  const has = (move,id,group) => assert.ok(moveLearners(move).flatMap(g => g.pokemon).find(p => p.dex === pokemonMeta[id].dex)?.methods[group], `${id}/${move}/${group}`);
  for (const [id,entries] of Object.entries(levelMoves)) for (const e of entries) has(e.move,id,'Level-up Moves');
  for (const [id,entries] of Object.entries(crossGameMoves)) for (const e of entries) has(e.move,id,e.method === 'Level-up' ? 'Level-up Moves' : e.method.toLowerCase().includes('tutor') ? 'Move Tutors' : 'Special Moves');
  for (const m of machineResources) for (const id of m.species) has(m.moveId,id,'TMs / HMs');
  for (const m of tutorResources) for (const id of m.species) has(m.moveId,id,'Move Tutors');
  for (const [id,moves] of Object.entries(eggMoves)) for (const m of moves) has(m,id,'Egg Moves');
});
test('Swampert Earthquake keeps both level-up and TM26 but appears once under level-up', () => {
  const p = learner('Earthquake',260);
  assert.ok(p.methods['Level-up Moves']); assert.ok(p.methods['TMs / HMs'].some(s=>s.code==='TM26'));
  assert.ok(moveLearners(89)[0].pokemon.includes(p));
});
test('tutor sources retain games and override egg presentation; Box gifts follow verified evolution chains', () => {
  const growlithe=learner('Body Slam',58);
  assert.ok(growlithe.methods['Egg Moves']);
  assert.ok(moveLearners(move('Body Slam')).find(g=>g.title==='Move Tutors').pokemon.includes(growlithe));
  const mew=learner('Thunder Wave',151);
  assert.ok(mew.methods['Move Tutors'].some(s=>s.game==='Emerald'));
  assert.ok(mew.methods['Move Tutors'].some(s=>s.game==='XD'));
  assert.ok(learner('Self Destruct',143).methods['Move Tutors'].some(s=>s.game==='XD'));
  for (const [name,dexes] of [['Surf',[172,25,26]],['ExtremeSpeed',[263,264]],['Pay Day',[300,301]],['False Swipe',[333,334]]]) {
    for (const dex of dexes) assert.ok(learner(name,dex).methods['Special Moves'].some(s=>s.game==='Pokémon Box'));
  }
  assert.equal(learner('Surf',173),undefined);
  assert.ok(learner('Psycho Boost',249).methods['Special Moves'].some(s=>s.method==='Purification'));
  assert.ok(learner('Frenzy Plant',154).methods['Special Moves'].some(s=>s.method==='Mt. Battle reward'));
  assert.ok(learner('Volt Tackle',26).methods['Egg Moves']);
});
test('lookup is cached, supports empty moves, and retains large learner lists', () => {
  assert.equal(moveLearners(89),moveLearners(89));
  assert.deepEqual(moveLearners(165),[]); assert.deepEqual(moveLearners(-1),[]);
  assert.ok(moveLearners(move('Toxic')).flatMap(g=>g.pokemon).length>300);
});
