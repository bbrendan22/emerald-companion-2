> Historical Step 4 record. [Step 5](BASIC_DAMAGE_STEP_5.md) now adds supported items and abilities; the exclusions below describe the earlier milestone.

# Damage calculator restart — Step 4

The new calculator now accepts the existing manual Battle Conditions explicitly: weather, Critical Hit, attacker status, relevant attacking/defending stages, and the defender's screens. The Conditions UI, persistence/reducers and all popup styling remain unchanged. Raw Pokémon stats remain separate from display stats. No retired engine or preview/KO module is connected.

## Files changed

- `src/battle/basicDamage.js`: stages applied once using the trusted `stageStat` utility; Singles burn/screen/weather arithmetic before +2; selected critical multiplier after +2; existing STAB, ordered type modifiers and rolls retained. Conditions are an optional explicit fourth argument, neutral by default.
- `src/ui/components/BattleMoveDetails.jsx`: extract only relevant condition fields from existing projections, separately from raw `basicAttacker`/`basicDefender`.
- `src/ui/components/BasicDamagePreview.jsx`: pass the explicit conditions to the calculator; presentation unchanged.
- New `test/basicDamageConditions.test.js`, `test/basicDamageConditions.browser.mjs`: independent numerical and open-popup regressions.
- `test/basicDamage.browser.mjs`, `test/basicDamageTypes.browser.mjs`: update earlier “conditions ignored” expectations for newly approved stages/weather while keeping prior scope, typing, selection/level and mobile coverage.
- `test/basicDamage.test.js`: clarify the raw-input/no-explicit-conditions test name; behavior and original numerical fixtures retained.
- This document and a historical-status pointer in the Step 3 record.

No changes to `BattleConditions.jsx`, `conditionState.js`, `battleState.js`, `BattleMatchupShell.jsx`, CSS, stat/card/row components, adapters, reference data, headers, tabs or other pages.

## Order and critical rules

1. Start with raw original stats. Physical reads Attack/Defense stages; special reads Sp. Atk/Sp. Def stages. The trusted stage utility floors the -6…+6 ratio; effective stats have a minimum of1. HP and Speed stages do not affect ordinary damage.
2. For selected critical hits, ignore negative attacker stages and positive defender stages independently. Keep positive attacker stages and negative defender stages.
3. Form the integer damage subtotal by the approved level/power/stat formula, dividing by Defense then50 with truncation.
4. Physical: halve the subtotal for burn, then halve for Reflect unless critical; floor each step and retain the physical minimum-one subtotal. Special: halve for Light Screen unless critical; then apply rain/sun Water/Fire boosts(3/2) or reductions(1/2), flooring at each step. Sand/hail do not boost ordinary attacks or add residual damage.
5. Add2. Multiply by2 for the manually selected critical scenario. Then apply STAB once, cartridge-ordered type entries, and85–100% rolls as already approved in Step 3. Chart immunity still yields sixteen zeros and `0.0% · 0 HP`.

Primary checks: [Emerald CalculateBaseDamage](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c) and [damagecalc/typecalc/random order](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c). Critical hits ignore screens but do not ignore burn or selected weather. The checkbox selects a scenario; it does not estimate critical probability.

## Independent numerical examples

Unless stated otherwise, fixtures are Lv50, neutral types/no STAB, physical power80/Attack101/Defense100, or special power95/SpA103/SpD100. Expected values are literal hand calculations, not calculator-generated test expectations.

- Physical subtotal35,+2=37 =>31–37. Attack stages+1,+2,-1,-2,+6,-6 give raw adjusted Attack151,202,67,50,404,25 and bases55,73,25,19,144,10. Special stages produce adjusted SpA154,206,68,51,412,25 and bases66,88,30,23,174,12. Independent defending-stage cases are also covered.
- Special subtotal43: rain Water/sun Fire floor43×1.5=64,+2=66 =>56–66. Rain Fire/sun Water floor43/2=21,+2=23 =>19–23. Sand/hail/none preserve38–45.
- Selected physical critical:37×2=74 =>62–74, unchanged by negative Attack or positive Defense stages. Favorable+1 Attack or -1 Defense still yields base55, critical110 =>93–110.
- Burn physical:35→17,+2=19 =>16–19; Reflect alone gives the same range. Both:35→17→8,+2=10 =>8–10. With critical, Reflect is bypassed but burn remains:17,+2=19,×2=38 =>32–38.
- Combined special: staged SpA154/SpD66 gives subtotal97; Light Screen48; rain72; +2=74; Water STAB111; Fire/Rock weaknesses444 =>377–444. Critical keeps favorable stages and bypasses screen:97→rain145→+2=147→critical294→STAB441→4x1764 =>1499–1764.
- Combined physical: staged Attack151/Defense150 gives subtotal35; burn17; Reflect8;+2=10; Normal STAB15; Rock resistance7 =>5–7. Critical ignores positive Defense and Reflect: subtotal53→burn26→+2=28→critical56→STAB84→Rock42 =>35–42.
- Actual imported fixture Swampert SpA95 vs Onix#1 SpD86: Surf ordinary244–288; rain360–424; sun125–148; Light Screen125–148; rain+Light Screen183–216; critical489–576. Reset restores244–288. Current HP changes do not alter the maximum-HP percentage denominator.
- Reverse Onix Rock Slide vs Swampert Defense110:12–15 normally,6–8 under player Reflect or opponent burn,26–31 under selected critical (with opposing positive Defense and own negative Attack ignored).

Step 3's56–67 Ice Beam/Charizard result and both defender type orders, Surf/Onix4x+STAB, all immunity cases and unsupported move omissions remain regression-tested.

## Remaining limitations — intentional until later steps

Items and abilities are not modeled. In particular, Guts does not exempt a burned physical attacker or grant its boost yet; burn is always applied to supported physical attacks. Battle Armor/Shell Armor do not block the manually selected critical scenario. Cloud Nine/Air Lock do not suppress selected weather. Forecast does not alter the damage calculator's original typing. These results are not yet verified complete matchups involving such abilities or items. No new popup disclaimers or labels were added.

Weather Ball, Hidden Power, Brick Break and other special/variable/fixed damage moves remain outside the unchanged eligibility allowlist. There are no ability result branches, KO odds, current-HP-dependent damage, recovery, residual damage or simulated turns.

Implementation stops after Step 4 for review.

## Verification results

All 231 automated tests and all 18 browser scripts passed. Production build passed with the existing large-chunk warning. The open-popup regression checks weather, stages, critical interactions, burn, both screens, current/max HP and Reset using literal independent ranges in both directions. It verifies the same dialog instance, 22 unchanged controls and panel geometry, unchanged raw stat bars/save data, and conditions persisting through tab navigation. Existing browser suites continue to cover team/trainer/rules/selection persistence and unaffected pages. Mobile popups passed at 320/375/430px; the 320px screenshot was visually reviewed. No commits or pushes were made.
