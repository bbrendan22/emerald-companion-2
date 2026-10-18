# R2E Locations port — legacy behavior audit

Legacy root is read-only. The inspection below preceded the port.

## Actual 1.0 behavior

`SpeciesEncounters.jsx` renders embedded Locations content, with native details/summary sections in the fixed order Emerald, Ruby, Sapphire, FireRed, LeafGreen, Colosseum, XD. Each game opens by default when its displayed entry count is at most three. Missing game routes are omitted, rather than inventing a generic unavailability paragraph. Emerald is omitted when neither direct nor family acquisition exists. Other games use detailed encounters or the existing native/event source fallback.

`SpeciesLocationEntries.jsx`, `speciesEncounters.js`, `groupEncounterLocations.js` and `encounterSummary.js` filter internal species IDs, sort locations naturally, merge matching routes/cities, group cave floors, independently combine matching methods, combine matching Sevii island encounters, and order categories Routes / Caves / Underwater / Cities & Towns / Sevii Islands / Other Locations. Level ranges and slot probabilities are aggregated per form, retaining different forms. Matching parent-area labels may be omitted when all subareas are covered. Conditional requirements remain expandable.

`speciesAvailability.js`, `rubySapphireAvailability.js`, `fireRedLeafGreenAvailability.js` and `orreAvailability.js` supplement wild tables with starters, gifts/eggs, fossils, static/roaming/event encounters, NPC trades, outbreaks, version-specific prizes, shadow Pokémon and Poké Spots. Historical ticket/event and bonus-disc descriptions are retained. Orre has no breeding routes; FireRed/LeafGreen omit Eevee friendship-evolution relatives. Existing Emerald trade and record-mixed outbreak exceptions remain intact.

`acquisitionRoutes.js` deduplicates routes and replaces evolution-family routes with the immediate predecessor. Evolve text is deliberately noninteractive; breeding routes link to the source species. The legacy component does not pass a location callback to its row component, so location names are noninteractive. Notes deliberately suppress many detailed source notes: outbreak notes, starter/gift notes, Feebas and several static notes; fossil/trade/ticket/starter-choice notes have specific compact formatting. This behavior is preserved, not expanded or corrected during the port.

## Inspected source files

Components: `SpeciesEncounters.jsx`, `SpeciesLocationEntries.jsx`, `GameNames.jsx`, `SpeciesPanel.jsx`, and the Locations integration in `ResourcesPage.jsx`.

Data: `locationResources.js`, `rubySapphireEncounters.js`, `fireRedLeafGreenEncounters.js`, `orreEncounters.js`, `bonusDiscEncounters.js`, `specialEncounters.js`, `availabilityNotes.js`, `availabilitySources.js`, `pokemonMeta.js`, `evolutionResources.js`, and the `breedingEvolutions` export of `eggMoveResources.js`.

Helpers: the eight encounter/availability/grouping helpers above, `evolutions.js`, `eggMoveFathers.js` (only `descendants` is needed). Styling: Locations and encounter rules in `ResourcesPage.css`. Tests: `speciesAvailability`, `acquisitionRoutes`, `rubySapphireEncounters`, `fireRedLeafGreenEncounters`, `orreEncounters`, `availabilitySources`, the six relevant suites were inspected. No separate encounter grouping/summary test file was found, so the port adds coverage for those helpers.

## Port plan and constraints

Copy the eight encounter datasets and the focused helpers without altering encounter records or lookup rules. Adapt canonical species metadata from 2.0 rather than copying a second names dataset. Reuse the already verified 2.0 evolution edges, preserving internal IDs and source iteration order; extract only the legacy descendant graph required by availability, rather than importing breeding tools or learnsets. Preserve JSX display logic with an embedded wrapper and universal-profile callback. Use Resources-scoped CSS only; retain hierarchy and compact spacing while replacing old theme colors. No shared-header component, scrolling, save or Battle changes.

## Implemented differences and provenance

