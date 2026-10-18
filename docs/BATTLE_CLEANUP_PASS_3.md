# Battle cleanup Pass 3 — final small simplifications

Scope: B03, B04 and B05 only. No formula/mechanics, Conditions/state/persistence, selection/touch, popup, asset/dataset or unrelated-page changes. No commit, push, GitHub or deferred performance work.

## Changes made

### B03: shared set/item lookups

- `src/ui/pages/BattlePage.jsx` now uses the existing `towerSetById` instead of constructing another ordinary/Anabel map. Its keys and undefined/missing-set behavior are equivalent; selection dispatches and header rendering are unchanged. `towerSets.js` itself did not need modification.
- Added `src/battle/itemLookup.js`: one module-private name-to-ID map and one pure string-input `battleItemId` lookup. Both `BattleSetItem.jsx` and `BattleMatchupShell.jsx` use it instead of constructing separate maps.
- Preserved caller-specific behavior: Sets still passes its original string input and rejects null/undefined as before. Matchup still converts null/undefined to an empty string before lookup, retains its existing None/unknown-item display logic and does not introduce another user setting. The local card normalizer remains for that display logic, not a second item map.
- Image-error state/handlers, text, dimensions and loading attributes are unchanged: Sets12×12 and lazy; Matchup20×20 with its existing default loading behavior. Unknown item IDs still produce no image.
- Added two independent item-lookup tests with literal IDs/aliases and edge cases. No existing test assertion was removed or weakened.

### B04: proven redundant CSS only

- Removed the ineffective min360px `.battle-move-dot { padding-inline:3px }` declaration (44 source bytes including whitespace/newline). The later global2px declaration remains untouched, so computed padding does not change.
- Removed Battle's redundant `@import './section-heading.css'` (33 source bytes). Trainer and Pokémon profile retain their own imports; the shared stylesheet and its heading rules are unchanged. All page imports are still eager; this is not lazy-loading work.
- No other declarations were consolidated. Responsive breakpoints, graphite colors, selected metallic tabs, font/icon sizes, layout/spacing, Conditions dimensions, natural scrolling and the intentional100vh/100dvh popup fallback remain unchanged.

### B05: current documentation and preserved provenance

- Added [BATTLE_ARCHITECTURE.md](BATTLE_ARCHITECTURE.md) as the current entry point: five tabs; App-owned session state and separate saved definitions; explicit persistent Conditions; new calculator chain/mechanics/support boundaries; data/adapters/lookups/assets; numerical tests; historical materials and the verified recovery location.
- Preserved both source-workbook notes **verbatim** in that document before deleting the unreachable `src/battle/data/frontierNotes.js` (406 bytes /2 lines). No source/test/archive consumer imports it; historical Foundation/audit references remain as historical references. All other datasets are unchanged.
- Updated only the opening historical banners in `DAMAGE_CALCULATOR.md`, `BATTLE_CALCULATOR_AUDIT.md`, `BATTLE_CALCULATOR_RESOLUTIONS.md`, `BATTLE_CALCULATOR_RELIABILITY.md`, `DAMAGE_CALCULATOR_RESTART.md`, `BATTLE_FOUNDATION.md` and `BATTLE_MATCHUP.md`. Their research, old numerical findings and bodies remain intact. The current pointer replaces the misleading suggestion that Step2 alone describes the current calculator.
- Original retirement archive and `backups/battle-calculator-pass2-20261018T002530Z/` were not modified or deleted. Recovery instructions/checksums remain in [Pass2](BATTLE_CLEANUP_PASS_2.md) and the backup README.

## Files and measured source savings

| Source path | Before bytes | After bytes | Reduction |
| --- | ---: | ---: | ---: |
| `src/ui/pages/BattlePage.jsx` | 4,498 | 4,303 | 195 |
| `src/ui/components/BattleSetItem.jsx` | 672 | 433 | 239 |
| `src/ui/components/BattleMatchupShell.jsx` | 7,829 | 7,700 | 129 |
| `src/ui/styles/battle.css` | 23,033 | 22,956 | 77 |
| `src/battle/data/frontierNotes.js` | 406 | removed | 406 |
| `src/battle/itemLookup.js` | absent | 454 | −454 |
| **Net source reduction** | | | **592 bytes** |

B03 alone saves109 net source bytes while eliminating one duplicate set map and one duplicate item map. B04 saves77 CSS source bytes. B05 moves406 provenance-module bytes out of runtime-shaped source into documentation; that module was already unreachable, so its deletion does not reduce shipped JS. New tests/docs are deliberate additions and are not included in the source savings total. No asset savings are claimed.

Modified source: the four existing paths above. Removed: only `frontierNotes.js`. Added source: only `itemLookup.js`. Added test: `test/itemLookup.test.js`. Modified docs: the seven opening banners listed above. Added docs: architecture entry point and this report.

