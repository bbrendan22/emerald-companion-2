// Ported 1.0 regression tests; import paths adapted only.
import test from 'node:test'
import assert from 'node:assert/strict'
import { pokemonMeta } from '../src/resources/locations/data/pokemonMeta.js'
import { speciesAvailability } from '../src/resources/locations/utils/speciesAvailability.js'
const id=dex=>Object.keys(pokemonMeta).find(key=>pokemonMeta[key].dex===dex)
test('all 386 species have an Emerald or import route',()=>{
 for(const key of Object.keys(pokemonMeta)){
  const result=speciesAvailability(key)
  assert.ok(result.hasEmeraldRoute||result.imports.length,pokemonMeta[key].name)
 }
})
test('special encounters use species IDs rather than dex numbers',()=>{
 assert.ok(speciesAvailability(id(374)).special.some(entry=>entry.kind==='Gift'&&entry.level===5))
 assert.ok(speciesAvailability(id(349)).special.some(entry=>entry.kind==='Special fishing'))
 assert.ok(speciesAvailability(id(380)).special.some(entry=>entry.kind==='Roaming encounter'&&entry.note.includes('Red')))
 assert.ok(speciesAvailability(id(381)).special.some(entry=>entry.kind==='Roaming encounter'&&entry.note.includes('Blue')))
})
test('event access, mixed outbreaks and source versions remain explicit',()=>{
 assert.ok(speciesAvailability(id(151)).special.every(entry=>entry.note.includes('event')))
 assert.ok(speciesAvailability(id(283)).special.some(entry=>entry.kind==='Record-mixed outbreak'))
 assert.equal(speciesAvailability(id(335)).imports[0].game,'Ruby')
 assert.equal(speciesAvailability(id(337)).imports[0].game,'Sapphire')
 assert.equal(speciesAvailability(id(123)).imports[0].game,'FireRed')
 assert.equal(speciesAvailability(id(79)).imports[0].game,'LeafGreen')
 assert.equal(speciesAvailability(id(251)).hasEmeraldRoute,false)
})
test('evolved species and babies link to family acquisition routes',()=>{
 assert.ok(speciesAvailability(id(376)).relatives.some(relative=>relative.id===id(374)&&relative.method==='Evolve'))
 assert.ok(speciesAvailability(id(172)).relatives.some(relative=>relative.id===id(25)&&relative.method==='Breed'))
 assert.equal(speciesAvailability(id(1)).hasEmeraldRoute,false)
})
