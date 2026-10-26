import {createTowerRules} from '../battle/towerRules.js';

const key = 'emerald-companion-2.battle-rules.v1';
const roundKey = 'emerald-companion-2.battle-round.v1';
export const battleRounds = ['', '1', '2', '3', '4', '5', '6', '7', '8+'];

// UI preference only: keep this outside the calculation rules and reducer.
export function loadBattleRound(storage) {
  try {
    const round = JSON.parse(storage.getItem(roundKey) ?? '""');
    return battleRounds.includes(round) ? round : '';
  } catch {
    return '';
  }
}
export function storeBattleRound(storage, round) {
  try {
    storage.setItem(roundKey, JSON.stringify(battleRounds.includes(round) ? round : ''));
    return true;
  } catch {
    return false;
  }
}
export function loadBattleRules(storage) {
  try {
    const saved = JSON.parse(storage.getItem(key) ?? '{}');
    // Migrate earlier facility choices while retaining format and level settings.
    return createTowerRules({...saved, facility:'Tower'});
  } catch {
    return createTowerRules();
  }
}
export function storeBattleRules(storage, rules) {
  const {facility, format, levelMode, openLevel} = createTowerRules(rules);
  try {
    storage.setItem(key, JSON.stringify({facility, format, levelMode, openLevel}));
    return true;
  } catch {
    // Preferences remain usable in memory if storage is full or unavailable.
    return false;
  }
}
