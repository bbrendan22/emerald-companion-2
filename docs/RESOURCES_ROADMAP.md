# Resources roadmap — Milestone 5, Step R0

Audit date: October 17, 2026. Baseline: `7bde447` (Milestone 4).

**Status: proposal only; stop for approval before R1.** This audit changes only this document. No application code, styles, dependencies, assets, save parsing, or Battle behavior changed. No datasets were downloaded or imported into 2.0. The legacy project was inspected read-only. Counts below describe file contents and structural coverage, not an independent verification of every value against a cartridge.

## 1. Existing architecture findings

- React 19 + Vite 8, JavaScript ES modules, local JSON reference files; no router, state library, UI framework, runtime API, or external fonts. `src/main.jsx` mounts `src/ui/App.jsx` and loads palette/base CSS.
- `src/ui/navigation.js` already lists Trainer, My Pokémon, Battle, Resources; Settings is separate. The header menu opens `NavigationDrawer`, a native modal dialog with backdrop dismissal, Escape handling, scroll locking, and active-section semantics. Settings opens from the gear.
- `App.jsx` uses `pageId` React state, starting at Trainer. Navigation clears subpage state, closes the drawer, scrolls to the top, and focuses the heading/main. There are no URL routes, deep links, or browser-history integration; reloading resets navigation.
- Resources currently receives the generic heading and a graphite placeholder reading “Your reference library will live here.” No Resources page/component/CSS exists. This branch is the narrow integration point; completed page internals do not need changes.
- Pages live in `src/ui/pages/`; components in `src/ui/components/`; feature CSS in `src/ui/styles/`. Pages import their styles. Common patterns include compact headings, segmented controls, search/filter toolbars, result counts, empty states, sprites, icon-only buttons with accessible names, and local detail views.
- My Pokémon profiles consume owned Pokémon with save-specific fields. Do not feed fabricated save records into `PokemonProfile` to make a reference detail page. Reuse small presentation conventions and pure reference helpers instead.
- The shell's header back action is currently enabled only for Pokémon subpages. Future Resources back navigation needs a small explicit shell integration; setting existing `subpage` alone will not enable it. Keep Resources detail state separate from owned-Pokémon selection and Battle state.
- `useImportedSave`, showcase state, and `useBattleState` are owned by App. Resources should require no imported save and should not mutate those hooks. Loading Resources must not introduce additional damage-calculator dependencies.

### Layout and visual conventions

`base.css` establishes system typography, foreground `#f3f4f6`, page background `#17191c`, dark color scheme, keyboard focus, reduced motion, and 44px icon buttons. `page.css` limits the page to 960px with safe-area padding; feature styles adjust compact spacing. Header/drawer have their own styles. `section-heading.css` shares the small pale-blue underlined heading pattern between existing features.

Surfaces use `#202328` / `#24272d`, subtle borders and seams, restrained graphite gradients, muted secondary text, and dense controls. Collection selected states include `#263443` and translucent blue; Battle tabs use a neutral metallic selected surface. `palette.css` assigns Resources an existing gold accent (`#F4B400`, neon `#FFD85C`), while My Pokémon uses blue. Preserve the gold navigation identity and established metallic-blue reference selections without recoloring other sections or introducing a new palette.

The app uses natural document scrolling, `viewport-fit=cover`, safe-area insets, flexible/grid layouts, `min-width: 0`, and feature-specific media queries. Shared page spacing changes at 700px; the collection goes from three to six gallery columns at 900px. Search inputs use 16px text. These are conventions to follow, not justification to alter existing global selectors.

A manifest and install icons exist, but no service worker/cache registration exists in source/public. Bundled local data avoids runtime network requests; this is **not** a guarantee that the site can reopen offline. README's opening placeholder description is stale for My Pokémon and Battle; inspected source takes precedence.

## 2. Data availability matrix

Legend: **Ready** = structurally complete in 2.0; **Derived** = accurately computed from existing local values; **Candidate** = present only in legacy and needs review/copy approval; **Missing** = no suitable 2.0 dataset. Candidate files are not runtime dependencies or approved imports.

