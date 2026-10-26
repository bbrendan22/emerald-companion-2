# Damage calculator finalization — Step 1 baseline

This inventory supersedes the older compatibility audit's availability counts for
finalization planning. It records the current working tree, including existing
uncommitted implementations. No production behavior changes in Step 1.

## Exact inventory

The machine-readable inventory is `test/fixtures/damageFinalizationBaseline.json`.
It contains one named row for every real Emerald move, IDs 1–354; ID 0 is excluded.
Each row records canonical type, power, effect, finalization category and observed
core result under the explicit fixture matchup.

| Category | Count |
| --- | ---: |
| Standard | 152 |
| Specialized: keep exact | 27 |
| Specialized: variable multi-hit | 12 |
| Specialized: Triple Kick | 1 |
| Specialized: Rollout / Ice Ball | 2 |
| Specialized: Fury Cutter | 1 |
| Specialized: Magnitude | 1 |
| Specialized: Present | 1 |
| Specialized: Pursuit | 1 |
| Specialized: Revenge | 1 |
| Specialized: OHKO | 4 |
| Specialized: ordinary hit only | 6 |
| Specialized: unavailable | 7 |
| Status | 138 |
| **Total** | **354** |

Specialized categories total 64. Category membership follows the approved request,
not the calculator's current eligibility. In particular, the six ordinary-hit-only
moves remain specialized for inventory purposes even though they use the ordinary
formula. Status entries retain their database descriptions.

## Coverage and limits

`test/damageFinalizationBaseline.test.js` verifies:

- Complete, unique real-move coverage and the exact category counts.
- Canonical metadata and nonempty descriptions for all 138 status moves.
- Recorded core behavior for all 354 moves in a neutral level 50 Snorlax mirror.
- Independently computed 16-roll expectations for all 152 standard moves, through
  both core calculation and ability-result presentation.

The recorded specialized outcomes characterize existing behavior; they are not an
independent cartridge-accuracy oracle. They retain all-case conditional output, legacy combined multi-hit endpoints and
the level-50 Psywave distribution. Step 5 corrects the level-1 boundary in focused
tests without changing this neutral level-50 snapshot. Step 4 updates only the four OHKO snapshot
rows to explicit outcomes; the standard-move expectations remain unchanged. Later approved steps should update affected expectations explicitly.
The aggregate baseline records endpoints; existing specialized distribution tests
remain responsible for detailed distributions and unsupported between-hit guards.

The neutral sweep uses known abilities, IVs, friendship and stats. It does not
certify every weather/item/status combination or uncertain opponent matchup.
Existing focused tests remain in place for those mechanics. No browser or mobile
layout claim is made by this step; production code and UI are unchanged.

## Remaining approved sequence

2. Add compact selectors and conditional selection wiring, with agreed defaults
   and move-switch resets.
3. Extend selected-hit aggregation while retaining unsupported ability safeguards.
4. Add OHKO outcomes, status descriptions, consistent unsupported messaging and
   normal-selection Struggle filtering.
5. Correct the Psywave level 1 boundary and add focused regression coverage.
6. Run full validation, standard-move regression checks and mobile layout checks.

Stop after Step 1 for user review before beginning Step 2.
