# Frontier candidate damage — Step 6 release validation

October 25, 2026. Final validation of the completed candidate feature. No production source, calculation contract, formula, identification, observation-persistence behavior, controls, or visual design changed in this step. No caching, workers or new calculator features were introduced.

## Automated release result

- Complete unit suite: **1,106 passed, zero failures/skips**. [Unit log](../artifacts/frontier-candidate-step6/unit-tests.log).
- Production build: **PASS**, including service-worker generation and 439 precache entries. The existing large-chunk advisory remains.
- Eight existing candidate/calculator popup suites: **PASS at 320, 375, 390 and 430px**, 32 suite/viewport checks.
- Built production Battle page: **PASS at all four widths**, including real controls, ALEXAS calculations, navigation and reload behavior. [Results](../artifacts/frontier-candidate-step6/production-validation.json).
- Additional mobile/performance suite: normal browser mode and a simulated `navigator.standalone` flag at all four widths. [Log](../artifacts/frontier-candidate-step6/mobile-release.log).
- Actual service-worker A→B installation/update, deferred activation and offline reload: **PASS in Chromium 375px and WebKit 430px**. [PWA log](../artifacts/frontier-candidate-step6/pwa-updates.log).
- **No production defect demonstrated; no production correction required.**

## Regression and layout coverage

The existing suites were extended to include 390px. Logs are under [the Step 6 artifact directory](../artifacts/frontier-candidate-step6/): `candidate-popup.log`, `instrumented-popup.log`, `alexas-popup.log`, `core-popup.log`, `field-popup.log`, `doubles-popup.log`, `multi-hit-popup.log`, and `conditional-abilities-popup.log`. Each has four passing viewport results.

Coverage includes both attack directions, Singles/Doubles, opponent levels, trainer/species switching, item/ability/move observations and clearing, live weather/stages/status/critical/HP changes, screens, active counts, Helping Hand, conditional/multihit selections, dynamic metadata, incomplete/zero-candidate results, mixed immunity, OHKO categories, scalar contexts, scrolling, dismissal and stale-popup invalidation.

The additional layout checks verify percentage-before-HP order, panel bounds, no horizontal overflow, wrapped long Trace explanations, deliberate short-panel scrolling with the explanation brought into view, touch opening and keyboard/tap dismissal. Screenshots include [320px browser](../artifacts/frontier-candidate-step6/browser-320.png), [390px production](../artifacts/frontier-candidate-step6/production-390.png) and the four `standalone-sim-*.png` files. Existing neon matchup styles and CSS were not changed.

## ALEXAS final regression

The original diagnostic Swampert fixture against ALEXAS's level50 Aerodactyl retains four correlated sets and both Rock Head/Pressure alternatives. Calculable defaults show numerical results, never the former generic missing-data popup.

| Move | Singles | Doubles, two active defenders |
| --- | --- | --- |
| Ice Beam | 40.3%–54.2%; 71–84 HP | Same |
| Surf | 60.8%–81.3%; 107–126 HP | 31.8%–42.6%; 56–66 HP |
| Earthquake | 0%–0%; 0–0 HP | Same |

The percentage endpoints use each candidate's HP176 or HP155 before combining. Observed reverse Earthquake retains Choice Band set2 (90–107 HP) and Kings Rock set4 (60–71 HP): overall **60–107 HP, 33.3%–59.4%** against player HP180. Observations narrow/clear immediately; count/screens/Helping Hand changes preserve established arithmetic. Genuine unseen weather/Trace/Damp/Plus-Minus safeguards remain unavailable rather than falling back to scalar numbers or displaying partial envelopes.

The built-production test uses a separately encoded level50 synthetic save, rather than claiming the diagnostic fixture represents a real user's imported stats. It validates the production route and interactions without asserting that its damage numbers equal the level47 diagnostic fixture.

## Persistence and PWA boundaries

Production `useBattleState` owns active selections and observations at app-session scope. Navigation away from Battle and back preserves them. Rules and saved team presets are durable. Reload correctly restores rules but resets trainer, active matchup and observations. The production test verifies this existing distinction; observation persistence was not expanded to local storage.

The PWA suite exercises real browser service workers and offline reload against a local origin. It does not install a physical Home Screen app. The viewport simulation only forces `navigator.standalone`; it records the real display-mode media query separately. Automated safe-area values are zero, so hardware notch insets and iOS browser/keyboard chrome transitions are not established by these tests.

## Performance methodology and memory limits

