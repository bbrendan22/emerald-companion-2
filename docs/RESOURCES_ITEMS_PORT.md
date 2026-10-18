# Useful Items port

## Legacy inventory established before implementation

Read-only source: `/Users/bbrendan22/Desktop/emerald-companion`.

Entry points: `src/components/ResourcesPage.jsx` maps six Useful Items links to `ItemsBrowser.jsx`. The latter uses `ItemAcquisition.jsx`, `GameNames.jsx`, `ResourceHeading.jsx`, `utils/itemCategories.js`, item/machine definitions, display names, icons, cash-shop/BP/machine prices, catch-rate text, and acquisition helpers.

Acquisition dependencies include battle, utility, berry, miscellaneous, Poké Ball and machine inventories; native map/wild sources; berry trainer sources; Pickup bands; and Safari-specific wild-item wording. Original tests are `tests/itemAcquisition.test.js`. Presentation was inspected in `ResourcesPage.css` and `resourcesNeon.css`, including later overrides. Generator/provenance entry points are recorded in the hash inventory.

Legacy visible categories: Battle 37; Utility 32; Berries 23; Poké Balls 12; TMs/HMs 58; Misc. 14 (176 entries). Group headings follow declaration order; non-machine names are alphabetized within each group; machines retain TM01–TM50 / HM01–HM08 order. Name/code search trims whitespace and ignores case. Six category tabs retain the search and expanded item state. One item can be expanded; expansion shows catch-rate text where applicable, acquisition notes and curated source rows. Prices show actual Emerald cash-shop buy prices, Frontier BP, and half-price sell values under the original conditions. `Once per pickup` is presented as `Once per save`.

Legacy also has an optional standalone detail branch entered only through external location links (`initialEntry`), with Effect, Item Info or machine information, acquisition sources and machine compatibility callbacks. It is not entered by tapping a normal item-list row. This branch must not be confused with the normal expandable rows.

## Verified mapping and coverage

The six homepage labels remain Battle, Utility, Berries, Poké Balls, TM/HM and Misc.; TM/HM maps to the legacy internal label TMs/HMs. All 251 item definitions match the existing 2.0 display names. All 58 machine compatibility lists match the canonical 2.0 Learnset export. All 176 visible-entry icons already exist in 2.0 and match legacy byte-for-byte.

There are 185 acquisition inventories, 1,251 raw source rows, and 471 rows returned by the existing curation helper across those inventories (462 are displayed by the 176 visible catalog entries). The complete raw inventories and the unchanged curation algorithm are preserved, including event/e-Reader exclusions, item-specific game/source restrictions, game order and availability order.

Known source organization: 20 berry definitions are intentionally outside legacy berry groups; Misc. has 23 acquisition inventories but only 14 visible catalog entries. Other uncategorized item definitions are also retained, not added to new categories. These are source behavior, not missing port records.

## Presentation and scope adaptations

Use the native static global header and its Back arrow, returning directly to Resources. No legacy in-content Back button, clickable scroll-to-top heading, viewport locking, nested scrolling or sticky controls are transferred. Existing Resources search appearance is reused. Legacy game-specific colors apply only to the tokenized game-name text in acquisition headings. Item layout, prices, content, search, category filtering and expansion rules are otherwise preserved.

The optional externally entered detail branch is retained in the component, but the six category links enter the original normal list. Existing protected Locations/Move/Species pages receive no new integration or behavior; their legacy cross-links are not introduced here.

## Game-name text colors

Emerald/E `#08755d`; Ruby/R `#b52d43`; Sapphire/S `#245cbb`; FireRed/FR `#c44a1b`; LeafGreen/LG `#438022`; Colosseum/Colo `#6552a3`; XD `#903a9b`; Pokémon Box `#956b16`. These exactly match the existing 2.0 Learnset GameNames component. Slashes, arrows, borders, backgrounds and surrounding text keep neutral/Resources colors. No additional legacy game-color mapping was found.

## Parity and verification

Implementation and standalone parity checks pass. Detailed source hashes and parity coverage are recorded in `src/resources/items/provenance.json` and verified with `tools/verifyResourcesItems.mjs`.

## Transferred implementation and files

`src/resources/items/components/ItemsBrowser.jsx` retains both the normal list and optional legacy `initialEntry` detail branch. `ItemAcquisition.jsx` retains source rendering, notes and the displayed availability wording. `GameNames.jsx` delegates to the existing, identical 2.0 implementation. All new CSS is scoped to `.resource-items-page` in `items.css`; existing homepage CSS is unchanged.

