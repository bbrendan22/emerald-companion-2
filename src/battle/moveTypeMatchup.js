import {emeraldTypes, typeMultiplier} from './typeMatchups.js';
import {calculateHiddenPower} from './hiddenPower.js';

// The three damaging sound moves in Emerald (status moves stay a dash).
const damagingSoundMoves = new Set([173,253,304]);
const guaranteed = (abilities, predicate) => abilities.length > 0 && abilities.every(predicate);

// Matchup row indicator only. Actual damage continues to use its ability-aware
// helpers. Only guaranteed immunities from the supported abilities affect
// this display; damage reductions, items and weather never do.
export function moveTypeMatchup(move, defendingTypes, attackerIvs, defendingAbilities = [], attackingAbilities = []) {
  const type = move?.effect === 'HIDDEN_POWER'
    ? calculateHiddenPower(attackerIvs ?? {})?.type.toUpperCase() ?? null : move?.type;
  if (!move || move.power === 0 || !emeraldTypes.includes(type)
    || !defendingTypes?.length || defendingTypes.some(value => !emeraldTypes.includes(value))) return {type,label:'—'};
  const normal = typeMultiplier(type,defendingTypes);
  const immune = ability => ({Levitate:'GROUND','Water Absorb':'WATER',
    'Volt Absorb':'ELECTRIC','Flash Fire':'FIRE'}[ability] === type)
    || (ability === 'Wonder Guard' && normal <= 1)
    || (ability === 'Soundproof' && damagingSoundMoves.has(move.id))
    || (ability === 'Sturdy' && move.effect === 'OHKO')
    || (ability === 'Damp' && move.effect === 'EXPLOSION');
  // Only the two displayed active Pokémon are tracked, including in Doubles.
  const prevented = move.effect === 'EXPLOSION'
    && guaranteed(attackingAbilities, ability => ability === 'Damp');
  const multiplier = prevented || guaranteed(defendingAbilities, immune) ? 0 : normal;
  return {type,multiplier,label:`${multiplier}×`};
}
