# Useful Items popups — local review

Implemented locally; no commit or push.

## Behavior and preserved content

Useful Items entries now open the existing shared ResourceDialog used by Moves and Abilities. That component is unchanged: backdrop, positioning, dimensions, content scrolling, page scroll lock, pointer movement detection, tap-anywhere dismissal, Escape and keyboard focus restoration all come from the established implementation. There is no close button or selected-state styling.

ItemDialog accepts an existing canonical item identifier (numeric or string) and can mount independently of the Resources page. It resolves items and TMs/HMs from existing data. Invalid IDs render nothing. The list and dialog share exactly the same ItemSummary markup. The existing ItemAcquisition renderer, catch-rate field where applicable, source ordering, notes, availability text and game-name colors are reused without modification. No additional fields or prices were added.

The approved 115 Useful Items and four tabs remain unchanged: Battle (29), Utility (16), TMs/HMs (58), Misc. (12). Battle Items precedes Type Boosters; Utility retains Training, Valuables and Vitamins; Misc. retains Evolution Stones, Evolution Items and Shards. No removed item was restored. All 23 visible Berries retain their existing separate page and inline expansion behavior.

## Verification

- 440 unit tests passed, including direct ID lookup for canonical items and all machines.
- All six local Resources integrity checks passed against read-only legacy 1.0, retaining strict canonical data, icon, source and compatibility assertions.
- Production build passed. Vite retains its existing large-chunk advisory.
- Production Items/Berries browser test passed: all 138 visible entries and every displayed acquisition source, summary/name/description/sprite checks, search/tab navigation, keyboard behavior, no row prices, unchanged Berry expansion, and no added scrolling calls.
- Popup interaction browser test passed at 320, 375, 390 and 430px: tap on sprite/name/description/details/background/backdrop; real touch swipe and momentum; returning drag; stationary release after scroll; Escape; keyboard focus restoration; unchanged touch appearance; unchanged list geometry and scroll position; no horizontal overflow.
- Standalone ItemDialog browser test passed for string/numeric IDs, TM26, invalid IDs and dismissal, without a mounted item list.
- GitHub Pages production smoke passed at /emerald-companion-2/, including all 3,230 public assets and Resources navigation.
- Mobile screenshots inspected at 320px and 390px.
- git diff --check passed.

Browser verification used installed Google Chrome. Other browser engines and the entire unrelated browser regression suite were not rerun for this task. No known item-popup failures remain. Existing uncommitted work elsewhere was preserved.

## Files changed for this popup task

- [src/resources/items/components/ItemsBrowser.jsx](/Users/bbrendan22/Desktop/emerald-companion-2/src/resources/items/components/ItemsBrowser.jsx) — Open item dialogs; retain Berry inline expansion and existing list markup.
- [src/resources/items/components/ItemDialog.jsx](/Users/bbrendan22/Desktop/emerald-companion-2/src/resources/items/components/ItemDialog.jsx) — Reusable controlled popup accepting canonical itemId and onClose.
- [src/resources/items/components/ItemSummary.jsx](/Users/bbrendan22/Desktop/emerald-companion-2/src/resources/items/components/ItemSummary.jsx) — Shared sprite/name/description markup for rows and popups.
- [src/resources/items/utils/itemEntries.js](/Users/bbrendan22/Desktop/emerald-companion-2/src/resources/items/utils/itemEntries.js) — Existing derived item/machine records, extracted without duplicating canonical data; ID lookup.
- [test/items.test.js](/Users/bbrendan22/Desktop/emerald-companion-2/test/items.test.js) — Canonical ID resolver coverage; existing strict inventory/data/icon checks retained.
- [test/items.browser.mjs](/Users/bbrendan22/Desktop/emerald-companion-2/test/items.browser.mjs) — Verify every source and summary in item dialogs; preserve Berry checks.
- [test/itemPopupInteractions.browser.mjs](/Users/bbrendan22/Desktop/emerald-companion-2/test/itemPopupInteractions.browser.mjs) — Touch, drag, momentum, focus, layout, dismissal and list-scroll regressions.
- [test/itemDialog.browser.mjs](/Users/bbrendan22/Desktop/emerald-companion-2/test/itemDialog.browser.mjs) — Independent ID-based opening without the item browser.
- [test/helpers/itemDialogHarness.jsx](/Users/bbrendan22/Desktop/emerald-companion-2/test/helpers/itemDialogHarness.jsx) — Standalone component test mount.
- [tools/verifyResourcesItemsRender.mjs](/Users/bbrendan22/Desktop/emerald-companion-2/tools/verifyResourcesItemsRender.mjs) — Transform new imported components for existing retained-detail integrity checks.
- This review report: docs/useful-items-popups-review.md