Unchanged modules: `battleItemAcquisition`, `battleItemWildSources`, `berryItemAcquisition`, `berryItemMapSources`, `berryItemWildSources`, `berryTrainerSources`, `itemAcquisition`, `itemIcons`, `itemShopData`, `machineItemAcquisition`, `machineMapSources`, `miscItemAcquisition`, `miscItemMapSources`, `miscItemWildSources`, `pickupResources`, `pokeBallAcquisition`, `pokeBallCatchRates`, `pokeBallMapSources`, `utilityItemAcquisition`, `utilityItemMapSources`, `utilityItemWildSources`, `wildItemAcquisition`, and `utils/itemCategories`.

`data/itemResources.js` retains all 251 original definitions and re-exports the already verified canonical 58-machine compatibility table. Name adapters use existing `profileReference.json` and `reference.json`. Move details reuse the canonical static table. Compatibility metadata reuses existing internal-ID-to-National-Dex/name mapping and canonical Pokémon types (converted to the original uppercase display strings); the existing Learnset metadata intentionally has no `types` field, so this is supplied locally without changing it. All 386 legacy ID/name/type relationships were checked. All 309 item/machine icon files are reused byte-for-byte from existing `public/items` assets; none were added or overwritten.

Minimal integration is in `src/ui/pages/ResourcesPage.jsx`: six existing item labels become links, item-category state selects the ported browser, and the shared header receives its existing Back callback. There is no item router or extra global header. The existing Resources browser regression is updated only where it previously required those six labels to be noninteractive.

Source organization details retained:

- Excluded berry definitions: Aguav, Belue, Bluk, Cornn, Durin, Enigma, Figy, Iapapa, Mago, Magost, Nanab, Nomel, Pamtre, Pinap, Rabuta, Razz, Spelon, Watmel, Wepear and Wiki Berries.
- Retained acquisition inventories outside visible legacy groups: Eon Ticket, Root Fossil, Claw Fossil, Old Amber, Helix Fossil, Dome Fossil, Mystic Ticket, Aurora Ticket and Old Sea Map. No new fossil/event/ticket category was invented.
- Pokémon Box remains in the verified color tokenizer; the existing item-source records do not add a Box-specific acquisition group. Visible sources include Emerald, Ruby, Sapphire, Ruby/Sapphire, FireRed/LeafGreen, Colosseum/XD and XD according to each item's original curation rules.

## Reproducible checks

- `node tools/verifyResourcesItems.mjs /path/to/emerald-companion`: verifies 41 unchanged legacy source files, 23 verbatim port modules, 251 item definitions, 309 identical icons, 58 machine lists, all 386 compatibility ID/name/type mappings, move descriptions, exact GameNames implementation, 185 acquisition inventories, all 1,251 raw rows and the 471 curated rows. Catalog/category and representative search projections also match legacy.
- `node tools/verifyResourcesItemsRender.mjs`: renders all 309 optional item/machine detail pages, including all 58 compatibility grids. This validates the retained external-detail branch without creating new routes or modifying protected pages.
- `test/itemsLegacy-acquisition.test.js`: the ten original tests with import paths adapted only.
- `test/items.test.js`: category coverage, no silent group omissions, canonical machine/type mappings, source hashes and local icon checks.
- `test/items.browser.mjs`: all six homepage links; every visible item and displayed acquisition source; original group/item order, names, descriptions, notes, prices, catch-rate text; search, tabs and expansion-state retention; keyboard use; unchanged hover/pressed appearance; game-name-only colors; shared-header Back; no-save operation; 320/375/390/430/1280px fit; no added scroll API calls.

## Final verification results

- All 387 unit tests passed, including the ten adapted legacy acquisition tests and three new port coverage tests.
- All 34 browser scripts passed (33 existing scripts plus Useful Items); no failed scripts or retries were needed in this final suite.
- Production build passed. The existing large-bundle warning remains; no dependencies were added.
- Final parity check passed with all 41 inspected legacy source files unchanged, all 23 verbatim port modules unchanged, 309 identical reused icons, 251 item definitions, 58 machines, 185 inventories, 1,251 raw sources and 471 curated sources.
- Optional detail-render verification passed for all 309 defined-item/machine pages, including all 58 compatible-Pokémon grids.
- Useful Items browser coverage compared all 176 visible records and all 462 displayed acquisition rows, including game colors, names, descriptions, icons, prices, catch-rate text, notes and ordering.
- All six categories were checked at 320, 375, 390, 430 and 1280px. Screenshots were reviewed; no horizontal overflow, custom scroll API calls, hover/pressed highlighting or save dependency was found.
- A final presentation-only line-break hint keeps the original TMs/HMs tab label and accessible name intact while allowing a clean break after the slash on narrow screens. Targeted checks at all five widths confirmed the exact label, 58 machine entries, TM26 search/expansion and no overflow; build and detail/parity checks passed again afterward.

No content or data-parity gaps remain for the six normal Useful Items categories. The intentional external-link boundary and legacy category exclusions are documented above. No legacy files were modified; no commit or push was performed.
