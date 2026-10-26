# Frontier candidate damage — Step 5 regression validation

October 25, 2026. Validation boundary: candidate construction, evaluation, aggregation, presentation and existing popup integration. Step 6 has not begun. No production files, formulas, identification rules, observation persistence, controls or result contracts changed in this step.

## Result

- Full unit suite: **1,106 passed, 0 failed, 0 skipped**. Added six regression tests.
- Production/PWA build: **PASS**, including service-worker generation. Vite retains its large-chunk advisory.
- WebKit: **eight suites passed at 320, 375 and 430px**, 24 suite/viewport checks.
- Roster audit: **zero suspicious results**; 510,982 complete raw branch comparisons match direct scalar-engine calls.
- **No production defect demonstrated. No production correction required.**

## Deterministic roster audit

Run `node tools/auditFrontierCandidates.mjs`. Machine-readable output: [roster-audit.json](../artifacts/frontier-candidate-step5/roster-audit.json).

The audit covers all 302 selectable trainer entries (300 ordinary trainers plus Anabel Silver/Gold), 9,949 trainer/species pairs, levels 50 and 85, and both formats wherever supported. Anabel Doubles contexts are excluded by the existing eligibility rule.

Each context uses the explicit level-47 diagnostic Swampert, with scalar stats from the established fixture. Audit-only friendship255 and IV31 inputs are explicit fixture values for supported dynamic-move reference tests; they are not inferred opponent data or claims about the user's save. Opponent stats/items/IVs always derive from authorized canonical sets.

Forward attacks: Ice Beam, Surf, Earthquake. Reverse attacks: every distinct canonical move in the eligible collection, supplied through the existing move-observation reducer before evaluation. This narrows candidates through the existing rules; the audit never gives an opponent an unjustified move.

| Metric | Count |
| --- | ---: |
| Trainer/species/format/level contexts | 39,784 |
| Move evaluations | 310,696 |
| Player → opponent evaluations | 119,352 |
| Opponent → player evaluations | 191,344 |
| Singles evaluations | 155,390 |
| Doubles evaluations | 155,306 |
| Level 50 evaluations | 155,348 |
| Open Level 85 evaluations | 155,348 |
| Raw ability branches / direct scalar comparisons | 510,982 |
| One-set contexts | 35,480 |
| Multiple-set contexts | 4,304 |
| Contexts with different items | 4,040 |
| Contexts with different natures | 3,716 |
| Contexts with different EV spreads | 3,724 |
| Contexts with different maximum HP | 2,712 |
| Evaluations with ability alternatives | 106,554 |
| Brain contexts | 12 |

Reference models are rebuilt separately with `toTowerOpponent`; their correlated stats, EVs, nature, item, IVs and friendship are compared to each evaluated candidate. The audit pins each legitimate ability pair directly into `calculateCoreDamage`, including the same selected conditional case/hit count, and compares complete raw results. Denominators are checked against the separately built scalar target. Expected envelopes use those reference results and denominators, rather than trusting normalized aggregation fields. Group contributor counts and candidate membership/order are also checked.

This verifies integration against the existing scalar engine; it is not a new independent proof of every Emerald formula.

## Legitimate unavailable results versus failures

| Summary kind | Evaluations |
| --- | ---: |
| Complete numerical envelope, including zero/immunity | 226,128 |
| Status move | 74,304 |
| Unsupported special move | 4,304 |
| Categorical OHKO | 1,324 |
| Incomplete due to genuine missing/unsupported inputs | 4,636 |

Raw branch reasons in this clear-weather roster sweep:

- Unresolved Trace: **7,788** branches.
- Unknown unseen Damp in Doubles: **1,072** branches.
- Unknown opposite Plus/Minus field information: **52** branches.
- Unknown Metal Powder transformation state: **104** null branches. This is an audit classification of the existing engine's `missing-damage-data` result: canonical Ditto's item does not establish its in-battle transformation state. No transformation value is invented.

Branch counts are not summary counts and must not be added to the summary totals. There were no unexplained null results, exceptions, candidate-construction failures or direct-result mismatches. Status and unsupported moves are classified separately, not counted as candidate implementation failures.

Rain/sun weather suppression, copied abilities, Forecast and dynamic metadata are exercised in the focused matrix and popup suites, rather than inferred from this clear-weather sweep.

## Focused regression coverage

[frontierCandidateRegression.test.js](../test/frontierCandidateRegression.test.js) adds six tests:

1. Representative roster audit across both formats/levels/directions, including both Brain medals and all coverage categories above.
2. Held item, ability, multiple moves, unique identification, contradictory observations, clearing and state immutability. Candidate sources must match `possibleMatchupSets` exactly.
3. **2,760** direct branch comparisons across eleven forward moves and observed reverse Earthquake, five weather states, both critical settings, both formats, one/two active defenders, screens, Helping Hand, stages and statuses. Includes STAB/types, multihit, fixed damage, conditional power, Hidden Power, friendship moves, HP-dependent power and OHKO.
4. Reverse Earthquake with set2 calculable and set4 invalid at explicit HP160: candidate count remains two; no overall numerical envelope is shown.
5. **160** direct comparisons for Trace/unresolved and copied Flash Fire/Cloud Nine, activated Flash Fire, native Cloud Nine/Air Lock, Forecast, Plus/Minus and Damp, through the complete evaluation/aggregation path.
6. A missing canonical item is retained beside three valid candidates; the overall result remains unavailable.

