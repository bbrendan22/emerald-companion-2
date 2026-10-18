# Battle page comprehensive cleanup audit

Audit date: 2026-10-17. Project: Emerald Companion 2.0.

**Audit only. No cleanup has been applied.** This report is the only permanent file created or changed by this task. Legacy Emerald Companion 1.0 was not modified. No commit, push, dependency change, application edit, test edit, or CSS edit was performed.

## Summary

| Category | Findings | Meaning |
| --- | ---: | --- |
| A. Safe cleanup | 4 | Strong evidence of unused or redundant material; retain stated verification gates. |
| B. Low-risk simplification | 7 | Small, reviewable changes; some require preserving test fixtures or recovery copies first. |
| C. Higher-risk refactoring | 4 | Measured loading/DOM/data/asset opportunities that need separate approval and regression checks. |
| D. Keep unchanged | 6 | Complexity that protects approved behavior, shared mechanics, or historical evidence. |
| **Total** | **21** | Recommendations, not completed changes. |

The new `basicDamage.js` calculator is the active implementation. The old engine, retaliation helper, archived preview component, and KO system are absent from the application import graph and production source map. Removing those files will simplify maintenance but will not fix the current large-chunk warning.

The largest measured performance opportunities are eager Frontier data loading and the unfiltered Sets DOM. They should be addressed separately from simple source cleanup. No calculation or approved mobile design changes are recommended.

## Scope and method

Reviewed the Battle page shell and five tabs; team headers and touch handling; cards, stats, move rows, popup, calculator and presentation; Conditions controls, projections, state and persistence; Frontier/reference adapters and datasets; Battle CSS and shared imports; dynamic asset URL construction; active and archived tests, browser scripts and documentation.

Evidence combines source imports/references, application-entry reachability, current test consumers, production source-map inspection, a read-only browser module-request/DOM check, all active browser scripts, and narrow-screen screenshots. Text-search absence alone was not treated as proof that a dynamically referenced asset or class is unused. Export searches were checked against internal module calls before classifying code.

Temporary analysis scripts, logs, browser screenshots and a source-map build were written under `/private/tmp`; they are not project deliverables. No production instrumentation was added. All measurements describe this working tree, not a committed release.

## Baseline and verification

### Working tree and file census

Before the audit there were **177 porcelain Git-status entries**: one modified tracked file (`src/ui/App.jsx`, pre-existing 6 additions/2 deletions) and 176 untracked files. No staged changes. Much of the Battle work, including its retirement archive, is currently untracked. Do not assume a recoverable Git version exists for those files.

| Area | Files | Raw bytes |
| --- | ---: | ---: |
| `src/` | 95 | 1,128,711 |
| `src/battle/` (subset of src) | 29 | 760,302 |
| `test/` | 80 | 656,920 |
| `public/` | 3,232 | 178,376,290 |
| `docs/` before this report | 23 | 210,722 |
| `archive/` | 11 | 79,458 |

Counts include metadata files where present. They are raw filesystem sizes, not Git-tracked counts, download sizes or minified savings. SHA-256 snapshots covered 3,444 existing files across source, tests, assets, docs, archive and root package/config inputs. Final comparison verified all 3,444 original files are byte-identical. The only new scoped file and Git-status addition is `docs/BATTLE_CLEANUP_AUDIT.md`; final status has 178 entries, with all 177 original entries unchanged.

### Automated and browser verification

- `npm test`: **330 passed, 0 failed**, across 42 active `*.test.js` files.
- All **25 active `test/*.browser.mjs` scripts passed** against the existing local Vite server.
- Chrome ran with mobile viewport/touch emulation. Existing checks exercise **320px, 375px and 430px** layouts; shell tests additionally cover 960px. Popup/screenshots from `restoredDamageReview.browser.mjs` were visually reviewed at all three phone widths: no horizontal overflow, clipping or close-X appeared.
- This is **not physical iPhone or Safari/WebKit verification**. That remains a release check, especially after any touch, dialog, CSS or rendering refactor.
- `npm run build`: passed; **103 modules transformed**.
- No lint script, lint configuration or configured lint runner was found. There is no existing lint-warning baseline to run; no linter was installed. Passing tests/build is not a claim of lint cleanliness.
- No production `console.*`, `debugger`, TODO or FIXME matches were found in the inspected Battle source/component/page scope. Test-script success logging is intentional.

Browser scripts executed:

