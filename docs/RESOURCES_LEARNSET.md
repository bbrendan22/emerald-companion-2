# R2F Learnset — legacy inspection before porting

Legacy is strictly read-only. Inspected `components/LearnsetSection.jsx`, `GameNames.jsx`, `SpeciesPanel.jsx`, the Learnset integration in `ResourcesPage.jsx`, and relevant `ResourcesPage.css` rules; `utils/gameLearnsets.js`, `crossGameLearnset.js`, `evolutions.js`, `eggMoveFathers.js`; `data/crossGameMoves.js`, `eggMoveResources.js`, `itemResources.js`, `tutorResources.js`, `moveResources.js`, `emeraldData.js`, `pokemonMeta.js`; tests `gameLearnsets.test.js`, `crossGameLearnset.test.js`.

## Actual legacy behavior

Five native independent details groups, all initially collapsed: Level-up moves, TMs / HMs, Move tutors, Egg moves, Special moves. Each summary displays its existing count. There is no game selector, filter, sort control, move-detail navigation or clickable move row in this tab. Do not invent them.

Rows show existing type icon, move name, power, accuracy, PP, secondary-effect chance and learning label, with description below. Zero power/accuracy/effect chance use “-”; power one uses “Var”. Legacy group column labels are Move / Pow / Acc / PP / Eff / Learn.

Level-up groups cover Emerald, Ruby / Sapphire, Colosseum, XD, FireRed / LeafGreen. Deoxys substitutes separate FireRed Attack and LeafGreen Defense lists; Emerald uses Speed. Ancestors contribute moves absent from the current species' game list. Identical full lists group games; merged rows deduplicate by move, preserve differing-level/source notes, sort by minimum learned level then move ID, and suppress common/all-game annotations using the existing abbreviation rules.

TM/HM rows retain machine source order and compatibility. Emerald tutors preserve source order, condensed location and BP/Tutor labels; other-game tutors are merged per move with deduplicated game/location pairs. Egg moves retain source family order and each family's move order, while summary count deduplicates moves. Any duplicate displayed family entries remain as in legacy. Pichu/Pikachu/Raichu gain the Emerald Light Ball Volt Tackle special-breeding row.

Special moves retain only Purification, Gift Egg and Mt. Battle reward sources from the original cross-game helper. This helper includes ancestors, excludes moves already in Emerald level-up lists, and deduplicates source records using legacy keys. Requirement notes and “Learn as …, then evolve” text remain intact. Empty methods display the five existing category-specific messages. Limited/unusual learnsets (Ditto, Unown, Smeargle, Wobbuffet, Deoxys) are displayed as their original data provides.

## Integration plan

Keep the original JSX and helper algorithms, adapting only imports, embedded wrapper, local type-icon path and canonical IDs. Reuse 2.0 canonical species/move names, already verified evolution/descendant adapters, and compatible existing static move reference data. Copy cross-game/tutor data; project only egg/level and machine exports rather than importing unrelated breeding/item tools. Verify all legacy/canonical reference matches before writing outputs. No runtime legacy imports.

Original GameNames text colors: Ruby/R #b52d43; Sapphire/S #245cbb; Emerald/E #08755d; FireRed/FR #c44a1b; LeafGreen/LG #438022; Colosseum/Colo #6552a3; XD #903a9b; Pokémon Box #956b16. Copy the original text tokenization, including abbreviations. Only game-name spans receive those colors. Locations' mapping is scoped CSS, not a shared JS mapping; it will remain untouched.

Legacy uses an overflow-x auto rule on learnset groups. This scrolling rule is explicitly excluded by the user's current instructions. Keep the same compact columns but allow names/labels to wrap within the available width; add no scroll containers, overflow rules or scroll handlers. Group borders/backgrounds/radius are adapted to the approved plain graphite/gold design without adding cards or colored game accents.

## Implemented files and necessary adaptations

`src/resources/learnset/` contains the original Learnset component, copied GameNames component, two original lookup helpers, copied cross-game/tutor datasets, extracted egg/level/machine exports, and small canonical-data adapters. Names and PP come from existing `reference.json`; the static `battle/data/moveResources.js` table is reused unchanged after a full equality check against legacy. It is pure reference data: no Battle state, calculation code or UI is imported or modified. Species metadata and evolution/descendant functions reuse the existing verified adapters without modifying Locations files.

`species-learnset.css` retains the compact seven-column move layout, descriptions, source notes and independent native disclosure groups. It changes only theme/presentation: graphite/light text/gold, no extra backgrounds/cards/rounded containers, no hover/pressed effects or animations. Names/labels may wrap in their columns on narrow screens rather than copying legacy's min-content widths plus custom horizontal scrolling. No overflow, sticky or scrolling CSS/JS was added. Game-name tokenization and inline text colors exactly match original GameNames; game colors never style summaries/arrows, divider lines, move names or other controls. No ordered type filter exists here; move rows and icons retain source order, with no app type-order changes.

`SpeciesProfile.jsx` enables Learnset and includes it in the existing keyboard tab sequence; identity and other panels are unchanged. `ResourcesPage.jsx` changes the remaining catalog header-title override to the static “Emerald Companion” brand, as explicitly required; catalog headings, search/filter state and Back callbacks are unchanged. Shared header/component/styles are untouched.

`tools/portResourcesLearnset.mjs` reproduces the export from a read-only legacy root and records SHA-256 hashes in `provenance.json`. `tools/verifyResourcesLearnset.mjs` compares original/projected datasets, original/copied helper results and both rendered JSX components for all 386 species. The render comparison normalizes only the outer embedded-wrapper class and icon-asset root. Game-name colors, row order, power/accuracy/PP/effect formatting, source text, group counts and default-closed state are compared exactly. Original legacy tests are ported with import changes only; focused browser coverage is in `test/speciesLearnset.browser.mjs`.

No missing in-scope species data or canonical-reference discrepancies were found. Legacy limitations are preserved: absent methods use original messages; this tab has no selector, sort/filter UI or move-detail navigation; duplicate egg-family rows and deduplicated summary counts remain as originally implemented. Historical/special source requirements retain their original wording. No new move acquisition claims were introduced.

## Verification results

- 364/364 unit tests pass, including twelve original Learnset/cross-game regression cases ported with import changes only.
- All 31 browser scripts pass across the full run and successful Resources rerun. Its obsolete changing-title timing assumption was replaced with an explicit Back-button wait for the requested static header; the remaining 30 scripts passed in the full run.
- Original and ported data/helper results and rendered content match for all 386 species. Legacy input hashes are unchanged. This verifies parity with the existing 1.0 feature; it is not a new independent audit of every cached Serebii source record.
- Browser verification renders all 386 species without a save, checks all five groups, row order, local icon decoding, exact game-name-only colors (including abbreviations and Pokémon Box), limited/empty/special learnsets, Deoxys form differences, species switching, static header, direct Back/query retention and unchanged collapsed Locations.
- Screenshots inspected at 320, 375, 390, 430 and 1280px. No horizontal overflow or new scroll calls. No sticky/custom scrolling, scroll restoration/locking, page overflow rules or scroll controls added.
- Production build passes. Existing large-chunk warning remains; the faithful cross-game table increases total gzip JavaScript to approximately 385 kB. No dependency, runtime network requirement, commit or push.

Source provenance retained: crossGameMoves was generated in 1.0 from cached Serebii Gen III species tables; tutor/egg/level/machine and move references carry their original pret/pokeemerald source lineage. Canonical move-reference equality was checked in full before reusing it. No in-scope missing data or unexplained parity differences remain.
