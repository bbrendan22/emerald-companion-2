# Pokémon Database cleanup and stabilization

## Architecture overview

`ResourcesPage.jsx` owns the separate homepage/catalog queries, catalog selection and selected National Dex ID. It supplies the shared static Emerald Companion header context and direct Back callbacks. Catalog entries retain canonical National IDs, three-digit numbers, local sprites and source-order typing. Search, focus targets and return-origin refs serve distinct navigation levels and are intentionally retained.

`SpeciesProfile.jsx` is one mounted species profile driven by `dex`. Its identity, five-tab bar and artwork-only evolution navigation are shared across species; Back always returns directly to the originating Pokédex query. Overview derives canonical data through `speciesOverview.js`; Stats uses existing My Pokémon stat scaling/colors and Gen 3 defensive-chart helpers; Locations and Learnset use faithful, isolated legacy ports; More formats verified Emerald scalar attributes. Native details elements provide independent disclosures. No new navigation stack or application state layer is present.

Canonical sources remain `reference.json`, `pokemonTypes.json`, `profileReference.json`, verified `resources/data/{overview,more}.json`, and the original ported encounter/learnset tables with source hashes. Learnset reuses the existing static move-reference table, not Battle state/calculation logic. All-species Locations/Learnset verification runs against read-only 1.0 modules and original JSX.

## Issues identified and conservative changes

1. Learnset summary borders were gold even while collapsed. This was the only visual defect authorized for correction.
2. `internalIdForDex` recreated `Object.keys` and scanned up to 386 records on every call. It now reads a private Map initialized once. Numeric/string normalization and returned internal-ID strings remain identical. The port generator emits the same implementation, preventing regeneration from undoing the cleanup.
3. The universal profile recomputed its full overview/evolution view model whenever its selected tab changed. A `useMemo` keyed only by the selected National ID retains that pure view model until the species changes. No extra state or global cache was added.
4. Removed two demonstrably unused CSS rules: disabled-tab cursor styling (all five tabs are enabled) and a search-field direct-SVG rule (the approved search component contains no such SVG). Neither removal affects rendered elements.

No dataset, encounter/learnset algorithm, application state model or component hierarchy was rewritten. Legacy-port exports used by parity tooling are not treated as dead code. Replacing whole components or consolidating every historical adapter would create risk without a concrete benefit here.

## Learnset divider correction

Locations uses a **1px** subdued divider `#ffffff0b` when collapsed and a **1px** gold divider `#f4b40055` when expanded. Learnset now uses those exact colors and thickness on its existing summary divider, with `[open]` selecting the gold state. Its existing padding, dimensions, line position and spacing are preserved; no Locations rule is changed.

The five Learnset groups still start closed, toggle natively and can open independently. Game-name text retains the exact original palette; arrows, text, backgrounds, icons, move details and all unrelated borders remain unchanged. Browser assertions check closed → open → closed colors and confirm summary typography, padding, thickness, marker color and background do not change on toggle.

## Reliability, data integrity and performance

- The ID-map regression test checks every internal/National mapping, padded numeric strings and invalid inputs.
- Asset inventory tests cover all 386 Emerald sprites, all 386 identity artwork files (including the existing Deoxys Speed asset), and all 17 type icons. A read-only Pillow audit also validated all PNG files. No artwork was added, replaced or downloaded.
- `tools/verifyPokemonDatabase.mjs` checks all 386 names, IDs, generations, Gen 3 types, gender thresholds, ability IDs/descriptions, Emerald entries, More attributes and My Pokémon stat-bar scaling against existing references/legacy. All **6,562** defensive attacking-type/species combinations agree with the legacy Gen 3 chart. Existing tests retain exact type-list order, actual typing order, stat totals/colors and known immunity/Steel/Shedinja cases.
- One intentional reference difference is documented rather than changed: legacy's raw Deoxys record uses Normal Forme base stats; approved 2.0 uses Emerald Speed Forme (50/95/90/95/90/180 in HP/Attack/Defense/Sp. Attack/Sp. Defense/Speed order). Existing Speed artwork, stats/scaling and form-specific Learnset behavior remain intact.
- A local illustrative 10,000-call lookup benchmark improved from about **58.3ms to 1.3ms**, with identical checksum/results. This is not a timing-sensitive test or a universal performance claim.

## Reusable helpers already present

- `reference.moves` / `reference.abilityNames`, `resources/search.js` and its canonical search projection provide existing name/ID lookup inputs for later work; no new Moves/Abilities feature was started.
- `GEN3_TYPE_DISPLAY_ORDER` is already shared by ordered type interfaces. Species typing and gameplay-significant source order remain untouched.
- `internalIdForDex`, canonical species metadata adapters and `speciesByDex` already distinguish National IDs from cartridge IDs. The lookup itself was optimized without moving APIs or introducing another normalization framework.
- `baseStatPercent`, stat-field definitions and `typeMatchups` already supply shared calculations, so no alternative scales/charts were introduced.
- Learnset's original GameNames component and Locations' scoped text palette agree exactly. They remain separate because unifying CSS and JSX tokens would require touching the explicitly protected Locations styling; no speculative theme framework was added.