```text
basicDamage.browser.mjs                 basicDamageConditions.browser.mjs
basicDamageModifiers.browser.mjs        basicDamageTypes.browser.mjs
battleAccuracyCorrections.browser.mjs   battleConditions.browser.mjs
battleHeaders.browser.mjs               battleHub.browser.mjs
battleInformationalPopup.browser.mjs    battleMatchup.browser.mjs
battleRules.browser.mjs                 battleShell.browser.mjs
battleStagedStats.browser.mjs            battleTeams.browser.mjs
battleVisibility.browser.mjs            damagePolish.browser.mjs
earthquake.browser.mjs                  fixedDamage.browser.mjs
restoredDamageReview.browser.mjs        setSearch.browser.mjs
showcase.browser.mjs                    specialDamage.browser.mjs
trainerDashboard.browser.mjs            trainerSearch.browser.mjs
variableDamage.browser.mjs
```

### Production bundle baseline

| Output | Build-reported size | Gzip |
| --- | ---: | ---: |
| HTML | 1.20 kB | 0.48 kB |
| CSS (`index-CfW0-SM8.css`) | 45.19 kB | 9.10 kB |
| JS (`index-zibzegPn.js`) | 1,014.46 kB | 215.05 kB |

The build retains its **greater-than-500-kB minified chunk warning**. A separate temporary build with source maps also passed (1,014.50 kB JS including the map reference). The normal production build configuration was not changed.

Source maps identify **685,551 raw source bytes** from `src/battle/data/` in that chunk. Major inputs are `frontierPokemon.js` (390,334 source bytes), `frontierTrainers.js` (192,161), `moveResources.js` (80,732), and `frontierBrains.js` (18,564). React DOM and shared reference JSON also contribute substantially.

A generated-column source-map attribution counted approximately **572,753 minified characters** mapped to Battle data (335,548 sets; 166,501 trainers; 54,788 move resources; 15,916 Brains). This is approximate attribution, not independently gzippable bundle savings: mappings leave some generated code unattributed and compression is shared. It nevertheless demonstrates that Battle datasets materially contribute to the warning. Retired calculator modules contribute **zero mapped sources**.

In an isolated fresh browser context, before navigating away from Trainer, requests already included **26 `/src/battle/` modules**, including all five Battle data resources (`frontierPokemon`, `frontierTrainers`, `frontierBrains`, `moveResources`, `weights`). Static imports in `App.jsx`, `BattlePage.jsx` and `useBattleState.js` explain this behavior.

With no save, at 375px:

| Battle view | All document elements | Trainer-result buttons, including hidden | Horizontal overflow |
| --- | ---: | ---: | --- |
| Matchup | 2,570 | 302 | No |
| Unfiltered Sets | 38,638 | 302 | No |
| Back to Matchup | 2,570 | 302 | No |

These are DOM counts, not timing benchmarks or evidence of a specific phone frame rate. Sets already drops its results when inactive; Trainers remains mounted/rendered inside its hidden panel.

## A. Safe cleanup

### A01 — Obsolete and empty CSS

- **Files:** `src/ui/styles/battle.css`.
- **Issue/evidence:** `.battle-tab-placeholder`, its `p` rule and its `> span` rule have no current component/class consumers. All five tabs have implementations. `.battle-set-results { }` is an empty declaration block. `--side-text` has two definitions and no `var(--side-text)` consumer. These differ from dynamically generated `battle-side-*`, stat and percentage-color classes, which are live.
- **Action:** Remove the three placeholder rules, empty block, and only the unused custom-property declarations. Preserve `--side-accent` and all current card/tab styles.
- **Risk:** Very low.
- **Benefit/measurement:** Placeholder rules total 252 bytes and the empty rule 24 bytes, excluding separating whitespace: **276 measured CSS bytes**, plus the two unused declarations. Small stylesheet clarity gain; no meaningful performance promise.
- **Verification:** Build; shell, Matchup, Rules and popup browser checks at 320/375/430px; compare current tabs and team-border screenshots.

### A02 — Unreachable private Matchup empty-state branches

- **Files:** `src/ui/components/BattleMatchupShell.jsx`; associated fallback selectors in `src/ui/styles/battle.css`.
- **Issue/evidence:** Private `PokemonCard`, `Stats` and `Moves` are each called only behind their own side's truthy Pokémon guard. `conditionedBattlePokemon` returns a projected Pokémon for a truthy input. The internal “No Pokémon selected” and “Select a Pokémon” branches therefore cannot render. Their extra `mon &&`/optional guards obscure the actual approved independent-side behavior.
- **Action:** Remove only those unreachable private branches and their exclusive CSS. In the combined `.battle-matchup-identity h2, .battle-matchup-empty h2` rule, retain the live identity heading selector/declarations. Do not add placeholder cards or collapse the two-column grid.
- **Risk:** Low; limited to private call sites currently controlled by this module.
- **Benefit:** Fewer contradictory empty-state implementations; no reliable standalone byte-saving estimate because live and dead JSX/CSS share expressions/selectors.
- **Verification:** All four player/opponent selection combinations, switching/removal, empty slots and popup-owner removal; `battleVisibility`, `battleHub`, `battleMatchup` and shell checks.

