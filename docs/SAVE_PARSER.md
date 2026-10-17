# Emerald Companion 2 — save parser test foundation

The parser uses ES modules and Node's built-in test runner, independently of the React interface. Run `npm test` from the project root. The parser has no runtime dependencies or connection to the 1.0 application.

## Files

- `src/save/readSave.js`: validate raw save size, both complete slots, section IDs, signatures, checksums and counters; select a valid slot and reassemble blocks in logical order.
- `src/save/readTrainer.js`: raw Trainer identity, playtime, money, badges and National Pokédex flags, with consistency warnings.
- `src/save/readPokemon.js`: boxed/party decryption, substructure ordering, checksum enforcement and normalized Pokémon records.
- `src/save/readCollection.js`: extract party and all 420 PC positions from `readSave` output; retain duplicates and report rejected records with their location and original bytes.
- `src/save/binary.js`: bounded DataView access and sector checksum arithmetic.
- `src/save/stats.js`: experience thresholds, level derivation and stat formulas.
- `src/save/text.js`: explicitly limited Western character decoding.
- `src/data/reference.json`: only required species metadata, base stats, growth rates, abilities and move names/PP. 386 species with distinct internal/National IDs, 354 moves plus the empty entry, ability names. No sprites or unrelated databases.
- `test/*.test.js`: direct save, Pokémon, collection and arithmetic tests.
- `test/fixtures/`: independent synthetic encoder, fixed hex record, fixture provenance and space for future verified real saves.

## API and consistent Pokémon shape

`readSave(Uint8Array | ArrayBuffer)` returns `slotIndex`, `saveCounter`, per-slot validity/errors, and fresh `blocks.{saveBlock2,saveBlock1,storage}` byte arrays. It throws if size is unsupported or neither slot is valid; the latter error includes `slots` diagnostics. Call `readCollection(readSave(bytes))` for `{records, issues}`. `readPokemon(bytes)` decodes exactly 80 or 100 bytes, returns null for an empty record, and throws for corrupt or unsupported records. Inputs are never modified.

Each Pokémon has:

- `internalSpeciesId`, `nationalDexId`, `speciesName`; never use one ID in place of the other.
- `personality`; `ot.{id,trainerId,secretId,name,gender}`; nickname, language ID and markings. No claim that PID/OT uniquely identify an occurrence.
- Explicit `isEgg` from the secure IV word and `headerIsEgg`; mismatches are warnings. Eggs have `hatchCycles`, null `friendship` and null `calculated` stats.
- Experience, `derivedLevel`, nature, gender, shiny status, ability `{id,slot,name}` (zero-based slot), held item ID and numeric origin metadata.
- Exactly four `moves`, retaining empty gaps: `{slot,id,name,currentPp,ppUps,maxPp}`. Empty move ID is zero; name/max PP are null. Unknown nonempty IDs produce warnings.
- Named `ivs`, `evs`, contest values, raw Pokérus byte and ribbons `{raw,contestRanks}`. The raw ribbon word preserves all other ribbon flags.
- `recorded`: null for boxed records, otherwise `{level,status,currentHp,stats}` read directly from the party suffix.
- `calculated`: `{level,stats}` computed independently from base stats, nature, IVs and EVs; use recorded party level when present, experience-derived level otherwise. `stats` keys are `hp,attack,defense,speed,spAttack,spDefense`; HP is maximum HP. Calculations target ordinary Emerald stats, including its Speed Forme Deoxys behavior, not link-battle transformations or battle modifiers. Mismatched recorded/derived levels are warnings, not overwritten data.
- `checksumValid:true`, `warnings`; collection extraction adds `source:{kind:'party',slot}` or `{kind:'box',box,slot}` using zero-based indices. Identical Pokémon at different locations remain separate records. Invalid occurrences appear in `issues` with source, message and `rawBytes`, not silently lost.

## Scope and conservative policies

Only unwrapped 128 KiB retail Emerald layouts are accepted. Other games, hacks, 64 KiB saves, emulator wrappers and international text coverage are not supported. Structural validation does not prove a file originated from Emerald: another game could share similar sizes, signatures and layouts.

Every selected slot must contain all 14 logical sections once, with valid signatures/checksums and one consistent counter. No section stitching across slots is allowed. Normal counter comparison follows retail logic, including `FFFFFFFF -> 0`; equal counters deterministically select physical slot 0. A consistent-counter requirement is intentionally stricter than retail's validity scan. Unusual partial/link-save histories need real-save verification before relaxing that policy. Invalid newer slots fall back to an older complete slot with diagnostics.

Checksums establish integrity, not legal Pokémon values. Full legality checks, full character tables, every special form/context, empty occupied-party diagnostics and exhaustive reference-data verification are outside this foundation. General Day Care collection extraction and gained-experience semantics remain deferred; the Stage 1 snapshot reads only deposited boxed records for occurrence/shiny counts. Raw Trainer fields, including gender and spendable Battle Points, are decoded by `readTrainer(readSave(bytes))`. `readTrainerSnapshot(bytes)` assembles the Stage 1 Trainer view and counts party, PC, and deposited Day Care occurrences. Hall of Fame decoding is provided separately by `readHallOfFame(rawBytes)`; see the Stage 2 notes in the main README. The decoding modules do not persist imports, assign roles, or infer cross-import identity; browser persistence is handled separately in src/storage/.

## Source and provenance

