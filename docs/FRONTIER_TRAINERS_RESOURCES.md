# Resources: Battle Frontier Trainers

## Scope and implementation

Resources → Battle Frontier → Trainers now opens a local Resources subpage.
Its normal shared Back arrow returns to Resources. The page defaults to
Trainers; Frontier Brains is the second tab. Search sits directly below the
tabs, matches case-insensitive name/class or Brain/facility terms, and filters
only that tab. Each tab retains its own query. Query changes and tab switches
close expansion; only one row is expanded at once. Tabs support arrow keys,
Home and End. No result counts, filters, pagination, scroll containers, sticky
controls, page-height rules or scroll restoration were added.

New files are `src/resources/frontier/Trainers.jsx`, `trainers.js`,
`trainers.css`, the corresponding unit/browser tests, and this document.
`ResourcesPage.jsx` activates the link and uses its existing subpage-header
convention. The Resources navigation test and the Pokémon Sets test's previous
“Trainers link absent” assertion were updated. Pokémon Sets implementation,
Battle implementation, all authoritative datasets and legacy 1.0 are unchanged.
No dependencies or assets were added.

## Data and mappings

The standard tab reads all 300 original `frontierTrainers` records in dataset
order, including their `ivs` and exact `pokemonSetIds.length`. Its sprite names
come from the existing `frontierTrainerSprite` helper and local assets.
`resourceTrainerSets` calls Battle's `towerTrainerSets(trainerKey(trainer))`
to resolve exact set IDs, then sorts the returned array by global `entry`.
This preserves distinct sets of the same species and never sorts shared data.

Rows show a 48×48 trainer sprite, trainer name, class followed by its source
IV tier, and a simple right-aligned count such as “62 sets”. Expansion contains a three-column display-only grid of
species sprite and the exact species-specific set label (for example,
“Tyranitar 4”), matching the Pokémon Sets page. Global entry numbers remain
internal identifiers for eligibility and sorting. No move, item, nature,
ability or EV details are introduced into these grids.

These are allowed pools, not fixed generated teams or availability predictions
for a specific challenge. Encounter progression, level-mode restrictions and
species/item clauses can affect actual generated teams. The source IV field is
the standard trainer tier (3/6/9/12/15/18/21/31); facility rules can override it,
including the existing ordinary Dome IV rule of 3. The summary's IV tooltip
states this boundary. The prior `BATTLE_CALCULATOR_AUDIT.md` records independent
verification of all 300 trainer pools and IV tiers against Emerald's source.

The Brain tab reuses the six presentation metadata records and the 36 original
Brain Pokémon already verified for Pokémon Sets. There are six rows, each with
three Silver and three Gold entries. Each row's count is six encounter-set
entries, not six distinct species. Noland is excluded. The canonical Palace
Brain spelling is Spenser. Expanded groups preserve their original species and
Symbol ordering and never assign ordinary Frontier numbers. Tucker's three
candidates per Symbol remain visible. He selects two for a Dome match; the
page does not add a separate explanation below his groups.

Brain IVs show the minimum–maximum fixed IV range across their Silver and Gold
records: Anabel 24–31, Tucker and Greta 20–31, Lucy/Spenser/Brandon 16–31.
These are endpoints from actual encounter records, not a claim that intervening
IV values are used. The original fixed per-set IVs are unchanged. Expanded
regular trainer grids omit the eligible-set explanatory label.


## Verification

`npm test`: 429 tests passed. The new tests check all 300 identities/sprites,
exact pool membership and numbered order without mutation, tab-specific search,
and all six Brains / 36 original special set references. Existing Frontier
integrity tests remain included.

`node tools/verifyFrontierBrains.mjs /private/tmp/emerald-frontier-util.c`:
all 36 source records verified for species/items/natures/moves/EVs/fixed IVs and complete
species ability alternatives. Source SHA-256:
`be3ec95f9e438f385256ae8a55f53be70677f28d3fa44272f00f2e927c9b868c`.

`npm run build`: passed with the existing bundle-size warning; the production
base remains `/emerald-companion-2/`.

The targeted browser script checks all 300 row values/paths, exact expanded
membership, a 100-set pool, three-column grids, decoded sprites, name/class and
Brain/facility search, empty results, one expansion, keyboard controls, isolated
tab queries, all six Brain groups, IV ranges/counts, pointer appearance, no
programmatic scroll calls, Back, and Pokémon Sets navigation. Viewports:
320/375/390/430px. Screenshots are written to
`/private/tmp/frontier-trainers-list-{width}.png`,
`/private/tmp/frontier-trainers-expanded-{width}.png`, and
`/private/tmp/frontier-trainers-brains-{width}.png`.

Final browser verification: all ten relevant production scripts passed:
Resources Trainers, Pokémon Sets, Resources, Moves, Abilities, Battle set search,
Battle trainer search, Battle rules, Battle shell and Pages deployment. All
3,230 public assets matched their production URLs. No horizontal overflow was
observed at any requested width. No commits or pushes were made.
