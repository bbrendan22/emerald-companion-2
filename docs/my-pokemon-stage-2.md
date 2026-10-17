# My Pokémon — initial profiles

Selecting an individual occurrence from either collection view opens an in-section
profile. The collection remains mounted but hidden, retaining its view, search,
filters and DOM. Back restores the saved document scroll position and focuses the
original card. Duplicate species and identity-collision suffixes remain unchanged.

The shared Header accepts optional `onBack` and `backLabel` props. Its subpage
variant centers the existing brand between equal side columns, with a blue back
button left of the working hamburger. The ordinary header is unchanged.

Summary includes the showcase, saved Pokémon information, held-item sprite, four
move slots, stats and persistent roles. Advanced includes IVs/EVs, base stats,
Hidden Power, friendship, Pokérus, ribbons, type matchups and origin metadata.
Both use ordinary document scrolling. No new dependencies or artwork downloads.

## Data and mechanics

- Parser, save bytes and storage format are unchanged. Profiles consume existing
  parsed records; role assignments still use the existing independent role store.
- Party stats and current HP come from the parsed party suffix. Box/Day Care stats
  use the parser's existing calculations, explicitly labeled. Neither invents
  current HP. Day Care uses deposit experience/level; eggs do not show current stats.
- All current-stat bars use 0–714 (maximum ordinary unboosted Gen 3 stat value).
  IV bars use 31; EV/base-stat bars use 255. IVs of 30–31 get subtle highlighting.
- `profileReference.json` contains only Gen 3 move types, item names and the type
  chart, extracted from the existing original Emerald Companion data. Existing
  reference species, abilities, move names, PP and calculations remain in use.
- Hidden Power uses HP/Attack/Defense/Speed/Sp. Atk/Sp. Def IV bit order, power
  30–70 and 16 types. The move's displayed type uses the Pokémon's actual IVs.
- Curse retains its Gen 3 Mystery (`???`) typing; no nonexistent icon is requested.
- Matchups apply Gen 3 types only, including Steel's Ghost/Dark resistances.
  The profile explicitly excludes abilities, held items and battle conditions.
- Contest ribbon ranks are cumulative; bits 15–26 are the 12 other ribbon flags.
  Invalid ranks are reported, and unused/fateful-encounter bits are not ribbons.
- Pokérus: zero = never infected; nonzero low nibble = active; nonzero strain with
  no days remaining = cured. Only existing status icons are used.
- Met locations display raw saved IDs with names marked unavailable: no validated
  location-name table is present. Unknown game/item/ability IDs remain identified
  numerically. No origin date or other absent metadata is invented.

Mechanics were checked against the Emerald decompilation:

- [Hidden Power](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c) (`Cmd_hiddenpowercalc`).
- [Type chart](https://github.com/pret/pokeemerald/blob/master/src/battle_main.c) (`gTypeEffectiveness`).
- [Moves](https://github.com/pret/pokeemerald/blob/master/src/data/battle_moves.h).
- [Record and ribbon fields](https://github.com/pret/pokeemerald/blob/master/include/pokemon.h).
- [Pokérus expiry](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c) (`UpdatePartyPokerusTime`).

## Validation

Focused tests cover Hidden Power (including all 4096 combinations of relevant IV
bits), Gen 3 dual typing, saved vs calculated stats, eggs, empty moves, PP, Curse,
held items, cumulative ribbons, invalid ribbon ranks, existing ribbon assets and
Pokérus states. Existing collection, persistence and private-save tests still pass.

Browser checks cover Gallery/Box entry, role persistence across views, retained
search/generation/game/view state, exact scroll restoration after a direct tap,
shiny artwork, an earned National Ribbon, hamburger navigation and responsive
Summary/Advanced at 320px, 390px and 1440px without horizontal overflow. Screenshots
remain in the ignored artifacts directory. No save files are modified.