### Pokémon: all 386 National Dex entries

| Field | 2.0 coverage / source | Reuse and limitations |
| --- | --- | --- |
| National number and name | **Ready**, 386 `reference.json.species` records, National IDs exactly 1–386 | Object keys are internal IDs (range 1–411 with gaps), not National IDs. Sort/join explicitly by `nationalDexId`. |
| Types | **Ready**, 386 `pokemonTypes.json` entries keyed by National ID | Lowercase, 17 Gen 3 types, no Fairy. Presentation types must not use modern typings. |
| Six base stats | **Ready**, all 386 `reference.json.species` records | Deoxys internal 410 / National 386 explicitly uses Emerald Speed Forme: HP 50, Atk 95, Def 90, Spe 180, SpA 95, SpD 90. Do not replace with legacy/general form values. |
| Base-stat totals, bars, generation filters | **Derived** | Sum six base stats; `src/pokemon/statBars.js` validates complete coverage and derives bar ranges. Generation follows National boundaries 151/251. |
| Ability assignments/names | **Ready**, all 386; all assigned IDs resolve | `abilities` arrays + `abilityNames`: 77 abilities plus ID 0 “None.” No hidden abilities. Names do not supply mechanics descriptions. |
| Evolutions | **Missing**; legacy **Candidate** | `evolutionResources.js`: 172 source-species entries, internal-ID targets and method/parameter records. Sparse entries are not inherently missing species. Validate terminal species and special conditions before import. |
| Level-up learnsets | **Missing**; legacy **Candidate** | `eggMoveResources.js.levelMoves`: 386 entries. Validate Emerald version and internal-ID mapping. Owned current moves and Frontier sets are not species learnsets. |
| TM/HM compatibility | **Missing**; legacy **Candidate** | `itemResources.js.machineResources`: 58 machine entries containing move IDs and compatible internal species IDs. Derive species-to-machine index only after validating all 50 TM / 8 HM records. |
| Egg/tutor/cross-game moves | **Missing**; legacy **Candidate** | `eggMoveResources.js.eggMoves`: 165 species entries; `tutorResources.js`: 30 tutor records. `crossGameMoves.js` exists but was not exhaustively validated. Keep source game and method distinct. |
| Locations and obtainability | **Missing**; legacy **Candidate**, partial semantic coverage | `locationResources.js`: 113 map records with encounter methods, species, levels and rates. Additional `specialEncounters`, availability, and cross-game datasets exist. Wild tables alone cannot prove full availability or absence. |
| Egg groups | **Missing**; legacy **Candidate** | `breedingResources.js.eggGroups`: 386 entries; verify enum labels and species IDs. |
| Breeding/hatching | Gender available; remaining fields **Missing** / legacy **Candidate** | `hatchingResources.js.eggCycles`: 386; egg moves and breeding evolution records exist. Incense, inheritance, compatibility and Emerald-specific rules require validation; egg-cycle values alone are not a breeding guide. |
| Growth rate | **Ready**, all 386 species | Six growth curves; `src/save/stats.js` has experience/level functions. |
| Experience thresholds | **Derived** | `expForLevel`, `levelFromExperience` for levels 1–100. Validate UI input rather than relying on the helper's default curve for unknown input. |
| Height | **Missing**; legacy **Candidate** | `speciesDetails.js`: 386 entries with height in metres. |
| Weight | **Ready**, 386 `src/battle/data/weights.json` values keyed by National ID | Consumed in kilograms by Low Kick logic; sample Bulbasaur 6.9. Legacy `speciesDetails` also has weight; compare rather than create a competing canonical table. |
| Gender ratio | **Ready**, all 386 species | Raw cartridge threshold; derive display using Gen 3 threshold semantics, including female-only/male-only/genderless sentinels. Do not display raw byte as a percentage. |
| Catch rate | **Missing**; legacy **Candidate** | `speciesDetails.js.catchRate`, 386 records. A catch rate is not a capture probability. |
| Base experience yield | **Missing**; legacy **Candidate** | `speciesDetails.js.expYield`, 386 records. Keep separate from growth curves and modern yields. |
| Other useful reference fields | **Missing**; legacy **Candidate** | `speciesDetails`: category, description, base friendship, common/rare held items; `evResources.js.evYields`: 386 records; `pokedexEntries.js`: 386 entries with version-labelled text. All require provenance/coverage review. |

