# Damage Calculator — Step 6C

Adds only Weather Ball, Eruption, Water Spout, Facade and Brick Break to the new single-use damage calculator. No retired preview engine, KO estimates or simulated turns.

## Cartridge mechanics verified before implementation

Sources: Emerald's [battle script commands](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c), [move battle scripts](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s), and [base damage calculation](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c). The historical H04 fixture is in [BATTLE_CALCULATOR_AUDIT.md](BATTLE_CALCULATOR_AUDIT.md).

- **Weather Ball:** `Cmd_setweatherballtype` sets the type from effective weather and sets the script damage multiplier to2. Base power remains50. `Cmd_damagecalc` multiplies the completed base damage by critical and script multipliers, before STAB and the type table. Rain/sun's ordinary special-weather modifier remains inside the base calculation before +2. Types: clear Normal, sun Fire, rain Water, hail Ice, sand Rock. Normal and Rock use physical stats. Cloud Nine/Air Lock suppress the type change, weather damage multiplier and Forecast. Forecast uses the same existing effective-weather projection for STAB and defender types.
- **Eruption / Water Spout:** `Cmd_scaledamagebyhealthratio` gives `max(1,floor(150*currentHP/maxHP))`. Explicit Conditions HP takes precedence, then imported initial/current/max HP. Invalid/fainted attacker HP omits damage. Type and normal modifiers remain Fire/Water respectively. No HP changes occur.
- **Facade:** `BattleScript_EffectFacade` sets the post-base script multiplier to2 for burn, poison, bad poison and paralysis. Listed power remains70. Sleep/freeze do not trigger this boost. Gen3 burn still halves the physical subtotal before +2; Guts raises Attack and bypasses that burn penalty. Stages and screens continue using existing integer order; critical hits bypass screens but not burn.
- **Brick Break:** Emerald removes Reflect/Light Screen before `damagecalc`. This read-only preview bypasses screens for Brick Break's own calculation, without changing the manually selected Conditions. All other moves still respect the selected screens.

## Architecture and popup

`specialDamage.js` resolves only these five canonical move IDs and their type/power/script multiplier/screen behavior. `basicDamage.js` continues to own ordinary stat preparation, stages, items, abilities, weather, critical, STAB, cartridge-ordered effectiveness and random rolls. A single script multiplier is applied after base damage and before STAB; no duplicate damage engine.

The popup shares the resolver for existing type/Power fields. Weather Ball shows50; HP moves show current power. Existing dynamic move-row Weather Ball typing already agrees, so rows needed no change. When uncertain suppression abilities yield different weather types, the existing single-icon Normal fallback remains; independently calculated ability-specific damage results are preserved. Identical results still combine.

No CSS, popup dimensions, Conditions controls/persistence, cards, stat bars, team headers, other tabs or save parser changes. Percentage-first white ranges, descriptions, type icons, outside dismissal and no close X remain intact.

## Independently derived examples

Unless otherwise stated: level50, relevant Attack/Defense100, no STAB, neutral defender.

| Fixture | Cartridge arithmetic | HP range |
| --- | --- | --- |
| Weather Ball, rain | quotient22; rain33; +2=35; script x2=70 |59–70|
| Weather Ball, hail/sand | quotient22; +2=24; script x2=48 |40–48|
| Weather Ball, rain + Light Screen | quotient22; screen11; rain16; +2=18; script x2=36 |30–36|
| Weather Ball, rain + crit + Light Screen | screen bypassed; base35; crit2; script2 |119–140|
| Weather Ball, rain + Forecast | post-script70; Water STAB105 |89–105|
| Eruption/Water Spout, fullHP | power150; quotient66; +2=68 |57–68|
| Eruption/Water Spout, halfHP | power75; quotient33; +2=35 |29–35|
| Eruption/Water Spout, HP1/300 | effective power1; quotient0; +2=2 |1–2|
| Facade, no status | quotient30; +2=32 |27–32|
| Facade, poison | base32; script2=64 |54–64|
| Facade, burn | quotient30; burn15; +2=17; script2=34 |28–34|
| Facade, burn + Guts | Attack150; quotient46; +2=48; script2=96 |81–96|
| Brick Break vs Normal, selected Reflect | quotient33; no screen reduction; +2=35; weakness2=70 |59–70|

Additional literal regressions cover HP rounding boundaries, both attacking directions, type-based category, status/Guts/stage/screen/crit combinations, type items, absorption, Thick Fat, ability-dependent suppression and immutable Conditions/reference data. Browser fixtures independently exercise imported Castform versus Onix, including rain367–432 HP, screen183–216 HP, critical734–864 HP, and Machamp Brick Break66–78 HP.

## Files changed

- Added `src/battle/specialDamage.js`.
- Updated `src/battle/basicDamage.js` and `src/ui/components/BattleMoveDetails.jsx`.
- Added `test/specialDamage.test.js` and `test/specialDamage.browser.mjs`.
- Updated intentionally obsolete exclusions in `test/basicDamage.test.js`, `test/basicDamageConditions.test.js`, `test/fixedDamage.test.js`, and `test/variableDamage.test.js`.
- Updated `test/basicDamage.browser.mjs` to expect the newly supported Facade preview while retaining Dig/Protect omissions.
- Updated `test/battleAccuracyCorrections.browser.mjs` to expect the now-supported Weather Ball damage section; preserved its dynamic type/effectiveness/Forecast checks.
- Added this document and a historical follow-up link in `docs/BASIC_DAMAGE_STEP_6B.md`.

## Remaining unsupported cases

Counter/Mirror Coat, Present, Magnitude, Psywave, Endeavor, multi-strike special mechanics, OHKO-class moves, KO probabilities, recovery, residual damage and turn simulation remain excluded. Existing unsupported ability/item contexts still omit results rather than guessing activation or copied ability state. Only currently exposed manual weather/status/stages/screens are modeled.

Stop after Step6C for review before Step7. Legacy1.0 remains read-only; no commits or pushes.

## Verification results

All **274 automated tests** passed. All **22 browser scripts** passed: the full run passed21 and exposed one obsolete Facade exclusion in the original basic-damage script; that assertion was updated and the affected script passed on rerun. No implementation changes were needed after that full run. Production build passed with the existing large-bundle warning. The CSS output hash remains unchanged.

New live checks cover all weather types, Forecast, Cloud Nine suppression, exact weather/screen/critical damage ranges, HP-derived power, status/stage changes, Brick Break without screen mutation, other moves retaining screen reduction, opponent set changes, Open Level100, player/opponent attacks and persistent imported save bytes. No retired engine/preview modules were requested. Conditions control geometry and raw stat bars remained unchanged. Popups fit at320/375/430px, both ranges stay white, outside dismissal works, and the320px screenshot was visually reviewed.