## Deliberately retained candidates

- All other CSS/search-field/color/custom-property duplication: no additional benefit sufficient to justify cascade risk in this small pass.
- Card-specific None normalization, separate failed-image state and different icon/loading presentation: these serve distinct caller behavior.
- Shared heading stylesheet and Trainer/profile imports; no changes to those pages were necessary.
- B02 test-only APIs, B06 browser infrastructure, B07 legacy Conditions compatibility and all C01–C04 performance/data/asset work remain deferred.
- All calculator formulas,162-move eligibility,39 restored moves, AUD-01 correction, ability scenario behavior and percentage colors remain unchanged.

## Verification

Before editing, recorded complete Git status and SHA-256/byte sizes of the existing production assets. Snapshots also cover original source, tests, docs, assets, archive, backups, package files and ignore rules. Existing user work is compared against those snapshots rather than inferred from Git, since most Battle files remain untracked.

- `npm test`: **312/312 passed**,0 failed/skipped. Includes all310 existing tests unchanged plus two new lookup regressions. Restored-move, independent Gen3 rounding/order, AUD-01, eligibility162/192, ordinary/Anabel lookup, state and persistence suites remain passing.
- Production build: **passed**,104 modules. Existing >500kB JS warning remains; no dependency or build configuration changes.
- Mobile visual/style comparison: captured all five Battle tabs at320/375/430px plus Trainer and Pokémon profile,17 views total. **Computed-style snapshots matched in all17 views; screenshot SHA-256 matched in all17 views.** Ability text was masked consistently for screenshots to avoid its intentional timer affecting comparison. Styles compared include typography, colors/backgrounds, borders, dimensions, margins/padding, gaps, display/grid and move-dot spacing.
- Focused extra browser check passed both image-error fallbacks, name retention,12/20px attributes, Sets lazy loading and None-without-image behavior. A first temporary check used the fixture's default Potion while expecting None; its synthetic held-item data/checksum was corrected and the check passed. No application change was needed.
- All **25/25 existing browser scripts passed**. Checks retain all five tabs, saved teams, selections and double-tap handling, ordinary/Anabel trainers/sets, Conditions persistence/reset, live popup calculations and both directions, all39 restored moves and narrow-screen presentation. Browser scripts themselves are unchanged.
- These are Chrome touch/mobile emulation checks; no new physical iPhone Safari verification is claimed.

## Production assets: exact sizes and hashes

| Asset | Before | After | Delta |
| --- | --- | --- | ---: |
| JS | `index-BZIREeMP.js`,1,014,188 bytes | `index-BmJEQJ4j.js`,1,014,023 bytes | −165 bytes |
| CSS | `index-5FY94Aqr.css`,44,590 bytes | `index-DXhiFMYG.css`,44,554 bytes | −36 bytes |

Build-reported gzip: JS214.97→214.96kB; CSS8.97→8.97kB; HTML remains1.20kB/gzip0.48kB. Values above use exact filesystem bytes; gzip/build text uses the tool's displayed rounding. Small savings only; no performance redesign was attempted.

SHA-256:

```text
Before JS  d7c29b4b66bbdddaf18be735d0ff5b4256393be72982e10de1e041c9ba4ff120
After  JS  601cc9f6b07b55ada108961e8d5b96b96d93f4409ee4dd0dcc50b31cb3730d01
Before CSS 598d01959bbd39a12ac444dc293390dd5d647f2b69770ebbbb1c0f55332e8499
After  CSS a566f900dd439c1ebd5bf5997559f99838adca75e502173c3f9c03335630d19c
```

## Final integrity and status

Final checksum/diff comparison confirmed exactly four existing source/style edits, seven documentation-banner edits, one removed unused notes module and four additions (helper, two-test file, architecture entry point, this report). All other original source, all existing tests, assets/datasets, shared CSS, original archive, package/ignore files and every Pass2 recovery-backup file are byte-identical.

Git status: **175 entries before →178 after**. Exactly four added untracked paths (`src/battle/itemLookup.js`, `test/itemLookup.test.js`, `docs/BATTLE_ARCHITECTURE.md`, `docs/BATTLE_CLEANUP_PASS_3.md`) and one removed untracked path (`src/battle/data/frontierNotes.js`). Edited Battle/docs files were already untracked; the pre-existing tracked `src/ui/App.jsx` modification is unchanged. No staged changes or unrelated user work overwritten. Complete before/after content diffs were inspected, including the already-untracked files. No unresolved implementation issue has been found; the existing bundle warning and physical Safari verification remain outside this pass. Stop after Pass3; no further cleanup, performance or GitHub action is authorized by this record.
