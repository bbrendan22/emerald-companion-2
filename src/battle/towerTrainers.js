import {frontierTrainers} from './data/frontierTrainers.js';
import {trainerKey, towerTrainerSets} from './towerRules.js';
import {matchesBattleWords} from './searchWords.js';

// Sprite naming retained from 1.0 frontierSets.js.
export function frontierTrainerSprite(trainerClass) {
  const triathlete = trainerClass.match(/^Triathlete \(([MF]) (runner|swimmer|biker)\)$/);
  if (triathlete) return `${{runner:'running',swimmer:'swimming',biker:'cycling'}[triathlete[2]]}_triathlete_${triathlete[1].toLowerCase()}`;
  return trainerClass.replace('Swimmer♂','Swimmer M').replace('Swimmer♀','Swimmer F').replace('PKMN','Pokemon').replace('Poké','Poke').replace(/[()]/g,'').toLowerCase().replace(/\s+/g,'_');
}
export const towerTrainerEntries = [
  ...['Silver','Gold'].map(symbol => ({key:`Anabel ${symbol}`, trainer:'Anabel', symbol, name:'Anabel', trainerClass:'Salon Maiden', sprite:'salon_maiden_anabel',
    setIds:towerTrainerSets('Anabel').filter(set => set.brainSet === `Anabel ${symbol}`).map(set => `${set.brainSet}:${set.species}`)})),
  ...frontierTrainers.map(trainer => ({key:trainerKey(trainer), trainer:trainerKey(trainer), symbol:null,
    name:trainer.name, trainerClass:trainer.trainerClass, sprite:frontierTrainerSprite(trainer.trainerClass), setIds:trainer.pokemonSetIds})),
];
const anabelEntryKeys = new Set(['Anabel Silver','Anabel Gold']);
export function towerTrainerSupportsFormat(entry, format) {
  return format !== 'Doubles' || !anabelEntryKeys.has(entry?.key);
}
export function searchTowerTrainers(query = '', {entries = towerTrainerEntries, nameOnly = false, format = 'Singles'} = {}) {
  return entries.filter(entry => {
    if (!towerTrainerSupportsFormat(entry,format)) return false;
    const text = (nameOnly ? entry.name : `${entry.name} ${entry.trainerClass} ${entry.symbol ?? ''}`).toLowerCase();
    return matchesBattleWords(text,query);
  });
}
export function selectedTowerTrainer(state) {
  return towerTrainerEntries.find(entry => entry.trainer === state.selectedTrainer && entry.symbol === (state.selectedBrainSymbol ?? null)) ?? null;
}
export function selectedTowerSetIds(state) {
  return selectedTowerTrainer(state)?.setIds ?? [];
}
