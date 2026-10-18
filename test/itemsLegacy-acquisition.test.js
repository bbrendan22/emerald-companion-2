// Original legacy tests; import paths adapted only.
import test from 'node:test'
import assert from 'node:assert/strict'
import { utilityItemAcquisition } from '../src/resources/items/data/utilityItemAcquisition.js'
import { itemAcquisition, itemAcquisitionEntries } from '../src/resources/items/data/itemAcquisition.js'
import { berryItemAcquisition } from '../src/resources/items/data/berryItemAcquisition.js'
import { berryItemWildSources } from '../src/resources/items/data/berryItemWildSources.js'
import { berryItemMapSources } from '../src/resources/items/data/berryItemMapSources.js'
import { miscItemAcquisition } from '../src/resources/items/data/miscItemAcquisition.js'
import { miscItemMapSources } from '../src/resources/items/data/miscItemMapSources.js'
import { miscItemWildSources } from '../src/resources/items/data/miscItemWildSources.js'

test('Utility sources have complete fields and no duplicate acquisition methods', () => {
  assert.equal(Object.keys(utilityItemAcquisition).length, 32)
  for (const [id, item] of Object.entries(utilityItemAcquisition)) {
    const seen = new Set()
    for (const row of item.entries) {
      for (const field of ['game', 'location', 'method', 'availability']) assert.ok(row[field], `${id}: missing ${field}`)
      const key = JSON.stringify([row.game, row.location, row.method])
      assert.ok(!seen.has(key), `${id}: duplicate source ${key}`)
      seen.add(key)
    }
  }
})

test('Misc inventory retains native pickups and wild sources with correct version restrictions', () => {
  assert.equal(Object.keys(miscItemAcquisition).length, 23)
  for (const [id, item] of Object.entries(miscItemAcquisition)) {
    const keys = new Set()
    for (const row of item.entries) {
      for (const field of ['game', 'location', 'method', 'availability']) assert.ok(row[field], `${id}: missing ${field}`)
      const key = JSON.stringify([row.game, row.location, row.method])
      assert.ok(!keys.has(key), `${id}: duplicate ${key}`)
      keys.add(key)
    }
    assert.deepEqual(new Set(itemAcquisitionEntries(id)), new Set(item.entries.filter(row => !/Colosseum|XD|event|e-Reader/i.test([row.game, row.location, row.method, row.requirement].join(' ')) && ([93, 201, 46, 47, 48, 49, 50, 51].includes(Number(id)) ? row.game === 'Emerald' : [95, 96, 97, 98].includes(Number(id)) ? ['Emerald', 'FireRed / LeafGreen'].includes(row.game) : true))), `${id}: ordinary handheld sources`)
  }
  for (const row of miscItemMapSources.filter(row => row.pickups)) assert.ok(miscItemAcquisition[row.item].entries.some(e => e.game === row.game && JSON.stringify(e.pickups) === JSON.stringify(row.pickups)))
  for (const row of miscItemWildSources) assert.ok(miscItemAcquisition[row.item].entries.some(e => e.game === row.game && e.pokemon === row.pokemon && e.heldItemChance === row.chance))
  assert.ok(!miscItemAcquisition[94].entries.some(e => e.game === 'Emerald' && e.pokemon === 'Lunatone'))
  for (const id of [201,218]) assert.equal(miscItemAcquisition[id].entries.find(e => e.location.includes('Trainer Tower')).availability, 'Once per save')
  for (const id of [354,357,358]) assert.ok(miscItemAcquisition[id].entries.every(e => e.game === 'FireRed / LeafGreen'))
  assert.ok(miscItemAcquisition[376].entries.every(e => e.game === 'Emerald' && e.requirement.includes('Japanese')))
  assert.equal(miscItemMapSources.find(e => e.item === 49 && e.game === 'Ruby / Sapphire').locations.includes('Underwater Route 125'), false)

})

