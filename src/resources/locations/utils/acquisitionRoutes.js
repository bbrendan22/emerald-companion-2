import { previousEvolutions } from './evolutions.js'

// Older import records and game-specific records can describe the same route.
export function acquisitionRoutes(relatives = [], imports = [], speciesId) {
  if (speciesId != null && [...relatives, ...imports].some(route => route.method === 'Evolve')) {
    const previous = previousEvolutions(speciesId)[0]
    if (previous) return [{ id: previous.from, method: 'Evolve' }]
  }
  const routes = new Map()
  for (const route of [...relatives, ...imports]) {
    if (!route.method) continue
    const method = route.method === 'Evolve' ? 'Evolve' : 'Breed from'
    const key = `${route.id}:${method}`
    if (!routes.has(key)) routes.set(key, { ...route, method })
  }
  return [...routes.values()]
}
