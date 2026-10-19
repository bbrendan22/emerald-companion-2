# Useful Items & Berries — local review

Implemented locally. No commit or push. Existing unrelated working-tree changes are preserved.

## Navigation and pages

Resources → Items & Berries now contains exactly two plain text links: Useful Items and Berries. Useful Items opens Battle by default. Berries opens a standalone page using the existing browser, data, search, sprites, ordering and inline expansion, without category tabs. No popup conversion.

Buy/Sell and BP columns are removed from all entry rows. Canonical prices and retained expanded information are unchanged.

## Final structure

| Page / category | Groups in display order | Entries |
| --- | --- | ---: |
| Useful Items / Battle | Battle Items; Type Boosters | 29 |
| Useful Items / Utility | Training; Valuables; Vitamins | 16 |
| Useful Items / TMs/HMs | TMs; HMs | 58 |
| Useful Items / Misc. | Evolution Stones; Evolution Items; Shards | 12 |
| Berries | Recovery; Stat Boost; EVs | 23 |

Final cleanup: Battle Items now precedes Type Boosters. The Pokémon-Specific Items group and all eight entries are removed from presentation only; Exchange Items is renamed Shards. Internal ordering is preserved. Useful Items has 115 unique entries across four tabs. All 12 Poké Balls, the Encounters heading and its four entries (Cleanse Tag, Fluffy Tail, Poké Doll, Smoke Ball), and Shoal Salt/Shoal Shell are excluded from presentation. All four Shards remain. PP Max is also excluded from presentation; PP Up remains.

Rare Candy moved from Training to Valuables and appears once. Tiny Mushroom, Big Mushroom, Escape Rope, Repel, Super Repel, Max Repel and all five colored Flutes are removed only from the visible Useful Items collection. The Flutes heading is removed. Canonical item definitions, acquisition data and icons remain intact; legacy 1.0 was only read.

## Verification

- Unit suite: 439 passed, zero failures.
- Production build: passed; Vite reports its existing large-chunk advisory.
- Final cleanup: item parity and retained-detail render checks pass, including 309 rendered detail pages, canonical item data, icons, acquisition sources and read-only legacy parity. The earlier reorganization also passed all six Resources integrity checks.
- Focused production Items/Berries browser test: passed for all 138 visible entries (115 Useful Items and 23 Berries) and every displayed acquisition source, exact names/descriptions/icons/group order, absent row prices, search, expansion, keyboard behavior, navigation, and no new scrolling calls.
- No horizontal overflow at 320, 375, 390, 430 and 1280px. Expanded Utility and Berry screenshots visually inspected at 320px.
- Production GitHub Pages deployment/asset smoke test: passed under `/emerald-companion-2/`.
- Earlier reorganization full production browser suite with installed Chrome: 49 of 50 passed. Resources initially failed its old six-link count; that presentation expectation is now two. Its rerun passes that check, then times out at test/resources.browser.mjs:144 expecting an aria-current catalog row for the pre-existing Abilities search implementation, which explicitly omits aria-current for abilities. That unrelated assertion and behavior are unchanged.
- git diff --check: passed.

Playwright's bundled browser was unavailable; tests used installed Google Chrome without adding dependencies.

## Integrity/parity adjustments

Updated only item presentation counts, homepage link expectations, row-price expectations, standalone Berry navigation and approved removal expectations. A separate presentation hash records the changed category configuration while original legacy hashes, canonical data hashes and icon checks remain enforced.

## Files changed for this task

- [src/ui/pages/ResourcesPage.jsx](/Users/bbrendan22/Desktop/emerald-companion-2/src/ui/pages/ResourcesPage.jsx)
- [src/resources/items/components/ItemsBrowser.jsx](/Users/bbrendan22/Desktop/emerald-companion-2/src/resources/items/components/ItemsBrowser.jsx)
- [src/resources/items/utils/itemCategories.js](/Users/bbrendan22/Desktop/emerald-companion-2/src/resources/items/utils/itemCategories.js)
- [src/resources/items/items.css](/Users/bbrendan22/Desktop/emerald-companion-2/src/resources/items/items.css)
- [src/resources/items/provenance.json](/Users/bbrendan22/Desktop/emerald-companion-2/src/resources/items/provenance.json)
- [test/items.test.js](/Users/bbrendan22/Desktop/emerald-companion-2/test/items.test.js)
- [test/items.browser.mjs](/Users/bbrendan22/Desktop/emerald-companion-2/test/items.browser.mjs)
- [test/resources.browser.mjs](/Users/bbrendan22/Desktop/emerald-companion-2/test/resources.browser.mjs)
- [test/pagesDeployment.browser.mjs](/Users/bbrendan22/Desktop/emerald-companion-2/test/pagesDeployment.browser.mjs)
- [tools/verifyResourcesItems.mjs](/Users/bbrendan22/Desktop/emerald-companion-2/tools/verifyResourcesItems.mjs)
- This review report: docs/useful-items-berries-review.md
