# Doubles unseen-field ability safeguards

Verified against pret/pokeemerald commit `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`.

## Cartridge lookups

- [include/battle_util.h](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/include/battle_util.h): `WEATHER_HAS_EFFECT` uses `ABILITYEFFECT_CHECK_ON_FIELD`; `WEATHER_HAS_EFFECT2` uses `ABILITYEFFECT_FIELD_SPORT`.
- [src/battle_util.c](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/battle_util.c): `CHECK_ON_FIELD` checks ability and nonzero HP. `FIELD_SPORT`'s ability branch checks only ability. Neither checks `absentBattlerFlags`. `CastformDataTypeChange` requires Castform, Forecast and nonzero HP and uses `WEATHER_HAS_EFFECT`. Trace copies a nonzero ability from an opposing battler with nonzero HP; the copied ability replaces Trace. It is not necessarily the currently represented opponent's ability.
- [src/pokemon.c](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/pokemon.c): `CalculateBaseDamage` uses `WEATHER_HAS_EFFECT2` for sun/rain and adverse-weather SolarBeam reduction. Plus/Minus uses `ABILITY_ON_FIELD2`, including either side without HP/absence filtering, after held items/Thick Fat and before stages.
- [src/battle_script_commands.c](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/battle_script_commands.c): `Cmd_setweatherballtype` uses `WEATHER_HAS_EFFECT`. `Cmd_tryexplosion` scans all `gBattlersCount` records for Damp without checking HP/absence; target absence is checked separately after the Damp scan.

## Calculator policy

No new field controls or partner inference. Each existing ability scenario resolves Trace first. Singles does not receive unseen-field guards. Represented living weather suppressors establish suppression. A represented zero-HP suppressor suppresses base-damage weather but does not suppress Forecast/Weather Ball scripts; zero-HP Forecast does not change the supplied types.

In Doubles, compare the existing full damage distribution against the relevant suppressed-weather calculations, including the distinct script/base-weather branches. Restrict checks to sun/rain Fire/Water damage, adverse-weather SolarBeam, Weather Ball, and weather-changing Forecast on a represented Castform. Compare conditional cases individually. Preserve numerical results when rounding, immunity or other prevention makes them identical. Retain pre-existing unavailable reasons.

Weather Ball's damage and type/power metadata become unavailable when unseen living suppression could change them, even if damage is zero in both branches. Do not display a selected-weather type/power as certain in that case. A represented known living suppressor still gives Normal/50 metadata.

Explosion/Selfdestruct become unavailable for unresolved unseen Damp when they would otherwise damage the represented defender. Preserve represented Damp prevention, known immunity/zero damage and existing unavailable results. Do not affect other moves.

Counts describe active Pokémon, not the HP and ability contents of the two unrepresented cartridge battler records. A 1/1 count is therefore not proof that a field lookup cannot find a suppressor, Damp or the opposite Plus/Minus ability. Existing Plus/Minus and unresolved Trace safeguards remain unchanged.

## Usability and limitations

For the neutral level-50 test fixture (no Forecast, Plus/Minus or unresolved Trace), a sweep of all 354 move IDs adds field guards to 2 IDs in clear weather (Explosion/Selfdestruct), 30 in sun, 31 in rain, and 4 in sand/hail. This measures new field guards, not overall availability: existing missing-data and specialized-move limitations still apply.

Weather-sensitive Doubles results cannot be made exact merely by selecting weather when other battler records are unknown. These results use the existing unavailable presentation. No full field/history model, absent-slot memory, partner abilities, activation simulation or probabilities are introduced. No assumptions about unseen species, Frontier sets or copied abilities are made. Prior safeguards for unsupported between-hit interactions remain.

Coverage: `test/unseenFieldAbilities.test.js`, `test/unseenFieldAbilitiesPopup.browser.mjs`; existing weather, Plus/Minus, spread, screen/count and Helping Hand regressions.