### A03 — Two genuinely unused stat-helper exports

- **Files:** `src/battle/stats.js`.
- **Issue/evidence:** `ivStats` and `natureStatEffect` have no source, test or archive consumers and no internal calls. `ivNatures`, `natureOrder` and `emeraldStat` are used and must remain.
- **Action:** Remove only the unused constant/function, without changing the stat formula or nature indexing.
- **Risk:** Very low within this repository; these are not a published package API.
- **Benefit/measurement:** **401 bytes across 7 lines** of declarations/function text. Tree-shaking may already remove them, so this is source cleanup rather than a claimed download saving.
- **Verification:** Full unit suite, especially foundation/nature/opponent-stat fixtures, and production build.

### A04 — Ignored OS metadata

- **Files:** `src/.DS_Store`; `public/.DS_Store`; `public/pokemon/.DS_Store`; `public/pokemon/artwork/.DS_Store`; `public/pokemon/bdsp/.DS_Store`; `public/pokemon/emerald/.DS_Store`; `public/trainers/.DS_Store`; `public/types/.DS_Store`.
- **Issue/evidence:** Eight Finder metadata files, already covered by `.gitignore`, with no application/test references. Public-directory metadata is copied with public assets during builds.
- **Action:** Delete these local metadata files during an approved cleanup; retain the existing ignore rule. Finder may recreate them.
- **Risk:** Very low.
- **Benefit/measurement:** **98,336 raw bytes total**, of which **86,044 bytes** are in public assets. This is deploy-directory/disk hygiene, not JS savings or necessarily an HTTP transfer saving.
- **Verification:** Asset tests and build; check build output for accidental metadata. No UI changes expected.

## B. Low-risk simplification

### B01 — Finish retirement of the second calculator, with fixture and recovery gates

- **Files:** `src/battle/battleDamage.js`, `battleRetaliation.js`; `archive/retired-battle-calculator/**`; `test/battleDamage.test.js`, `battleRetaliation.test.js`, `battleAccuracy.test.js`, `battleAccuracyCorrections.test.js`, `battleFoundation.test.js`, `conditionState.test.js`.
- **Issue/evidence:** The two source modules have no application-entry path. They retain the old formula, special-move handling, ability/item paths and KO helpers alongside the replacement calculator. The archived `BattleDamageResults.jsx`, `damagePreview.js`, `koProbability.js`, styles and six retired test/browser files are outside active discovery and bundle inputs. Active tests still import the old source engine, so these are **not consumer-free deletions**.
- **Action:** First inventory independent numerical fixtures and transfer any unique, currently supported mechanics to the new calculator's tests. Keep old unsupported/KO fixtures as historical material, not as requirements to restore KO scope. Remove old-engine calls from mixed files without deleting their shared state/adapter/Speed tests. Once no active test imports remain, remove or relocate the old source modules. Retain the physical archive until a verified recoverable snapshot/commit includes its currently untracked contents; do not assume existing history contains them. Archive removal is a later optional choice.
- **Risk:** Low for runtime reachability, medium for losing independent reference evidence. Do not mechanically rewrite expected numbers from current production outputs.
- **Benefit/measurement:** Old source engine **16,452 bytes / 214 lines**, retaliation **2,755 / 33**, totaling **19,207 bytes / 247 lines**. Separate historical archive: **11 files / 79,458 bytes**. These do not overlap. Neither contributes to current JS size. Test reductions are not counted as savings because fixture preservation comes first.
- **Verification:** Full suite, new engine's independent rounding/type-order/special-move fixtures, both directions, Conditions inputs, all calculator browsers; retain the transitive retired-import guard. Confirm no KO UI returns.

### B02 — Distinguish test-only convenience APIs from production behavior

- **Files:** `battleConditions.js::displayedBattleStat`; `matchupPresentation.js::fasterSide`; `pokemonAdapter.js::frontierPokemonPool`; `towerRules.js::domeOrdinaryOpponentIVs`; their tests.
- **Issue/evidence:** These exports have test consumers but no runtime callers. Runtime highlighting uses `effectiveFasterSide`, and the hook constructs its pool through stable identities/adaptation. The Dome helper deliberately records a future cartridge exception; no Dome mode exists.
- **Action:** Remove convenience wrappers only after their tests exercise the actual runtime path or preserve their independent expectation in an appropriate fixture/comment. Consider retaining the documented Dome exception as reference rather than treating it as an abandoned feature flag. Do not delete `calculateBasicDamage` merely because scenarios drive the UI: that facade supports the new engine's independent tests.
- **Risk:** Low to medium depending on fixture migration.
- **Benefit:** Less test-only API surface and fewer tests that appear to protect UI code while exercising a different helper. No byte savings claimed before choosing what moves versus remains.
- **Verification:** Pool duplicate identities/clones/role assignments; effective Speed with stages, weather, status and uncertain abilities; foundation IV/rules assertions. Assert real runtime helpers, not newly mirrored formulas.

