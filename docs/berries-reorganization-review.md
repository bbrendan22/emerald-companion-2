# Berries reorganization review

Implemented locally; no commit or push. Existing working-tree changes were preserved.

## Groups

1. Stat Boost Berries — 7
2. Recovery Berries — 10
3. Nature Berries — 5 (Figy, Wiki, Mago, Aguav, Iapapa)
4. EV Berries — 6

Exactly 28 unique visible berries. The 15 requested exclusions retain their canonical definitions. Existing groups retain their alphabetical entry order; Nature Berries use the requested explicit order. Existing descriptions, sprites, acquisition rows, expansion behavior and styles remain intact. No prices added.

## Emerald acquisition inventory

| Berry | Route 120 southern Berry Beauty daily gift | Kiri, southwest Sootopolis daily second gift | Other methods |
| --- | --- | --- | --- |
| Figy | Trainer ID ends in 0 or 5 | Random Figy or Iapapa | Pokémon Jump; planting; held-item link trade |
| Wiki | Trainer ID ends in 1 or 6 | Not in her Emerald gift pool | Pokémon Jump; planting; held-item link trade |
| Mago | Trainer ID ends in 2 or 7 | Not in her Emerald gift pool | Pokémon Jump; planting; held-item link trade |
| Aguav | Trainer ID ends in 3 or 8 | Not in her Emerald gift pool | Pokémon Jump; planting; held-item link trade |
| Iapapa | Trainer ID ends in 4 or 9 | Random Figy or Iapapa | Pokémon Jump; planting; held-item link trade |

Pokémon Jump: Mossdeep City Game Corner, random prize at 5,000+ points, requires 2–5 linked players with Wireless Adapters and eligible small Pokémon. Kiri requires Surf; her gifts pause during the legendary crisis until Rayquaza resolves it. Cultivation requires an existing berry, soft soil and a functioning game clock. Held-item trading requires another compatible Generation III game with the berry and trading access; it is an import route rather than an Emerald map pickup.

No initial Nature Berry trees occur in Emerald's new-game table. No shop, exchange, wild held-item, trainer theft or event-only source was verified for these five. Dodrio Berry Picking's prize pools exclude them. No unverified method has been added. Kiri locations from Omega Ruby/Alpha Sapphire must not be applied to Emerald.

## Exact effects

All five activate at half maximum HP or less and restore floor(maximum HP / 8), minimum 1 HP. Confusion occurs if the holder's Nature dislikes the berry's flavor: Figy spicy, Wiki dry, Mago sweet, Aguav bitter, Iapapa sour. These details use the existing acquisition-note presentation; canonical item descriptions remain unchanged.

## Verification sources

- [Route 120 gift script](https://github.com/pret/pokeemerald/blob/master/data/maps/Route120/scripts.inc)
- [Kiri's script](https://github.com/pret/pokeemerald/blob/master/data/maps/SootopolisCity/scripts.inc)
- [Pokémon Jump prize table](https://github.com/pret/pokeemerald/blob/master/src/pokemon_jump.c)
- [Dodrio prize table](https://github.com/pret/pokeemerald/blob/master/src/dodrio_berry_picking.c)
- [Initial tree table](https://github.com/pret/pokeemerald/blob/master/data/scripts/new_game.inc)
- [Berry cultivation](https://github.com/pret/pokeemerald/blob/master/src/berry.c)
- [Held-effect parameters](https://github.com/pret/pokeemerald/blob/master/src/data/items.h)
- [HP and Nature effect implementation](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c)

## Files touched for this task

- `src/resources/items/utils/itemCategories.js` — headings, group order and five canonical IDs.
- `src/resources/items/components/ItemsBrowser.jsx` — explicit Nature Berry entry ordering only.
- `src/resources/items/data/berryItemAcquisition.js` — five new acquisition records and effect notes.
- `src/resources/items/provenance.json` — approved hashes for the two changed presentation/data modules; canonical hashes retained.
- `test/items.test.js` — approved counts and focused Nature Berry assertions.
- `test/itemsLegacy-acquisition.test.js` — 28 records and narrowly scoped cultivation allowance.
- `test/items.browser.mjs` — approved count/order and expanded Nature Berry mobile checks.
- `tools/verifyResourcesItems.mjs` — allows precisely five acquisition additions while comparing all original acquisition records and canonical definitions with legacy.
- This review document.

## Validation

Unit tests: 442 passed. Production build passed with the existing bundle-size warning. All six local Resources integrity checks passed, including read-only legacy comparisons. Browser results recorded after completion below.

Production browser suite using installed Google Chrome: **51/52 passed**. The focused Items/Berries run also passed independently. Nature Berry expanded panels were checked at 320, 375, 390 and 430px; sprites decoded successfully, Pages-prefixed asset paths matched, and no horizontal overflow or new scrolling calls occurred. Screenshots at 320px and 430px were inspected visually. Pages deployment smoke test passed.

The sole broader failure is `test/resources.browser.mjs:144`: the search-result test waits for `.resources-catalog-list [aria-current="true"]`. Existing Moves/Abilities popup behavior does not select that catalog row. That test and its related production code were not changed by this task. The first browser attempt lacked Playwright's bundled executable; using installed Chrome resolved that environment issue. A run interrupted by rebuilding preview assets was discarded; the final results above are from a fresh preview of the completed build.

Parity adjustments preserve deep equality of every original acquisition record, item definition, machine definition and sprite against legacy. Only the five approved Nature Berry records are additional; hashes for canonical item definitions and legacy sources are unchanged. No legacy files were written.
