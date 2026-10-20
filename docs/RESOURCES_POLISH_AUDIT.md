# Home Resources usability audit

Scope: Home Master Search, the five compact directories, and existing Move,
Ability, Item and Berry information popups. No changes to Trainer achievements,
Frontier pages, Tools, Charts, Collection, Battle, Settings or the header.

## Automated data checks

Read-only upstream comparison: pret/pokeemerald commit
`731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`.

`tools/auditHomeResources.mjs` compares a local source export (no network at test
runtime and no second application database). It checks:

- All 386 National Dex numbers against Emerald internal species IDs and names.
- All 354 move names, types, power, accuracy, PP, priority and effect chances;
  Gen III type-based Physical/Special classification, with zero-power Status.
- All 77 ability names and cartridge descriptions. Unused Cacophony stays in
  the canonical catalog; its empty species list is intentional.
- All 115 curated Useful Items and 23 curated Berries: canonical popup IDs,
  names, non-machine cartridge descriptions and acquisition coverage/citations.
- All 58 TM/HM item IDs and move relationships against the Emerald macros.
- Displayed acquisition records have game, location, method and availability.

No upstream data mismatches were found. Name/description comparisons normalize
case, whitespace and punctuation used in presentation. This is not a claim that
every acquisition location or cross-game availability statement was independently
verified against event scripts. Those curated textual claims require a separate
location-by-location audit if needed; no broad data rewrite was undertaken.

To repeat, export these files from the pinned commit, naming each file with `/`
replaced by `__`, and put the commit SHA in `commit.txt` in that directory:

- `include/constants/{moves,species,abilities,pokedex,tms_hms}.h`
- `src/data/battle_moves.h`
- `src/data/text/{move_names,species_names,abilities,item_descriptions}.h`
- `src/data/items.h`

Then run `node tools/auditHomeResources.mjs <export-directory>`.
The local review used `/tmp/emerald-resources-polish-upstream`.

## Confirmed usability fixes

- Home Master Search and all five directories use **No matching results**.
- Displayed TM/HM codes now resolve their canonical item from either search;
  move-name results remain separate from machine item results.
- Only reference popups receive the consistency styling: a subtle shared border,
  matching heading/description type sizes, normalized item header padding, and
  wrapping acquisition labels. Existing information, sprite sizes suited to the
  content, internal scrolling and dismissal handling are retained.
- No changes to Home achievement popups or pinch-to-zoom settings.

## Focused verification

- `node --test test/homeSearch.test.js test/items.test.js test/abilities.test.js test/moveFilters.test.js`
- `node test/resourcesPolish.browser.mjs`
- `node test/homeDirectories.browser.mjs`
- `node test/homeSearch.browser.mjs`
- `npm run build`

Mobile browser checks cover 320/375/430px, uniform directory icon/text sizes,
long-name wrapping, no horizontal overflow, zoom-safe input font sizes, empty and
cleared queries, preserved directory queries/scroll positions, correct popup and
profile navigation, and real touch swipes/internal scrolling without accidental
dismissal. Physical iPhone Safari keyboard/viewport behavior remains for review;
Chrome touch emulation does not reproduce Safari's software keyboard.

## Files changed in this pass

| File | Change |
| --- | --- |
| `src/resources/components/ResourceDialog.jsx` | Optional content class for scoped reference-popup styling. |
| `src/resources/moves/MoveDialog.jsx` | Apply reference-popup styling. |
| `src/resources/abilities/AbilityDialog.jsx` | Apply reference-popup styling. |
| `src/resources/items/components/ItemDialog.jsx` | Apply reference-popup styling to items and berries. |
| `src/ui/styles/resources.css` | Scoped popup typography, border, padding and acquisition wrapping. |
| `src/resources/homeSearch.js` | Match displayed machine codes as well as move/item names. |
| `src/ui/components/HomeResourceSearch.jsx` | Consistent empty-state wording for Master Search and directories. |
| `test/homeSearch.test.js` | Canonical TM/HM code-search coverage. |
| `test/homeSearch.browser.mjs` | Updated empty-state expectation. |
| `test/homeDirectories.browser.mjs` | Updated empty-state expectation. |
| `test/resourcesPolish.browser.mjs` | Focused reference-popup/mobile/empty-state checks. |
| `tools/auditHomeResources.mjs` | Read-only source comparison and acquisition integrity audit. |
| `docs/RESOURCES_POLISH_AUDIT.md` | Findings, limitations and reproduction instructions. |

Upstream reference: [pinned Emerald decompilation](https://github.com/pret/pokeemerald/tree/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881).