### B03 — Duplicate set and item lookup construction

- **Files:** `BattlePage.jsx`, `src/battle/towerSets.js`, `BattleMatchupShell.jsx`, `BattleSetItem.jsx`.
- **Issue/evidence:** BattlePage recreates a map of ordinary/Anabel sets even though `towerSetById` already provides that lookup. Two components each normalize item names and build maps from the same reference item names. Vite deduplicates the imported reference dataset; it does not eliminate the separate map constructions.
- **Action:** Use the existing set lookup for header membership. Share a small pure item-ID resolver, preserving the card's null/“None” handling and each component's independent failed-image fallback, size and loading attributes. Avoid a broad component abstraction.
- **Risk:** Low; normalize null values consistently and preserve Brain IDs.
- **Benefit:** One source of set identity/item matching truth; fewer repeated startup allocations. No measured latency or compressed-byte saving claimed.
- **Verification:** Ordinary/Anabel selection, level/trainer changes, saved-team loading, no-item/unknown-item/broken-item display and mobile header/card geometry.

### B04 — Small CSS consolidation and ineffective override

- **Files:** `src/ui/styles/battle.css`; imports of `section-heading.css` in Battle, Trainer and Pokémon profile styles.
- **Issue/evidence:** The min-360px `.battle-move-dot { padding-inline:3px }` declaration is superseded by the later same-specificity global `padding-inline:2px`. Trainer/Sets search-field rules repeat comparable styling. Battle imports shared heading CSS whose selectors target Trainer/profile elements; the other page styles already import it. Several graphite colors repeat.
- **Action:** Remove the ineffective 3px declaration while preserving the currently rendered 2px spacing. Optionally combine genuinely identical declarations/selectors. Review the redundant Battle-only heading import and unused Battle heading custom properties separately; **do not delete the shared stylesheet**. Do not introduce a new token system just to reduce lines.
- **Risk:** Low with computed-style comparisons; consolidation can change cascade order if careless.
- **Benefit:** Clearer cascade and less misleading styling. No whole-rule saving estimate because some declarations remain live.
- **Verification:** Move PP/effectiveness alignment, search input font/keyboard zoom behavior, selected metallic tabs and Trainer/profile headings; compare computed styles and 320/375/430px screenshots.

### B05 — Historical documentation needs a current entry point

- **Files:** `docs/BATTLE_FOUNDATION.md`, `DAMAGE_CALCULATOR.md`, `BATTLE_CALCULATOR_AUDIT.md`, `BATTLE_CALCULATOR_RESOLUTIONS.md`, `BATTLE_CALCULATOR_RELIABILITY.md`, `DAMAGE_CALCULATOR_RESTART.md`, Steps 2–6C docs, `FINAL_DAMAGE_CALCULATOR_AUDIT.md`; `src/battle/data/frontierNotes.js`.
- **Issue/evidence:** Foundation still describes the layer as not imported by the UI. Old calculator docs describe KO summaries, removed paths and previous formatting. Some correctly carry historical/restart banners, but the old document's replacement link points only to Step 2. `frontierNotes.js` is an unreachable 406-byte module containing two source-workbook provenance notes, not live application data.
- **Action:** Add a concise current architecture/scope index and explicit historical labels/links where missing; preserve numbered mechanics findings and independent fixture provenance. Move or retain the two workbook notes as documentation before considering removal of their runtime-shaped module. Do not erase audit history or present old KO promises as current functionality.
- **Risk:** Low; links and historical meaning must stay accurate.
- **Benefit:** Prevents accidental restoration of the wrong engine or unsupported KO scope. Historical docs and notes are not shipped bundle weight; no performance saving claimed.
- **Verification:** Resolve documented file paths and links against current source; ensure the new-engine chain below is correct and historical fixture references remain accessible.

### B06 — Make the existing browser suite reproducible before consolidating it

- **Files:** `package.json`; `test/*.browser.mjs`; existing synthetic fixtures and browser documentation.
- **Issue/evidence:** `npm test` discovers unit tests only. Browser scripts accept `PLAYWRIGHT_MODULE`, `CHROME_EXECUTABLE` and `BATTLE_URL`, but there is no package-level aggregate browser command or declared Playwright dev dependency. This audit used the already available cached runtime and a temporary runner. Several calculator scripts repeat synthetic-save/bootstrap/navigation setup; their stage names do not make their current assertions obsolete.
- **Action:** In a separate approved cleanup, document or add a portable browser runner using the existing script interfaces. Consolidate repeated setup only; retain independently derived expected values and regression identities. Keep stage-named scripts whose live assertions protect current behavior. Do not silently add dependencies as part of cosmetic cleanup.
- **Risk:** Low to medium: test-harness changes can hide discovery failures or couple formerly independent fixtures.
- **Benefit:** Reliable full-suite execution and less duplicated setup; no measured code reduction claimed.
- **Verification:** The runner must discover all 25 current scripts, fail on any child failure, use isolated contexts, and retain all current width checks. Verify fresh documented environment setup. Safari/device coverage remains a separate gap, not solved by renaming Chrome tests.

