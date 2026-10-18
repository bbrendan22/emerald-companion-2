# Battle architecture — current implementation

Current entry point after cleanup Passes 1–3. Historical stage documents record decisions and fixtures; this document describes the running app.

## Page and state

`src/ui/pages/BattlePage.jsx` contains **Matchup | Trainers | Sets | Teams | Rules**.

- Matchup: independent player/opponent cards, stats and moves; Conditions appears only with both active selections. Original stats remain separate from stage-adjusted display values and effective Speed. Bars use original stats.
- Trainers: Tower trainer search, including Anabel Silver/Gold.
- Sets: ordinary/selected-trainer sets, search and species-safe opponent selection.
- Teams: Frontier-role individual Pokémon and persisted saved team definitions.
- Rules: Tower Singles, three per side; Level50 or manual Open Level60–100 and trainer/Brain IV rules.

`App.jsx` owns `useBattleState`; `battleState.js` keeps active teams, identities, selections, tab, Rules and Conditions for the session across navigation. `conditionState.js` projects conditions without changing source Pokémon: HP/status follow individual identities; stages/screens belong to sides. Conditions persist when hidden or switching selections until explicitly changed/reset. `src/storage/battleTeams.js` persists saved definitions separately from active team edits. Frontier roles and occurrence identities reuse `src/storage/pokemonRoles.js` and the existing imported-save adapters. There is no second save parser or collection database.

## Current calculator

Runtime path:

`BattleMatchupShell → BattleMoveDetails → BasicDamagePreview → basicDamageScenarios`

Active implementation lives in `src/battle/`: `basicDamage.js`, `damageModifiers.js`, `fixedDamage.js`, `variableDamage.js`, `specialDamage.js`, `damagePresentation.js`. Shared type, conditions, Hidden Power and stat helpers remain active. The popup shows max-HP percentage first, then HP range; existing percentage colors and ability-specific grouping remain. No KO predictions, recovery simulation or turn simulation are implemented.

Current canonical eligibility is **162 moves**, including all **39 restored ordinary moves**. Supported scope includes Gen3 physical/special typing, integer rounding and cartridge type-table order, STAB, chart/implemented ability immunities,16 ordinary rolls, explicit stages/weather/burn/screens/critical/currentHP, supported items/abilities and separate uncertain-ability scenarios. Fixed moves: Seismic Toss, Night Shade, Dragon Rage, SonicBoom, Super Fang. Variable moves: Hidden Power, Return/Frustration, Low Kick, Flail/Reversal. Other explicit specials: Weather Ball, Eruption/Water Spout, Facade, Brick Break. Unsupported mechanics remain omitted rather than guessed.

See [final accuracy audit](FINAL_DAMAGE_CALCULATOR_AUDIT.md) for exact support boundaries, independent fixtures and corrected **AUD-01** zero-offense rounding; [Earthquake correction](EARTHQUAKE_DAMAGE_FIX.md) for the eligibility issue; [Step6C](BASIC_DAMAGE_STEP_6C.md) for special-move ordering. Earlier Steps2–6B describe incremental implementation, not the full current scope.

## Data, lookups and assets

`src/battle/data/` holds the882 ordinary sets,300 trainers,42 historical Brain rows, move resources and weights. `towerRules.js` exposes six Anabel sets; other facilities remain unavailable. `towerSets.js::towerSetById` is the shared ordinary/Anabel lookup. `itemLookup.js::battleItemId` resolves string item names to IDs; callers retain their own None/null display and image-error handling.

`reference.js`, `pokemonAdapter.js` and `frontierAdapter.js` adapt existing shared JSON/save records without modifying them. Dynamic URLs address shared box/artwork/Emerald sprites, trainer images, item IDs and type icons under `public/`; no asset deletion or data projection is part of these cleanups.

### Preserved source-workbook notes

These two notes were copied verbatim from the unused `frontierNotes.js` module before its removal. They are historical source-workbook provenance, not additional supported Tower functionality:

```text
*All instances of Frustration* were listed as Return in the ROM. However, in the Factory Frustration replaces Return.
†Placeholder only. Noland`s team is subject to the same restrictions as regular trainers - sets 565-660 in Open Level the first time with IVs of 15s, and sets 373-882 for the second time with IVs of 31s.
```

## Tests and historical recovery

Current numerical coverage: `test/basicDamage*.test.js`, `fixedDamage.test.js`, `variableDamage.test.js`, `specialDamage.test.js`, `damagePresentation.test.js`, `ordinaryDamageEligibility.test.js`, `restoredDamageReview.test.js`, `finalDamageAudit.test.js`, `calculatorMigration.test.js` and retained shared/foundation tests. `test/fixtures/restoredDamageMoves.js` preserves independent39-move expectations. `battleInformationalPopup.test.js` guards against retired implementation imports. All25 current browser scripts remain under `test/`; browser environment requirements and infrastructure are unchanged. Run unit tests with `npm test`, production build with `npm run build`.

Historical materials: `DAMAGE_CALCULATOR.md`, `BATTLE_CALCULATOR_AUDIT.md`, `BATTLE_CALCULATOR_RESOLUTIONS.md`, `BATTLE_CALCULATOR_RELIABILITY.md`, the Restart Step1 record and `archive/retired-battle-calculator/`. Their KO/retaliation behavior is not current functionality. Preserve research, independent fixtures and the archive; do not import the old system back into the app.

The verified Pass2 recovery copy is at:

`backups/battle-calculator-pass2-20261018T002530Z/`

It contains original source/tests/docs/archive in `originals.tar.gz`, a per-file checksum manifest, full-tar checksum, original Git status and recovery instructions. The directory is locally ignored, not a committed backup. It remains unchanged. See [Pass2 retirement record](BATTLE_CLEANUP_PASS_2.md) for checksums, exact fixture dispositions and selective recovery procedure. Existing archive files are historical and not standalone executable modules.

See [cleanup audit](BATTLE_CLEANUP_AUDIT.md) for deferred findings. Test-only API removal, browser infrastructure, condition compatibility, lazy loading/rendering, runtime projections and asset deletion remain deferred.
