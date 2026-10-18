// Original 1.0 tests, adapted import paths only.
import test from 'node:test'
import assert from 'node:assert/strict'
import { crossGameLearnset } from '../src/resources/learnset/utils/crossGameLearnset.js'
import { crossGameMoves } from '../src/resources/learnset/data/crossGameMoves.js'
import { pokemonMeta } from '../src/resources/learnset/data/pokemonMeta.js'
import { moveNames } from '../src/resources/learnset/data/emeraldData.js'
const species = dex => Object.keys(pokemonMeta).find(id=>pokemonMeta[id].dex===dex)
const move = name => Number(Object.keys(moveNames).find(id=>moveNames[id].toLowerCase()===name.toLowerCase()))
test('all species have valid Gen III moves',()=>{
 assert.equal(Object.keys(crossGameMoves).length,386)
 for(const entries of Object.values(crossGameMoves))for(const entry of entries)assert.ok(moveNames[entry.move])
})
test('Cape Brink moves require final starter evolution',()=>{
 assert.ok(!crossGameLearnset(species(1)).some(entry=>entry.move===move('Frenzy Plant')))
 assert.ok(crossGameLearnset(species(3)).some(entry=>entry.move===move('Frenzy Plant')))
})
test('XD purification moves are included with their source',()=>{
 const entry=crossGameLearnset(species(249)).find(entry=>entry.move===move('Psycho Boost'))
 assert.ok(entry.sources.some(source=>source.game==='XD'&&source.method==='Purification'))
})
test('pre-evolution sources propagate without importing later evolution moves',()=>{
 const entries=crossGameLearnset(species(6))
 assert.ok(entries.some(entry=>entry.move===move('Metal Claw')&&entry.sources.some(source=>source.name==='Charmander'&&source.method==='Level-up')))
 assert.ok(!crossGameLearnset(species(25)).some(entry=>entry.sources.some(source=>source.name==='Raichu')))
})
test('shared level-up moves are omitted even when learned at different levels',()=>{
 const entries=crossGameLearnset(species(4))
 assert.ok(!entries.some(entry=>entry.move===move('Smokescreen')))
 assert.ok(!entries.some(entry=>entry.move===move('Ember')))
 assert.ok(entries.some(entry=>entry.move===move('Metal Claw')))
})
test('XD tutor additions and Mew correction are present',()=>{
 assert.ok(crossGameLearnset(species(143)).some(e=>e.move===move('Self Destruct')&&e.sources.some(s=>s.game==='XD')))
 const entries=crossGameLearnset(species(151))
 assert.ok(entries.some(e=>e.move===move('Role Play')&&e.sources.some(s=>s.method==='Mew tutor')))
 assert.ok(!entries.some(e=>e.move===move('Trick')&&e.sources.some(s=>s.method==='Mew tutor')))
 const specialNames=['Faint Attack','Fake Out','Hypnosis','Night Shade','Role Play','Zap Cannon']
 for(const name of specialNames){
  const sources=crossGameMoves[species(151)].filter(e=>e.move===move(name)&&e.game==='XD'&&e.method.toLowerCase().includes('tutor'))
  assert.equal(sources.length,1)
  assert.equal(sources[0].location,'Mt. Battle')
 }
 const general=new Set(Object.values(crossGameMoves).flat().filter(e=>e.game==='XD'&&e.method==='Move tutor').map(e=>moveNames[e.move]))
 assert.deepEqual([...general].sort(),['Mimic','Thunder Wave','Seismic Toss','Icy Wind','Substitute','Dream Eater','Swagger','Body Slam','Nightmare','Sky Attack','Double Edge','Self Destruct'].sort())
})
test('gameplay gift requirements are recorded and retained after evolving',()=>{
 const surf=crossGameLearnset(species(26)).find(e=>e.move===move('Surf'))
 assert.ok(surf.sources.some(s=>s.requirement.includes('1499')&&s.requirement.includes('same GBA save')))
 const frenzy=crossGameLearnset(species(154)).find(e=>e.move===move('Frenzy Plant'))
 assert.ok(frenzy.sources.some(s=>s.requirement.includes('1–100')))
})