test('version-specific acquisition rules remain accurate', () => {
  for (const id of [85, 86]) assert.ok(!utilityItemAcquisition[id].entries.some(row => row.game === 'XD' && row.location === 'Pickup'))
  assert.ok(!utilityItemAcquisition[197].entries.some(row => row.game === 'Emerald'))
  assert.ok(utilityItemAcquisition[111].entries.some(row => row.game === 'FireRed / LeafGreen' && row.location.includes('Tanoby Ruins') && row.availability === 'Repeatable'))
  for (const id of [103, 104]) assert.ok(utilityItemAcquisition[id].entries.some(row => row.location === 'Mt. Moon · B1F' && row.availability === 'Repeatable'))
  for (const id of [63, 65, 66, 67, 70]) assert.ok(!utilityItemAcquisition[id].entries.some(row => row.location.includes('Favor Lady')))
  assert.ok(!utilityItemAcquisition[68].entries.some(row => row.location === 'Trainer Hill'))
  for (const row of utilityItemAcquisition[197].entries.filter(row => row.method.startsWith('Wild '))) assert.ok(!row.method.includes('Thief'))
})

test('Unreviewed items expose all sources and reviewed battle items keep their approved methods', () => {
  for (const [id, item] of Object.entries(itemAcquisition)) {
    const original = JSON.stringify(item.entries)
    const visible = itemAcquisitionEntries(id)
    const selected = Number(id) >= 133 && Number(id) <= 142
      ? item.entries.filter(row => row.game === 'Emerald' && (row.availability === 'Daily' || row.method === 'Harvest the existing berry trees' || (Number(id) === 136 && row.pokemon === 'Numel') || (Number(id) === 134 && row.location === 'Route 104 · south') || (Number(id) === 142 && row.location.startsWith('Ever Grande City ·'))))
      : [298, 302, 303, 304, 305, 308, 309, 313, 315, 320, 321, 326, 331, 339, 340, 341, 342, 343, 344, 345, 346].includes(Number(id))
      ? item.entries.filter(row => row.game === 'Emerald')
      : [301, 312, 317, 323].includes(Number(id))
        ? item.entries.filter(row => ['Emerald', 'FireRed / LeafGreen'].includes(row.game))
      : Number(id) >= 289 && Number(id) <= 338
        ? item.entries.filter(row => !/Colosseum|XD/.test(row.game))
      : [179, 180, 183, 185, 186, 187, 198, 199, 202, 203, 204, 211, 213, 214, 219, 223, 195, 68, 111, 69, 71, 63, 64, 65, 67, 70, 66, 194, 80, 81, 83, 84, 85, 39, 40, 41, 42, 43, 93, 201, 46, 47, 48, 49, 50, 51, 168, 153, 154, 155, 156, 157, 158].includes(Number(id))
      ? item.entries.filter(row => row.game === 'Emerald')
      : [205, 206, 208, 209, 212, 215, 217, 189, 181, 184].includes(Number(id))
      ? item.entries.filter(row => ['Emerald', 'Ruby / Sapphire', 'FireRed / LeafGreen'].includes(row.game))
      : [222, 224, 225, 197, 104].includes(Number(id))
        ? item.entries.filter(row => row.game === 'FireRed / LeafGreen')
      : Number(id) === 196
        ? item.entries.filter(row => row.game === 'Emerald' || (row.game === 'FireRed / LeafGreen' && row.pokemon === 'Machoke'))
      : Number(id) === 210
        ? item.entries.filter(row => row.game === 'Emerald' || (row.game === 'FireRed / LeafGreen' && row.pokemon === 'Fearow'))
      : [188, 200, 216, 103, 95, 96, 97, 98].includes(Number(id))
        ? item.entries.filter(row => ['Emerald', 'FireRed / LeafGreen'].includes(row.game))
      : Number(id) === 207
      ? item.entries.filter(row => row.game === 'Emerald' || (row.game === 'FireRed / LeafGreen' && row.location === 'Route 15'))
      : Number(id) === 1
        ? item.entries.filter(row => ['Emerald', 'Ruby', 'Sapphire', 'Ruby / Sapphire', 'FireRed / LeafGreen'].includes(row.game))
      : Number(id) >= 2 && Number(id) <= 12
        ? item.entries.filter(row => row.game === 'Emerald' && (/^(Buy for|Pay ₽|Receive 1 free)/.test(row.method) || /Contest Hall|Quiz Lady|Favor Lady|lottery/i.test(row.location)))
      : Number(id) === 110
        ? item.entries.filter(row => row.game === 'Emerald' && (row.location === 'Pickup' || row.location === 'Lilycove City · Favor Lady' || row.pickups))
      : Number(id) === 182
        ? item.entries.filter(row => row.game === 'Emerald' || row.game === 'FireRed / LeafGreen' || (row.game === 'Ruby / Sapphire' && row.availability === 'Once per save'))
      : item.entries
    const expected = selected.filter(row => row.availability !== 'Event distribution' && row.availability !== 'Card reward' && !/Historical Pokémon distribution|e-Reader/i.test(row.location) && (!miscItemAcquisition[id] || !/Colosseum|XD|event|e-Reader/i.test([row.game, row.location, row.method, row.requirement].join(' '))))
    assert.equal(visible.length, expected.length, `item ${id}: source selection`)
    assert.deepEqual(new Set(visible), new Set(expected), `item ${id}: replaced sources`)
    assert.equal(JSON.stringify(item.entries), original, `item ${id}: source order mutated`)
    const firstOtherGame = visible.findIndex(row => row.game !== 'Emerald')
    if (firstOtherGame >= 0) assert.ok(visible.slice(firstOtherGame).every(row => row.game !== 'Emerald'))
  }
})