Repeatable benchmark cases are defined in `test/fixtures/frontierPerformance.js`. Each timed call includes candidate construction, evaluation, aggregation and presentation. The cases cover one set/one ability, four sets/eight ability branches, Doubles Surf, a five-hit move, HP-dependent Eruption, uncertain Weather Ball, unresolved Trace and reverse two-set Earthquake. Diagnostic player move/ability substitutions are test inputs, not assertions about legal saved Swampert moves or the user's save.

Node command: `node --expose-gc tools/measureFrontierCandidates.mjs`. It uses 50 warmups and 500 timed calls per case on the unthrottled arm64 macOS host, Node v24.20.0. Median times were **0.044–0.222ms**, and p95 values **0.066–0.338ms**. [Full Node data](../artifacts/frontier-candidate-step6/node-performance.json).

WebKit command: `node test/frontierMobileRelease.browser.mjs`. WebKit's timer has approximately 1ms granularity here. The final run therefore uses 100 batches of ten calls per case after 20 warmups, reporting amortized per-call batch averages; p95 is the tail of those batch averages, not individual-call latency. It runs after the other validation jobs complete. The original individual-call run is retained as `webkit-performance-initial.json` rather than presenting rounded-zero medians as zero-cost work.

Popup timing uses programmatic DOM activation/cancel and real reducer dispatch to the second `requestAnimationFrame`, with ten warmup cycles, 100 measured open/close cycles and 30 live condition updates per width. This deliberately includes two-frame scheduling overhead; it is not physical touch latency or proof of a hardware paint deadline. Actual touch interactions are tested separately by the regression suites.

The Node memory run performs forced GC after each batch of 500 further evaluations, through 5,000 evaluations. Heap samples ranged from **9,335,640 to 9,468,712 bytes**; final minus initial was **31,648 bytes**. This shows bounded fluctuation in this run, not a formal leak proof. WebKit exposes no JS heap-size API in this setup. Repeated-interaction checks instead require DOM-node and tracked document/window listener counts to return exactly to baseline. Only the explicitly tracked popup event types are counted; this is not a census of every browser allocation.

Final per-viewport calculation, responsiveness and retention measurements are recorded below and in [webkit-performance.json](../artifacts/frontier-candidate-step6/webkit-performance.json).

## Files changed and recommendation

Only validation files changed: the eight existing browser viewport lists; new `test/frontierMobileRelease.browser.mjs`, `test/frontierProductionRelease.browser.mjs`, `test/fixtures/frontierPerformance.js`, `tools/measureFrontierCandidates.mjs`; and this report. Generated evidence is under `artifacts/frontier-candidate-step6/`.

The feature is suitable for release based on the completed automated checks. Physical iPhone Safari and an actually installed Home Screen app remain a manual validation boundary, especially hardware safe areas, keyboard/browser chrome, low-memory pressure and older-device speed. No OHKO probabilities, unrelated features or comprehensive final formula audit were started.

## Final WebKit measurements

Each calculation row is a range across the four viewport runs.

| Case | Median batch-average ms/call | p95 batch-average ms/call |
| --- | --- | --- |
| one-set-one-ability | 0.10–0.10 | 0.10–0.10 |
| four-sets-two-abilities | 0.10–0.10 | 0.20–0.20 |
| four-sets-doubles-spread | 0.10–0.10 | 0.20–0.20 |
| four-sets-five-hit | 0.20–0.20 | 0.30–0.30 |
| hp-dependent-power | 0.10–0.10 | 0.20–0.20 |
| uncertain-weather-ball | 0.20–0.20 | 0.20–0.20 |
| unresolved-trace | 0.10–0.10 | 0.20–0.20 |
| reverse-two-sets | 0.10–0.10 | 0.10–0.10 |

| Width | Open median / p95 ms | Update median / p95 ms | Max frame gap ms / gaps over 50ms | DOM nodes before → after | Tracked listeners before → after |
| --- | --- | --- | --- | --- | --- |
| 320 | 33 / 34 | 33 / 34 | 20 / 0 | 246 → 246 | 3 → 3 |
| 375 | 33 / 34 | 33 / 34 | 19 / 0 | 246 → 246 | 3 → 3 |
| 390 | 33 / 35 | 33 / 34 | 21 / 0 | 246 → 246 | 3 → 3 |
| 430 | 33 / 34 | 33 / 34 | 21 / 0 | 246 → 246 | 3 → 3 |

All eight normal/simulated-standalone contexts passed. Safe-area padding reported `0px`; `display-mode: standalone` remained false, including forced navigator-flag contexts. Measured matchup row touch targets were at least 30px high and 144px wide; existing native selectors and real touch interactions remained usable without changing styling.
