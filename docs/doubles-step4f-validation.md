# Step 4F Doubles validation — 2026-10-25

## Scope and result

No production files changed. No confirmed numerical production defect was found in the representative matrix. Three stale Doubles test expectations were corrected; there were no new full-suite failures. This is representative regression coverage, not exhaustive verification of every move, species or turn history.

## Independent numerical fixtures

`test/fixtures/doublesNumericalCases.js` contains literal, hand-calculated final pre-random maxima and integer truncation notes. Expected values are not captured from the implementation. The new node tests expand each maximum into all 16 Emerald rolls and independently enumerate all 16^n outcome sequences for 1-, 2- and 3-hit KO probabilities, comparing exact BigInt numerators and denominators.

- 24 canonical pairing cases: two player slots × two opponent slots × both attacking directions × three moves. Swampert/Snorlax vs Aggron Set 3/Aerodactyl Set 4. Canonical IV31 stats, nature, item, move list and unresolved ability alternatives are asserted explicitly.
- 36 controlled full-field cases: Surf/Rock Slide spread, Earthquake's full Gen 3 FOES_AND_ALLY damage, one/two living defenders, Reflect/Light Screen, critical bypass and Battle Armor, Helping Hand ordering, burn/Guts, favorable/adverse critical stages, rain/sun, Cloud Nine/Air Lock, Weather Ball's distinct fainted-holder lookup, Damp execution prevention, field-wide Plus/Minus, Lightning Rod's actual redirected target and ordinary Electric resistance, reduced HP, and empty/fainted slots.
- One state isolation matrix verifies all four views preserve individual HP/status/stages, independent observations and selected Sets; replacing one occupant resets only its own conditions.

Reference: [Emerald CalculateBaseDamage](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/pokemon.c), and [battle script damage commands](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/battle_script_commands.c). Fixtures preserve Emerald's integer arithmetic and existing distinct ability lookup semantics, including fainted retained records. KO assertions cover repeated damage rolls at fixed HP, not accuracy, recovery, residual damage or turn simulation.

## Actual Battle page integration

`test/doublesNumericalRegression.browser.mjs --webkit` loads the real application with deterministic player records injected only by a test Vite transform. It uses actual native selectors, sprite taps, Battle Conditions, observations and damage dialogs. Candidate results are observed without replacing the calculator. It asserts 24 exact-roll popup cases plus six exact-roll screen/critical/liveness/observation cases. An actual hook dispatch while the native modal is open checks hidden Set invalidation and observation preservation; background controls cannot be operated through an open native modal.

Existing mobile suites additionally cover field-ability uncertainty/effective stats, canonical Set refresh, multiple/unknown Lightning Rod candidates, actual redirected damage, unresolved Trace/history and fainted-target safeguards, and the exact Swellow/Aggron Set 3 Thunder empty-slot regression. Narrow layouts/native hit targets are checked by those suites.

## Confirmed test defects corrected

- `test/doublesIntegration.test.js`: expected observations, screens and Helping Hand to survive Singles/Doubles format changes. Replaced with explicit view-preservation and complete format-reset assertions.
- `test/helpingHand.test.js`: expected Helping Hand to survive a format reset. Now checks independent recipient memory across views/collapse, active-slot condition reset and complete format reset.
- `test/opponentAbilitySelection.test.js`: used four opponent slots and expected format toggles to retain them. Now tests the two actual active slots, independent ability observations, removal and full reset.

These corrections match approved behavior; they do not change battle mechanics or Singles behavior.

## Validation

| Check | Result |
|---|---|
| New numerical/state tests | 61/61 passed |
| Relevant Doubles/Battle focused collection (including new tests and snapshot) | 176/176 passed |
| New mobile WebKit numerical popup test | Passed, 30 exact-roll cases plus hidden-Set refresh |
| Existing mobile WebKit suites | 7/7 passed |
| 10,620-result Singles snapshot | Passed |
| Production build | Passed; existing large-chunk warning |
| Full suite before changes | 1,182/1,245 passed; 63 failures |
| Full suite after changes | 1,246/1,306 passed; 60 failures |
| New full-suite failures | 0; failure-name comparison confirms only three removals |

Focused command:

```sh
node --test test/doublesNumericalRegression.test.js test/battleDoublesSelection.test.js test/battleSpriteSwitch.test.js test/battlefieldContext.test.js test/battlefieldLiveness.test.js test/doublesFieldAbilities.test.js test/lightningRodTarget.test.js test/lightningRodEmptySlot.test.js test/doublesIntegration.test.js test/helpingHand.test.js test/doublesSelectedSet.test.js test/doublesSideConditions.test.js test/doublesStateArchitecture.test.js
```

Existing mobile commands use `node test/NAME.browser.mjs --webkit` for battleDoublesSelection, battleSpriteSwitch, battlefieldLiveness, battlefieldContext, doublesFieldAbilities, lightningRodTarget and lightningRodEmptySlot. Build: `npm run build`. Full suite: `npm test`.

## Remaining baseline failures and limitations

The remaining failures are pre-existing. Most concern legacy Singles species-wide candidates/ranges, observations/HP expectations, and old search/selection assumptions; they were left unchanged. One additional old ability test expects observations to survive a level-rule reset. No claim is made that these unrelated failures have been repaired.

The mixed-format `frontierCandidateRegression.test.js` is relevant to Doubles but its reference harness is obsolete: `tools/auditFrontierCandidates.mjs` compares constructed candidates against every `possibleMatchupSets()` result rather than the selected analysis Set. Reproducing only ALEXAS/Doubles/Level50 produces 141 suspicious entries over 18 species contexts, starting with expected Breloom Sets 1–4 versus correctly selected Set 1. Its direct two-model calculation comparison also predates full field ability/target scenarios. It is retained as a known baseline harness failure; the new matrix exercises the real selected-Set/four-slot pipeline instead. Reworking the broad legacy Singles audit was not included in this step. This remaining failure is not evidence of a demonstrated Doubles damage defect.

Full-suite failure report inventory below counts 59 leaf/file entries; Node also counts the failed parent popup group, yielding 60 failures:

| Existing failing file | Reported entries |
|---|---:|
| `test/alexasAerodactyl.test.js` | 8 |
| `test/battleObservations.test.js` | 3 |
| `test/battleSearchWords.test.js` | 1 |
| `test/battleSinglesSelection.test.js` | 1 |
| `test/coreDamage.test.js` | 1 |
| `test/frontierCandidateDamage.test.js` | 11 |
| `test/frontierCandidatePopup.test.js` | 2 |
| `test/frontierCandidateRegression.test.js` | 1 |
| `test/frontierCandidates.test.js` | 8 |
| `test/frontierDamageAggregation.test.js` | 17 |
| `test/frontierDamagePresentation.test.js` | 3 |
| `test/matchupConditions.test.js` | 1 |
| `test/opponentAbilitySelection.test.js` | 1 |
| `test/opponentStats.test.js` | 1 |

Existing safeguards remain for unresolved copied abilities or retained battle history and fainted redirect destinations. A genuinely empty Lightning Rod slot remains distinguishable from an unknown populated slot. No new history tracking, targeting controls or execution simulation was added. Mobile validation used Playwright WebKit, not a physical iPhone. Step 4F stops here.