### B07 — Legacy condition-shape compatibility without a current UI writer

- **Files:** `src/battle/conditionState.js`, `setSpeedComparison.js`; `test/setRefinement.test.js` and condition tests.
- **Issue/evidence:** Projection merges legacy `conditionsByPokemon[id].stages` before side stages even though current reducers write stages to `field.playerStages/enemyStages`. Sets comparison also reads `conditionsByPokemon[id].abilitySelection`; current UI/reducers do not set that field, while refinement tests explicitly populate it. These are compatibility/test branches, not separate current user controls.
- **Action:** Document the supported condition shape first. Remove legacy fallbacks only if deliberately retiring their test-supported input contract; otherwise keep them with an explanatory comment. Do not remove conditions maps or move current stages back to identities.
- **Risk:** Low for current UI writes, medium for undocumented programmatic/test compatibility.
- **Benefit:** A clearer single state contract; no runtime performance claim.
- **Verification:** Per-identity HP/status, side stages/screens, switching and reset, uncertain ability Speed, existing explicit-ability refinement tests or an approved replacement contract.

## C. Higher-risk refactoring

### C01 — Split Battle loading without losing session state

- **Files:** `src/ui/App.jsx`, `useBattleState.js`, `BattlePage.jsx`, Battle dataset/reference imports.
- **Issue/evidence:** Static imports load the Battle code/data on Trainer startup. The source-map attribution and early module requests above demonstrate actual loading cost; the warning is not explained by dead old calculators alone.
- **Action:** Explore lazy Battle UI/data loading in a dedicated implementation stage. Splitting only `BattlePage` is insufficient if the eagerly imported hook/reducer still pulls Tower data. Preserve a stable owner for team, active selection, Rules and Conditions across page navigation, and preserve role reload when returning from My Pokémon. Measure the resulting initial chunk and deferred chunk before claiming savings.
- **Risk:** High: moving the hook below a conditional/lazy mount can reset the entire approved session state; loading/error boundaries need deliberate behavior.
- **Benefit:** Potentially smaller initial JS and less initial parse work. No promised gzip reduction: much of the code is deferred, not deleted, and shared dependencies remain.
- **Verification:** Cold load on Trainer; first Battle load/error; leaving/returning to every tab; roles/snapshot replacement; Conditions and saved-team integrity; complete suites and real iPhone Safari.

### C02 — Reduce hidden-tab and unfiltered Sets rendering cost

- **Files:** `BattlePage.jsx`, `BattleTrainers.jsx`, `BattleSets.jsx`.
- **Issue/evidence:** All tab panel components remain mounted. Trainers renders 302 results even while hidden. Unfiltered Sets expands the document from 2,570 to 38,638 elements; Sets already suppresses its list when inactive and memoizes opponent views. Repeated parent updates can still traverse the mounted Trainers result tree. No React timing profile was collected, so exact rerender milliseconds are not claimed.
- **Action:** First profile representative Conditions updates/search on a phone. Consider an inactive-list guard that retains Trainers query state, or narrowly memoized rows/derived search results. Evaluate larger Sets strategies separately; do not impose scroll containers, fixed viewport heights or new pagination without product approval.
- **Risk:** Medium/high: unmounting all panels loses local Teams editor/query state; careless memo keys can stale trainer IVs/rules/disabled states or alter focus/search behavior.
- **Benefit:** Fewer hidden DOM nodes and less reconciliation work, supported by counts rather than invented timing gains.
- **Verification:** All five tabs, focus-clears-search behavior, trainer changes, hidden set restoration, team editor retention, full/duplicate disabled entries, level/IV/Conditions updates, keyboard navigation and natural page scrolling.

### C03 — Separate runtime data from preserved reference fields

