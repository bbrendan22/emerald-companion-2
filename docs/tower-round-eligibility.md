# Battle Tower Singles and Doubles round eligibility

Verified against pret/pokeemerald master commit `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881` on 2026-10-25.

## Authoritative rules

- [battle_tower.c](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/battle_tower.c): `sFrontierTrainerIdRanges`, `sFrontierTrainerIdRangesHard`, `SetNextFacilityOpponent`, `GetRandomScaledFrontierTrainerId`, `FillTrainerParty`, `ChooseSpecialBattleTowerTrainer`.
- [Trainer ID constants](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/include/constants/battle_frontier_trainers.h), [trainer definitions](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/data/battle_frontier/battle_frontier_trainers.h), [rosters](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/data/battle_frontier/battle_frontier_trainer_mons.h), [set ID constants](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/include/constants/battle_frontier_mons.h).
- [frontier_util.c](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/frontier_util.c): `sFrontierBrainStreakAppearances`, `GetFrontierBrainStatus`, `GetFronterBrainSymbol`.

All ranges below are inclusive canonical trainer IDs, not display-list positions. The game uses zero-based challenge numbers. UI rounds are one-based.

| UI round | Battles 1–6 | Battle 7 | Round-wide standard union |
| --- | --- | --- | --- |
| 1 | 0–99 | 100–119 | 0–119 |
| 2 | 80–119 | 120–139 | 80–139 |
| 3 | 100–139 | 140–159 | 100–159 |
| 4 | 120–159 | 160–179 | 120–179 |
| 5 | 140–179 | 180–199 | 140–199 |
| 6 | 160–199 | 200–219 | 160–219 |
| 7 | 180–219 | 220–239 | 180–239 |
| 8+ | 200–299 | 200–299 | 200–299 |

Level mode does not change these trainer ranges. `FillTrainerParty` excludes canonical Pokémon set IDs greater than 849 at Level 50. Open Level permits them. Project set `entry` is the verified canonical ID plus one, so the Level 50 cutoff is `entry <= 850`. This restriction is applied only with a selected Tower Singles or Doubles round; All Rounds preserves the existing unrestricted behavior.

The Brain schedule is 35/70/35: Silver at battle 35 (Round 5), Gold at 70 (Round 10), then Gold every 35 battles. The 8+ bucket therefore permits Gold, but not Silver. Actual appearances also depend on symbol progress, which is not tracked by this selector. This feature presents a union of possible opponents, not a next-battle prediction. Standard seventh-battle trainers remain in that union where a Brain encounter is not triggered.

Save-dependent record-mixed trainers, apprentices, and e-Reader opponents have no canonical roster in this project's dataset and are not introduced here. Their existing absence remains unchanged.

## Dataset verification

Canonical data files are unchanged. `towerTrainerIds.js` is an explicit identity mapping. The read-only audit matched all 300 project trainers by name plus complete canonical roster, yielding 300 unique canonical IDs. It verified all 882 project set entries against canonical species/variant constants. No display index is used. The same-name GILLIAN records resolve separately to Lady ID 16 and Cooltrainer F ID 227.

Reproduce against a local checkout of the pinned source (requires the system C preprocessor, not an app dependency):

```sh
node tools/verifyTowerRoundData.mjs /path/to/pret/pokeemerald
```

## Scope and state

`towerRoundEligibility.js` supplies the shared round trainer predicate and eligible set IDs. Searches, roster selection guards, independent Pokémon search and Possible Sets use this pool; damage aggregation and identification algorithms remain unchanged.

Round preference now belongs to the existing app-owned battle state and retains its existing storage key. A changed Round or valid rules action clears trainer, medal, opponent species/sets, observations, matchup and set search; an opponent reset counter remounts search popups to discard their local query text. Re-selecting the active value is a no-op. Player slots (including hidden fourth slots), imported data and Battle Conditions are retained. Conditions continue their existing slot reconciliation on subsequent occupant changes.

