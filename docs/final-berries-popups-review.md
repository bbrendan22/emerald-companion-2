# Final Berries page and popups — local review

Implemented locally. No commit or push.

## Final selection

Exactly three headings, in order:

| Heading | Visible berries |
| --- | ---: |
| Stat Boost | 7 |
| Recovery | 10 |
| EV | 6 |
| Total | 23 |

The five Nature Berries are excluded from the page. Pokéblock-focused berries and Enigma remain excluded. All original 23 Berry IDs are retained exactly once, with their existing internal list ordering. Canonical Berry definitions, acquisition inventories (including the prior Nature Berry source additions), descriptions and sprites are untouched.

## Popup reuse and preserved design

Berry rows now open the existing ItemDialog, which already accepts canonical numeric or string item IDs independently of the list. It uses the unchanged ResourceDialog shared with Moves, Abilities and Useful Items. No Berry-specific popup framework or duplicate data was added.

The unchanged ItemSummary and ItemAcquisition components provide the existing sprite, name, description, source locations, availability, notes, game-name colors, spacing and dividers. No new information, prices, controls or styling were added. Existing search remains as it was. The popup reuses tap-anywhere dismissal, pointer movement/scroll cancellation, Escape, keyboard focus restoration and page scroll locking. There is no X or popup border.

Useful Items behavior and membership, other Resources pages, the shared dialog implementation and general application scrolling are unchanged. Legacy 1.0 was read only.

## Verification

- 443 unit tests passed.
- All six local Resources integrity checks passed, including canonical data/icon hashes, acquisition parity, retained detail rendering and read-only legacy checks. The Nature Berry acquisition assertions remain enforced despite those berries being hidden.
- Production build passed with Vite's existing large-chunk advisory.
- Items/Berries production browser regression passed for all 138 visible records: exact names, descriptions, sprite URLs, group order, every displayed acquisition source, notes, game colors, row price absence, navigation, search and keyboard operation.
- Berry popup interaction test passed at 320, 375, 390 and 430px: taps on sprite/name/description/details/background/backdrop dismiss; real swipes and momentum, returning drags, and release after scroll do not dismiss; keyboard Escape restores visible focus; touch dismissal leaves no row highlight; list layout and page scroll remain unchanged; no horizontal overflow.
- Existing Useful Items popup interaction regression passed at all four mobile widths.
- Direct ID test passed for Sitrus Berry ('142') with no mounted Berry/item list, alongside numeric item and TM checks.
- GitHub Pages production smoke passed under /emerald-companion-2/; all 3,230 public assets match and Resources navigation works.
- Popup screenshots visually inspected at 320px and 390px.
- git diff --check passed.

Browser checks used installed Chrome. The entire unrelated browser suite and other browser engines were not rerun.

## Files changed for this task

- [src/resources/items/utils/itemCategories.js](/Users/bbrendan22/Desktop/emerald-companion-2/src/resources/items/utils/itemCategories.js) — Only Berry headings, order and visible selection changed.
- [src/resources/items/components/ItemsBrowser.jsx](/Users/bbrendan22/Desktop/emerald-companion-2/src/resources/items/components/ItemsBrowser.jsx) — Berry entries now open the existing ItemDialog; inline expansion removed. Useful Items behavior remains unchanged.
- [src/resources/items/provenance.json](/Users/bbrendan22/Desktop/emerald-companion-2/src/resources/items/provenance.json) — Updated the Berry presentation configuration hash; canonical data hashes retained.
- [test/items.test.js](/Users/bbrendan22/Desktop/emerald-companion-2/test/items.test.js) — Exact 23-Berry membership and headings; retained all canonical and Nature acquisition data assertions.
- [test/items.browser.mjs](/Users/bbrendan22/Desktop/emerald-companion-2/test/items.browser.mjs) — All existing Berry detail checks now verify popups instead of inline expansion; updated selection and headings.
- [test/berryPopupInteractions.browser.mjs](/Users/bbrendan22/Desktop/emerald-companion-2/test/berryPopupInteractions.browser.mjs) — Berry tap, touch scrolling, momentum, focus, no-highlight, layout and page-position coverage.
- [test/itemDialog.browser.mjs](/Users/bbrendan22/Desktop/emerald-companion-2/test/itemDialog.browser.mjs) — Direct string Berry-ID opening without mounting the Berries page.
- [tools/verifyResourcesItems.mjs](/Users/bbrendan22/Desktop/emerald-companion-2/tools/verifyResourcesItems.mjs) — Visible Berry selection again matches the original 23; canonical and prior Nature acquisition checks retained.
- This report: docs/final-berries-popups-review.md
