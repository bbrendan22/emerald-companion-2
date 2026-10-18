// Safari encounters only allow catching, rather than using battle moves.
export function wildItemMethod(location, pokemon) {
  const areas = location.split(' / ')
  const safariAreas = areas.filter(area => area.includes('Safari Zone'))
  if (safariAreas.length === areas.length) return `Wild ${pokemon} · catch`
  if (safariAreas.length) return `Wild ${pokemon} · catch; Thief / Covet outside the Safari Zone`
  return `Wild ${pokemon} · catch or use Thief / Covet`
}
