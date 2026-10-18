// Ported 1.0 regression tests; import paths adapted only.
import test from 'node:test'
import assert from 'node:assert/strict'
import { rubySapphireEncounters } from '../src/resources/locations/data/rubySapphireEncounters.js'
import { rubySapphireAvailability as availability } from '../src/resources/locations/utils/rubySapphireAvailability.js'
import { pokemonMeta } from '../src/resources/locations/data/pokemonMeta.js'
const id=dex=>Object.keys(pokemonMeta).find(id=>pokemonMeta[id].dex===dex)
test('all wild encounter methods have valid species and rates totaling 100%',()=>{
 for(const locations of Object.values(rubySapphireEncounters)){
  assert.equal(locations.length,97)
  for(const location of locations)for(const method of location.methods){
   assert.equal(method.encounters.reduce((sum,e)=>sum+e.rate,0),100)
   for(const e of method.encounters){assert(pokemonMeta[e.species]);assert(e.min<=e.max);assert(e.rate>0)}
  }
 }
})
test('Ruby and Sapphire version exclusives remain separate',()=>{
 assert(availability(id(273),'Ruby').locations.length)
 assert.equal(availability(id(273),'Sapphire').locations.length,0)
 assert(availability(id(270),'Sapphire').locations.length)
 assert.equal(availability(id(270),'Ruby').locations.length,0)
})
test('special encounters and evolution routes retain requirements',()=>{
 assert(availability(id(383),'Ruby').special.some(e=>e.level===45))
 assert.equal(availability(id(383),'Sapphire').special.length,0)
 assert(availability(id(349),'Ruby').special.some(e=>e.note.includes('50%')))
 assert(availability(id(254),'Ruby').relatives.some(e=>e.id===id(252)))
 assert.equal(availability(id(2),'Ruby').relatives.length,0)
 assert(availability(id(380),'Ruby').special.some(e=>e.kind==='Event encounter'&&e.level===50))
 assert(availability(id(380),'Sapphire').special.some(e=>e.kind==='Roaming encounter'&&e.level===40))
})