The existing parser documentation traces reduced references to legacy `emeraldData.js` / `pokemonMeta.js`, originally generated from pret/pokeemerald, and records the Emerald Deoxys correction. This establishes ancestry, not a fresh cartridge-level accuracy audit. Later-generation typing, base-stat buffs, abilities, evolution methods, learnsets and experience yields must never silently replace these values.

### Moves, abilities, items, berries and utilities

| Dataset / module | Actual coverage | Resources recommendation |
| --- | --- | --- |
| `src/data/reference.json` | ~153 KiB; 386 species, moves 0–354 (name/PP), abilities 0–77 (names) | Reuse directly; exclude empty move/ability sentinels from catalog totals. |
| `src/data/profileReference.json` | ~18 KiB; move types 0–354, item names 0–376, sparse 17-type chart | Reuse canonical names/type chart; do not interpret every numbered item slot as an obtainable Emerald item. |
| `src/battle/data/moveResources.js` | Exactly 354 moves, IDs 1–354; type, power, accuracy, PP, priority, effect token, effect chance, description | Ready for a move reference. Audit found zero PP/type mismatches against the above references. Power 0/1 and accuracy 0 are game conventions, not always literal displayed values. Effects/descriptions do not implement every move's mechanics. |
| Move category | Derivable from Gen 3 type-based physical/special split, with status classification | Do not apply the Gen 4 per-move split. Dynamic and exceptional moves need existing semantics/explicit notes. |
| Ability mechanics | 77 names in 2.0; selected behavior in Battle code, no full description catalog | Legacy `abilityResources.js`: 77 in-game descriptions; `abilityFieldEffects.js`: 23 curated entries. `abilityDescriptions.js` contains blank descriptions (first entry blank), so presence is not completeness. Validate before migrating. |
| Items | 377 names and 377 icons, including ID 0 and unused/version-specific slots | No general descriptions, pockets, prices, acquisition, or full held-effect metadata in 2.0. `battle/itemLookup.js` normalizes names to IDs; it is a lookup, not a catalog. Battle modifiers support selected effects only. |
| Legacy item candidates | `itemResources.js`: 251 item metadata records plus 58 machines | Description/pocket/price/held flag are useful but sparse; absence and `held` boolean do not prove obtainability or complete effect coverage. Acquisition/shop datasets need separate review. |
| Berries | Names/icons: IDs 133–175 (43 named berries); 176–178 are unused berry slots | No complete berry growth, yield, firmness, flavor, smoothness, planting or acquisition metadata in 2.0. Berry Juice and Berry Pouch are not berries. Legacy acquisition files exist; no standalone complete horticultural dataset was established in this audit. Enigma needs explicit special handling. |
| Type chart | `profileReference.typeChart`, 17 attacker types, non-neutral entries only | Missing matchup entries mean 1×. Steel/Ghost/Dark-era rules must stay Gen 3. `pokemon/profile.js.typeMatchups` provides ordinary defensive combinations; `battle/typeMatchups.js` preserves cartridge calculation ordering for Battle. |
| Pure utilities | `save/stats.js`, `pokemon/profile.js`, `pokemon/statBars.js`, `battle/hiddenPower.js`, reference accessors | Reuse where input/output fits. Two existing Hidden Power helpers have different validation/casing contracts; select one deliberately, do not refactor them during Resources work. |
| Battle-specific data | Frontier Pokémon, trainers, brains, tower rules, sets, damage helpers | Useful future cross-links or mechanics examples; not a substitute for general Pokédex learnsets, encounter locations, item availability, or a full mechanics encyclopedia. Keep future tools independent of Battle state/preview orchestration. |

