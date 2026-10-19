import {frontierBrainPokemon} from '../../battle/data/frontierBrains.js';
import {towerTrainerEntries} from '../../battle/towerTrainers.js';
import {frontierPokemon} from '../../battle/data/frontierPokemon.js';

// Keep Battle's record identities and one-based entry numbers; never sort its array in place.
export function searchFrontierSets(query = '') {
  const term = query.trim().toLowerCase();
  const number = term.replace(/^#\s*/, '');
  return frontierPokemon.filter(set => !term || (/^\d+$/.test(number)
    ? set.entry === Number(number) : set.species.toLowerCase().includes(term)))
    .sort((a, b) => a.entry - b.entry);
}
export const frontierEVLabels = {hp:'HP', atk:'Atk', def:'Def', spa:'SpA', spd:'SpD', spe:'Spe'};
export function frontierEVSpread(set) {
  return Object.entries(frontierEVLabels).filter(([key]) => set.evs[key] > 0)
    .map(([key, label]) => `${set.evs[key]} ${label}`).join(' / ');
}

// The shared Battle entries reference allowed pools, not fixed generated teams.
export function eligibleFrontierTrainers(set) {
  return towerTrainerEntries.filter(trainer => trainer.setIds.includes(set.id));
}

// Presentation metadata only; Pokémon records remain in Battle's shared dataset.
export const frontierBrains = [
  {name:'Anabel', facility:'Battle Tower', sprite:'salon_maiden_anabel'},
  {name:'Tucker', facility:'Battle Dome', sprite:'dome_ace_tucker'},
  {name:'Greta', facility:'Battle Arena', sprite:'arena_tycoon_greta'},
  {name:'Lucy', facility:'Battle Pike', sprite:'pike_queen_lucy'},
  {name:'Spenser', facility:'Battle Palace', sprite:'palace_maven_spenser'},
  {name:'Brandon', facility:'Battle Pyramid', sprite:'pyramid_king_brandon'},
];
export function frontierBrainInfo(set) {
  const brain = frontierBrains.find(brain => set.brainSet?.startsWith(`${brain.name} `));
  return brain ? {...brain, symbol:set.brainSet.slice(brain.name.length + 1)} : null;
}
export function frontierResourceSetKey(set) {
  return set.brainSet ? `${set.brainSet}:${set.species}` : String(set.entry);
}
export function searchFrontierBrains(query = '') {
  const terms = query.trim().toLowerCase().split(/\s+/);
  return frontierBrains.flatMap(brain => frontierBrainPokemon.filter(set => {
    if (!set.brainSet.startsWith(`${brain.name} `)) return false;
    const text = `${set.species} ${set.brainSet} ${brain.facility}`.toLowerCase();
    return terms.every(term => text.includes(term));
  }));
}