## Code deliberately left unchanged

Resources homepage, catalog/search/filter behavior, query/return refs, static shared header design and Back callbacks; identity/artwork/types; Overview and evolution grid; Stats layout, scaling and colors; Locations grouping, styling, colors and closed defaults; Learnset data/content/order/interactions; More formatting; all verified datasets. No Trainer, owned Pokémon, Battle, Settings, save or persistence code changed.

The pure static move table still lives under the historical Battle data path; extracting it to a new common-data module would require changing protected consumers and is deferred. Port helper adapters and original unused-but-audited exports remain to keep faithful reproduction/parity straightforward. Missing-data fallback UI remains useful reliability handling, not an obsolete placeholder. Moves/Abilities name catalogs that predated this audit are untouched.

## Remaining technical debt deliberately deferred

- Large encounter/cross-game tables are eagerly imported. The production bundle is approximately 385kB gzip and triggers the existing chunk-size warning. Lazy loading/data compaction would affect loading behavior and deserves a separate scoped task, not a cleanup rewrite.
- Ported helpers favor fidelity over indexing/caching all encounter, evolution and Learnset calculations. Broader caches would increase retained memory and complicate source parity; no need was established for that work here.
- Current catalog entry still contains its pre-existing `window.scrollTo({top: 0})` and existing focus behavior. Those calls were identified but **not changed**, per the explicit scrolling exclusion. No sticky positioning, overflow rules, custom containers, scroll locking/restoration/snapping, or new scroll controls/handlers were added.
- Historical milestone documents describe earlier implementation stages; this document describes the current five-tab architecture. Exact legacy game colors and historical event/data limitations remain intentional.

## Verification

Pre-edit baseline: **364 unit tests**, **31/31 browser scripts**, production build and all-species Locations/Learnset data/render parity passed. Pre-edit screenshots and DOM/computed-style snapshots were captured for every profile tab at 320/375/390/430/1280px before any source changes.

Post-cleanup: unit suite and build pass; all-species Locations and Learnset parity pass with unchanged legacy hashes. Full browser and final visual-comparison results are recorded below when complete.

Legacy 1.0 is strictly read-only throughout. No dependency, dataset replacement, Moves/Abilities implementation, commit or push.

### Final results

- **366/366 unit tests pass** (baseline 364; two new ID/asset integrity regressions).
- **31/31 browser scripts pass** both before and after cleanup. Final Learnset assertions cover closed/open/closed divider transitions, simultaneous native groups, exact game-name colors, unchanged summary appearance, all 386 species and all five widths. Locations remains closed by default and its existing color/grouping/navigation checks pass.
- Production build passes with the existing large-chunk warning; final gzip JS is approximately **385.45kB**. No lazy-loading or unrelated bundle refactor was introduced.
- All-species Locations and Learnset data/render parity passes, with unchanged legacy source hashes and only their already documented wrapper/icon/default-state normalizations. The broader 386-species / 6,562-matchup integrity audit passes, preserving the documented Emerald Deoxys Speed exception.
- **30 before/after DOM snapshots are identical**, covering all five tabs plus expanded Learnset at 320/375/390/430/1280px. Computed summary geometry, spacing, typography, colors, backgrounds and arrow colors match; only collapsed Learnset divider color differs. Pixel comparisons confirm text/layout/background equality: 20 captures are pixel-identical, five show the authorized divider change, and six have browser image-raster variation confined to unchanged artwork/type-image bounds (categories overlap). No other visible change was found.
- Full PNG validation covers 772 sprite/artwork images plus type icons. Actual browser icon/sprite decoding, no-save operation, overflow, Back/query retention, evolution-artwork switching and existing page regressions pass.
- All scrolling code, shared header design, approved content/styles and legacy files remain untouched, apart from the explicitly authorized Learnset divider correction and removal of rules matching no rendered elements.

### Files added or modified in this cleanup

- Modified: `src/ui/styles/species-learnset.css`, `src/ui/styles/species-profile.css`, `src/ui/styles/resources.css`, `src/ui/pages/SpeciesProfile.jsx`, `src/resources/locations/data/pokemonMeta.js`, `tools/portResourcesLocations.mjs`, `test/speciesLearnset.browser.mjs`.
- Added: `test/pokemonDatabaseIntegrity.test.js`, `tools/verifyPokemonDatabase.mjs`, `docs/POKEMON_DATABASE_CLEANUP.md`.

Moves/Abilities work was not started. No commit or push.
