# Resources: Move Coverage port

## Legacy inspection (read-only)

Inspected in `~/Desktop/emerald-companion`:

- `src/components/MoveCoverage.jsx`: complete UI, state and pointer/keyboard interactions.
- `src/utils/moveCoverage.js`: roster construction, filtering and grouping.
- `src/utils/typeMatchups.js` and `src/data/typeChart.js`: Gen 3 type product and chart.
- `src/data/pokemonMeta.js`, `src/data/evolutionResources.js`, `src/data/frontierPokemon.js`: species, evolution and Frontier roster dependencies, inspected directly and through exact data comparisons.
- `src/components/ResourcesPage.css`: coverage rules at 1035–1067 and database scrolling rules.
- `src/emeraldNeon.css`: shared resource and scrolling overrides.
- `src/components/ResourceHeading.jsx`: heading and scroll-to-top behavior.
- `src/components/ResourceTypeIcons.jsx`: local icon convention.
- `src/components/ResourcesPage.jsx` and `src/components/AppNavigation.jsx`: integration.
- `tests/moveCoverage.test.js`: all original tests, ported with import path changed only.

No files in legacy 1.0 were modified or generated.

## Original functionality and hierarchy

The original selects **attacking types**, not move names. All 17 Gen 3 types are independently toggleable, with no four-selection limit. Controls occupy two rows (nine then eight buttons), each showing an icon and type label. Selected types retain color; unselected icons are dimmed/grayscale. Pointer movement over 10px and cancelled pointers do not toggle. Keyboard activation toggles once.

Roster controls: All Pokémon (386), Fully evolved (214), Frontier (376). Fully evolved means no outgoing Gen 3 evolution; Frontier means a species occurs in the existing Frontier set dataset, not merely that it is legally eligible. Changing roster preserves attacking selections.

For each species, multiply the selected attacking type's chart multipliers across its unique defending types; take the maximum across selected attacking types. Each species appears exactly once. Buckets are always ordered 0, 0.25, 0.5, 1, 2, 4, classified Immune, Resisted, Neutral, Super effective. Pokémon retain National Dex order inside each bucket. All six buckets, including empty ones, are shown after selecting a type.

Six totals, roster population and the “Best type effectiveness” note remain. Results show sprites and names. Empty selection gives zero totals and a selection prompt. Clear types appears only with a selection; it clears types while retaining the roster. There is no legacy full reset. Leaving and reopening creates the original empty/all initial state.

## Data and calculation dependencies

`src/resources/coverage/moveCoverage.js` retains the legacy roster/filter/group algorithm. Adapters reuse canonical 2.0 species reference, species types, existing evolution edges, Frontier set data and `typeMultiplier`. Internal species ID strings and National Dex numbers remain distinct. Defending types retain canonical primary/secondary order.

The original port was chart-only. The subsequent guaranteed-ability update below applies five defensive immunity abilities. Items, weather, STAB, move power, physical/special categories and damage remain outside this type-based tool. Unknown attacking types and unknown roster modes retain the pure helper's original fallback behavior, though the UI exposes only valid values.

## 2.0 integration and visual adaptation

Added:

- `src/resources/coverage/MoveCoverage.jsx`
- `src/resources/coverage/moveCoverage.js`
- `src/resources/coverage/moveCoverage.css`
- `test/moveCoverage.test.js`
- `test/moveCoverage.browser.mjs`
- `tools/verifyMoveCoverageParity.mjs`
- This document.

Modified only navigation in `src/ui/pages/ResourcesPage.jsx` to activate Move Coverage and use the existing temporary header Back arrow. Updated `test/resources.browser.mjs` to expect four active Tools links.

Presentation changes: graphite/light-text Resources styling; yellow/gold selection accents and section dividers; transparent controls instead of legacy panels; existing `/types/icons/` images and `/pokemon/emerald/normal/` sprites; 620px content maximum. Type and roster selections keep persistent selected-state styling, without hover/pressed effects or animations. Layout and information hierarchy stay intact.

Intentional differences from 1.0:

1. Attacking type display follows required 2.0 ordering: **Steel before Ghost**, rather than the legacy Ghost-before-Steel order. Calculations do not depend on selection display order.
2. The shared application Back arrow replaces the legacy in-content Back button.
3. Legacy custom result scrolling, shell overflow locking, fixed-height controls and heading scroll-to-top behavior are **not ported**, per the explicit scrolling restriction. The tool uses the application's existing page flow; no scrolling/overflow rules or commands were added.
4. Assets use 2.0's paths and styling; species records, rosters, results and result order are unchanged.

## Initial port parity verification (before ability support)

Run `node tools/verifyMoveCoverageParity.mjs [legacy-root]` (default `../emerald-companion`). This reads the original modules directly without writing into 1.0.