test('Berry inventory covers each native map and wild source without duplicate methods', () => {
  assert.equal(Object.keys(berryItemAcquisition).length, 23)
  for (const [id, item] of Object.entries(berryItemAcquisition)) {
    const seen = new Set()
    for (const row of item.entries) {
      for (const field of ['game', 'location', 'method', 'availability']) assert.ok(row[field], `${id}: missing ${field}`)
      const key = JSON.stringify([row.game, row.location, row.method])
      assert.ok(!seen.has(key), `${id}: duplicate ${key}`)
      seen.add(key)
      assert.ok(!/growth|Plant a|hours/i.test(row.method))
      if (row.location.includes('Safari Zone')) assert.ok(!/catch or use Thief/.test(row.method))
    }
  }
  for (const row of berryItemWildSources) assert.ok(berryItemAcquisition[row.item].entries.some(e => e.game === row.game && e.pokemon === row.pokemon && e.heldItemChance === row.chance))
  for (const row of berryItemMapSources) assert.ok(berryItemAcquisition[row.item].entries.some(e => e.game === row.game && JSON.stringify(e.pickups) === JSON.stringify(row.pickups)))
  for (const id of [138,141,142]) assert.ok(berryItemAcquisition[id].entries.some(e => e.game === 'Emerald' && e.method.includes('Pokémon Jump')))
  for (const id of [153,154,155,156,157,158]) assert.ok(berryItemAcquisition[id].entries.some(e => e.game === 'Emerald' && e.method.includes('Dodrio')))
  assert.equal(berryItemAcquisition[134].entries.find(e => e.method.includes('Snorlax')).availability, 'Once per encounter')
})

test('Poké Balls retain native pickups, shop routes and distinct special rewards', async () => {
  const { pokeBallAcquisition } = await import('../src/resources/items/data/pokeBallAcquisition.js')
  const { pokeBallMapSources } = await import('../src/resources/items/data/pokeBallMapSources.js')
  assert.equal(Object.keys(pokeBallAcquisition).length, 12)
  for (const [id, item] of Object.entries(pokeBallAcquisition)) {
    const seen = new Set()
    for (const row of item.entries) {
      for (const field of ['game','location','method','availability']) assert.ok(row[field], `${id}: missing ${field}`)
      const key = JSON.stringify([row.game,row.location,row.method])
      assert.ok(!seen.has(key), `${id}: duplicate source`)
      seen.add(key)
    }
    const visible = itemAcquisitionEntries(id)
    assert.ok(visible.length > 0, `${id}: no retained source`)
    if (Number(id) !== 1) assert.ok(visible.every(row => row.game === 'Emerald'))
  }
  for (const row of pokeBallMapSources.filter(row => row.pickups)) {
    assert.ok(pokeBallAcquisition[row.item].entries.some(entry => entry.game === row.game && JSON.stringify(entry.pickups) === JSON.stringify(row.pickups)))
  }
  assert.ok(pokeBallAcquisition[7].entries.some(row => row.game === 'Emerald' && row.method === 'Buy for ₽1,000' && row.location.includes('Mossdeep')))
  assert.ok(pokeBallAcquisition[1].entries.some(row => row.game === 'Emerald' && row.availability === 'Daily'))
  assert.ok(pokeBallAcquisition[12].entries.every(row => row.game !== 'FireRed / LeafGreen'))
  assert.ok(pokeBallAcquisition[5].entries.every(row => row.availability === 'Per visit' && row.requirement.includes('cannot be kept')))
  assert.ok(pokeBallAcquisition[2].entries.some(row => row.game === 'FireRed / LeafGreen' && row.method.includes('recurring')))
})

