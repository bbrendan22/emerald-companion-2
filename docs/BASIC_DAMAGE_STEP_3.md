> Historical Step 3 record. [Step 4](BASIC_DAMAGE_STEP_4.md) now connects manual Battle Conditions to the new calculator.

# Damage calculator restart — Step 3

The new calculator now applies STAB and Generation 3 type-chart effects. No retired damage engine, preview or KO module is connected. The approved move eligibility and raw stats/level/reference-type inputs are unchanged. Battle Conditions, abilities and items remain excluded. The popup heading is now simply “Damage Calculation”; percentages remain first and both ranges stay white. A chart immunity renders exactly `0.0% · 0 HP`. Unsupported moves still omit the section.

## Changed files

- `src/battle/basicDamage.js`: validate existing raw attacker/defender type arrays; apply STAB once with `floor(base × 3 / 2)`; call the existing shared `orderedTypeDamage`; preserve zero through all 16 random rolls; format immunity. Base arithmetic and move eligibility remain unchanged.
- `src/ui/components/BasicDamagePreview.jsx`: neutral heading only. No CSS, popup dimensions, metadata, rows, conditions, cards, stats or other tabs changed.
- `test/basicDamageTypes.test.js` and `test/basicDamageTypes.browser.mjs`: new independent type and integration regressions.
- `test/basicDamage.test.js` and `test/basicDamage.browser.mjs`: retain Step 2 arithmetic/live-change coverage, adding explicit neutral reference types where appropriate and updating reverse Bubble Beam results for approved STAB/resistance.
- This document and the Step 2 historical status pointer.

`typeMatchups.js` and its existing Gen 3 chart/order data are reused unchanged as shared utilities. Their simple ordered modifier helper has no battle-state, ability or item behavior. No chart or order was duplicated. Missing/invalid types yield no preview rather than guessed neutral damage.

## Order and rounding

The sequence is raw integer base damage → STAB → each applicable chart entry in cartridge order → random percentage85–100. STAB checks whether either original attacker type matches the reference move type and applies once, including duplicate monotype slots. Each applicable type entry floors separately, retaining a minimum of1 for a nonzero modifier. Immunity returns0; the random step preserves it. Defender types are treated as membership, not iteration order, so reversing their displayed order cannot alter damage. No combined floating-point effectiveness product determines damage.

The original chart includes Gen 3 Steel resistance to Ghost/Dark. Weather-dependent Forecast typing, ability/item immunity and temporary type changes are outside Step 3. Existing cards and move metadata retain their existing behavior, while the damage input remains the raw Pokémon types.

Primary checks: [`Cmd_typecalc`, `ModulateDmgByType`, and random damage in Emerald](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c), and [`gTypeEffectiveness` in cartridge table order](https://github.com/pret/pokeemerald/blob/master/src/battle_main.c). Existing audit finding H05 supplied the independent Ice Beam fixture.

## Independently worked fixtures

- Strength, Lv50/power80/Atk100/Def100: base37. No STAB31–37; matching single type, either dual-type slot or duplicated same type: floor37×1.5=55 →46–55. STAB is never doubled.
- Ice Beam, Lv50/SpA100/SpD100, no STAB: base43. Neutral36–43; Water resistance floor43/2=21 →17–21; Water/Ice double resistance floor21/2=10 →8–10; Grass weakness86 →73–86; Grass/Flying double weakness172 →146–172.
- Mixed Water/Grass:43 →Water21 →Grass42 →35–42. Multiplying both type values together would incorrectly preserve43. Both displayed type orders give35–42.
- STAB before type rounding: Ice Beam base43 →Ice STAB64 →Water32 →27–32. Applying resistance before STAB would incorrectly yield31 before randomness.
- H05 Charizard: Lv50 Ice attacker SpA103, power95 vs SpD100: base45 →STAB67 →Flying134 →Fire67 →56–67. Both Fire/Flying and Flying/Fire produce literal rolls `56,57,58,58,59,60,60,61,62,62,63,64,64,65,66,67`.
- Swampert Surf versus Onix#1: Lv50 SpA95; Onix#1 default IV31, SpD86/max HP131. Base48 formerly gave40–48. Water STAB72 →Ground144 →Rock288 →244–288, displayed `186.3–219.8% · 244–288 HP`. Onix's Sitrus Berry/Rock Head/Sturdy do not enter this step. Different actual save stats/trainer IVs continue to change results normally.
- Reverse fixture: Onix Rock Slide versus the imported Swampert's Defense110/max HP175: base21 →STAB31 →Ground resistance15 →12–15, or `6.9–8.6% · 12–15 HP`.
- Chart immunities (Normal→Ghost, Electric→Ground, Psychic→Dark, Ghost→Normal) retain16 zeros. Ability-only Water Absorb does not block Surf at this stage.

Stop after Step 3; no Step 4 or later mechanics are implemented.

## Verification results

All 223 automated tests and all 17 browser scripts passed. Production build passed with the existing large-chunk warning. Mobile layouts were checked at 320/375/430px and Surf/Onix and type-immunity screenshots were visually reviewed. Tests retain live selection/move/level updates, excluded/persistent Conditions, unchanged move eligibility, both directions, and the guard preventing retired calculator imports. No commits or pushes were made.
