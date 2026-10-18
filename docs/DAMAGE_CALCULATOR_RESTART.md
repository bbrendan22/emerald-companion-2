> Historical Restart Step1 snapshot. See [current Battle architecture](BATTLE_ARCHITECTURE.md) and [Pass2 retirement/recovery](BATTLE_CLEANUP_PASS_2.md); the old system remains retired.

# Damage calculator restart — Step 1

The Battle move popup is informational only. It displays the existing type icon, name, Power/Accuracy/Effect fields and description. The native dialog, graphite styling, outside-tap/Escape dismissal and no-close-X design are unchanged. No replacement calculator has been started.

## Retired implementation

The following files moved out of active source/test directories into `archive/retired-battle-calculator/`, preserving their original relative paths:

- `src/ui/components/BattleDamageResults.jsx`: all damage/KO rendering and its calculation `useMemo`.
- `src/battle/damagePreview.js`: preview orchestration, ability grouping, availability messages and KO presentation.
- `src/battle/koProbability.js`: repeated-use DP, PP horizon, recovery/residual/survival branching.
- `test/damagePreview.test.js`, `test/koReliability.test.js`, `test/repeatKoPopup.test.js`: retired preview/KO tests.
- `test/battleDamagePopup.browser.mjs`, `test/battleReliability.browser.mjs`, `test/battlePopupColors.browser.mjs`: retired calculator browser tests.

Calculator-only styles are preserved in the archive's `calculator.css` and removed from active CSS. The old calculator component import/render was removed from `BattleMoveDetails.jsx`. There was no separate persisted preview state: selection/dismissal state is still needed for the informational popup; Battle Conditions state and projections remain intact. No storage migration or reset was performed.

The archive is historical source, outside the application import graph and normal `npm test`/browser test discovery. Its original relative imports are intentionally not rewired into the application. It is not the foundation for the new calculator. Some files were untracked before retirement, so a physical archive preserves work that Git history alone could not recover. Existing Git history is untouched; nothing was committed, reset or pushed. To inspect the previous implementation, read the archived files. Original locations are recorded by their paths beneath the archive; restoring them is a separate, explicit operation, not part of this step.

## Preserved foundation and shared behavior

- `src/battle/battleDamage.js` and `battleRetaliation.js` remain unchanged as inactive migrated foundation utilities with their engine/mechanics tests. Neither is reachable from the running application. Keeping them avoids deleting potentially reusable foundation work; they are not connected to the popup and are not a commitment to reuse their design.
- `battleConditions.js`, `conditionState.js`, `battleState.js`, `matchupPresentation.js`, `battleMoveEffectiveness.js`, `hiddenPower.js`, reference data, Pokémon/Frontier adapters and save/stat utilities remain unchanged.
- Conditions UI, controls, geometry, persistence and reset behavior remain unchanged. Cards, stats/bars, Speed comparison, move rows/type effectiveness, headers and other tabs/pages remain unchanged.
- `battleAccuracyCorrections.test.js` keeps engine/shared-mechanics coverage; only the retired preview/KO assertion/import was removed.
- `battleAccuracyCorrections.browser.mjs` keeps Forecast, weather suppression, live type icons, Speed, bars, informational popup and mobile layout coverage, replacing retired damage assertions with absence checks.

Earlier calculator audit, resolution, reliability and implementation documents describe the retired system, not current popup behavior.

## Verification

- `test/battleInformationalPopup.test.js`: reference metadata plus a transitive application-import regression guard that rejects damage engine, retaliation, preview, KO or old results UI dependencies.
- `test/battleInformationalPopup.browser.mjs`: player/opponent/status moves; metadata; outside/Escape dismissal; no calculator DOM/messages/modules; Conditions control values/dimensions/stages, bars and save preservation; 320/375/430px fit.
- Existing Matchup, Conditions, visibility, team/header/tab and other browser checks remain active.

Step 1 results: all 208 active automated tests and all 15 active browser scripts passed. Production build passed with the existing large-chunk warning. Narrow layouts were checked at 320px, 375px and 430px; the informational popup screenshot was visually reviewed. The application import graph and browser module requests both confirm the old calculator cannot run. No commits or pushes were made.
