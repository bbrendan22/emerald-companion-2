# Doubles field ability integration — Step 4D

## Emerald reference

Verified against pret/pokeemerald revision
`731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`:

- [battle_util.h](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/include/battle_util.h#L33-L43)
  maps WEATHER_HAS_EFFECT to CHECK_ON_FIELD and WEATHER_HAS_EFFECT2 /
  ABILITY_ON_FIELD2 to FIELD_SPORT.
- [battle_util.c](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/battle_util.c#L2985-L3023)
  checks nonzero HP for CHECK_ON_FIELD, but not FIELD_SPORT. Neither checks
  absent-battler flags.
- [pokemon.c](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/pokemon.c#L3100-L3116)
  finds opposite Plus/Minus anywhere through FIELD_SPORT, after held items and
  Thick Fat and before stages. Base-damage weather also uses FIELD_SPORT.
- [battle_script_commands.c](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/battle_script_commands.c#L6167-L6199)
  scans all battler ability records for Damp before Explosion/Selfdestruct,
  without checking HP or absence.

| Lookup | Assigned holder at 0 HP | Scope |
| --- | --- | --- |
| Weather Ball / Forecast / Speed weather effects | Does not suppress | All four records, nonzero HP |
| Base-damage weather suppression | Suppresses | All four records, no HP filter |
| Damp | Prevents execution | All four records, no HP filter |
| Opposite Plus/Minus | Boosts Special Attack | Either side, no HP filter |

The app's empty slot has no retained cartridge ability/HP history. Because
neither cartridge lookup checks absence flags, an empty slot cannot prove
absence of a retained suppressor, Damp, or opposite Plus/Minus ability. These
cases retain conservative safeguards. Known applicable holders still establish
the answer despite other missing slots. Assigned fainted slots retain their
known ability, with the distinct HP rules above; they remain excluded from
spread/screen living counts.

## Implementation

`fieldAbilities.js` reads the Step 4C context and separates living-only weather
queries from record-based queries. Current attacker/defender abilities come from
the pinned calculation branch, not the unpinned field models. Legal hidden
ability alternatives are enumerated only when their field roles differ. Unknown
records and unresolved copied Trace abilities are never replaced by a guess.

The existing scenario engine retains these branches, including conditional-case
caching, move metadata, aggregation and ability rows. Hidden Pokémon names and
abilities label materially different rows using the existing popup structure.
Equivalent outcomes still collapse. Known Damp produces a prevented outcome,
including against a chart-immune defender, rather than an ordinary zero hit.

The existing arithmetic is unchanged: Plus/Minus still modifies the operand in
its established location; weather still uses its separate script/base paths.
The selected weather and stored conditions are not modified. Effective stat and
Speed displays consume the same field possibilities. Uncertain field modifiers
produce ranges; unrelated stat modifiers retain the prior confirmed-only display
policy. Singles and callers without a battlefield retain their prior behavior.

## Validation and remaining boundaries

`doublesFieldAbilities.test.js` covers hidden holders on either side, nonzero/zero
HP, missing records, legitimate uncertainty, copied Trace, conditional/multi-hit
paths, reverse attacks, four view pairings, canonical Set refresh, display values,
and input immutability. `doublesFieldAbilities.browser.mjs` uses an imported
synthetic save and the actual application page/popup pipeline under mobile
WebKit, with test-only observation hooks and no production test controls.

No Lightning Rod, Intimidate entry tracking, Follow Me, Protect execution, field
sports, or retained-record history system was added. Viewed fainted Pokémon keep
existing per-hit eligibility. Step 4E targeting work must retain the same pinned
field identity and uncertainty semantics; it must not infer retained records or
entry events from the living count.
