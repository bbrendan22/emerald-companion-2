import { encounterSummary } from './encounterSummary.js'

export function splitEncounterLocation(name) {
  const match = name.match(/^((?:(?:One|Two|Three|Four|Five|Six|Seven) Island )?(?:Abandoned Ship|Granite Cave|Mt\.? Pyre|Victory Road|Safari Zone|Meteor Falls|New Mauville|Seafloor Cavern|Cave Of Origin|Shoal Cave|Sky Pillar|Magma Hideout|Mirage Tower|Artisan Cave|Rock Tunnel|Mt\.? Moon|Seafoam Islands|Cerulean Cave|Pok[eé]mon Mansion|Pok[eé]mon Tower|Mt\.? Ember|Icefall Cave|Lost Cave|Tanoby Ruins))\s+(.+)$/i)
  if (match) return { parent: match[1], label: match[2] }
  const island = name.match(/^((?:One|Two|Three|Four|Five|Six|Seven) Island)(?: (.+))?$/)
  if (island) return { parent: island[1], label: island[2] ?? 'Town' }
  return { parent: null, label: name }
}
const signature = entry => JSON.stringify({ methods: entry.methods.map(method => [method.name, encounterSummary(method.encounters)]).sort(), requirements: entry.requirements ?? [] })
export function groupEncounterLocations(locations, { combineMatchingRoutes = false, combineMatchingCities = false } = {}) {
  const groups = new Map()
  for (const entry of locations) {
    const split = splitEncounterLocation(entry.location.name)
    const route = entry.location.name.match(/^Route (\d+)$/) ?? (combineMatchingRoutes && entry.location.name.match(/^Route (\d+) (North|South)$/) && locations.some(other => other.location.name === entry.location.name.replace(/(North|South)$/, side => side === 'North' ? 'South' : 'North') && signature(other) === signature(entry)) ? entry.location.name.match(/^Route (\d+)/) : null)
    const city = combineMatchingCities && / (City|Town)$/.test(entry.location.name)
    const underwater = /^Underwater(?: Route \d+| \d+)$/.test(entry.location.name)
    const key = route ? 'routes' : underwater ? 'underwater-routes' : city ? 'cities' : split.parent ?? entry.location.name
    if (!groups.has(key)) groups.set(key, { parent: route || city ? null : split.parent, entries: [] })
    groups.get(key).entries.push({ ...entry, label: split.label, route: route ? Number(route[1]) : null })
  }
  return [...groups.values()].flatMap(group => {
    const combined = []
    for (const entry of group.entries.sort((a,b) => a.label.localeCompare(b.label, undefined, { numeric: true }))) {
      const key = signature(entry)
      const target = entry.route !== null && !combineMatchingRoutes ? combined.at(-1) : combined.find(row => row.signature === key)
      if (target && target.signature === key && (entry.route === null || combineMatchingRoutes || target.entries.at(-1).route + 1 === entry.route)) target.entries.push(entry)
      else combined.push({ signature: key, entries: [entry], methods: entry.methods, requirements: entry.requirements ?? [] })
    }
    if (group.entries[0]?.route !== null) return combined.map(row => ({ parent: null, rows: [row] }))
    return [{ parent: group.parent, rows: combined }]
  })
}
export function combinedEncounterLabel(entries) {
  if (entries[0].route !== null) {
    if (entries.length === 1) return entries[0].label
    const numbers = [...new Set(entries.map(entry => entry.route))].sort((a, b) => a - b)
    const runs = []
    for (const number of numbers) {
      const last = runs.at(-1)
      if (last && last.at(-1) + 1 === number) last.push(number)
      else runs.push([number])
    }
    return `${numbers.length === 1 ? 'Route' : 'Routes'} ${runs.map(run => run.length === 1 ? run[0] : `${run[0]}–${run.at(-1)}`).join(', ')}`
  }
  const labels = entries.map(entry => entry.label)
  const rooms = labels.map(label => label.match(/^(B\s*)?(\d+)F\s+(\d+)r$/i))
  if (rooms.every(Boolean)) {
    const floors = new Map()
    for (const room of rooms) {
      const floor = `${room[1] ? 'B' : ''}${room[2]}F`
      if (!floors.has(floor)) floors.set(floor, [])
      floors.get(floor).push(Number(room[3]))
    }
    return [...floors].map(([floor, numbers]) => {
      const runs = []
      for (const number of [...new Set(numbers)].sort((a, b) => a - b)) {
        const last = runs.at(-1)
        if (last && last.at(-1) + 1 === number) last.push(number)
        else runs.push([number])
      }
      return `${floor} ${numbers.length === 1 ? 'Room' : 'Rooms'} ${runs.map(run => run.length > 1 ? `${run[0]}–${run.at(-1)}` : run[0]).join(', ')}`
    }).join('; ')
  }
  if (labels.length > 1) {
    const parts = labels.map(label => label.match(/^(.*?)(\d+)(F?)$/))
    if (parts.every(Boolean) && parts.every(part => part[1] === parts[0][1] && part[3] === parts[0][3])) {
      const runs = []
      for (const part of parts) {
        const last = runs.at(-1)
        if (last && Number(part[2]) === Number(last.at(-1)[2]) + 1) last.push(part)
        else runs.push([part])
      }
      return runs.map(run => `${run[0][1]}${run[0][2]}${run[0][3]}${run.length > 1 ? `–${run.at(-1)[2]}${run.at(-1)[3]}` : ''}`).join(', ')
    }
  }
  return labels.map(label => label.replace(/\bB\s+(\d+)F\b/g, 'B$1F').replace(/\bSsanne\b/i, 'S.S. Anne')).join(', ')
}

