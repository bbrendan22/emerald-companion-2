// Ported 1.0 regression tests; import paths adapted only.
import test from 'node:test'
import assert from 'node:assert/strict'
import { orreEncounters } from '../src/resources/locations/data/orreEncounters.js'
import { orreAvailability } from '../src/resources/locations/utils/orreAvailability.js'
import { pokemonMeta } from '../src/resources/locations/data/pokemonMeta.js'
const id = dex => Object.keys(pokemonMeta).find(key => pokemonMeta[key].dex === dex)
test('Orre shadow rosters contain 48 Colosseum shadows, three e-Reader shadows, and 83 XD shadows', () => {
  const shadows = game => orreEncounters[game].filter(row => row.kind.startsWith('Shadow'))
  assert.equal(new Set(shadows('Colosseum').filter(row => !row.kind.includes('e-Reader')).map(row => row.dex)).size, 48)
  assert.equal(shadows('Colosseum').filter(row => row.kind.includes('e-Reader')).length, 3)
  assert.equal(new Set(shadows('XD').map(row => row.dex)).size, 83)
  for (const rows of Object.values(orreEncounters)) for (const row of rows) {
    assert(id(row.dex))
    assert(row.place)
    assert(row.level)
  }
})
test('Poké Spots retain species rates and individual level ranges', () => {
  const wild = orreEncounters.XD.filter(row => row.kind === 'Wild encounter')
  assert.equal(wild.length, 9)
  for (const place of new Set(wild.map(row => row.place))) assert.equal(wild.filter(row => row.place === place).reduce((sum,row) => sum + row.rate,0),100)
  assert.equal(wild.find(row => row.dex === 27).level, '10–23')
  assert.equal(wild.find(row => row.dex === 187).level, '10–20')
  for (const dex of [41,304,194]) assert.equal(wild.find(row => row.dex === dex).level, '10–21')
})
test('gifts, trades, rewards, and evolution-only routes remain distinct', () => {
  assert.equal(orreAvailability(id(239),'XD').special[0].level,20)
  assert.equal(orreAvailability(id(175),'XD').special[0].level,25)
  assert.equal(orreAvailability(id(250),'Colosseum').special[0].level,70)
  for (const dex of [152,155,158]) assert(orreAvailability(id(dex),'XD').special.some(row => row.kind === 'Mt. Battle reward' && row.level === 5))
  assert(orreAvailability(id(135),'XD').relatives.some(row => row.id === id(133) && row.method === 'Evolve'))
  assert.equal(orreAvailability(id(1),'XD').relatives.length,0)
})