Passed:

- Deep equality of all 386 complete species records, including internal IDs, names, generations, Dex IDs and type order.
- Exact roster equality: 386 all, 214 fully evolved, 376 Frontier; unknown-mode fallback also matches.
- All 289 Gen 3 attack/defense matchups match the legacy chart, including Steel resisting Ghost and Dark.
- 966 input sets × four modes = **3,864 exact ordered group comparisons**: empty, every single, every pair, every triple, all types, duplicates, unknown-type fallback and 128 deterministic multi-type selections.
- No data or calculation discrepancies found.

## Initial port tests and review (before ability support)

- Full unit suite: **402 passed**, including all three original Move Coverage tests.
- Production build: passed; Vite retains its existing large-chunk warning.
- Move Coverage browser checks: passed at 320, 375, 390, 430 and 1280px. Verified exact ordered groups, all filters, clear retaining filter, reopen defaults, keyboard/touch activation, dragged/cancelled pointer behavior, local type image decoding, all 386 sprite paths, header/Back and no-save operation. Layout containers have no custom scrolling or fixed/sticky positioning; no horizontal overflow. 320px screenshot visually inspected.
- Full browser suite: **38/38 scripts passed**, including Resources, all three calculators, Moves, Abilities, Items, all species-profile tabs, Trainer, My Pokémon/showcase, Battle and damage checks. Scripts ran against `http://127.0.0.1:5189` with installed Chrome and bundled Playwright. No test failures remain.

No dependencies added; no protected calculator/feature files or shared header styling changed; no commits or pushes.


## Guaranteed defensive ability update

The current implementation applies only **Levitate, Flash Fire, Water Absorb, Volt Absorb and Wonder Guard** when the canonical Emerald species record contains one distinct nonzero standard ability. Repeated slots (Vibrava/Flygon list Levitate twice) are deduplicated. The ability is resolved using internal species IDs, not National Dex IDs or names. No ability dataset is duplicated or edited. No ambiguous/missing standard ability records were found.

Guaranteed holders (23):

- Levitate (17): Gastly, Haunter, Gengar, Koffing, Weezing, Misdreavus, Unown, Vibrava, Flygon, Lunatone, Solrock, Baltoy, Claydol, Duskull, Chimecho, Latias, Latios.
- Flash Fire (3): Vulpix, Ninetales, Flareon.
- Water Absorb (1): Vaporeon.
- Volt Absorb (1): Jolteon.
- Wonder Guard (1): Shedinja.

Calculate the normal dual-type product first, apply the guaranteed immunity next, then choose the best result across selected attacking types. Wonder Guard changes products of 1 or less to zero; Shedinja remains vulnerable to Fire, Flying, Rock, Ghost and Dark. Existing type immunities remain zero. Species with alternative standard abilities retain ordinary type-chart coverage.

**Thick Fat support was removed at the user's request.** Fire and Ice coverage for all its holders uses the normal type chart. No 0.125× group, total or display support was added. The only buckets remain 0, 0.25, 0.5, 1, 2 and 4. No move-specific interactions, weather, conditions or later-generation mechanics were introduced.

Files in this update:

- Added `src/resources/coverage/defensiveAbilities.js`: pure scoped multiplier helper and derived guaranteed-ability lookup.
- Updated `src/resources/coverage/moveCoverage.js`: use ability-adjusted products before best-type selection.
- Added `test/moveCoverageAbilities.test.js`: complete holder lists, mandatory examples, ignored alternatives, dual typings, Wonder Guard, unaffected type data and group integration. Removed the experimental Thick Fat logic and its specific tests.
- Updated `test/moveCoverage.browser.mjs`: assert the five immunity cases and conditional non-immunity results in the actual UI.
- Updated `tools/verifyMoveCoverageParity.mjs`: retain exact species/roster/chart checks and ordered group parity for the 363 species without approved guaranteed abilities. Differences for the other 23 are intentional and independently covered by focused tests.
- Updated this document.

Verification: all **407 unit tests pass**, production build passes (existing Vite chunk-size warning remains), and **3,864 ordered legacy comparisons** pass for unaffected species, plus exact 386-record, three-roster and 289-matchup parity. Move Coverage browser checks pass at 320, 375, 390, 430 and 1280px, including all five immunity cases, alternative-ability species, live changes, filters, Clear types, local assets, Back/no-save operation, no horizontal overflow and no custom scrolling. The previous 38-script browser run above describes the original port; it is not a claim that all scripts were rerun for this update.

No JSX, CSS, inputs, results layout, icons, navigation, scrolling, canonical datasets, Battle code or other pages changed during this update. No new dependencies, commits or pushes.
