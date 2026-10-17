# My Pokémon — Stage 1

Implemented Gallery and Box views, National Dex sorting, species/nickname search,
All / Frontier / Utility / Shinies filters, individual selection and local roles.
Trainer UI and global navigation are unchanged. No dependencies or downloads added.

## Save audit

Personal save files, per-save audit details, and screenshots remain local and ignored.
Duplicates remain separate entries.
Both Day Care slots are now parsed by the shared collection reader, with locations.
Day Care displayed levels are deposit levels: accumulated experience is applied by the
game on withdrawal. An unclaimed Day Care egg is not an individual BoxPokemon record;
it is not synthesized into this collection. Bad Eggs, unsupported species and corrupt
records retain the existing import-rejection policy, preserving the previous saved import.

Roles are stored separately from the raw save in `emerald-companion-2.roles.v1`.
Identity uses full original Trainer ID and personality; changes to species, nickname,
level, egg status or storage location do not change it. Identical identity collisions
(e.g. exact clones) get occurrence suffixes. Such clones cannot be reliably distinguished
if their traversal order changes, because the game stores no unique clone identifier.
Missing Pokémon's roles are retained for future imports. Failed role writes leave the
current assignment intact and show an error.

## Asset audit

All paths below are relative to `public/`. All audited artwork files are PNGs.
Numeric species filenames use National Dex IDs without padding: `1.png` … `386.png`,
with complete coverage in every species set below. Gallery artwork and Gen 3 box icons are static PNGs.

| Directory | Files | Size | Filenames / coverage |
| --- | ---: | --- | --- |
| pokemon/emerald/normal | 386 | 64×64 | 1.png–386.png |
| pokemon/emerald/shiny | 386 | 64×64 | 1.png–386.png |
| pokemon/bdsp/normal | 386 | 512×512 | 1.png–386.png |
| pokemon/bdsp/shiny | 386 | 512×512 | 1.png–386.png |
| pokemon/artwork/normal | 392 | 475×475 | 386 species + 6 forms |
| pokemon/artwork/shiny | 389 | 475×475 | 386 species + 3 forms |
| pokemon/box | 386 | 32×32 | 1.png–386.png; single set |
| types/icons | 17 | 192×192 | bug, dark, dragon, electric, fighting, fire, flying, ghost, grass, ground, ice, normal, poison, psychic, rock, steel, water (.png) |
| items | 377 | 24×24 | 0.png–376.png, complete |
| status | 2 | 2×2; 22×8 | pokerus-cured.png; pokerus.png |
| ribbons | 32 | 40×40 | Listed below |

Normal artwork extras: `castform-rainy.png`, `castform-snowy.png`, `castform-sunny.png`,
`deoxys-attack.png`, `deoxys-defense.png`, `deoxys-speed.png`.
Shiny artwork extras: the same three Deoxys files; no Castform weather variants.
`pokemon/egg.png` is available for Gallery eggs. Gallery uses normal/shiny high-resolution
artwork. Box uses the single available Gen 3 icon set, with no shiny variants.

Ribbon filenames: `artist-ribbon.png`, `champion-ribbon.png`, `country-ribbon.png`,
`earth-ribbon.png`, `effort-ribbon.png`, `land-ribbon.png`, `marine-ribbon.png`,
`national-ribbon.png`, `sky-ribbon.png`, `victory-ribbon.png`, `winning-ribbon.png`,
`world-ribbon.png`, plus each of `beauty`, `cool`, `cute`, `smart`, `tough` with suffixes
`-ribbon-hoenn.png`, `-ribbon-super-hoenn.png`, `-ribbon-hyper-hoenn.png`,
`-ribbon-master-hoenn.png` (20 contest ribbons).

## Validation

All automated tests and production build pass. Focused tests cover Day Care, eggs,
unsupported records, duplicates, sorting, search, filters, identity stability, role
reload and storage failures. Existing private real-save integration tests pass.
Browser checks confirm 3 Gallery / 6 Box columns at iPhone width, no horizontal
overflow, separate duplicate search results, selection, role assignment and filtering.
Generation, type, and represented origin-game filters combine with search and role filters.
Type icons are enlarged while Gallery artwork and card dimensions remain unchanged.
Box icons are enlarged within six iPhone columns; responsive checks cover iPhone and desktop.
