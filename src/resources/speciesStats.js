import {baseStatPercent} from '../pokemon/statBars.js';
import {statFields, typeMatchups} from '../pokemon/profile.js';

export function baseStatRows(baseStats) {
  return statFields.map(([key, label]) => ({key, label: {spAttack: 'Sp. Attack', spDefense: 'Sp. Defense'}[key] ?? label,
    value: baseStats[key], percent: baseStatPercent(key, baseStats[key])}));
}
export function defensiveMatchupGroups(types) {
  const matchups = typeMatchups(types);
  return [[4, '4×'], [2, '2×'], [0.5, '½×'], [0.25, '¼×'], [0, '0×']].map(([multiplier, label]) => ({
    multiplier, label, types: matchups.filter(matchup => matchup.multiplier === multiplier).map(matchup => matchup.type),
  })).filter(group => group.types.length > 0);
}