test('All 58 machines retain native sources and version-specific acquisition methods', async () => {
  const { machineItemAcquisition: data } = await import('../src/resources/items/data/machineItemAcquisition.js')
  const { machineMapSources } = await import('../src/resources/items/data/machineMapSources.js')
  assert.equal(Object.keys(data).length, 58)
  for (const [id, item] of Object.entries(data)) {
    assert.ok(item.entries.some(e => e.game === 'Emerald'), `${id}: missing Emerald`)
    assert.ok(itemAcquisitionEntries(id).some(row => row.game === 'Emerald'), `${id}: retained Emerald source`)
    const seen = new Set()
    for (const row of item.entries) {
      for (const field of ['game','location','method','availability']) assert.ok(row[field], `${id}: missing ${field}`)
      const key = JSON.stringify([row.game,row.location,row.method])
      assert.ok(!seen.has(key), `${id}: duplicate source`)
      seen.add(key)
    }
  }
  for (const row of machineMapSources.filter(e => e.pickups)) assert.ok(data[row.item].entries.some(e => e.game === row.game && JSON.stringify(e.pickups) === JSON.stringify(row.pickups)))
  assert.ok(data[289].entries.some(e => e.game === 'Emerald' && e.location === 'Pickup' && e.method.includes('71–90')))
  assert.ok(data[331].entries.some(e => e.game === 'Emerald' && e.location === 'Route 111'))
  assert.ok(data[294].entries.some(e => e.game === 'Emerald' && e.requirement?.includes('Japanese')))
  assert.ok(data[309].entries.some(e => e.game === 'Emerald' && e.availability === 'Weekly'))
  assert.ok(!data[346].entries.some(e => e.game === 'FireRed / LeafGreen'))
  for (let id=339; id<=346; id++) assert.ok(data[id].entries.every(e => !['XD','Colosseum'].includes(e.game)))
})

test('Shell Bell displays its Emerald exchange with the required clock note', () => {
  const entries = itemAcquisitionEntries(219)
  assert.equal(entries.length, 1)
  assert.equal(entries[0].game, 'Emerald')
  assert.match(entries[0].requirement, /working game clock/)
})

test('Displayed sources follow the approved game order', () => {
  const order = ['Emerald', 'Ruby', 'Sapphire', 'Ruby / Sapphire', 'FireRed', 'LeafGreen', 'FireRed / LeafGreen', 'Colosseum', 'XD', 'Colosseum / XD']
  for (const id of Object.keys(itemAcquisition)) {
    const ranks = itemAcquisitionEntries(id).map(row => {
      const index = order.indexOf(row.game)
      return index < 0 ? order.length : index
    })
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), `${id}: game order`)
  }
})

test('Displayed sources follow the approved label order within each game', () => {
  const order = ['Repeatable', 'Repeatable before capture', 'Daily', 'Weekly', 'Once per save', 'Once per request', 'Once per quiz', 'Per visit']
  for (const id of Object.keys(itemAcquisition)) {
    const byGame = new Map()
    for (const row of itemAcquisitionEntries(id)) {
      const label = row.availability === 'Once per pickup' ? 'Once per save' : row.availability
      assert.notEqual(label, 'Once per spot')
      const index = order.indexOf(label)
      const ranks = byGame.get(row.game) ?? []
      ranks.push(index < 0 ? order.length : index)
      byGame.set(row.game, ranks)
    }
    for (const ranks of byGame.values()) assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), `${id}: label order`)
  }
})
