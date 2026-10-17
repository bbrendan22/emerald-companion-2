export const showcaseKey = 'emerald-companion-2.showcase.v1';
export const emptyShowcase = () => Array(6).fill(null);
const validSlot = slot => slot && Number.isInteger(slot.nationalDexId) && slot.nationalDexId >= 1 && slot.nationalDexId <= 386 && typeof slot.shiny === 'boolean';
export function loadShowcase(storage) {
  const raw = storage.getItem(showcaseKey);
  if (raw === null) return null; // No customization: retain the party fallback.
  try {
    const slots = JSON.parse(raw);
    if (!Array.isArray(slots) || slots.length !== 6) return emptyShowcase();
    return slots.map(slot => validSlot(slot) ? {nationalDexId: slot.nationalDexId, shiny: slot.shiny} : null);
  } catch { return emptyShowcase(); }
}
export function storeShowcase(storage, slots) {
  if (!Array.isArray(slots) || slots.length !== 6 || slots.some(slot => slot !== null && !validSlot(slot))) throw new Error('Invalid showcase configuration');
  const next = slots.map(slot => slot ? {nationalDexId: slot.nationalDexId, shiny: slot.shiny} : null);
  storage.setItem(showcaseKey, JSON.stringify(next));
  return next;
}
export function changeShowcaseSlot(slots, index, value) {
  if (!Number.isInteger(index) || index < 0 || index > 5) throw new Error('Invalid showcase position');
  return (slots ?? emptyShowcase()).map((slot, i) => i === index ? value : slot);
}
// Uncustomized showcases use party order in the six grid positions.
export function showcaseSlots(custom, records = []) {
  if (custom !== null) return custom;
  const result = emptyShowcase();
  for (const pokemon of records) if (pokemon.source.kind === 'party') {
    result[pokemon.source.slot] = {nationalDexId: pokemon.nationalDexId, shiny: pokemon.shiny, isEgg: pokemon.isEgg};
  }
  return result;
}
