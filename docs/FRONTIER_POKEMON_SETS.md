# Resources: Battle Frontier Pokémon Sets

The page reads `src/battle/data/frontierPokemon.js` directly: 882 ordinary
records, numbered 1–882 by `entry`, with 376 distinct species. It retains the
original record identities and species + variant IDs. Search uses a trimmed
case-insensitive species substring or exact set number (optional # and leading
zeroes). Sorting uses a new array. A query change closes the expanded record.
The separately stored 42 Brain records are outside this numbered pool and are
not appended or assigned invented numbers. Battle's six Anabel entries remain
unchanged.

## Compact entry layout

A two-column CSS grid keeps Pokémon information on the left and four move slots
in a 2×2 grid on the right, including at 320px. The sprite precedes the name and
space-separated species variant number (e.g. Tyranitar 4), in the same text
color; the item name and then its sprite sit beneath the Pokémon name. Search
by number still uses the original global 1–882 entry numbers.
Move names wrap inside their cells, with existing type icons. Vacant slots show
a dash; Curse retains the established treatment without a Mystery type icon.
Assets use `publicAsset`, shared species/move references, `battleItemId`, and
`FrontierTrainerSprite`. No duplicate sprite mappings or datasets were added.

Expansion adds only nature, ability alternatives and EVs, followed by trainers.
The facts use Nat./Ab./EVs labels in that order, with full nature and ability
names and HP/Atk/Def/SpA/SpD/Spe EV abbreviations. Slashes separate alternative
abilities; the Ab. label identifies possible abilities via its accessible title.
A local ResizeObserver reduces the facts font from at most 11px only when
necessary to fit the entire line. It does not change page scrolling or overflow
policies. Variant, repeated items, species, set number and moves were removed
from the expansion.

## Exact trainer eligibility and limitations

`eligibleFrontierTrainers` filters Battle's existing `towerTrainerEntries` by
`trainer.setIds.includes(set.id)`. Those entries reference the authoritative
300 trainers' `pokemonSetIds` arrays, not species matches. All matching trainers
are displayed with class-based sprites and names; the title retains trainer
class for identification. Brain IDs cannot match ordinary IDs. Unown #127 has
no association in these pools and explicitly displays that empty state.

The trainer section retains an accessible eligibility label with no visible
heading. These are allowed pools,
not guaranteed generated rosters or unconditional encounter predictions.
Source inspection of Emerald's [FillTrainerParty and GetRandomFrontierMonFromSet](https://github.com/pret/pokeemerald/blob/master/src/battle_tower.c)
confirms random pool selection, a high-tier restriction in Level 50, and
species/held-item duplication checks during team generation. Trainer selection
also depends on challenge progression; this page does not simulate facility,
streak, level mode, or complete-team legality. Membership is eligibility under
applicable conditions, not a claim that every listed trainer can produce the
set in every mode. No trainer search, rules or Battle behavior was changed.

Single available abilities retain their full names. Multiple possible abilities
are all displayed; the data does not specify a fixed choice for ordinary sets.
No trainer-dependent IVs, fixed level, or precomputed stats are inferred. The
prior `BATTLE_CALCULATOR_AUDIT.md` records an independent source comparison of
all 882 ordinary records' species, moves, items, natures and EV allocations.
No data corrections were needed for this feature.

## Verification

All 424 unit tests pass, including checking every set's exact trainer pool
membership and distinct same-species variants. The production build passes with
the existing bundle-size warning. Targeted production browser tests cover all
882 collapsed identities/items/move grids/type icons, accurate expanded values,
multiple/empty trainer pools, decoded sprites, alternative abilities, longest
facts lines, keyboard expansion/collapse, query reset, clear, Back and base paths.
At 320/375/390/430px, columns remain side by side, moves remain 2×2, the facts
stay on one line, trainers wrap, and there is no horizontal overflow.
Screenshots: `/private/tmp/frontier-sets-refined-list-{width}.png` and
`/private/tmp/frontier-sets-refined-expanded-{width}.png`.

Final production browser runs also passed Resources, Moves, Abilities, Battle
set search, trainer search, Battle rules, Battle shell and Pages deployment
(all 3,230 production assets). No commits or pushes were made.


## Frontier Brains tab

Standard Sets is the default tab, retaining all 882 records. Frontier Brains
shows 36 references to the original `frontierBrains.js` records: Silver and Gold
teams of three for Anabel, Tucker, Greta, Lucy, Spenser (canonical spelling), and
Brandon. Noland's six placeholder rows are excluded. No new Pokémon dataset or
Battle data edits were needed. The six-name/facility/sprite metadata in `sets.js`
is presentation data only. Each tab retains its own query and applies it only to
its records; tab switches close expansion. Brain search matches species, Brain,
Symbol and facility. Tabs support Left/Right/Home/End keyboard navigation.

Brain row names use species + Silver/Gold, never ordinary set numbers. Record
keys include Brain, Symbol and species; DOM IDs encode those keys for valid
ARIA references. Both tabs share the same compact row, item-after-name layout,
move grid and facts renderer. Expanded Brain entries show the original trainer
sprite, canonical name, facility and Symbol. The missing Tucker, Greta, Lucy,
Spenser and Brandon front sprites were added from pret/pokeemerald's
`graphics/trainers/front_pics/`; Anabel's existing sprite is reused.

`node tools/verifyFrontierBrains.mjs /path/to/frontier_util.c` independently
parses Emerald's `sFrontierBrainsMons` and compares all 36 species, items,
natures, move slots and EV values. It also validates complete ability
alternatives against the shared Gen 3 species reference. Verified on 2026-10-18
against [Emerald's source](https://github.com/pret/pokeemerald/blob/master/src/frontier_util.c),
SHA-256 `be3ec95f9e438f385256ae8a55f53be70677f28d3fa44272f00f2e927c9b868c`.
The source creates random non-shiny personalities constrained by nature, and
does not hard-code an ability in these set records. Both species abilities stay
visible where possible. Silver Lucy Shuckle's explicit 610 EV allocation is
preserved (252 HP / 106 SpA / 252 SpD). Dome lists Tucker's three available
candidates; the source selects a subset for the actual battle. The resource
page does not claim that all three fight together. No battle-context levels or
IV assumptions were introduced.

Targeted browser coverage includes 36 distinct Brain IDs, all 12 Symbol teams,
all expanded facts and Brain/facility/Symbol text, decoded sprites, duplicate
species across Symbols, isolated tab searches, tab-switch collapse, keyboard
tabs, Standard Sets retention, and both layouts at 320/375/390/430px. Screenshots
are `/private/tmp/frontier-brains-list-{width}.png` and
`/private/tmp/frontier-brains-expanded-{width}.png`.


Brain-tab verification: 424/424 unit tests and production build passed, with
only the existing bundle-size warning. Relevant production browser regressions
passed Frontier Sets, Resources, Moves, Abilities, Battle set search, trainer
search, Battle rules, Battle shell and Pages deployment. All 3,230 public assets
matched production paths. Battle datasets, UI and behavior remain untouched.