- **Files:** `src/battle/data/frontierPokemon.js`, `frontierBrains.js`, `frontierTrainers.js`, `frontierAdapter.js`, `towerRules.js`; foundation fixtures/docs.
- **Issue/evidence:** Opponents are recalculated from base stats, IVs, EVs, nature and level. `level50Stats`, `level100Stats`, `level50Speed`, `level100Speed` are retained reference fields, not current runtime reads. Compact JSON measurement for 882 ordinary sets is 390,228 bytes; removing just those fields in memory yields 223,653, a **166,575-byte raw difference / 29,858-byte isolated gzip difference**. The 42 Brain rows show a further **7,957 raw / 1,633 isolated gzip** difference. Only six Anabel rows are exposed to Tower, yet the full 42-row array is in the chunk. Trainer association lists also dominate data, but their redundancy was not proven safely removable.
- **Action:** Consider generating a runtime projection while retaining canonical datasets and independent reference fixtures intact. Restrict Tower's shipped Brain projection without deleting non-Tower historical data. Do not reorganize originals or derive test expectations from the same runtime transformation during cleanup.
- **Risk:** Medium/high: preserving source provenance, exceptional NPC EVs, trainer associations, fixed IVs, all IDs and missing-data behavior matters more than shrinking files.
- **Benefit:** Measured data-representation opportunity, **not a guaranteed final bundle saving**. Isolated JSON gzip differences cannot be added directly to whole-chunk gzip savings; they also overlap with moving the same data under C01.
- **Verification:** Every set/trainer association; all source counts; six Anabel sets; every supported Open Level/IV tier; Shuckle provenance and Shedinja override; full independent numerical fixtures and build-size comparison.

### C04 — Asset variants require a separate shared-asset decision

- **Files:** `public/pokemon/{bdsp,emerald,artwork}/**`; dynamic sprite/artwork callers; `test/collectionAssets.test.js`; `docs/my-pokemon-stage-1.md`.
- **Issue/evidence:** No runtime `bdsp/` URL consumer remains; **772 BDSP PNGs total 67,733,486 bytes**, but `collectionAssets.test.js` still explicitly checks them. No runtime consumer constructs `emerald/shiny/` (386 PNGs / 281,299 bytes). Nine named alternate-form artwork PNGs total **1,330,742 bytes**; current artwork URLs use numeric dex IDs and do not choose those named forms. Historical documentation records these assets. These are candidates, not confirmed Battle-exclusive waste.
- **Action:** Review the intended shared asset inventory separately before deleting variants; align stale asset tests with current gallery/profile/Matchup paths and preserve future/reference assets if desired. Do not delete shared normal/shiny numeric artwork, normal Emerald sets sprites, or box sprites. Named-form artwork absence from runtime is not authorization to change Forecast presentation.
- **Risk:** Medium/high and partly outside Battle ownership: shared pages, tests and intended future artwork support must be considered.
- **Benefit:** Candidate pools total **69,345,527 raw bytes** (67,733,486 + 281,299 + 1,330,742). This is an upper-bound review inventory, **not approved safe savings**. Public files are copied to dist but images load by URL on demand; removing unrequested files does not reduce initial JS or initial image transfer.
- **Verification:** All species/normal/shiny/egg gallery/profile/showcase and Battle image URLs, dynamic path inventory, asset tests, build output and screenshot checks. Preserve image fallback behavior. Requires explicit shared-asset approval before implementation.

## D. Keep unchanged

### D01 — Current calculator boundaries and shared mechanics

- **Files:** `BattleMoveDetails.jsx`, `BasicDamagePreview.jsx`; `basicDamage.js`, `damageModifiers.js`, `fixedDamage.js`, `variableDamage.js`, `specialDamage.js`, `damagePresentation.js`; shared `battleConditions.js`, `battleMoveEffectiveness.js`, `hiddenPower.js`, `typeMatchups.js`, `reference.js`, stat/adapters/save utilities.
- **Concern/evidence:** The active path is `BattleMatchupShell → BattleMoveDetails → BasicDamagePreview → basicDamageScenarios`, with dedicated new special-move modules. Shared helpers still feed move metadata, row effectiveness, effective types, Speed and independent tests. Similar-looking calculations serve different purposes: row effectiveness is not the same as full damage arithmetic; raw stats, displayed staged numbers and effective Speed are intentionally distinct.
- **Action:** Keep the new implementation and shared mechanics. Do not merge it back with old `battleDamage.js` or KO helpers. Do not delete a helper merely because both calculators once used it. No unsupported move expansion or formula changes are part of cleanup.
- **Risk of removal/consolidation:** High numerical and scope regression risk.
- **Benefit of retention:** Preserves established cartridge ordering, uncertainty and current supported scope.
- **Verification if touched later:** Independent H05 Ice Beam/Charizard type-order and rounding fixtures; STAB, immunity/Levitate, items/abilities, all conditions, fixed/variable/special cases, Earthquake eligibility and restored 39-move fixtures, both directions. Keep raw stats separate so stages cannot be applied twice.

### D02 — State ownership, identity and persistence boundaries