- `src/resources/locations/data`: eight copied encounter/source datasets, unchanged. Their original source comments are retained: pret decompilation exports and the legacy Serebii classification table. This is a faithful port, not a fresh independent verification of every upstream source claim.
- `src/resources/locations/utils`: copied availability/grouping/rate/acquisition rules. `descendants` is extracted verbatim with only its required graph; evolution family/predecessor functions are extracted verbatim and read the existing verified 2.0 edges through internal-ID adapters. No egg-move tools or learnsets are imported.
- `src/resources/locations/components`: original two display components. Explicit React/extension imports were added for 2.0 compatibility; the outer embedded panel is a scoped div. Game-name text uses the exact legacy game-specific colors; arrows and dividers retain the original 2.0 gold styling. All conditional display logic is unchanged.
- `SpeciesProfile.jsx`: enables Locations and its keyboard traversal, passes the canonical internal ID and maps breeding-source clicks back to National ID. Locations remounts its local native disclosures per selected species, matching legacy keyed disclosure behavior. The universal species-profile component remains mounted.
- `ResourcesPage.jsx`: removes the species-title override so the shared header retains its static Emerald Companion brand. Its existing Back callback and catalog titles are unchanged; no shared shell or header styles were modified.
- `species-locations.css`: reproduces the legacy compact hierarchy and natural wrapping with scoped graphite/gold colors. No hover effects, animations, scrolling rules or overflow changes.

`provenance.json` records SHA-256 hashes of inspected legacy inputs. `tools/portResourcesLocations.mjs` reproduces the copy/adapters from a read-only legacy root; `tools/verifyResourcesLocations.mjs` compares all 386 species × seven games and renders both original and ported components in memory. Full rendered-markup comparison normalizes only game-name spans/colors and the outer wrapper class, then checks the rest exactly (including disclosure defaults, notes, encounter ordering and links). No runtime legacy imports exist.

Preserved data limitations: historical event access remains historical; suppressed legacy notes remain suppressed; missing game routes remain omitted. No new acquisition claims or missing data have been invented. Learnset remains disabled. No legacy files were modified.

## Verification results

- 352/352 unit tests pass, including six ported legacy suites and ID/form/grouping checks.
- All 30 browser scripts pass across the full run and targeted reruns. Two checks interrupted by a Vite reload were rerun successfully; all Resources scripts were rerun against the final static-header integration.
- Both 1.0 and 2.0 availability/grouping results match for 386 species × seven games. Rendered Locations markup matches for all 386 after theme/wrapper normalization. Legacy source hashes remain unchanged.
- Browser checks render all 386 species without errors. Representative wild, gift, outbreak, import-only, event, evolution and breeding cases pass at 320, 375, 390, 430 and 1280px. Screenshots at all widths were inspected. No horizontal overflow or new scroll API calls; keyboard focus, species switching and direct Back/query retention pass.
- Production build passes. Existing large-bundle warning remains; encounter tables increase the gzip JS bundle to approximately 301 kB. No new dependency, scrolling behavior, commit or push.

## Game-name text color correction

Only the `summary > [data-game]` text spans receive the exact legacy `GameNames.jsx` palette: Emerald #08755d, Ruby #b52d43, Sapphire #245cbb, FireRed #c44a1b, LeafGreen #438022, Colosseum #6552a3, XD #903a9b. Summary arrows inherit their original Resources yellow; open summary dividers remain #f4b40055; collapsed game borders remain #ffffff0b. Category, encounter, spacing and scrolling styles are unchanged. Browser assertions explicitly check text colors, yellow arrows and the original divider/border colors.

## Default disclosure state adjustment

All supported game disclosures now start closed whenever Locations mounts, including after tab changes or selecting a different species. Native independent details/summary toggling is retained, so several games may remain expanded simultaneously. The previous count-based auto-expansion and its unused counting helper were removed; no styling, encounter data, layout or scrolling code changed. The port generator reproduces this intentional deviation from 1.0, and the parity audit normalizes only those default-open attributes in addition to the existing theme normalization while asserting every ported game starts closed.

Verification: all 352 unit tests, all-species source/render parity (with the documented default-state exception), focused Locations browser checks for all 386 species and 320/375/390/430/1280px, independent expand/collapse, tab/species reset and existing color assertions, and production build pass. Existing bundle-size warning remains.
