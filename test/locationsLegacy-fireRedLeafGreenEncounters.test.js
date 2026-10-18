// Ported 1.0 regression tests; import paths adapted only.
import test from 'node:test'
import assert from 'node:assert/strict'
import { fireRedLeafGreenEncounters } from '../src/resources/locations/data/fireRedLeafGreenEncounters.js'
import { fireRedLeafGreenAvailability as get } from '../src/resources/locations/utils/fireRedLeafGreenAvailability.js'
import { pokemonMeta } from '../src/resources/locations/data/pokemonMeta.js'
const id=dex=>Object.keys(pokemonMeta).find(id=>pokemonMeta[id].dex===dex)
test('every wild method totals 100% with valid species and levels',()=>{
 for(const areas of Object.values(fireRedLeafGreenEncounters)){
  assert.equal(areas.length,132)
  for(const area of areas)for(const method of area.methods){
   assert.equal(method.encounters.reduce((s,e)=>s+e.rate,0),100)
   for(const e of method.encounters){assert(pokemonMeta[e.species]);assert(e.min<=e.max)}
  }
 }
})
test('version exclusive encounters and prizes',()=>{
 assert(get(id(23),'FireRed').locations.length)
 assert.equal(get(id(23),'LeafGreen').locations.length,0)
 assert(get(id(27),'LeafGreen').locations.length)
 assert.equal(get(id(27),'FireRed').locations.length,0)
 assert(get(id(123),'FireRed').special.some(e=>e.kind==='Prize'&&e.level===25))
 assert(!get(id(123),'LeafGreen').special.some(e=>e.kind==='Prize'))
 assert(get(id(137),'LeafGreen').special.some(e=>e.level===18&&e.note.includes('6,500')))
})
test('special levels and unavailable friendship evolution',()=>{
 assert(get(id(138),'FireRed').special.some(e=>e.level===5))
 assert(get(id(150),'LeafGreen').special.some(e=>e.level===70))
 assert(get(id(243),'FireRed').special.some(e=>e.level===50&&e.note.includes('Squirtle')))
 assert.equal(get(id(196),'FireRed').relatives.length,0)
 assert(get(id(134),'FireRed').relatives.some(e=>e.id===id(133)))
})
test('Unown forms remain while access and breeding explanations are omitted',()=>{
 const unown=get(id(201),'FireRed')
 const monean=unown.locations.find(e=>e.location.id.includes('MONEAN'))
 assert.deepEqual(monean.methods[0].encounters.map(e=>[e.form,e.rate]),[['A',99],['?',1]])
 assert.equal(monean.requirements,undefined)
 const forms=new Set(unown.locations.flatMap(e=>e.methods.flatMap(m=>m.encounters.map(e=>e.form))))
 assert.equal(forms.size,28)
 const pichu=get(id(172),'LeafGreen')
 assert.equal(pichu.routeNotes,undefined)
 const crobat=get(id(169),'FireRed')
 assert.equal(crobat.routeNotes,undefined)
})