`moveResources.js` names `tools/buildMoveResources.mjs`, but that tool is absent from 2.0. No generator directory is present. Future dataset work should include reproducible extraction/provenance in 2.0 rather than assuming old comments describe runnable tooling.

## 3. Asset inventory

All checks below inspected existing files only. Numeric image coverage was checked for every National ID 1–386; file presence is not visual verification of every image.

| Public path | Files / coverage | Existing usage and caveats |
| --- | --- | --- |
| `pokemon/artwork/normal/{dex}.png` | 386 numeric + 6 named variants = 392 | Collection, profile, showcase; extra Castform sunny/rainy/snowy and Deoxys attack/defense/speed. |
| `pokemon/artwork/shiny/{dex}.png` | 386 numeric + 3 Deoxys variants = 389 | Shiny choice is a directory switch. No named shiny weather Castform variants here. |
| `pokemon/emerald/{normal,shiny}/{dex}.png` | 386 each | Complete lightweight cartridge-style sprite options. |
| `pokemon/bdsp/{normal,shiny}/{dex}.png` | 386 each | Available modern presentation assets; not evidence of Emerald mechanics or extra forms. |
| `pokemon/box/{dex}.png` | 386 | Collection Box view; no separate shiny directory. |
| `pokemon/egg.png` | 1 | Collection/showcase egg representation; egg is not National Dex entry 387. |
| `types/icons/{lowercaseType}.png` | 17 | Collection/profile colored type indicators. Supply accessible type text; do not add Fairy. |
| `items/{internalItemId}.png` | 377, IDs 0–376 | Profile and Battle item display; names use the same item namespace, not National IDs. |
| Other existing assets | 8 badges, 14 Frontier symbols, 32 ribbons, 2 status icons, 4 trainer portraits, 51 Frontier trainer sprites, 7 app icons | Reuse only where relevant; no Resources-specific category icon pack currently exists. `Icon.jsx` has menu/close/ball/settings SVGs only. |

Paths are root-relative (`/pokemon/...`, `/types/...`, `/items/...`). Preserve that established hosting assumption unless a separate base-path task is approved. `collectionImage` builds gallery/box paths; `ShowcaseArtwork` supplies an accessible question-mark fallback after image failure. Profile/collection images do not have universal fallbacks. Battle item image failures hide the icon while retaining text. A future reference image wrapper should adopt the useful fallback pattern without changing completed pages.

Do not assume numeric `386.png` matches Speed Forme simply because the stats do. A named `deoxys-speed.png` exists; visually verify form identity in the Pokédex stage and label forms clearly. Castform weather typing is battle-dependent and should not overwrite base species data. Unown forms are not extra National Dex entries; individual letter asset coverage is not present in these numbered directories.

Assets total approximately **170 MiB** (3,225 files): artwork 101.21 MiB, BDSP 64.60 MiB, Emerald sprites 0.54 MiB, box sprites 0.10 MiB. Avoid preloading or precaching every art family. No deletion, regeneration, optimization, or download is proposed for R1.

## 4. Missing information and recommended sources

### Source policy

