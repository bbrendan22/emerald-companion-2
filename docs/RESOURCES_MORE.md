# Resources species More tab

The universal species profile renders eleven fields from a verified projection keyed by National Dex ID. Existing growth-rate categories and item names are reused, without duplicating their mappings. No runtime dependency on legacy or the network exists.

## Provenance

Source: original `pret/pokeemerald` revision `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`.

- `src/data/pokemon/species_info.h`: catch rate, Emerald base EXP yield, friendship, common/rare held-item IDs, EV yields, egg groups and egg cycles.
- `src/data/pokemon/pokedex_entries.h`: height (decimeters) and weight (hectograms), each divided by ten for meters/kilograms.
- Growth categories are checked against the existing 2.0 `reference.species`; item IDs resolve through existing `profileReference.itemNames`.

`tools/buildResourcesMore.mjs` verifies all 386 records against read-only 1.0 `speciesDetails.js`, `hatchingResources.js`, `breedingResources.js` and `evResources.js` before writing `src/resources/data/more.json`. Source hashes and pinned revision are recorded in the output. Run it with the legacy root and the same pinned export directory used by the Overview generator, plus `src/data/pokemon/species_info.h`.

## Display conventions

The labels and two-column structure match legacy `SpeciesFacts.jsx`. Approximate hatch steps = egg cycles × 256, preserving 1.0's convention. This is not an exact hatch timer: cycle timing, existing party step counter and Flame Body/Magma Armor can affect actual steps. Undiscovered species still show their stored cycle count, rather than implying they can breed. Genderless species retain their true egg group (e.g. Magneton: Mineral); genderless does not itself mean non-breedable. Fairy is an egg group, not a Generation 3 type.

Wild items show ordinary species-table encounter probabilities: common 50%, rare 5%, identical nonzero slots 100%, no items “None”. Verified against `src/pokemon.c`'s held-item assignment. These are base rates, without Compound Eyes (60%/20%), special encounter restrictions or the activated Altering Cave override. Values describe species possibilities, not a claim that every species is catchable wild in Emerald. Missing in-scope species fields: none.

No screenshot file was available in this request; the read-only 1.0 component supplied its exact labels and table structure. No identity, Overview, Stats, header, search/filter, or scrolling code was changed. Only More activation and keyboard traversal to the new enabled tab were integrated.
