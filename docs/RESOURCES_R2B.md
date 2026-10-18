# Resources R2B — species profile shell and Overview

## Scope

Species profiles are separate from owned Pokémon profiles. Entry links in the National Pokédex open a species profile; the shared header shows its name and returns to the same catalog/search query. Evolution-artwork buttons update the selected National Dex ID in the same mounted species-profile component; names, methods and surrounding whitespace are noninteractive. Back still returns directly to the originating catalog rather than stepping through species switches. Homepage quick-search behavior is unchanged.

Identity uses existing normal artwork, National ID, generation, existing Gen 3 type icons, and canonical standard-ability/gender mappings. Deoxys explicitly uses the local Speed Forme artwork. Artwork failures fall back to the existing Emerald sprite, then an accessible unavailable marker. Overview contains Abilities, Emerald Pokédex Entry and the complete Evolution Chain. The other four tabs are disabled and have no fabricated panels.

No scrolling behavior is introduced: no sticky elements, scroll containers, snapping, locks, restoration, overflow adjustments or new scroll calls. New programmatic focus uses `preventScroll: true`. Existing shell and catalog scrolling code is untouched.

## Verified reference data

The current 2.0 references did not contain descriptions, flavor text or evolution tables. Read-only legacy candidates were compared in full against original `pret/pokeemerald`, pinned at **731ad5bfd6e6f265508d0efcca0ba42f9dcf5881**.

- 386 Emerald entries: legacy `speciesDetails.js.description` and `pokedexEntries.js.Emerald` both match the pinned Emerald text, after whitespace collapse only.
- 77 ability descriptions: legacy `abilityResources.js` matches Emerald's own in-game descriptions exactly. These descriptions are intentionally concise cartridge text, not exhaustive mechanics guides. Cacophony is present upstream but is assigned to no canonical species. The legacy curated `abilityDescriptions.js` has blank entries for Stench (1), Illuminate (35), Pickup (53); these curated summaries were not imported.
- 172 evolution-table source rows / 184 directed edges: legacy `evolutionResources.js` exactly matches the pinned table, including method and parameter values. Internal species IDs were mapped to National IDs through existing `reference.species`; names, base stats, abilities and typing were not duplicated or replaced.
- Existing canonical ability assignments, gender thresholds and National IDs remain in `src/data/reference.json`; item requirement names come from `profileReference.json`; typing remains in `pokemonTypes.json`.

The resulting `src/resources/data/overview.json` contains only newly needed flavor text, cartridge ability descriptions, evolution edges, and provenance (revision plus SHA-256 hashes of the four legacy candidate files). No runtime import from legacy and no network dependency are used. No new artwork was fetched or generated.

Primary upstream sources at the pinned revision:

- [Emerald Pokédex text](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/data/pokemon/pokedex_text.h) and [entry-to-text mapping](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/data/pokemon/pokedex_entries.h).
- [In-game ability text](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/data/text/abilities.h).
- [Evolution table](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/data/pokemon/evolution.h), [evolution-condition implementation](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/pokemon.c), and [Shedinja creation](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/evolution_scene.c).

Special conditions verified against those sources: friendship 220+, Espeon noon–11:59 PM / Umbreon midnight–11:59 AM on Emerald's in-game clock; Wurmple upper-personality branches; Tyrogue Attack/Defense comparisons; Feebas Beauty 170+; trade and held-item evolutions; Nincada/Shedinja's empty party slot. Original Emerald does not add the later spare-Poké-Ball requirement to Shedinja. No modern evolutions are included. Gender percentages display the conventional nominal Gen 3 ratios (e.g. threshold 31 displayed as 12.5% female), with explicit genderless/female-only/male-only cases.

## Reproduction

`tools/buildResourcesOverview.mjs` accepts a read-only legacy root and a pinned upstream export folder. The export contains `revision.txt` and upstream files named with slashes replaced by double underscores. Export the following files from the exact pinned revision: `include/constants/{species,abilities,items}.h`, `src/data/pokemon/{pokedex_text,pokedex_entries,evolution}.h`, and `src/data/text/abilities.h`. The generator asserts all comparisons and counts before writing the new projection:

```sh
node tools/buildResourcesOverview.mjs /path/to/emerald-companion /path/to/pinned-export
```

Reference research used additional temporary copies of `src/pokemon.c`, `src/evolution_scene.c` and `include/constants/pokemon.h`. Only the verified projection is bundled. Missing source data for the in-scope 386 species: **none**. More detailed ability mechanics and the four disabled tabs remain future work.
