# Tower Singles set selection and observations

Tower Singles now selects one canonical Frontier set for analysis independently of recorded evidence. Other formats keep their existing candidate-based calculation path.

## Implementation

- `src/battle/battleState.js`: explicit `selectedOpponentSetId`; canonical default selection and reconciliation after evidence/context changes; observation reset and expansion state; selected-set HP clamping.
- `src/battle/towerSets.js`: separate eligible, observation-consistent, and analysis sets; canonical observation choices retain contradictory evidence rather than hiding it.
- `src/battle/frontierCandidates.js`: construct the selected Singles candidate through the existing verified IV/nature/EV/stat/ability pipeline; Doubles still constructs every observation-consistent candidate.
- `src/ui/components/BattlePokemonSelection.jsx`: native set selector, canonical set labels, species labels without set numbers.
- `src/ui/components/BattleMatchup.jsx`: selected-set facts and exact stats; opponent moves open damage popups directly; held item display does not record evidence. Existing explicit ability choice and uncertainty remain.
- `src/ui/components/BattleMoveDetails.jsx`: selected-set changes invalidate memoized damage results. Existing calculation formulas and popup presentation are unchanged.
- `src/ui/components/BattleObservations.jsx`: expandable move/item evidence controls, individual clearing, reset, and contradictory-evidence message.
- `src/ui/pages/BattlePage.jsx`: Observations below Battle Conditions; removed the visible Possible Sets section; selected-set condition HP bounds.
- `src/ui/styles/battle.css`: wrapping native selector pair and compact observation controls.
- `test/battleSelectedSet.test.js`, `test/battleSelectedSet.browser.mjs`, `test/fixtures/battleSelectedSet.jsx`: focused state, calculation input, and mobile browser coverage.

## Behavior

Eligible sets retain their canonical ordering and numbers. Selecting a species defaults to its first eligible set. Manual choices survive observation changes while eligible; eliminated choices switch to the first remaining set. Contradictions clear selection and produce no calculation candidates. Resetting contradictory evidence restores the first canonical candidate. Trainer, species, Round, and rules changes follow the existing opponent-context reset behavior.

Moves and held items observed in battle are recorded independently. Choices come from the eligible species' canonical sets, allowing contradictions to be represented and corrected. Merely viewing a set, item, or damage popup does not record evidence.

Damage receives one canonical selected candidate through `analysisMatchupSets` and the existing `frontierMatchupCandidates` / `evaluateFrontierCandidates` pipeline. This retains all existing condition, special-move, ability-scenario, damage, and KO calculations. No damage formula was edited.

## Validation

- Production build passes; Vite reports the existing large-chunk warning.
- 45 focused state and mechanics tests pass, including the new selection tests and existing conditions, screens, critical hits, weather, stages, and type modifiers.
- Chromium and WebKit browser workflow passes: default Aerodactyl Set 1; native species/set selectors; set content changes; all four moves on both sides open/dismiss damage popups; no move dropdowns; move/item evidence narrows choices; contradictions disable selection; reset recovers; no Possible Sets section; no horizontal overflow and correct native selector hitboxes at 320, 375, and 390 pixels.
- A broader diagnostic run passed 42 of 44 checks, including the 10,620-result Singles mechanics snapshot. Two tests failed: `coreDamage.test.js` calculates against a cleared opponent after a rules change, and `doublesIntegration.test.js` expects observations to survive format changes that reset the opponent context. These assertions were left unchanged. The full legacy test suite has not been migrated to the redesigned Singles presentation.
- WebKit automation is Safari-engine coverage, not a physical iPhone test.

## Doubles scope

The new explicit selector and separate Observations section are Tower Singles only. Doubles retains team selection, its existing observation controls, and multiple-candidate calculations. Its Possible Sets list is removed from the Battle page as requested. A future Doubles redesign would need per-slot selected-set state, selectors, and a separate observation surface; it is intentionally outside this change.
