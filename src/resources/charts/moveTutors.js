import reference from '../../data/reference.json' with {type: 'json'};
import {tutorResources} from '../learnset/data/tutorResources.js';

// Chart-only location labels. Source records and learnset/calculation code remain unchanged.
// Verified against pret game scripts; see docs/MOVE_TUTORS_CHART.md.
const emeraldLocations = {
  207: 'Slateport City · Pokémon Fan Club',
  205: 'Mauville City · Man near the Gym',
  210: 'Verdanturf Town · Pokémon Center',
  102: 'Lavaridge Town · House, Ninja Boy',
  118: 'Fallarbor Town · Poké Mart',
  214: 'Fortree City · Second house in the north row',
  164: 'Lilycove City · Department Store rooftop',
  223: 'Mossdeep City · Man on the coast',
  38: 'Sootopolis City · Pokémon Center',
  153: 'Pacifidlog Town · Pokémon Center',
};
const frlgLocations = [
  [5, 'Route 4 · Left Black Belt'],
  [25, 'Route 4 · Right Black Belt'],
  [69, 'Pewter City · Museum, rear entrance (Cut)'],
  [157, 'Rock Tunnel · B1F'],
  [68, 'Celadon City · Department Store, 3F'],
  [135, 'Celadon City · Man across the pond (Surf)'],
  [102, 'Saffron City · Copycat’s house, 2F (Poké Doll)'],
  [86, 'Saffron City · Silph Co., 2F'],
  [164, 'Fuchsia City · Boy by the Kangaskhan enclosure'],
  [138, 'Viridian City · Man across the pond (Cut or Surf)'],
  [118, 'Cinnabar Island · Pokémon Lab, Research Room'],
  [38, 'Victory Road · 2F, near the exit'],
  [153, 'Mt. Ember · Hiker outside'],
  [338, 'Two Island · Cape Brink house'],
  [307, 'Two Island · Cape Brink house'],
  [308, 'Two Island · Cape Brink house'],
  [34, 'Four Island · Northeast house'],
  [14, 'Seven Island · Cooltrainer near the southern dock'],
];
const byName = (a, b) => a.name.localeCompare(b.name, 'en');
const named = row => ({...row, name: reference.moves[row.moveId].name});
export const moveTutorTabs = [
  {id: 'emerald', label: 'Emerald'},
  {id: 'frontier', label: 'Battle Frontier'},
  {id: 'frlg', label: 'FRLG'},
];
export const moveTutorLists = {
  emerald: tutorResources.filter(tutor => !tutor.repeatable && tutor.cost === 0)
    .map(({moveId}) => named({moveId, location: emeraldLocations[moveId]})).sort(byName),
  frontier: tutorResources.filter(tutor => tutor.repeatable && tutor.cost > 0)
    .map(({moveId, side, cost}) => named({moveId, location: `Tutor house · ${side}`, side, cost}))
    .sort((a, b) => a.side.localeCompare(b.side, 'en') || byName(a, b)),
  frlg: frlgLocations.map(([moveId, location]) => named({moveId, location})).sort(byName),
};
export const moveTutorNotes = {
  emerald: 'Each tutor teaches their move once per save.',
  frontier: 'Tutor house west of the Battle Dome · Repeatable lessons.',
  frlg: 'Same tutors in both versions; each move once per save. Cape Brink requires a fully evolved Kanto starter with maximum friendship.',
};