Existing construction/evaluation/aggregation tests additionally retain exact ALEXAS values, denominator-correlation counterexamples, distribution equivalence, legitimate zero Psywave rolls, invalid source data, metadata uncertainty, and provenance/mutation checks.

## ALEXAS regression

Four canonical Aerodactyl sets, level50, known trainer IV31, Rock Head/Pressure alternatives, default conditions. These numbers use the labelled diagnostic Swampert fixture, not the user's unknown saved stats.

| Player attack | Singles | Doubles, two active defenders |
| --- | --- | --- |
| Ice Beam | 71–84 HP; 40.3%–54.2% | 71–84 HP; 40.3%–54.2% |
| Surf | 107–126 HP; 60.8%–81.3% | 56–66 HP; 31.8%–42.6% |
| Earthquake | 0–0 HP; 0%–0% | 0–0 HP; 0%–0% |

Ice Beam/Surf percentages use HP176 for sets1/2 and HP155 for sets3/4 before combining endpoints. All eight set/ability branches remain available in the default forward case; there is no generic missing-data result or scalar fallback.

Observed reverse Earthquake retains sets2/4: Choice Band set2 gives 90–107 HP; Kings Rock set4 gives 60–71 HP. Combined: **60–107 HP, 33.3%–59.4%**, using the player's HP180 denominator. Genuine item observations narrow this immediately. Rain Surf in Doubles still retains its weather-suppression safeguard.

## Actual popup and browser coverage

The new [instrumented regression suite](../test/frontierCandidateRegression.browser.mjs) uses a test-only Vite transform; production code contains no counters. It confirms:

- Zero candidate construction/evaluation before a move is opened.
- One evaluation/construction on initial opening; only the selected move is evaluated.
- Unrelated condition-panel renders reuse the memoized result.
- An item observation adds exactly one evaluation and updates percentages.
- Closed popups do not calculate in response to weather changes.
- Live player move replacement updates/remounts the selected move correctly.
- Removing opponent move justification dismisses the popup; restoring the observation does not reopen stale state.
- Switching opponent species or trainer dismisses the old popup; trainer replacement clears observations through existing persistence semantics.
- Real Lapras Water Absorb/Shell Armor alternatives retain a zero-inclusive envelope and explanatory note.
- Percentage precedes HP, dismissal works, and mixed results fit without horizontal overflow.

The initial new browser-test attempt created two Surf buttons in its diagnostic player fixture, causing Playwright's strict locator check to fail. The fixture was corrected to four distinct moves; the rerun passed at every width. This was a test-harness defect, not a production failure. An initial sandbox denial of the local test server was resolved by the authorized test execution environment.

| Suite | 320px | 375px | 430px | Evidence |
| --- | --- | --- | --- | --- |
| New instrumented candidate regression | PASS | PASS | PASS | [320 screenshot](../artifacts/frontier-candidate-step5/mixed-320.png), [375](../artifacts/frontier-candidate-step5/mixed-375.png), [430](../artifacts/frontier-candidate-step5/mixed-430.png) |
| Candidate popup integration | PASS | PASS | PASS | [Log](../artifacts/frontier-candidate-step5/candidate-popup.log) |
| Original ALEXAS popup regression | PASS | PASS | PASS | [Log](../artifacts/frontier-candidate-step5/alexas-popup.log) |
| Core damage popup | PASS | PASS | PASS | [Log](../artifacts/frontier-candidate-step5/core-popup.log) |
| Unseen field abilities popup | PASS | PASS | PASS | [Log](../artifacts/frontier-candidate-step5/field-popup.log) |
| Combined Doubles integration popup | PASS | PASS | PASS | [Log](../artifacts/frontier-candidate-step5/doubles-popup.log) |
| Multihit selectors popup | PASS | PASS | PASS | [Log](../artifacts/frontier-candidate-step5/multi-hit-popup.log) |
| Conditional abilities popup | PASS | PASS | PASS | [Log](../artifacts/frontier-candidate-step5/conditional-abilities-popup.log) |

Existing suites cover live weather, format/level changes, both directions, stages, status, criticals, screens, counts, Helping Hand, selected conditional/multihit paths, type/power metadata, Trace activation/context, scalar fallback contexts and popup layout/dismissal.

## Changed files and remaining limits

Added only:

- `tools/auditFrontierCandidates.mjs`
- `test/frontierCandidateRegression.test.js`
- `test/frontierCandidateRegression.browser.mjs`
- This validation report.

Generated evidence is under `artifacts/frontier-candidate-step5/`.

The roster sweep covers authorized trainers and their actual moves, not every move against every species under every possible condition. Unknown IVs/items/transformation state, copied abilities, unseen battlers and unsupported between-hit mechanics remain subject to existing safeguards. No OHKO probabilities or comprehensive final calculator audit were implemented. Desktop Playwright WebKit with mobile viewports is not physical iPhone Safari/Home Screen app validation. Step 6 remains unstarted.