export function groupedEncounterDisplay(locations, { combineMatchingRoutes = false, combineMatchingCities = false, splitMethodParents = [], independentMethods = false, combineSeviiIslands = false } = {}) {
  const groups = groupEncounterLocations(locations, { combineMatchingRoutes, combineMatchingCities })
  for (const group of groups) {
    if (!group.parent || !(splitMethodParents.includes(group.parent) || splitMethodParents.includes('*'))) continue
    const entries = group.rows.flatMap(row => row.entries)
    if (independentMethods) {
      const merged = new Map()
      const names = [...new Set(entries.flatMap(entry => entry.methods.map(method => method.name)))]
      for (const name of names) {
        const section = entries.map(entry => ({ ...entry, methods: entry.methods.filter(method => method.name === name) })).filter(entry => entry.methods.length)
        for (const row of groupEncounterLocations(section).flatMap(part => part.rows)) {
          const key = JSON.stringify([row.entries.map(entry => entry.location.id).sort(), row.requirements])
          if (merged.has(key)) merged.get(key).methods.push(...row.methods)
          else merged.set(key, row)
        }
      }
      group.rows = [...merged.values()]
      continue
    }
    const grass = entries.map(entry => ({ ...entry, methods: entry.methods.filter(method => method.name === 'Grass / Cave') })).filter(entry => entry.methods.length)
    const water = entries.map(entry => ({ ...entry, methods: entry.methods.filter(method => method.name !== 'Grass / Cave') })).filter(entry => entry.methods.length)
    group.rows = [grass, water].flatMap(section => groupEncounterLocations(section).flatMap(part => part.rows))
  }
  if (combineSeviiIslands) {
    const islandPattern = /^((?:One|Two|Three|Four|Five|Six|Seven) Island)(?: (.+))?$/
    const rows = new Map()
    const order = ['One Island', 'Two Island', 'Three Island', 'Four Island', 'Five Island', 'Six Island', 'Seven Island']
    const first = groups.findIndex(group => islandPattern.test(group.parent ?? ''))
    for (const group of groups.filter(group => islandPattern.test(group.parent ?? ''))) {
      for (const row of group.rows) {
        const key = JSON.stringify([row.methods.map(method => [method.name, encounterSummary(method.encounters)]).sort(), row.requirements])
        if (!rows.has(key)) rows.set(key, { ...row, entries: [], islands: [] })
        const target = rows.get(key)
        target.entries.push(...row.entries)
        const [, name, sublocation] = group.parent.match(islandPattern)
        const label = sublocation ? `${sublocation} (${combinedEncounterLabel(row.entries)})` : combinedEncounterLabel(row.entries)
        const island = target.islands.find(island => island.name === name)
        if (island) island.label += `; ${label}`
        else target.islands.push({ name, label })
      }
    }
    if (first !== -1) {
      const kept = groups.filter(group => !islandPattern.test(group.parent ?? ''))
      const combined = { parent: null, rows: [...rows.values()].map(row => ({ ...row, islands: row.islands.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name)) })) }
      kept.splice(first, 0, combined)
      groups.splice(0, groups.length, ...kept)
    }
  }
  const caveNames = /(?:^| Island )(?:Granite Cave|Rusturf Tunnel|Meteor Falls|Fiery Path|Desert Underpass|Altering Cave|Artisan Cave|Seafloor Cavern|Cave Of Origin|Shoal Cave|Victory Road|Magma Hideout|Rock Tunnel|Mt\.? Moon|Seafoam Islands|Cerulean Cave|Diglett'?s Cave|Icefall Cave|Lost Cave)(?:$| )/i
  const isCave = group => group.rows.every(row => row.entries.every(entry => caveNames.test(entry.location.name)))
  const islandOrder = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven']
  const groupEntries = group => group.rows.flatMap(row => row.entries)
  const isSevii = group => groupEntries(group).every(entry => /^(One|Two|Three|Four|Five|Six|Seven) Island(?: |$)/.test(entry.location.name))
  const rank = group => {
    const entries = groupEntries(group)
    if (entries.every(entry => /^Route \d+(?: |$)/.test(entry.location.name))) return 0
    if (isSevii(group)) return 4
    if (isCave(group)) return 1
    if (entries.every(entry => entry.location.name.startsWith('Underwater'))) return 2
    if (entries.every(entry => / (City|Town)$/.test(entry.location.name))) return 3
    return 5
  }
  groups.sort((a, b) => {
    const difference = rank(a) - rank(b)
    if (difference) return difference
    const nameA = a.parent ?? groupEntries(a)[0].location.name
    const nameB = b.parent ?? groupEntries(b)[0].location.name
    if (rank(a) === 4) {
      const islandA = islandOrder.indexOf(nameA.split(' ')[0])
      const islandB = islandOrder.indexOf(nameB.split(' ')[0])
      if (islandA !== islandB) return islandA - islandB
    }
    return nameA.localeCompare(nameB, undefined, { numeric: true })
  })
  const categoryNames = ['Routes', 'Caves', 'Underwater', 'Cities & Towns', 'Sevii Islands', 'Other Locations']
  for (const group of groups) group.category = categoryNames[rank(group)]
  return groups
}
