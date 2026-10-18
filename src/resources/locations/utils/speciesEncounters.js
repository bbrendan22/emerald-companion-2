import { locationResources } from '../data/locationResources.js'

export function speciesEncounters(id) {
  return locationResources.flatMap(location => {
    const methods = location.methods.flatMap(method => {
      const encounters = method.encounters.filter(entry => entry.species === Number(id))
      return encounters.length ? [{ name: method.name, encounters }] : []
    })
    return methods.length ? [{ location, methods }] : []
  }).sort((a, b) => a.location.name.localeCompare(b.location.name, undefined, { numeric: true }))
}
