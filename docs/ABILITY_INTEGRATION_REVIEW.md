# Ability fixes — Step 5 integration review

Scope: the five recently corrected ability mechanics and their existing state/scenario integration. This is not the separate comprehensive calculator Step 6 audit. No new controls, battle simulator, berry activation, Enigma changes or Shell Bell changes were introduced.

## Findings

- Battle Armor / Shell Armor, including copied abilities, normalize the critical flag before stages, screens, conventional damage and selected multi-hit aggregation.
- Forecast uses the existing type projection with the effective weather for both sides. Copied Forecast retains Emerald's Castform-only restriction. Copied Cloud Nine / Air Lock suppress both weather damage and Forecast typing.
- Copied abilities replace Trace; they do not stack. Selecting another copy clears activation. A stale activation cannot give copied Plus/Minus the Flash Fire modifier.
- Activated Flash Fire truncates the Fire subtotal after weather and before +2. Items, screens, criticals and copied armor preserve their separate integer operations. Frozen defenders retain the Gen III Flash Fire immunity exception.
- Plus/Minus boosts the Special Attack operand once, after items/Thick Fat and before stages. Either side can supply the opposite ability. Missing Doubles partners remain unknown; fixed, OHKO and physical calculations do not acquire this Special Attack dependency.
- Ability scenarios pin both sides independently. Four legitimate pairings remain accounted for, equal complete outcomes merge, and available/unavailable alternatives remain separate. Missing opponent stats/IVs are not replaced with guesses.
- Battle Conditions maintains independent player/opponent slots. Collapsing preserves valid selections; copy changes clear activation; observed ability changes invalidate state even while collapsed; Reset and replacement clear affected state. Existing HP/status/stage/screen conditions remain separate.

## Targeted defect corrected

The unconditional unresolved-Trace gate unnecessarily blocked fixed-damage attacks and OHKO outcomes that could not depend on the attacker's ability. The active core now permits those exact results without guessing a copied ability. OHKO attacker abilities likewise do not alter the supported level/type/Sturdy outcome checks. It also permits guaranteed fixed/OHKO chart immunities for unresolved Trace on non-Castform defenders.

Night Shade against Forecast Castform in sun/rain/hail remains unresolved when an attacker might have copied weather suppression: suppressing weather restores Normal typing and Ghost immunity. Unknown defender abilities that can change an outcome, including copied Wonder Guard, remain unavailable. Conventional unresolved Trace retains its existing conservative safeguard.

Only `src/battle/coreDamage.js` required a production change. Correct formulas and the UI were left intact.

## Emerald source checks

- [Critical suppression before damage](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c#L1200-L1239).
- [Castform species/ability/weather projection](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c#L2284-L2316).
- [Trace copies nonzero abilities from living targets, without modern exclusions](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c#L2892-L2947). None is excluded; unused Cacophony has no legitimate holder. Forecast, Wonder Guard and Trace are legal selectable copies.
- [Flash Fire activation and frozen exception](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c#L2584-L2607).
- [Flash Fire after weather, before +2](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c#L3216-L3254).
- [Item/ability operand order and Plus/Minus](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c#L3070-L3108).
- [Field lookup macros](https://github.com/pret/pokeemerald/blob/master/include/battle_util.h#L33-L43) and [field-wide FIELD_SPORT implementation](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c#L3002-L3011).
- [OHKO Sturdy and level checks](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c#L7082-L7112) do not use the attacker's ability.
- Fixed-damage scripts run type checks and then set damage directly: `Cmd_dmgtolevel`, `Cmd_psywavedamageeffect`, `Cmd_damagetohalftargethp`, `Cmd_setdamagetohealthdifference`/Endeavor's script, and fixed-damage move scripts in the same Emerald source tree. No offensive stat/item/critical multiplier is retained by these supported paths.

## Validation

- 869 unit tests pass, including eleven new cross-ability integration tests and revised unresolved-Trace regression expectations.
- Production build passes.
- Phone WebKit coverage: existing core damage, expanded conditional abilities, Forecast, and Plus/Minus at 320, 375 and 430px. Expanded checks include exact fixed damage and OHKO outcomes with unresolved attacker Trace, copied armor critical alternatives, collapse/reopen, both opponent slots, replacement/reset, percentage-first presentation, dismissal and horizontal overflow.

## Remaining limits and next gate

- The app tracks two represented battlers, not the complete Doubles field. Unrepresented field abilities and unknown screen side counts retain existing limitations/safeguards.
- Conventional unresolved Trace and unsupported between-hit ability interactions remain explicitly unavailable; no neutral copy or exact-looking approximation is substituted.
- Past ability events are not simulated. Use existing weather, HP, status and stage conditions for their observed effects. Flash Fire activation and copied abilities require explicit input.
- Unknown opponent stats/IVs, the seven unsupported specialized moves, and existing move eligibility boundaries remain unchanged.
- Enigma Berry custom effects, Shell Bell between-hit behavior and automatic berries remain excluded and were not implemented or audited here.

The five ability fixes are ready for the separately approved comprehensive Step 6 audit after the recorded validation. This review does not start that audit or certify the entire calculator.
