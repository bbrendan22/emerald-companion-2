import {readSave} from './readSave.js';
import {readTrainer} from './readTrainer.js';
import {readCollection} from './readCollection.js';
import {readPokemon} from './readPokemon.js';
import {readHallOfFame} from './readHallOfFame.js';
import {readFrontierSymbols} from './readFrontierSymbols.js';
import {view} from './binary.js';

// Decode once per import. No browser or storage dependencies.
export function readTrainerSnapshot(bytes) {
  const save = readSave(bytes);
  const trainer = readTrainer(save);
  const {records, issues} = readCollection(save);
  if (issues.length) throw new Error('A Pokémon record could not be decoded. The save was not imported.');
  const block = save.blocks.saveBlock1;
  if (records.filter(p => p.source.kind === 'party').length !== view(block).getUint32(0x234, true)) {
    throw new Error('The party contains an empty occupied slot. The save was not imported.');
  }
  // DayCare.mons has two 140-byte entries, each beginning with an 80-byte BoxPokemon.
  // Only occurrence/shiny status is used; deposited experience is deliberately not calculated.
  for (const offset of [0x3030, 0x30bc]) {
    const pokemon = readPokemon(block.subarray(offset, offset + 80));
    if (pokemon) records.push(pokemon);
  }
  const warnings = [...trainer.warnings];
  if (save.slots.some(slot => !slot.valid)) warnings.push('One save slot was invalid; a complete valid slot was used.');
  if (records.some(p => p.warnings.length)) warnings.push('Some Pokémon fields have parser warnings.');
  if (!trainer.gender) warnings.push('Trainer gender is unavailable.');
  return {trainer, hallOfFame: readHallOfFame(bytes), frontier: readFrontierSymbols(save), owned: records.length, shinies: records.filter(p => p.shiny).length, warnings};
}
