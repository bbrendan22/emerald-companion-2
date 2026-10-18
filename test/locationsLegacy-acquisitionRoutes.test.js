// Ported 1.0 regression tests; import paths adapted only.
import test from 'node:test'
import assert from 'node:assert/strict'
import { acquisitionRoutes } from '../src/resources/locations/utils/acquisitionRoutes.js'
import { previousEvolutions } from '../src/resources/locations/utils/evolutions.js'
import { pokemonMeta } from '../src/resources/locations/data/pokemonMeta.js'

test('evolution routes show only the immediate predecessor throughout the database', () => {
  for (const id of Object.keys(pokemonMeta)) {
    const previous = previousEvolutions(id)
    if (!previous.length) continue
    const routes = acquisitionRoutes([{ id: '41', method: 'Evolve' }, { id: '42', method: 'Evolve' }], [], id)
    assert.deepEqual(routes, [{ id: previous[0].from, method: 'Evolve' }])
  }
  assert.deepEqual(acquisitionRoutes([{ id: '41', method: 'Evolve' }], [], '169'), [{ id: '42', method: 'Evolve' }])
  assert.deepEqual(acquisitionRoutes([{ id: '41', method: 'Evolve' }], [], '42'), [{ id: '41', method: 'Evolve' }])
})

test('breeding-only routes remain breeding routes and are deduplicated', () => {
  assert.deepEqual(acquisitionRoutes([{ id: '25', method: 'Breed' }], [{ id: '25', method: 'Breed from' }], '172'), [{ id: '25', method: 'Breed from' }])
})
