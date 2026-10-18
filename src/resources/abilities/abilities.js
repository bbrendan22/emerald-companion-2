import reference from '../../data/reference.json' with {type: 'json'};
import overview from '../data/overview.json' with {type: 'json'};

// Emerald standard ability slots only; no inferred or modern abilities.
const pokemonByAbility = new Map();
for (const species of Object.values(reference.species)) {
  for (const ability of new Set(species.abilities.filter(id => id > 0))) {
    if (!pokemonByAbility.has(ability)) pokemonByAbility.set(ability, new Map());
    pokemonByAbility.get(ability).set(species.nationalDexId, {dex: species.nationalDexId, name: species.name});
  }
}
for (const [ability, pokemon] of pokemonByAbility) {
  pokemonByAbility.set(ability, [...pokemon.values()].sort((a, b) => a.dex - b.dex));
}
export function abilityDescription(id) {
  return overview.abilityDescriptions[id] ?? 'Verified Emerald description unavailable.';
}
export function abilityPokemon(id) {
  return pokemonByAbility.get(Number(id)) ?? [];
}