- **Files:** `useBattleState.js`, `battleState.js`, `conditionState.js`, `BattleTeams.jsx`, `BattleConditions.jsx`, `src/storage/battleTeams.js`, role/identity storage.
- **Concern/evidence:** Session state intentionally lives in App, saved team definitions persist separately, and full-collection identities prevent clone/species confusion. HP/status follow identities; stages/screens follow sides. Hiding/unselecting either side must not clear Conditions. The hook re-reads roles on Battle visibility; replacing that effect with static memoization would miss role changes. HP inputs need local draft state to allow editing before clamp/blur. Loading/error/editor state protects corrupt saved-team storage from silent overwrites.
- **Action:** Keep these ownership boundaries. Do not remove local draft/error/editor state as duplication. Active team removal must remain independent of saved definitions. Broader reducer/provider changes are not justified solely for tidiness.
- **Risk of simplification:** High persistence/identity regression risk. Future lazy loading must address this explicitly.
- **Benefit of retention:** Navigation, reset, team/trainer changes and imported save integrity remain predictable.
- **Verification:** `conditionState`, Battle state/hub, teams and staged-stat suites; role-return refresh, corrupt/failed localStorage handling, reset and current HP/rules switching. No demonstrated persistence defect was found in the exercised baseline.

### D03 — Touch suppression, live popup resolution and dismissal

- **Files:** `BattleTeamHeader.jsx`, `BattleMatchupShell.jsx`, `BattleMoveDetails.jsx`, `FrontierTrainerSprite.jsx`.
- **Concern/evidence:** Player slot double-tap logic checks pointer timing/distance, suppresses compatibility/consumed clicks, and preserves keyboard behavior. Simplifying to native `onDoubleClick` risks mobile duplicate removals after index shifts. Popup stores side/slot and resolves live Pokémon/move rather than holding stale calculated results. Its owner/tab guard, dialog cleanup, outside-pointer tracking and focus restoration remain necessary. Trainer empty/broken-image fallback is live, unlike A02's private card placeholders.
- **Action:** Keep these mechanisms and fallback handlers; no close-X restoration or active-header decoration. Existing refs/effects are not dead code.
- **Risk of simplification:** High mobile interaction/accessibility risk.
- **Benefit of retention:** Prevents accidental removals and stale popup data while maintaining dismissal and focus.
- **Verification:** `battleHeaders`, `battleHub`, `battleInformationalPopup`, `restoredDamageReview`, direction/switch/live Conditions tests; actual iPhone tap sequences after any future refactor.

### D04 — Approved CSS architecture is largely intentional

- **Files:** `src/ui/styles/battle.css`, shared palette/base/page/heading styles.
- **Concern/evidence:** Battle CSS is **23,739 bytes / 248 lines**, with **zero `!important` declarations** and only **two media blocks**. The repeated `.battle-move-dialog` rule supplies a deliberate `100vh` then `100dvh` fallback; it is not a duplicate to remove blindly. Dynamic side/stat/percentage classes and the compact negative-margin/set-row arrangements are active. There is no evidence supporting broad CSS replacement.
- **Action:** Keep graphite colors, metallic selected tabs, natural document flow, side-by-side columns, popup viewport safeguards, original-stat bars and unchanged Conditions dimensions. Restrict cleanup to proven dead declarations or equivalent consolidation.
- **Risk of redesign/consolidation:** Medium/high on narrow Safari layouts.
- **Benefit of retention:** Preserves approved presentation and mobile fit.
- **Verification:** Existing 320/375/430px suites and screenshot comparisons; real Safari for viewport-unit/input changes. Do not add page scroll restrictions or shrink typography/icons.

### D05 — Dynamic asset families and duplicate bytes are not dead files

- **Files:** `public/trainers/**`, `public/pokemon/{box,emerald/normal,artwork}/**`, `public/items/**`, `public/types/icons/**`; Battle image callers and shared Trainer/profile/collection components.
- **Concern/evidence:** All **302 trainer entries resolve 51 unique Frontier sprite URLs**; the Frontier directory contains exactly those 51 PNGs, with no missing or extra PNGs. Brendan/May Emerald sprites serve Battle; the original Brendan/May artwork still serves TrainerShowcase. Box sprites (386 / 102,170 bytes), normal Emerald sprites (386 / 281,299), numeric normal/shiny artwork, item-ID URLs and type icons use constructed URLs. Static-import-only asset analysis would incorrectly delete them. Hash analysis found 16 duplicate-content groups with 40,022 redundant bytes across public assets, primarily ID-addressed item images; distinct item IDs still need valid URLs.
- **Action:** Keep runtime-addressable assets and filename capitalization. Do not delete identical-content item icons without a deliberate canonical URL/alias strategy. Review only C04's distinct candidate pools separately. No unused VS/platform/card mockup asset was identified that can safely be deleted from this inventory.
- **Risk of removal:** High broken-image risk; byte identity does not imply interchangeable URL contracts.
- **Benefit of retention:** Covers all valid dynamic species/item/trainer paths, including values absent from the current screenshot.
- **Verification:** Enumerate dynamic URL domains, asset tests, both trainer genders, ordinary/Anabel trainers, item fallbacks and shiny/normal views; do not rely only on currently visible network requests.

