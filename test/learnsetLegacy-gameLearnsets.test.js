// Original 1.0 tests, adapted import paths only.
import test from 'node:test'
import assert from 'node:assert/strict'
import { gameLevelLearnsets, gameTutorSources, mergedLevelLearnset, levelSourceGames } from '../src/resources/learnset/utils/gameLearnsets.js'
import { pokemonMeta } from '../src/resources/learnset/data/pokemonMeta.js'
import { moveNames } from '../src/resources/learnset/data/emeraldData.js'
const id = dex => Object.keys(pokemonMeta).find(key => pokemonMeta[key].dex === dex)
const move = name => Number(Object.keys(moveNames).find(key => moveNames[key] === name))
test('level-up game labels use the shared five-game group and omit all-game labels',()=>{
  const shared=['Emerald','Ruby / Sapphire','Colosseum','XD']
  assert.equal(levelSourceGames(shared),'R/S/E/Colo/XD')
  assert.equal(levelSourceGames([...shared,'FireRed / LeafGreen']),'')
  assert.equal(levelSourceGames(['FireRed / LeafGreen']),'FR/LG')
})
test('merged rows deduplicate moves while preserving exclusive games and differing levels',()=>{
  const rows=mergedLevelLearnset(id(4))
  assert.equal(new Set(rows.map(row=>row.move)).size,rows.length)
  assert.equal(rows.find(row=>row.move===move('Ember')).common,true)
  const claw=rows.find(row=>row.move===move('Metal Claw'))
  assert.deepEqual(claw.sources[0].games,['FireRed / LeafGreen'])
  assert.deepEqual(rows.find(row=>row.move===move('Smokescreen')).levels,[13,19])
  for(const species of Object.keys(pokemonMeta)) {
    const expected=new Set(gameLevelLearnsets(species).flatMap(group=>[...group.entries,...group.inherited].map(entry=>entry.move)))
    assert.deepEqual(new Set(mergedLevelLearnset(species).map(entry=>entry.move)),expected)
  }
})
test('full level-up lists retain shared moves and isolate game-specific moves', () => {
  const groups = gameLevelLearnsets(id(4))
  const emerald = groups.find(group => group.games.includes('Emerald'))
  const frlg = groups.find(group => group.games.includes('FireRed / LeafGreen'))
  assert(emerald.entries.some(entry => entry.move === move('Ember')))
  assert(frlg.entries.some(entry => entry.move === move('Ember')))
  assert(frlg.entries.some(entry => entry.move === move('Metal Claw')))
  assert(!emerald.entries.some(entry => entry.move === move('Metal Claw')))
})
test('Deoxys has separate Attack, Defense and Emerald Speed level-up lists', () => {
  assert.equal(levelSourceGames(['Ruby / Sapphire','Colosseum','XD'], true), 'R/S/Colo/XD')
  assert.equal(levelSourceGames(['Emerald'], true), 'E')
  assert.equal(levelSourceGames(['FireRed · Attack Forme'], true), 'FR')
  assert.equal(levelSourceGames(['LeafGreen · Defense Forme'], true), 'LG')
  const groups = gameLevelLearnsets(id(386))
  assert(groups.find(group => group.games.includes('FireRed · Attack Forme')).entries.some(entry => entry.move === move('Superpower')))
  assert(groups.find(group => group.games.includes('LeafGreen · Defense Forme')).entries.some(entry => entry.move === move('Counter')))
  assert(groups.find(group => group.games.includes('Emerald')).entries.some(entry => entry.move === move('ExtremeSpeed')))
})
test('pre-evolution sources and tutors remain available independently of level-up moves', () => {
  assert(gameLevelLearnsets(id(26)).some(group => group.inherited.some(entry => entry.name === 'Pikachu' && entry.move === move('Agility'))))
  assert(gameTutorSources(id(151)).some(entry => entry.move === move('Thunder Wave') && entry.game === 'XD'))
  assert.equal(gameTutorSources(id(151)).filter(entry => entry.move === move('Role Play') && entry.game === 'XD').length,1)
})
