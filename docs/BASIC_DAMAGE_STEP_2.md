> Historical Step 2 record. [Step 3](BASIC_DAMAGE_STEP_3.md) now adds STAB and ordered type-chart modifiers to this new calculator.

# Damage calculator restart — Step 2

A new isolated basic formula preview is active. No retired engine, preview, retaliation or KO module is imported. Step 2 is deliberately incomplete: displayed numbers are neutral basic-formula values, not complete matchup predictions. The popup heading says “Damage Calculation · Basic preview”. The line is white, percentage first, e.g. `48.6–57.7% · 85–101 HP`, using defender maximum HP and one decimal place. Unsupported moves or missing/invalid data omit the entire section.

## Files

- New `src/battle/basicDamage.js`: input validation/preparation, integer base arithmetic, 16 rolls, result calculation and separate formatter. No dependencies, battle state, modifiers or probabilities.
- New `src/ui/components/BasicDamagePreview.jsx`: minimal presentation.
- Updated `BattleMoveDetails.jsx`, `BattleMatchupShell.jsx`, `battle.css`: raw selected battlers passed separately from the existing conditioned metadata, one compact section appended. Existing metadata/type icons still follow their existing presentation behavior. The calculation reads reference move type/power and raw stats only.
- New `test/basicDamage.test.js`, `test/basicDamage.browser.mjs`: independent numeric fixtures, omissions, excluded modifiers, live changes and narrow layouts.
- Updated `test/battleInformationalPopup.browser.mjs` and `test/battleAccuracyCorrections.browser.mjs`: accommodate the approved basic section while retaining metadata, Conditions, type icons, Speed, bars, dismissal and retired-module exclusion checks.
- Updated restart/status documents; archived source remains untouched.

## Arithmetic and inputs

`factor = floor(2 × level / 5) + 2`

`subtotal = floor(floor(factor × power × attack / defense) / 50)`

Emerald clamps physical subtotal to at least 1 before adding 2. Special subtotal has no such clamp. `base = subtotal + 2` after that category-specific rule. For each integer percentage 85 through 100, `damage = max(1, floor(base × percentage / 100))`.

Primary references: Emerald decompilation [CalculateBaseDamage in pokemon.c](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c) and [ApplyRandomDmgMultiplier in battle_script_commands.c](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c). This is a fresh implementation of just those arithmetic steps, not a copy or wrapper of the retired calculator.

Physical reference types: Normal, Fighting, Flying, Poison, Ground, Rock, Bug, Ghost, Steel. Special reference types: Fire, Water, Grass, Electric, Psychic, Ice, Dragon, Dark. Physical uses raw Attack/Defense, special uses raw Special Attack/Special Defense. Player adapters retain recorded level/stats where available. Frontier adapters continue supplying nature/EV/IV/Rules-derived opponent level/stats. No alternate stat calculation or database was introduced.

## Supported moves and exclusions

The small effect allowlist supports fixed-power, single-strike ordinary attacks, high-critical attacks at normal damage, priority/always-hit attacks and formula-neutral secondary effects. Examples: Tackle, Strength, Surf, Ice Beam, Thunderbolt, Shadow Ball, Crunch and Bubble Beam. Accuracy and secondary-effect chances remain informational; they do not modify the range.

Everything outside the allowlist is omitted for now. This includes status, variable-power, fixed-damage, OHKO, multistrike, retaliation, delayed/history-dependent, charge, drain/recoil, self-sacrifice and conditional damage effects. Examples: Hidden Power, Weather Ball, Return, Low Kick, Dragon Rage, Counter, Explosion, Double Kick, False Swipe, Facade, Pursuit and Earthquake (context-dependent effect; intentionally deferred under this conservative Step 2 scope). The allowlist is explicit and independently tested, not inferred from a plausible-looking power field.

No STAB, effectiveness/immunity, weather, crit, stages, burn, screens, items, abilities, current HP, survival, recovery or KO logic applies. A typed immunity can therefore still have a positive *basic* preview. Conditions values remain available to the existing UI but are not supplied to this calculation.

## Independent examples

- Lv50, power80, Attack100, Defense100: factor22; 1760 /50 =>35; +2 =>37. Rolls: `31,31,32,32,32,33,33,34,34,34,35,35,35,36,36,37`; against max HP200 => `15.5–18.5% · 31–37 HP`.
- Lv47, power100, Attack140, Defense82: factor20; 280000 /82 =>3414; /50 =>68; +2 =>70; range59–70. Lv48 crosses factor21 and yields62–73.
- Lv73 Ice Beam95, Special Attack137, Special Defense113: factor31; 403465 /113 =>3570; /50 =>71; +2 =>73; range62–73.
- Actual synthetic Lv50 Bulbasaur Atk69 Tackle35 vs Frontier Azumarill1 Def132/HP175: base10 => `4.6–5.7% · 8–10 HP`.
- Reverse Bubble Beam65, Lv50 Azumarill Special Attack70 vs Bulbasaur Special Defense85/max HP120: base25 => `17.5–20.8% · 21–25 HP`. Open73 changes attacker factor/stats to31/100: base49 => `34.2–40.8% · 41–49 HP`.

No Step 3 or later mechanics have been implemented.

## Verification results

All 215 automated tests and all 16 browser scripts passed. The production build passed with the existing large-bundle warning. Browser checks covered both directions, live selected move/player/opponent and Open Level changes, unchanged basic ranges under all tested Conditions changes, retained Conditions state, omission of unsupported moves, unchanged save/bars, no retired modules loaded, and 320/375/430px layouts. The 320px popup screenshot was visually reviewed. No commits or pushes were made. Implementation stops at Step 2 for review.