Tower is currently the only supported facility in `createTowerRules`; unsupported facility mutations remain rejected. Eligibility explicitly requires Tower Singles or Doubles, and fallback behavior for other facilities is unit-tested without adding new facility support. Doubles shares the standard round filtering and retains its exclusion of Anabel. The approved header styling is unchanged.

## Changed files and validation

Implementation:

- `src/battle/towerRoundEligibility.js`
- `src/battle/towerTrainerIds.js`
- `src/battle/towerTrainers.js`
- `src/battle/towerSets.js`
- `src/battle/opponentSpecies.js`
- `src/battle/battleState.js`
- `src/ui/useBattleState.js`
- `src/ui/components/BattleRulesControl.jsx` (state wiring only; approved markup/style retained)
- `src/ui/components/BattleOpponentTrainerControl.jsx`
- `src/ui/components/BattleTeamSections.jsx`
- `src/ui/components/BattleTrainers.jsx`

Verification:

- `tools/verifyTowerRoundData.mjs`
- `test/towerRoundEligibility.test.js`
- `test/battleRound.browser.mjs`
- `test/anabelFormat.test.js`
- `test/battleMatchup.test.js`
- `test/opponentSpecies.test.js`
- `test/frontierCandidates.test.js`
- `test/opponentStats.test.js`
- This document.

Results: 38 focused eligibility/storage/search/selection tests plus 25 directly affected candidate/stat regression tests passed. The latter fixtures now choose rules before selecting opponents, consistent with the new reset requirement. Canonical source audit passed. Focused Chromium flow passed trainer identity filtering, independent species search, selection/query resets, unchanged-value no-op, clearing Round, reload persistence, and the approved 375px/390px header layout. `git diff --check` passed. No full suite or production build was run.


## Phase 3: verified Doubles differences

The pinned `battle_tower.c` path was reviewed through `SetNextFacilityOpponent`, `GetRandomScaledFrontierTrainerId`, `DoSpecialTrainerBattle` and `FillTrainerParty`, rather than inferring behavior only from the range tables. Singles and Doubles both enter the non-Multi standard selection branch. The round and battle-seven ranges above therefore apply to both. `SetFacilityPtrsGetLevel` uses the same standard trainers and Pokémon database in both modes. No Doubles-only roster, move, species, or set-tier filter is present in the standard sampler.

Doubles passes `FRONTIER_DOUBLES_PARTY_SIZE` to the same party sampler and sets `BATTLE_TYPE_DOUBLE`; Singles passes `FRONTIER_PARTY_SIZE`. The shared sampler forbids duplicate species, duplicate nonempty held items, and duplicate exact sets when constructing a party. This companion continues to show a round-wide union of individual eligible sets; it does not generate teams or predict partners, and this milestone does not alter candidate correlations or damage algorithms.

`frontier_util.c:GetFrontierBrainStatus` returns not-ready outside Singles, so no Doubles round admits Anabel. `ChooseSpecialBattleTowerTrainer` restricts apprentice candidates to Singles. Record-mixed player candidates may be considered in Doubles when enough valid party members exist, but the dataset does not include those save-specific rosters. They remain unsupported, as before.

Implementation reuses `towerRoundEligibility.js` without changing the verified range tables or Level 50 boundary. It enables Doubles and rejects Brain identities before the no-round fallback. Multi and other facilities remain outside eligibility. No UI, persistence, reducer, canonical mapping, or calculator implementation changed in Phase 3.

Phase 3 changed files: `src/battle/towerRoundEligibility.js`, `test/towerRoundEligibility.test.js`, `test/battleRound.browser.mjs`, and this document.

Phase 3 validation: 41 targeted eligibility/search/storage/Possible Sets tests and 25 directly affected candidate/stat regression tests passed (66 total). The focused Singles/Doubles Chromium flow passed, including restored Doubles filtering, alphabetical sorting, Anabel exclusion in selected and All Rounds modes, independent species filtering, query resets and persistence. No full suite or production build was run.
