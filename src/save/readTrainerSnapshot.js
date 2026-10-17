import {readSave} from './readSave.js';
import {readTrainer} from './readTrainer.js';
import {readCollection} from './readCollection.js';
import {readHallOfFame} from './readHallOfFame.js';
import {readFrontierSymbols} from './readFrontierSymbols.js';
import {view} from './binary.js';

// Decode once per import. No browser or storage dependencies.
export function readTrainerSnapshot(bytes) {
  const save = readSave(bytes);
  const trainer = readTrainer(save);
  const {records, issues} = readCollection(save);
  if (issues.length) throw new Error(`A Pokémon record could not be decoded (${issues[0].message}). The save was not imported.`);
  const block = save.blocks.saveBlock1;
  if (records.filter(p => p.source.kind === 'party').length !== view(block).getUint32(0x234, true)) {
    throw new Error('The party contains an empty occupied slot. The save was not imported.');
  }
  const warnings = [...trainer.warnings];
  if (save.slots.some(slot => !slot.valid)) warnings.push('One save slot was invalid; a complete valid slot was used.');
  if (records.some(p => p.warnings.length)) warnings.push('Some Pokémon fields have parser warnings.');
  if (!trainer.gender) warnings.push('Trainer gender is unavailable.');
  return {collection: {records, issues}, trainer, hallOfFame: readHallOfFame(bytes), frontier: readFrontierSymbols(save), owned: records.length, shinies: records.filter(p => p.shiny).length, warnings};
}
