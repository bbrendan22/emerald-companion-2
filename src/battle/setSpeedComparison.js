import {conditionedBattlePokemon} from './conditionState.js';
import {battleSpeed, battleWeather, possibleAbilities} from './battleConditions.js';

export function candidateIsFaster(candidate, player, state, singleSpecies) {
  if (!singleSpecies || !player || !Number.isFinite(player.stats?.speed) || !Number.isFinite(candidate?.stats?.speed)) return false;
  const apply = (mon, key) => {
    const conditions = state.conditionsByPokemon?.[key] ?? {};
    const result = conditionedBattlePokemon(mon, key.startsWith('my-') ? 'player' : 'enemy', state);
    if (possibleAbilities(mon).includes(conditions.abilitySelection)) result.ability = conditions.abilitySelection;
    return result;
  };
  const own = apply(player, `my-${player.identity}`), enemy = apply(candidate, `enemy-${candidate.setId}`);
  const ownAbilities = possibleAbilities(own), enemyAbilities = possibleAbilities(enemy);
  if ([...ownAbilities, ...enemyAbilities].some(ability => !ability || ability === 'Unknown')) return false;
  return enemyAbilities.every(enemyAbility => ownAbilities.every(ownAbility => {
    const weather = battleWeather(state.field?.weather ?? 'none', enemyAbility, ownAbility);
    return battleSpeed(enemy, enemyAbility, weather) > battleSpeed(own, ownAbility, weather);
  }));
}
