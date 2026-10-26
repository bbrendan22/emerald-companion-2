# Damage calculator finalization — Step 4

## Behavior

- Guillotine, Horn Drill, Fissure and Sheer Cold return explicit OHKO / IMMUNE /
  BLOCKED outcomes, with no damage rolls, percentage range or HP amount.
- Type immunity, Levitate and Wonder Guard are checked before Sturdy; Sturdy is
  checked before the lower-level restriction. Sheer Cold has no later-generation
  Ice-type immunity. Unknown abilities and unresolved Trace remain unavailable.
- Existing ability enumeration/grouping retains legitimate Sturdy alternatives.
- OHKO accuracy is labeled Level-based; no numerical hit probability is displayed.
- All 138 status moves show their existing descriptions in the popup.
- The seven unsupported specialized moves show exactly:
  `Damage unavailable: requires special battle-state handling.`
  They cannot enter the ordinary formula through caller-supplied replacement metadata.
- Struggle is excluded from Battle selection choices. Database lookup, imported
  moves and the existing typeless damage calculation are preserved.

Mechanics source: [Emerald battle commands](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c)
and [OHKO battle script](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s).

## Files changed in Step 4

Production:

- `src/battle/ohkoDamage.js` (new outcome calculation and validation)
- `src/battle/moveDamagePolicy.js` (new description/unsupported presentation policy)
- `src/battle/coreDamage.js` (OHKO dispatch and unsupported-move guard)
- `src/battle/coreDamagePresentation.js` (OHKO messages)
- `src/battle/abilityScenarios.js` (OHKO grouping and availability)
- `src/battle/reference.js` (selection predicate; database unchanged)
- `src/battle/towerSets.js` (apply predicate to move choices)
- `src/ui/components/BasicDamagePreview.jsx` (descriptions, notices and outcomes)
- `src/ui/components/BattleMoveDetails.jsx` (power/accuracy metadata)
- `src/ui/styles/battle.css` (compact outcome typography)

New tests/fixtures:

- `test/ohkoDamage.test.js`
- `test/moveDamagePolicy.test.js`
- `test/specialMoveOutcomesPopup.browser.mjs`
- `test/fixtures/specialMoveOutcomesPopup.jsx`

Existing test expectations updated for the approved behavior:

- `test/abilityPrevention.test.js`
- `test/conventionalDamageEligibility.test.js`
- `test/deterministicDamage.test.js`
- `test/magnitudeDamage.test.js`
- `test/psywavePresent.test.js`
- `test/specialConventionalMoves.test.js`
- `test/damageFinalizationBaseline.test.js`
- `test/fixtures/damageFinalizationBaseline.json` (only four OHKO result rows)
- `test/basicDamage.browser.mjs` (status-description expectation)
- `test/coreDamagePopup.browser.mjs` (status-description expectation)

Documentation: this report and `docs/DAMAGE_FINALIZATION_BASELINE.md`.

## Validation and limits

All 810 unit tests pass, including all 152 standard-move expectations. The focused
OHKO/status/unsupported WebKit suite checks all 138 descriptions at 320, 375 and
430 pixels. Existing core-popup and Step 2/3 selector WebKit regression suites
cover the shared presentation and previous controls. This is WebKit emulation,
not a physical iPhone test or a complete browser-suite run.

These are connected-hit eligibility previews. Existing unmodeled battle execution
states (such as Protect, Substitute, Endure or copied abilities) have not gained
new controls or simulation. No Step 5 Psywave correction or Step 6 work is included.