1. Existing 2.0 references remain canonical for fields already consumed by parsing/Battle.
2. Review legacy candidates read-only, then migrate only approved missing fields into small version-labelled 2.0 datasets in a later stage. Never import from `../emerald-companion` at runtime or copy its broader architecture.
3. Resolve uncertainties against original Emerald data via [pret/pokeemerald](https://github.com/pret/pokeemerald). Record a commit SHA, source path, extraction method, units, ID namespace and exceptions when adding data. Use the original project, not expansion/fork datasets.
4. Use established game-specific references for human-readable explanation and cross-checks, preserving Emerald/Gen III distinctions. Source discovery in R0 used web search only; no new dataset files were fetched or incorporated.

### Research targets for later approved stages

| Gap | Primary Emerald source target | Validation required |
| --- | --- | --- |
| Species metadata, egg groups/cycles, yields, catch rate | pret `src/data/pokemon/species_info.h`; older generator revisions may refer to base-stats tables | Map internal IDs; verify height/weight units and Deoxys runtime form overrides. |
| Height, weight, category, Pokédex prose | pret `src/data/pokemon/pokedex_entries.h` and associated text | Emerald text/version; prose normalization must not alter meaning. |
| Evolution | pret `src/data/pokemon/evolution.h`, `src/pokemon.c` | Wurmple PID branches, Shedinja conditions, Tyrogue stats, friendship time windows, beauty, trade/items. |
| Learnsets | pret Pokémon level-up and egg-move tables, TM/HM learnsets; tutor tables/scripts | Emerald versus RS/FRLG, repeatability/cost, breeding prerequisites and cross-game-only moves. |
| Encounters/availability | pret `src/data/wild_encounters.json`, map scripts, gifts/trades, event scripts | Levels/rates, fishing/Surf/Rock Smash, Safari, outbreaks, roamers, gifts, fossils, event/language restrictions and trade-only species. Do not infer “unobtainable” from no wild record. |
| Item/berry reference | pret item tables, berry tables and item/berry effect code; map/shop scripts | Usable vs unused/other-version slots, held effects, acquisition, Enigma special data, growth/flavor/yield mechanics. |
| Abilities and mechanics | pret ability names/descriptions, `src/battle_util.c`, `src/pokemon.c`, `src/daycare.c`, encounter code | In-game text is abbreviated; distinguish battle effects from Emerald-only field/breeding effects. |

These are upstream file targets to confirm at the chosen pinned revision, not files downloaded in this audit. For context and cross-checks: [pret Pokémon structures](https://github.com/pret/pokeemerald/blob/master/include/pokemon.h), [pret encounter implementation](https://github.com/pret/pokeemerald/blob/master/src/wild_encounter.c), [Serebii's Gen III Pokédex](https://www.serebii.net/pokedex-rs/index.shtml), [Serebii Emerald](https://www.serebii.net/emerald/), and [Bulbapedia Emerald](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Emerald_Version). The Gen III Pokédex spans multiple games, so a Gen III label alone does not establish Emerald learnset or encounter accuracy.

Full breeding explanations and accurate acquisition coverage require a curated dataset/guide layer beyond numeric game tables. Treat legacy curated notes, missing rows, unpinned generator output and special-event claims as uncertain until reviewed.

## 5. Proposed Resources information architecture

Keep the existing app architecture. Add a Resources page under the existing drawer entry, with a small Resources-local view state: home → category → optional detail. Future categories:

1. **National Pokédex** — all 386 species, then detail pages and reviewed supplementary fields.
2. **Moves** — 354 moves, search/type/category filters and details.
3. **Abilities** — 77 abilities, assigned species and verified effects.
4. **Items & berries** — valid item categories, machines, berries and acquisition details as reviewed.
5. **Calculators & tools** — standalone stat/experience/Hidden Power or other separately scoped tools.
6. **Guides & mechanics** — type matchups, breeding and Emerald mechanics with source notes.

Use local imports and pure selectors, not a server/database or a major router rewrite. A future `src/resources/` can hold reference adapters/search helpers; resource UI can remain under existing pages/components conventions, with styles scoped to Resources. Build the National index once from `Object.entries(reference.species)` and retain both IDs. Do not mutate canonical objects or copy existing names/stats/types into new data files. Future supplementary data should carry only missing fields and documented joins.

Resources adapters may read current Battle-owned metadata such as moves/weights directly without moving or duplicating it. Avoid importing a Battle page, state hook, or damage engine merely to obtain reference data. Defer any truly necessary shared-data relocation to a separately justified change.

At 386 species / 354 moves, ordinary normalized in-memory filtering is sufficient; no search dependency, worker, virtualization, or backend is justified. Search species by name and National number (including `#025`); filter by type and origin generation; sort deterministically. Memoize the static index, keep controls local, preserve list position/filter state while entering/leaving a detail, and show counts/clear/no-results states. More advanced filters wait until their source data is validated.

Use dynamic imports for later category datasets if bundle measurements justify them; do not add complexity preemptively. Load image thumbnails lazily with fixed dimensions; defer large detail artwork until opened.

### Offline behavior

All reference functionality should run from bundled data without runtime API calls. Reliable offline reopening requires a later explicit cache/service-worker stage: versioned app-shell and reference-data caches, a bounded sprite choice, on-demand artwork caching, update behavior and iPhone storage-eviction testing. A manifest or previously loaded tab does not satisfy this requirement. Do not precache the entire 170 MiB asset tree. Save persistence stays in its existing storage path; Resources does not require or duplicate raw saves.

Future calculators own independent inputs/results. They may call an existing pure formula through an intentional adapter, but must not share Battle team state, matchup state, conditions, preview lifecycle, or save-write behavior. No change to the completed damage calculator is needed.

## 6. Suggested design approach

Use the current compact graphite page vocabulary. A small Resources title and “Pokémon Emerald · Generation III” context line lead into six section cards. Each card has one restrained icon, a concise title, one-line scope, and a clear availability state. Avoid large hero art, unrelated brand assets, gradients with new colors, or bulky promotional content.

On phones, use a single column of compact cards with generous tap areas and natural scrolling. At tablet/desktop widths, use two or three columns inside the existing 960px page width. Let longer text wrap without horizontal overflow. Keep gold as the Resources section cue and use the established metallic-blue selected-control treatment, existing typography, subtle seams and type indicators. Do not restyle existing buttons globally.

Reference lists should share a compact heading/back affordance, labelled search, restrained filter controls, result count, and consistent loading/empty/unavailable behavior. Pokémon rows/cards show National number, name, sprite and types; details use compact stat/metadata sections. Choose list/grid density after checking real iPhone widths rather than forcing the existing three-column collection layout onto denser reference data.

Use clear section-specific inline SVGs consistent with the existing stroke style when implementation is approved; the current generic Icon component does not already contain six category icons. Keep controls keyboard accessible, provide visible focus, meaningful text labels, minimum practical touch targets and reduced-motion support. Do not make icon color the only identifier.

Search belongs inside each implemented category initially. Defer global cross-category search until several searchable datasets exist. Planned categories must be visibly labelled “Planned,” not links into empty working-looking pages. R1 should not offer a nonfunctional Pokédex search field.

## 7. Ordered implementation stages

Each stage ends with review before the next begins.

| Stage | Scope | Exit evidence |
| --- | --- | --- |
| **R0 — this audit** | Architecture/data/asset inventory and roadmap only | Only this document changed; approval requested. |
| **R1 — Resources home/navigation** | Compact landing page and six category cards with truthful planned states; shell integration only as needed | Responsive/accessibility review and existing-page regression checks; no reference-detail implementation. |
| **R2 — Core National Pokédex** | All 386 from existing 2.0 data; name/number search, type/generation filters, deterministic order; basic detail with stats/types/abilities/growth/gender/weight | Complete ID joins, Gen 3/form correctness, list/detail/back/filter retention, image fallbacks, no-save operation. Enable Pokédex card here. |
| **R3 — Reviewed Pokédex enrichment** | Small approved legacy migrations or pinned-source extraction for evolution, physical/capture/breeding metadata and prose | Per-field provenance, all-species coverage or explicit exceptions, no duplicate canonical values. Split into smaller reviews if necessary. |
| **R4 — Learnsets and obtainability** | Emerald level-up/TM/HM/tutors/egg moves, then encounter/special/trade/event availability | Version/method labels, rates/conditions, sparse-data semantics and cross-game separation. Review these datasets separately. |
| **R5 — Moves and abilities** | Reuse 354-move metadata; add validated ability descriptions and species links | Sentinel handling, physical/special rules, display of dynamic values and version-specific effects. Can move earlier if preferred. |
| **R6 — Items and berries** | Valid item catalog, metadata, berry mechanics and acquisition | Exclude unused slots, preserve IDs, verified berry-specific fields and special cases. |
| **R7 — Independent tools and guides** | Separately scoped small calculators and sourced Emerald mechanics guides | Formula/input tests and explicit isolation from Battle state. |
| **R8 — Reliable offline delivery** | Versioned cache policy and on-demand media strategy | Airplane-mode cold reopen after initial install, cache updates, iPhone storage/performance checks. May be pulled forward after R2 if offline delivery is prioritized. |

## 8. Technical risks and verification plan

- **Identity mismatch:** species internal IDs differ from National numbers, particularly after Johto. Legacy evolutions/learnsets/machines often use internal IDs; types/weights/images use National IDs. Test cross-boundary examples, Chimecho (internal 411 / National 358), Deoxys and round-trip joins.
- **Version drift:** do not use current-generation stats/types/abilities or combined Gen III learnsets as Emerald truth. Preserve Speed Forme stats and verify artwork separately. Never overwrite parser references just to simplify a Resources display.
- **App coupling:** expanding App's subpage/back behavior can affect completed pages. Scope any shell change narrowly; Resources must work with no save, after import, and after visiting Battle/My Pokémon.
- **Misleading completeness:** current moves, Frontier sets, wild-only locations, abbreviated descriptions and sparse legacy entries do not establish full reference coverage. Distinguish unknown, not applicable, none and external-game availability.
- **Unsupported provenance:** legacy generator comments lack a pinned upstream revision; a cited builder is missing in 2.0. Validate migrated fields and document their derivation before trusting counts as correctness.
- **Mobile cost:** excessive artwork, eager detail rendering and all-media precaching increase network/storage pressure. Use light thumbnails, dimensions and lazy loading; measure before adding infrastructure.
- **Offline/install:** current manifest has no cache implementation. Test cold reopen and version changes explicitly in its later stage; iOS may evict storage.
- **CSS leakage:** global selectors and copied collection class names can alter completed pages. Add scoped Resources rules; verify existing page screenshots/behavior after implementation.
- **Navigation expectations:** local state does not give browser Back/deep links. Preserve this convention initially and provide in-app back behavior when details arrive; URL routing is a separate choice.

R0 verification used read-only scripts to count dataset entries, check 1–386 coverage, resolve assigned abilities, compare move PP/type values, inspect asset filenames and measure directory sizes. No build or test suite was run because this is a documentation-only audit; running the build would write `dist/`. No UI was implemented or visually tested in R0. Future code stages should run appropriate existing tests/builds and review phone/desktop layouts, keyboard focus, long names, no-result filters, missing media and transitions back to completed pages. Do not add tests that merely repeat markup.

## 9. Proposed scope for Step R1

**Approve a Resources landing page only.** R1 would replace the existing Resources placeholder with six compact category cards, explanatory Emerald/Gen III context, and clearly labelled planned status. Keep all categories planned until their reviewed implementation is available; enable National Pokédex in R2. Navigation in R1 means access through the existing drawer and coherent home structure, not fabricated reference pages.

Expected change boundary: one Resources page, one scoped stylesheet, minimal `App.jsx` integration and small icons if required. No new dependencies, datasets, asset downloads, save parser changes, Battle calculator changes, existing-page redesigns, global search, service worker, or router rewrite.

Acceptance: opens from the existing drawer without a save; matches graphite surfaces, typography, spacing, section identity and established selected states; works at 320/375/390/430px phone widths and desktop; no overflow; accessible controls/focus; planned categories cannot masquerade as functioning tools; existing Trainer/My Pokémon/Battle/Settings behavior remains intact. Run existing regression tests and production build after implementation, with targeted visual review.

**Stop here for approval. R1 has not been implemented. No commit or push was performed.**
