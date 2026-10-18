> Historical Stage4.2 snapshot: its UI-import and old-engine statements describe that stage. Current source-workbook notes, runtime architecture and retirement recovery are in [Battle architecture](BATTLE_ARCHITECTURE.md).

# Stage 4.2: Battle Tower Singles foundation

This is a local-only data/calculation layer. It is deliberately not imported by
the current UI. No parser, storage key, page design, navigation, or PWA behavior
has changed. No dependencies were added.

## Files and provenance

`src/battle/data/frontierPokemon.js` (882 sets), `frontierTrainers.js` (300
trainers), `frontierBrains.js` (42 rows), and `frontierNotes.js` come from the
current Emerald Companion 1.0 working tree. Original set IDs, entry numbers,
trainer order, associations and precomputed stats remain intact. All Brain rows
are retained for provenance; `towerBrainSets` exposes only Anabel's six rows.
Other facilities and Noland's placeholder teams are unsupported by the Tower
adapter. These pools do not implement streak-based availability or team legality.

The only Frontier dataset changes are Tucker Silver's abilities: Swampert →
Torrent, Salamence → Intimidate, Charizard → Blaze. These match the existing 2.0
species/ability reference. Dataset tests validate all abilities against it.

Lucy Silver Shuckle's 610 EV total is **preserved**, not normalized to 510.
The cartridge source explicitly specifies HP252 / Atk0 / Def0 / Speed0 /
SpAtk106 / SpDef252. This is an NPC exception, not a legal player EV spread.
Source inspected 2026-10-17:
https://github.com/pret/pokeemerald/blob/master/src/frontier_util.c
(`sFrontierBrainsMons`, Pike Silver Shuckle). It is not exposed by Tower rules.

Legacy precomputed stats are reference fields only. The opponent adapter always
recalculates from base stats, IVs, EVs, nature and chosen level, including
Shedinja's 1 HP override. `Unown 1` has no trainer association in the legacy
data; this has been preserved. The workbook-derived Frontier data has not been
exhaustively independently validated against the ROM.

`moveResources.js` is the unchanged legacy Gen 3 move metadata. `weights.json`
is a mechanical extraction of the weight field from legacy `speciesDetails.js`,
keyed by National Dex ID using the existing 2.0 species mapping. No duplicate
species database, parser, ability-name table or type chart was introduced.

`battleDamage`, `battleMoveEffectiveness`, `battleConditions`, `battleRetaliation`,
`hiddenPower`, and `typeMatchups` retain legacy algorithms. Changes are provenance
comments, imports, and weight/type-chart reference adaptation. `stats.js` contains
the unchanged stat/nature helpers from legacy `ivCalculator.js`; unrelated IV
inference tooling is omitted. `reference.js` normalizes 2.0's lowercase type chart
and species types to uppercase at the boundary and resolves moves from existing
IDs/names. No reference data is fetched at runtime.

The five migrated `test/battle{Accuracy,Conditions,Damage,MoveEffectiveness,Retaliation}.test.js`
files retain the original 53 assertions groups/tests with only import paths
changed. Legacy `battleStats` adapts the old record shape and is intentionally
replaced by tests of the actual 2.0 parser output. Stat-bar presentation is outside
this stage.

## Player adapter

`toBattlePokemon(record)` accepts an identified 2.0 parsed record and returns
the calculator shape, or null for unavailable/invalid records. It requires a
non-egg checksum-valid record, identity, recognized species/ability/item/nature,
valid IV/EV values, complete stats/level and resolvable move IDs. It does not
fabricate fallback stats or introduce a parser. Party records use `recorded` stats
and level; boxed/Day Care records use parser `calculated` values. The selected
opponent level never rescales player stats. Day Care values retain deposit-level
semantics from the parser.

`frontierPokemonPool(records, roles)` runs existing `identifyPokemon` on the full
collection **before** filtering the existing `Frontier` role. This matches My
Pokémon's PID/OT/occurrence identity behavior, including exact clones. Clone
occurrence suffixes retain the existing limitation when indistinguishable clones
are reordered. Missing assignments default out of this pool. Storage formats
are unchanged; the future UI must refresh role assignments when appropriate.

Moves preserve IDs, PP Ups, maximum PP and saved current PP. Empty slots remain
null. Friendship zero is retained. Stats/IVs/EVs are copied to avoid changing the
imported record. Each fresh battle starts at full HP with no status/stages/screens;
saved cartridge damage/status is not interpreted as the current Frontier battle.

## Tower rules and opponents

`createTowerRules()` produces Tower / Singles / three slots / Level 50.
`createTowerRules({levelMode:'open', openLevel:73})` explicitly chooses opponent
level 73. Every integer 60–100 is supported; other values throw. Open Level is
manual: no team-derived level or player stat normalization occurs.

Use `trainerKey(trainer)` for stable class/name keys (all 300 are unique), or
`'Anabel'` for the Tower Brain. `towerTrainerSets(key)` resolves the original
pool; null returns ordinary plus Tower Brain candidates. Silver/Gold Anabel
rows keep their labels; no streak inference is added.

`towerOpponentIVs(key, set)` returns `{value, source, assumed}`:
- Selected ordinary trainer: its fixed IV tier, source `trainer`.
- Anabel set: that row's fixed IVs, source `brain`.
- No selected trainer: 31, source `assumption`, `assumed:true`.

`toTowerOpponent(set, rules, key)` accepts canonical dataset rows, validates a
selected trainer's association, calculates stats and returns `ivAssumption`
alongside the calculator record. Display the assumption explicitly in the future
UI. Precomputed Level 50/100 fields do not control calculations.

`domeOrdinaryOpponentIVs()` retains 3 as a future compatibility helper only.
This follows the unpatched Emerald tournament-ID bug documented in
https://github.com/pret/pokeemerald/blob/master/src/battle_dome.c
(`CreateDomeOpponentMon`). No Dome workflow or setting is exposed.

## Trainer changes and manual conditions

`selectTowerTrainer(state, key)` preserves `team`, `active`, `rules` and other
nonbattle preferences, clears `opponents` and `enemy`, and replaces all transient
condition containers with new objects. Reset includes player and enemy temporary
HP/status/stages/ability selections, weather, critical toggle and both screens.
It also resets when reselecting the same trainer or selecting null.

The future state owner should use these model field names:
`hpByPokemon`, `conditionsByPokemon`, and
`field: {weather, critical, playerScreens, enemyScreens}`.
As in 1.0, copy the selected mon and attach current HP, per-mon condition fields,
weather/critical and side screens before calling the pure calculation utilities.
Do not retain old condition containers during a trainer transition.

## Preserved calculation boundaries

The Gen 3 type-based physical/special split, STAB, integer damage rolls, item and
ability scenarios, weather, status/stages/screens, speed, fixed/variable/multi-hit
damage and retaliation retain their existing behavior and unsupported messages.
Tests are regression evidence, not a claim of exhaustive cartridge verification.
KO percentages generally assume a connecting move, not overall hit probability.
General accuracy/evasion, move-use prerequisites, priority/Quick Claw, triggered
Flash Fire, residual damage, and full battle simulation remain incomplete.
Unknown friendship retains the legacy maximum-power assumption. Future Sight,
Beat Up, Rollout and other unsupported special handling remain unsupported.

## Stage 4.3

No further product decision is required to consume this foundation. Keep the
approved Matchup / Trainers / Sets / Teams / Rules direction and Tower Singles
scope. Review reset behavior and explicit IV assumptions when connecting UI.
Animations, journals, additional facilities, PWA and global styling remain deferred.
