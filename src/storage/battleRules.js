import {createTowerRules} from '../battle/towerRules.js';

const key = 'emerald-companion-2.battle-rules.v1';
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