### D06 — Independent regressions, provenance and intentional future restrictions

- **Files:** Current calculator/foundation/shared-mechanics tests, `battleInformationalPopup.test.js`, browser scripts, archive README, source provenance notes, Rules UI.
- **Concern/evidence:** Passing 330 tests includes old-engine/test-only APIs as well as current behavior, so test count alone is not proof that a specific active formula is protected. Conversely, old stage filenames can contain important current tests. The transitive application-import guard rejects retired engine/preview/KO wiring. Rules' disabled future facility/format controls are intentional placeholders, not hidden executable feature flags. Historical notes preserve cartridge anomalies and source findings.
- **Action:** Keep independent expected rolls, type-order checks, numeric fixtures and active UI assertions; preserve the retired-import guard. Do not lower counts as a cleanup objective, delete historical evidence wholesale, enable future Rules choices, or restore KO messages. Label historical consumers accurately before migration.
- **Risk of removal:** High loss of numerical independence, scope or recovery evidence.
- **Benefit of retention:** Maintains trust in the replacement engine and protects agreed functionality.
- **Verification:** Full suite and browser inventory; prove replacement tests cover each migrated fixture independently. Archive recovery must be verified before deletion, especially while untracked.

## State and coverage assessment

The inspected state paths preserve the approved behaviors: identity-based player selection and duplicate prevention; stable team removal; active clearing; opponent-trainer clearing without player/Rules/Conditions reset; saved-team definitions separate from active team; both independent Matchup columns; Conditions only visible with both selections; persistent manual HP/status/stages/screens; stage-adjusted displayed numbers with unchanged bars; popup move resolution and both attack directions. Existing unit/browser coverage exercises these behaviors.

No newly demonstrated state bug is being proposed for a fix in this audit. Relevant risks are future conditional unmounting/lazy loading, undocumented legacy condition fields, and stale asset-test coverage. Cross-tab/window saved-team storage synchronization is not implemented; it is not an agreed requirement or a reason to rewrite current persistence. Physical Safari coverage and a portable browser-suite invocation are verification gaps. No claim is made that current Chrome emulation establishes iPhone Safari correctness.

## Measured savings ledger — avoid double counting

| Candidate | Measured inventory | Conditions / actual impact |
| --- | ---: | --- |
| A01 placeholder/empty CSS | 276 bytes of rule text | Plus unused declarations; not a meaningful download claim. |
| A03 dead stat helpers | 401 source bytes / 7 lines | Likely tree-shaken already. |
| A04 OS metadata | 98,336 bytes | Includes 86,044 public bytes; ignored metadata may recur. |
| B01 inactive engine/retaliation | 19,207 source bytes / 247 lines | Requires test-fixture migration; zero current bundle saving. |
| B01 retirement archive | 79,458 bytes / 11 files | Optional after verified recovery; zero current bundle saving. |
| B05 workbook-note module | 406 source bytes / 2 lines | Preserve provenance first; zero current bundle saving. |
| C03 stat reference-field projection | 174,532 compact-JSON bytes | 166,575 + 7,957; isolated gzip deltas total 31,491, not whole-chunk savings. |
| C04 candidate image pools | 69,345,527 bytes | Not approved safe deletion; shared/test/history review required. |

Immediately supported A-category measured cleanup is **401 source bytes, at least 276 CSS bytes, and 98,336 metadata bytes**, plus the unquantified private JSX/fallback CSS and unused custom properties. **Safe removable Pokémon/trainer/item art identified: none.** Large image/data numbers are conditional opportunities, not safe-removal totals. Do not add C01's deferred bytes to C03's deleted projection bytes, or count metadata twice as both source and public savings.

## Recommended implementation order

1. Approve a small A-category cleanup, verify unchanged UI and numerical fixtures, and review that diff by itself.
2. Preserve a recoverable copy of currently untracked retirement work. Migrate unique old-engine fixtures before removing old runtime-shaped source/test dependencies (B01/B02).
3. Consolidate lookups and proven CSS redundancies; clarify docs, test commands and condition-shape contracts (B03–B07). Keep changes individually reviewable.
4. Measure phone performance, then separately approve lazy loading/rendering work (C01/C02), preserving App-owned state and tab-local edits/search.
5. Consider runtime data projections and shared asset inventories only as distinct scoped changes (C03/C04). Preserve originals/provenance and independent oracles.
6. After each approved stage: relevant targeted checks, complete unit suite, affected browser tests, production build and phone Safari review where interaction/layout/loading changed.

**Stop point:** audit delivered. No recommendation is authorized or applied by this document. Wait for review before cleanup. A fresh development chat after agreeing on the cleanup stage would keep implementation context focused.
