# Final Battle Tower QA — 2026-10-26

## Outcome

Tower Singles and Doubles are suitable for a development freeze under the existing documented behavior. No new Critical or Major production defect was established. No production code was changed by this QA pass. Physical iPhone sign-off remains necessary before public release; Battle Dome was excluded.

One checklist discrepancy needs to remain explicit: changing Singles/Doubles starts a fresh battle, clearing player/opponent selections, observations and conditions. It does not preserve otherwise valid selections. This is already documented in BATTLE_CHECKPOINT_VALIDATION.md and doubles-step4f-validation.md and enforced by current tests. It was preserved rather than silently changing established behavior. If selection preservation is now mandatory, that is a separate behavior change and this checklist item cannot be signed off as written.

## Baseline and coverage inventory

The working tree already contained extensive Battle and unrelated Collection edits. Those edits were treated as the audited baseline and preserved. Existing coverage includes reducer/session/rule defaults, roster reconciliation, native selection controls, trainer/round eligibility, observations and canonical sets, imported data and permanent storage, effective stats and speed, abilities/conditions, popup interactions and numeric damage/reference comparisons.

The meaningful gaps addressed here were production execution of the current Singles/Doubles selector suites, 430px Doubles selector bounds, and actual Settings replacement-save import reaching the App-owned Battle state. Older fixtures alone were not used as evidence for the mounted production workflow.

## Executed validation

All groups ran serially. Counts are test executions, with some overlap between groups, not unique tests.

| Group | Result |
| --- | --- |
| State/selection/session/rules/observations/stats/save integration unit group | 216 passed |
| Damage, abilities, conditions, Doubles and presentation regression group | 690 passed |
| Frontier/Tower data, reference stats, trainer/save/Pokémon group | 95 passed |
| Selected bounded independent-reference regressions | 3 passed, zero mismatches |
| Browser scripts listed below | 13 passed in WebKit |
| Production build, including PWA service worker | Passed |
| `git diff --check` | Passed |

Reference selection: `node --test --test-concurrency=1 --test-name-pattern='bounded reference sample|integrated independent-reference matrix|bounded four-slot reference' test/frontierCandidateRegression.test.js`.

This covered 322 direct reference comparisons, a 1,380-case matrix with 2,760 comparisons, and 29 four-slot reference probes. Largest exhaustive roster evaluations were deliberately excluded.

Browser scripts:

- Production-mounted: `battleRulesControl --production --webkit`, `battleSinglesSelection --production --webkit`, `battleDoublesSelection --production --webkit`, and `battleSaveReplacement` (always production WebKit).
- Development-mounted real App with state probe: `battleSession`.
- Focused component/interaction fixtures: `battleInformationalPopup`, `battlePopupDismiss --webkit`, `battleDamageOpening`, `battleConditionsLayout`, `battleHpInputs --webkit`, `battleTypeLevelHeader`, `conditionalAbilitiesPopup`, `opponentAbilitySelection`.

Commands use `node test/NAME.browser.mjs`. The final save-replacement script also exercises actual production Tackle damage and Growl informational popups in both formats at 320/375/390/430px, dialog bounds, Escape dismissal, focus restoration and scroll unlock. Current selector suites verify manual levels and player saved levels. Rules checks cover all requested widths plus desktop. Automated bounds checks were supplemented with inspection of the generated Doubles screenshot.

Unit groups exercised:

- `battle*.test.js`, selection/state/matchup/opponent tests, conditionState, setRefinement, possibleMatchupSets, Trace, roles, trainerImport, save and collection.
- Damage-named tests, basic/core damage groups, abilities, Helping Hand, Plus/Minus, Lightning Rod, Hidden Power, Psywave, weather, Forecast, held items, Doubles, Frontier popup/presentation/aggregation, final/restored audits and eligibility.
- Frontier candidates/sets/stat references, Tower tests, species uniqueness, real save, trainer and Pokémon parsing.

Logs are `/tmp/battle-qa-{state,damage,data,reference,build,rules,import}.log` and `/tmp/battle-qa-NAME.log` for the focused browser batch. These temporary paths are local evidence, not permanent project artifacts.

## Functional findings

Verified defaults are Tower / Singles / Level 50 / unselected Round, empty combatants, and clean observations/conditions. Legacy persistent Rules keys are ignored on reload without damaging saved data. In-app navigation preserves encounter state; reload clears it. Format changes fully reset the encounter as documented.

Verified manual player and individual opponent/set selection, slot independence, duplicate prevention, trainer/round resets, actual saved player levels, configurable opponent levels, selected-set refresh, native hit targets and layout bounds. Observed moves/items filter compatible sets without treating displayed set data as evidence. Ability observations and Trace choices retain their distinct ownership. Unknown item evidence uses an empty value; canonical `None` is distinct and displayed as No Item. Opponent display stats remain one effective value or a dash.

Regression coverage passed for Gen III rounding/type categories/STAB/effectiveness, crits, stages, screens, weather/suppression, held items and abilities, multi-hit/unusual/fixed damage, Hidden Power, HP/percent output, speed, spread damage, Helping Hand, field abilities and unresolved neutral Trace. Bounded independent comparisons support the existing mechanics; this was not a new exhaustive cartridge audit.

Actual replacement import through Settings updates a retained identity's level/stats, clears removed active identities, refreshes selectable records, writes the new save, and preserves permanent role/preset storage in both formats. Existing real-save parser tests also passed. Preset bytes remain intact even when a saved preset references a Pokémon absent from the replacement save; this pass did not redesign preset management.

## Defects, limitations and follow-up

- **Critical:** none established.
- **Major:** none established under documented behavior. The checklist's format-preservation requirement is not met; retain the documented reset baseline or scope a separate change.
- **Minor:** existing large-bundle build warning remains; no unrelated optimization was attempted.
- **Production test maintenance completed:** `frontierProductionRelease.browser.mjs` now uses inline player/trainer/opponent selectors and individually selected canonical sets. It verifies observation filtering, damage updates and popup behavior, in-app navigation retention, fresh encounters on format changes, and default Rules/empty workspace on reload. Production WebKit passed at 320/375/390/430px in both formats, followed by 47 passing focused tests. These results supplement the original 13-script QA run above; the whole legacy browser suite is not certified by this report.
- **Test-environment limitation:** sandbox prevented local listener startup. Browser tests passed after approved execution outside that restriction. A few unit SSR harnesses emitted nonfatal HMR listener warnings; all unit assertions completed successfully.
- **New test correction:** the initial save-replacement test opened the navigation drawer before clicking the Settings header button, causing interception. Corrected the harness navigation and fixture identities; final expanded test passes. This was not a product regression.
- **Known platform limitation:** physical iPhone native picker rapid switching is not reproduced faithfully by Playwright selectOption. Preserve native dropdowns, current popup gestures, HP typography/Safari zoom behavior and absence of popup Close buttons.

Before public release, manually check physical iPhone Safari and Home Screen mode: native picker switching on trainer/species/set/rules controls; damage and status popup tap/swipe scrolling and dismissal without click-through; focus/viewport recovery after HP editing; keyboard opening/closing; and portrait/rotation layout at the requested width classes. Run a real personal-save replacement smoke check on-device. Desktop WebKit and a simulated standalone flag do not substitute for these checks.

No commit, push or deployment was performed.
