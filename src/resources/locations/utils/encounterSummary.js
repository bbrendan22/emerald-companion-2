// Summarize slots within one species, location and encounter method.
// Keep distinct forms separate rather than combining their probabilities.
export function encounterSummary(encounters) {
  const groups = new Map()
  for (const entry of encounters) {
    const form = entry.form ?? ''
    const group = groups.get(form) ?? { form, min: entry.min, max: entry.max, rate: 0 }
    group.min = Math.min(group.min, entry.min)
    group.max = Math.max(group.max, entry.max)
    group.rate += entry.rate
    groups.set(form, group)
  }
  return [...groups.values()].map(({ form, min, max, rate }) =>
    `${form ? `${form} · ` : ''}Lv. ${min === max ? min : `${min}–${max}`} · ${Number(rate.toFixed(2))}%`,
  ).join(' / ')
}
export function encounterLevelRange(locations, methodName) {
  const slots = locations.flatMap(({ methods }) => methods
    .filter(method => !methodName || method.name === methodName)
    .flatMap(method => method.encounters))
  if (!slots.length) return ''
  const min = Math.min(...slots.map(slot => slot.min))
  const max = Math.max(...slots.map(slot => slot.max))
  return `Lv. ${min === max ? min : `${min}–${max}`}`
}
