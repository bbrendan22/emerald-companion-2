// Legacy Move Coverage regression tests; only import path adapted.
import test from 'node:test'
import assert from 'node:assert/strict'
import { coverageRoster, groupMoveCoverage, coveragePokemon } from '../src/resources/coverage/moveCoverage.js'

test('coverage rosters contain unique Gen III species and correct evolutions',()=>{
 assert.equal(coveragePokemon.length,386)
 assert.equal(new Set(coveragePokemon.map(p=>p.dex)).size,386)
 const fully=coverageRoster('fully')
 assert.ok(fully.some(p=>p.name==='Venusaur'))
 assert.ok(!fully.some(p=>p.name==='Bulbasaur'))
 assert.ok(fully.some(p=>p.name==='Farfetch\'d'))
 const frontier=coverageRoster('frontier')
 assert.ok(frontier.some(p=>p.name==='Sunkern'))
 assert.ok(!frontier.some(p=>p.name==='Mewtwo'))
})
test('each species is counted once using its best attacking type',()=>{
 const groups=groupMoveCoverage(['ELECTRIC','ICE'])
 assert.equal([...groups.values()].flat().length,386)
 assert.ok(groups.get(4).some(p=>p.name==='Gyarados'))
 assert.ok(groups.get(2).some(p=>p.name==='Swellow'))
 const electric=groupMoveCoverage(['ELECTRIC'])
 assert.ok(electric.get(0).some(p=>p.name==='Swampert'))
 assert.ok(groupMoveCoverage(['FIRE']).get(0.25).some(p=>p.name==='Kingdra'))
})
test('no selections has zero totals, and filters preserve roster counts',()=>{
 assert.equal([...groupMoveCoverage([]).values()].flat().length,0)
 for(const mode of ['fully','frontier']) assert.equal([...groupMoveCoverage(['NORMAL','GHOST'],mode).values()].flat().length,coverageRoster(mode).length)
})
