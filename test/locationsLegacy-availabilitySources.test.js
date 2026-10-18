// Ported 1.0 regression tests; import paths adapted only.
import test from 'node:test'
import assert from 'node:assert/strict'
import { availabilitySources } from '../src/resources/locations/data/availabilitySources.js'
const sources=dex=>availabilitySources[dex].filter(entry=>entry.native&&entry.game!=='Emerald'&&!entry.event).map(entry=>entry.game)
test('all tables have seven game rows and missing entries are not native sources',()=>{
 assert.equal(Object.keys(availabilitySources).length,386)
 for(const entries of Object.values(availabilitySources))assert.equal(entries.length,7)
 assert.deepEqual(sources(201),['FireRed','LeafGreen'])
})
test('version exclusives and additional XD sources are preserved',()=>{
 assert.deepEqual(sources(1),['FireRed','LeafGreen'])
 assert.deepEqual(sources(23),['FireRed'])
 assert.deepEqual(sources(79),['LeafGreen'])
 assert.deepEqual(sources(335),['Ruby','XD'])
 assert.deepEqual(sources(337),['Sapphire','XD'])
 assert.deepEqual(sources(315),['Ruby','Sapphire','XD'])
})
test('NPC trades are acquisition methods rather than imports',()=>{
 assert.deepEqual(sources(124),['FireRed','LeafGreen'])
})
test('historical event sources do not become ordinary gameplay',()=>{
 assert.equal(sources(251).length,0)
 assert.equal(sources(385).length,0)
 assert.deepEqual(sources(249),['XD'])
})
