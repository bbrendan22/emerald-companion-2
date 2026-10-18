import {gameLevelLearnsets} from '../learnset/utils/gameLearnsets.js';
import {previousEvolutions} from '../learnset/utils/evolutions.js';
import {descendants} from '../learnset/utils/eggMoveFathers.js';
import {pokemonMeta} from '../learnset/data/pokemonMeta.js';
import {crossGameMoves} from '../learnset/data/crossGameMoves.js';
import {eggMoves} from '../learnset/data/eggMoveResources.js';
import {machineResources} from '../learnset/data/itemResources.js';
import {tutorResources} from '../learnset/data/tutorResources.js';

export const learnerGroups = ['Level-up Moves', 'TMs / HMs', 'Move Tutors', 'Egg Moves', 'Special Moves'];
let index;

function buildIndex() {
  const moves = new Map();
  function add(move, species, group, source) {
    const {dex, name} = pokemonMeta[species];
    if (!moves.has(move)) moves.set(move, new Map());
    const learners = moves.get(move);
    if (!learners.has(dex)) learners.set(dex, {dex, name, methods: {}});
    const methods = learners.get(dex).methods;
    (methods[group] ??= []).push(source);
  }
  for (const id of Object.keys(pokemonMeta)) {
    // Use game-aware level sets, including verified pre-evolution sources.
    for (const set of gameLevelLearnsets(id)) for (const entry of [...set.entries, ...set.inherited]) {
      add(entry.move, id, learnerGroups[0], {...entry, games: set.games, species: entry.species ?? id});
    }
    const ancestors = new Set([id]);
    for (const species of ancestors) for (const entry of previousEvolutions(species)) ancestors.add(entry.from);
    for (const species of ancestors) {
      for (const machine of machineResources) if (machine.species.includes(Number(species))) {
        add(machine.moveId, id, learnerGroups[1], {species, code: machine.code});
      }
      for (const tutor of tutorResources) if (tutor.species.includes(Number(species))) {
        const {species: compatibility, ...source} = tutor;
        add(tutor.moveId, id, learnerGroups[2], {...source, species, game: 'Emerald'});
      }
      // Read raw records: the profile helper deliberately omits sources already
      // represented by Emerald level-up moves, but this index retains every method.
      for (const source of crossGameMoves[species] ?? []) {
        if (source.method.toLowerCase().includes('tutor')) add(source.move, id, learnerGroups[2], {...source, species});
        else if (['Purification', 'Gift Egg', 'Mt. Battle reward'].includes(source.method)) {
          add(source.move, id, learnerGroups[4], {...source, species});
        }
      }
    }
  }
  // The existing breeding graph maps egg moves to their verified descendants.
  for (const [parent, entries] of Object.entries(eggMoves)) for (const species of descendants(parent)) {
    for (const move of entries) add(move, species, learnerGroups[3], {species: parent, method: 'Egg'});
  }
  for (const [id, species] of Object.entries(pokemonMeta)) if ([172, 25, 26].includes(species.dex)) {
    add(344, id, learnerGroups[3], {method: 'Special breeding', game: 'Emerald', requirement: 'Hatch Pichu · Either parent holds a Light Ball'});
  }
  return new Map([...moves].map(([move, learners]) => [move, learnerGroups.map(title => ({title,
    pokemon: [...learners.values()].filter(learner => learnerGroups.find(group => learner.methods[group]) === title).sort((a, b) => a.dex - b.dex),
  })).filter(group => group.pokemon.length)]));
}

export function moveLearners(move) {
  index ??= buildIndex();
  return index.get(Number(move)) ?? [];
}