The 1.0 application was read as a reference, not modified or imported at runtime. Adapted from its `src/utils/saveParser.js`: `decryptPokemonData`, `getPokemonSubstructures`, `calculatePokemonChecksum`, `parseBoxPokemon`, `parsePartyPokemon`, `decodePokemonText`, party/storage offsets and nature ordering. The unsafe slot selection was replaced. `expForLevel` and `levelFromExperience` were copied from `src/utils/collectionDetails.js`; stat arithmetic was adapted from `emeraldStat` in `src/utils/ivCalculator.js`.

Reference data was reduced from 1.0 `src/data/emeraldData.js` and `src/data/pokemonMeta.js`, originally generated from pret/pokeemerald. The canonical Deoxys table was corrected to Emerald Speed Forme for calculation (50/95/90/180/95/90 in HP/Attack/Defense/Speed/SpAttack/SpDefense order).

Checked against the primary decompilation source on 2026-10-17:

- [Sector layout, checksum, save validity and counter selection](https://github.com/pret/pokeemerald/blob/master/src/save.c)
- [Save block sizes and party offsets](https://github.com/pret/pokeemerald/blob/master/include/global.h)
- [Storage structure](https://github.com/pret/pokeemerald/blob/master/include/pokemon_storage_system.h)
- [Pokémon structures](https://github.com/pret/pokeemerald/blob/master/include/pokemon.h)
- [Pokémon mechanics and Emerald Deoxys stats](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c)

These upstream links track master; local fixture constants and expectations are fixed in the test files. This is a small adapted foundation, not a claim of full game-equivalence or a wholesale copy of the old parser.

## Verified versus blocked

Synthetic tests check sector structure/corruption, rotated assembly, fallback, counter rollover, unsigned checksum arithmetic, all 24 Pokémon orders, nonzero XOR encryption keys, Pokémon checksum enforcement, internal/National ID separation, four move slots/PP Ups, eggs, IV/EV ordering, origin bits, OT, ability slots, gender/shiny cases, recorded/calculated separation, growth/stat examples and duplicate retention across party/PC locations.

One private 128 KiB Emerald save has now been checked using a separate Python byte reader and the unmodified 1.0 parser. All 70 current party/PC records match the independent raw-field expectations; all occupied Pokémon checksums in both generations pass. `npm test` runs 52 tests when the private fixture and manifest are available (45 non-private tests plus seven real-save tests); otherwise the seven real-save tests explicitly skip. If a save exists without its expectation manifest, tests fail instead of quietly skipping. See [REAL_SAVE_VALIDATION.md](../REAL_SAVE_VALIDATION.md) for results. In-game screen confirmation, occupied Day Care behavior, rare forms, non-English text and partial/link-save histories remain unverified.

## Private real-save regression tests

`test/realSave.test.js` compares the exact fixture to a SHA-256-pinned `test/fixtures/real/expected.private.json`. This private manifest was produced by the independent stdlib Python reader in `test/fixtures/inspect_real_save.py`, not by the production parser. The reader imports neither production functions nor reference data. Trainer identifiers are compared by a combined identity digest and are not printed. All fixture-directory contents except its README are ignored by Git, including the manifest. Nothing is copied into application assets.

The manifest records independent numeric/raw expectations for every current party/PC Pokémon and both slots. Names/ability labels/reference data are additionally corroborated against 1.0; that comparison shares ancestry and is supporting evidence, not fully independent proof. The Python reader is a one-time audit tool, not an npm-test runtime dependency. It rejects overwriting an existing manifest. Do not regenerate expectations simply to make tests pass. `EMERALD_REAL_SAVE` optionally selects a fixture path while retaining the pinned expectation check.

## Trainer Stage 3 — Frontier Symbols

`readFrontierSymbols(readSave(bytes))` returns seven `symbols` (facility, symbol name,
raw `silver`/`gold` booleans, and display `status`), plus independent `silverCount`
and `goldCount`. The snapshot exposes this as `frontier`; persisted raw saves are
reparsed automatically. Gold takes display priority; it does not fabricate a missing
silver flag in an edited save. Retail awarding sets gold without clearing silver.

Verified 2026-10-17 against primary game sources:
[SaveBlock1.flags at 0x1270](https://github.com/pret/pokeemerald/blob/master/include/global.h),
[system base 0x860 and symbol flags](https://github.com/pret/pokeemerald/blob/master/include/constants/flags.h),
[FlagGet byte/bit indexing](https://github.com/pret/pokeemerald/blob/master/src/event_data.c),
and [GiveFacilitySymbol](https://github.com/pret/pokeemerald/blob/master/src/frontier_util.c).
Flag byte = `0x1270 + floor(id / 8)`, mask = `1 << (id & 7)`.

| Facility / Symbol | Silver / Gold flag | SaveBlock1 byte | Silver / Gold mask |
| --- | --- | --- | --- |
| Tower / Ability | 0x8C4 / 0x8C5 | 0x1388 | 0x10 / 0x20 |
| Dome / Tactics | 0x8C6 / 0x8C7 | 0x1388 | 0x40 / 0x80 |
| Palace / Spirits | 0x8C8 / 0x8C9 | 0x1389 | 0x01 / 0x02 |
| Arena / Guts | 0x8CA / 0x8CB | 0x1389 | 0x04 / 0x08 |
| Factory / Knowledge | 0x8CC / 0x8CD | 0x1389 | 0x10 / 0x20 |
| Pike / Luck | 0x8CE / 0x8CF | 0x1389 | 0x40 / 0x80 |
| Pyramid / Brave | 0x8D0 / 0x8D1 | 0x138A | 0x01 / 0x02 |

Focused synthetic tests use literal byte/mask fixtures independently of decoder
constants, covering every facility, unearned/silver/gold/both states, neighboring
bits, totals, rotated sections, persistence, and all existing artwork paths.
Real-save symbol values have not been independently pinned or confirmed in-game.
