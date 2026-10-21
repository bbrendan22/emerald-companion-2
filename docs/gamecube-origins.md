# GameCube origin identification

`src/pokemon/gameCubeOrigin.js` identifies native origin-ID-15 records without
changing their raw data. `src/ui/pokemonOrigin.js` uses the result for the existing
Origin fields. Everything is bundled locally; the matcher performs no requests
and uses no save-wide preference or trainer provenance assumption.

## Reference

PKHeX revision **0a7854f64e118ad228513f3cf4b84c308dac2fdc**:

- [Colosseum encounter definitions](https://github.com/kwsch/PKHeX/blob/0a7854f64e118ad228513f3cf4b84c308dac2fdc/PKHeX.Core/Legality/Encounters/Data/Gen3/Encounters3Colo.cs)
- [XD encounter definitions](https://github.com/kwsch/PKHeX/blob/0a7854f64e118ad228513f3cf4b84c308dac2fdc/PKHeX.Core/Legality/Encounters/Data/Gen3/Encounters3XD.cs)
- [Colosseum e-Reader locks](https://github.com/kwsch/PKHeX/blob/0a7854f64e118ad228513f3cf4b84c308dac2fdc/PKHeX.Core/Legality/Encounters/Data/Gen3/Encounters3ColoShadow.cs)
- [XD Shadow matcher and rematches](https://github.com/kwsch/PKHeX/blob/0a7854f64e118ad228513f3cf4b84c308dac2fdc/PKHeX.Core/Legality/Encounters/Templates/Gen3/XD/EncounterShadow3XD.cs)
- [Location names](https://github.com/kwsch/PKHeX/blob/0a7854f64e118ad228513f3cf4b84c308dac2fdc/PKHeX.Core/Resources/text/locations/gen3/text_cxd_00000_en.txt)

The complete source-path list is embedded in `gameCubeEncounters.json`.

The dataset merges 193 encounter/slot variants into 154 acquisition records:
54 Colosseum (48 regular Shadows, 3 e-Reader Shadows, 2 starters, Plusle) and
100 XD (83 Shadows, 4 starter/gifts, 4 trades, 9 wild slots). Alternate locations
are combined; XD's five shared Shadow rematch locations are stored once. Poké
Spot slots retain their inclusive minimum/maximum levels. Moves and Shadow
progress/history are not duplicated: the former are mutable and the latter
are not present in a PK3 record. The existing canonical Gen 3 evolution graph
is reused; no second species evolution database is maintained.

Each record stores encounter species, kind, saved level range and locations.
Optional fields encode fixed balls, gender/shiny restrictions, fixed OT rules,
and the Japanese e-Reader language/nature/gender/zero-IV constraints. Source
trainer-name arrays are indexed by saved language, with Gen 3 OT truncation.

When updating the reference, review the listed encounter **templates** as well
as the definition arrays. Merge only records whose non-location restrictions
agree. Keep gifts distributed with Ruby/Sapphire origin IDs (MATTLE Ho-Oh,
bonus Pikachu/Celebi and WISHMKR Jirachi) outside this native ID-15 dataset.

## Matching and uncertainty

Match the current species or a directed pre-evolution, saved met level, and a
valid initial/alternate/rematch location. Check the stored fateful bit (ribbon
word bit 31), National Ribbon for purified Shadows (bit 24), legal capture ball,
male native OT and supported language. Apply each encounter's fixed constraints.
Do not use current level as the encounter level or match sibling evolutions.
Do not require original moves or nicknames to remain unchanged.

Exactly one matching game returns `colosseum` or `xd`. No matches or multiple
matching games return `null`. Unknown geographic locations remain Distant Land;
the shared special marker 254 remains In-game trade even when the game is
unresolved. A named map entry alone is not sufficient evidence of an encounter.
XD starter location 0 is unnamed in the pinned location table, so its game can
be identified while the location still displays Distant Land.

This is an origin matcher, not a complete legality engine: it does not reconstruct
PID/IV RNG seeds/team locks or enforce every current-level evolution condition.
The verified metadata combinations distinguish the games without those features.
Fixed NPC OT text that the existing Western-subset text parser cannot decode
reliably is deliberately left unresolved; the parser is not extended here.

## Validation

`test/gameCubeOrigin.test.js` covers both games, all catalog acquisitions,
evolution, shared map IDs, XD rematches, wild level boundaries, fixed gifts,
e-Reader locks, and incomplete/contradictory inputs. Existing GBA-origin tests
remain separate. `test/collectionOrigin.browser.mjs` verifies displayed games,
locations, wrapping and the unchanged six-field layout at 375px and 430px;
run with `PROFILE_WEBKIT=1` for WebKit.

The private-save integration compares all 51 GameCube records against the reviewed
research expectations, bound to the save hash, and checks that classification
leaves records unchanged. These private expectations remain ignored by Git.
