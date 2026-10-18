# GitHub release readiness — approved Battle publication inventory

## Decision

**Ready for explicit staging/commit approval.** The publication choices are resolved. The exact proposed milestone inventory is **169 files**: the original168 reviewed files (including all eight historical documents), plus `.gitignore`. No archive, recovery backup, private save, screenshot, build output or dependency directory is included. No remaining historical-publication decision is pending.

This preparation changes only `.gitignore`, the portable recovery reference/instructions in `docs/BATTLE_CLEANUP_PASS_2.md`, and this report. No application, calculator, Conditions, tests, styles, assets, datasets, archive or recovery-backup contents changed. No files were staged, committed, pushed or deleted. Legacy1.0 remains untouched.

## Approved publication choices

1. Include all eight previously reviewed historical documents: `BATTLE_CALCULATOR_AUDIT.md`, `BATTLE_CALCULATOR_RELIABILITY.md`, `BATTLE_CALCULATOR_RESOLUTIONS.md`, `BATTLE_FOUNDATION.md`, `BATTLE_MATCHUP.md`, `DAMAGE_CALCULATOR.md`, `DAMAGE_CALCULATOR_RESTART.md`, `BATTLE_CLEANUP_PASS_2.md`. Their historical banners, research, independent fixtures and links remain intact.
2. The Pass2 recovery location is now portable: `backups/battle-calculator-pass2-20261018T002530Z/`. Its instructions now start from the repository root. No machine-specific account path remains in the proposed files. Original backup contents/checksums were not edited.
3. Keep all11 original retired-calculator archive files local and unpublished. They remain on disk and are also preserved in the existing verified Pass2 recovery snapshot; they are not standalone active modules.
4. Append exactly `/archive/retired-battle-calculator/` to `.gitignore`. All previous ignore-rule bytes/order remain unchanged. No broad archive ignore or unrelated ignore change was made.

## Git and remote freshness

- Branch: `main`; remote `origin`: `https://github.com/bbrendan22/emerald-companion-2.git` (fetch/push).
- Upstream: `origin/main`.
- **`git fetch origin` completed successfully during this preparation.** The first sandboxed attempt could not write FETCH_HEAD; the approved elevated retry succeeded.
- Fresh comparison `git rev-list --left-right --count HEAD...origin/main`: **0 ahead /0 behind**. Both tips are `bc41e37` — `Milestone 3: Complete trainer dashboard and showcase`. **No remote divergence found.** No merge/rebase/pull, branch change or Git configuration change was performed.
- Before edits:179 status entries — one modified tracked App file and178 untracked files.
- After edits/ignore handling:169 entries — two modified tracked files (`.gitignore`, `src/ui/App.jsx`) and167 untracked files. The11 archive files disappeared from ordinary status only because they are now ignored, not deleted. The two documentation edits were already untracked and do not add status entries.
- The complete169-path inventory below exactly matches current modified/untracked paths. No staged changes. No unrelated work identified. The pre-existing App diff remains exclusively Battle imports/state/routing/page class/title integration.

## Exact proposed commit inventory —169 files

| Group | Files |
| --- | ---: |
| `.gitignore` | 1 |
| Battle source/integration/storage/helpers/data/styles | 43 |
| Tests, synthetic fixture, current browser regressions | 51 |
| Necessary player/Frontier trainer sprites | 53 |
| Current/historical architecture, calculator, cleanup and readiness documentation | 21 |
| **Total** | **169** |

Already tracked unchanged shared assets, parser/identity utilities, dependencies' manifests and existing tests remain available in the repository and do not need re-staging. Every explicit proposed path exists, is a regular file and is not ignored. The list equals the original168-path union plus `.gitignore`; there are no wildcard directory entries.

<!-- APPROVED_PATHS_BEGIN -->
```text
.gitignore
docs/BASIC_DAMAGE_STEP_2.md
docs/BASIC_DAMAGE_STEP_3.md
docs/BASIC_DAMAGE_STEP_4.md
docs/BASIC_DAMAGE_STEP_5.md
docs/BASIC_DAMAGE_STEP_6A.md
docs/BASIC_DAMAGE_STEP_6B.md
docs/BASIC_DAMAGE_STEP_6C.md
docs/BATTLE_ARCHITECTURE.md
docs/BATTLE_CALCULATOR_AUDIT.md
docs/BATTLE_CALCULATOR_RELIABILITY.md
docs/BATTLE_CALCULATOR_RESOLUTIONS.md
docs/BATTLE_CLEANUP_AUDIT.md
docs/BATTLE_CLEANUP_PASS_2.md
docs/BATTLE_CLEANUP_PASS_3.md
docs/BATTLE_FOUNDATION.md
docs/BATTLE_MATCHUP.md
docs/DAMAGE_CALCULATOR.md
docs/DAMAGE_CALCULATOR_RESTART.md
docs/EARTHQUAKE_DAMAGE_FIX.md
docs/FINAL_DAMAGE_CALCULATOR_AUDIT.md
docs/GITHUB_RELEASE_READINESS.md
public/trainers/brendan-emerald.png
public/trainers/frontier/aroma_lady.png
public/trainers/frontier/battle_girl.png
public/trainers/frontier/beauty.png
public/trainers/frontier/bird_keeper.png
public/trainers/frontier/black_belt.png
public/trainers/frontier/bug_catcher.png
public/trainers/frontier/bug_maniac.png
public/trainers/frontier/camper.png
public/trainers/frontier/collector.png
public/trainers/frontier/cooltrainer_f.png
public/trainers/frontier/cooltrainer_m.png
public/trainers/frontier/cycling_triathlete_f.png
public/trainers/frontier/cycling_triathlete_m.png
public/trainers/frontier/dragon_tamer.png
public/trainers/frontier/expert_f.png
public/trainers/frontier/expert_m.png
public/trainers/frontier/fisherman.png
public/trainers/frontier/gentleman.png
public/trainers/frontier/guitarist.png
public/trainers/frontier/hex_maniac.png
public/trainers/frontier/hiker.png
public/trainers/frontier/kindler.png
public/trainers/frontier/lady.png
public/trainers/frontier/lass.png
public/trainers/frontier/ninja_boy.png
public/trainers/frontier/parasol_lady.png
public/trainers/frontier/picnicker.png
public/trainers/frontier/pokefan_f.png
public/trainers/frontier/pokefan_m.png
public/trainers/frontier/pokemaniac.png
public/trainers/frontier/pokemon_breeder_f.png
public/trainers/frontier/pokemon_breeder_m.png
public/trainers/frontier/pokemon_ranger_f.png
public/trainers/frontier/pokemon_ranger_m.png
public/trainers/frontier/psychic_f.png
public/trainers/frontier/psychic_m.png
public/trainers/frontier/rich_boy.png
public/trainers/frontier/ruin_maniac.png
public/trainers/frontier/running_triathlete_f.png
public/trainers/frontier/running_triathlete_m.png
public/trainers/frontier/sailor.png
public/trainers/frontier/salon_maiden_anabel.png
public/trainers/frontier/school_kid_f.png
public/trainers/frontier/school_kid_m.png
public/trainers/frontier/swimmer_f.png
public/trainers/frontier/swimmer_m.png
public/trainers/frontier/swimming_triathlete_f.png
public/trainers/frontier/swimming_triathlete_m.png
public/trainers/frontier/tuber_f.png
public/trainers/frontier/tuber_m.png
public/trainers/frontier/youngster.png
public/trainers/may-emerald.png
src/battle/basicDamage.js
src/battle/battleConditions.js
src/battle/battleMoveEffectiveness.js
src/battle/battleState.js
src/battle/conditionState.js
src/battle/damageModifiers.js
src/battle/damagePresentation.js
src/battle/data/frontierBrains.js
src/battle/data/frontierPokemon.js
src/battle/data/frontierTrainers.js
src/battle/data/moveResources.js
src/battle/data/weights.json
src/battle/fixedDamage.js
src/battle/frontierAdapter.js
src/battle/hiddenPower.js
src/battle/itemLookup.js
src/battle/matchupPresentation.js
src/battle/pokemonAdapter.js
src/battle/reference.js
src/battle/setSpeedComparison.js
src/battle/specialDamage.js
src/battle/stats.js
src/battle/towerRules.js
src/battle/towerSets.js
src/battle/towerTrainers.js
src/battle/typeMatchups.js
src/battle/variableDamage.js
src/storage/battleTeams.js
src/ui/App.jsx
src/ui/components/BasicDamagePreview.jsx
src/ui/components/BattleConditions.jsx
src/ui/components/BattleMatchupShell.jsx
src/ui/components/BattleMoveDetails.jsx
src/ui/components/BattleRules.jsx
src/ui/components/BattleSetItem.jsx
src/ui/components/BattleSets.jsx
src/ui/components/BattleTeamHeader.jsx
src/ui/components/BattleTeams.jsx
src/ui/components/BattleTrainers.jsx
src/ui/components/FrontierTrainerSprite.jsx
src/ui/pages/BattlePage.jsx
src/ui/styles/battle.css
src/ui/useBattleState.js
test/basicDamage.browser.mjs
test/basicDamage.test.js
test/basicDamageConditions.browser.mjs
test/basicDamageConditions.test.js
test/basicDamageModifiers.browser.mjs
test/basicDamageModifiers.test.js
test/basicDamageTypes.browser.mjs
test/basicDamageTypes.test.js
test/battleAccuracyCorrections.browser.mjs
test/battleAccuracyCorrections.test.js
test/battleConditions.browser.mjs
test/battleConditions.test.js
test/battleFoundation.test.js
test/battleHeaders.browser.mjs
test/battleHub.browser.mjs
test/battleHub.test.js
test/battleInformationalPopup.browser.mjs
test/battleInformationalPopup.test.js
test/battleMatchup.browser.mjs
test/battleMoveEffectiveness.test.js
test/battleRules.browser.mjs
test/battleRules.test.js
test/battleShell.browser.mjs
test/battleStagedStats.browser.mjs
test/battleState.test.js
test/battleTeams.browser.mjs
test/battleTeams.test.js
test/battleVisibility.browser.mjs
test/calculatorMigration.test.js
test/conditionState.test.js
test/damagePolish.browser.mjs
test/damagePresentation.test.js
test/earthquake.browser.mjs
test/finalDamageAudit.test.js
test/fixedDamage.browser.mjs
test/fixedDamage.test.js
test/fixtures/restoredDamageMoves.js
test/itemLookup.test.js
test/matchupPresentation.test.js
test/ordinaryDamageEligibility.test.js
test/restoredDamageReview.browser.mjs
test/restoredDamageReview.test.js
test/setRefinement.test.js
test/setSearch.browser.mjs
test/specialDamage.browser.mjs
test/specialDamage.test.js
test/towerSets.test.js
test/towerTrainers.test.js
test/trainerSearch.browser.mjs
test/variableDamage.browser.mjs
test/variableDamage.test.js
```
<!-- APPROVED_PATHS_END -->

## Must remain local

- `node_modules/`, `dist/`, `backups/`, `backup/`.
- All original archive files below. They remain physically present, untracked and ignored by the new exact root-anchored rule. No archived technical findings or recovery evidence was deleted.
- `artifacts/`, `REAL_SAVE_VALIDATION.md`, and private real-save/exported evidence beneath `test/fixtures/real/`; its already tracked README exception remains intentional.
- Personal Pokémon saves, emulator states, compressed/save backups, private configurations, `.env`/`.env.*`, private keys, Finder metadata, temporary files/logs and screenshots.

Local archive inventory (NOT part of the169-file commit):

```text
archive/retired-battle-calculator/README.md
archive/retired-battle-calculator/calculator.css
archive/retired-battle-calculator/src/battle/damagePreview.js
archive/retired-battle-calculator/src/battle/koProbability.js
archive/retired-battle-calculator/src/ui/components/BattleDamageResults.jsx
archive/retired-battle-calculator/test/battleDamagePopup.browser.mjs
archive/retired-battle-calculator/test/battlePopupColors.browser.mjs
archive/retired-battle-calculator/test/battleReliability.browser.mjs
archive/retired-battle-calculator/test/damagePreview.test.js
archive/retired-battle-calculator/test/koReliability.test.js
archive/retired-battle-calculator/test/repeatKoPopup.test.js
```

### Ignore verification

- All169 intended paths are **not ignored**.
- All11 actual archive files are ignored, still exist and have no tracked index entries.
- Representative checks passed for all16 probes covering node_modules, dist, backup directories, ordinary/case/backup saves, emulator states, metadata, temporary/log files, environment files, private keys, artifacts and real private fixtures.
- Existing ignore rules remain byte-for-byte unchanged; the only addition is the approved exact archive line.
- Generic PNG/JSON files remain eligible because the app legitimately needs them. Keep private screenshots/configuration in the protected locations; no new broad ignore rule is needed.

## Privacy and secret verification — exact169-path scope

**Exact169-path scan passed:**116 UTF-8 text files and53 PNG assets. Credential assignments, provider/private-key/token markers, JWT/bearer or credential-URL patterns, embedded save markers, private/save filenames and machine-specific account paths produced **zero candidates**. No private save, recovery backup or archive path is in the inventory. The PNG asset scan found no suspicious readable metadata markers.24 logging matches are test/browser messages (zero runtime source matches);29 generic temporary output-path lines are intentional development destinations. No private ignored save contents or recovery archives were opened for this scan. The current portable documentation references preserve recovery without publishing a machine-specific account path.

No secret values will be printed in this report. Generic synthetic IDs, reference data, public GitHub URLs, cryptographic verification hashes and generated test fixtures are not credentials. Browser scripts' generic temporary output destinations are development paths, not personal game data or published screenshots.

## Verification

- Full unit suite: **312/312 passed**,0 failures/skips. No tests were changed or weakened.
- All **25/25 existing browser scripts passed**. They retain all five tabs, player/opponent selection, single/double-tap behavior, saved teams, trainer/set selection, Rules, persistent Conditions/Reset, live popup damage in both directions, percentage colors,162 eligible moves,39 restored moves and corrected AUD-01.
- Existing mobile checks run at320/375/430px with Chrome mobile/touch emulation. No physical iPhone Safari/WebKit verification is claimed.
- Current active import graph rejects retired engine/preview/KO wiring; removed source modules remain absent. Archive files are not active application/test imports.
- Production build: **passed**,104 modules. Existing >500kB JS warning remains. No formula, source, CSS, dependency or build configuration changes were made.

| Output | Raw bytes | Build-reported gzip | SHA-256 |
| --- | ---: | ---: | --- |
| `index-BmJEQJ4j.js` | 1,014,023 | 214.96kB | `601cc9f6b07b55ada108961e8d5b96b96d93f4409ee4dd0dcc50b31cb3730d01` |
| `index-DXhiFMYG.css` | 44,554 | 8.97kB | `a566f900dd439c1ebd5bf5997559f99838adca75e502173c3f9c03335630d19c` |

HTML1.20kB/gzip0.48kB. Production assets match Pass3 and the readiness inspection. No source-map, private save/config/key, recovery archive, Markdown report or Finder metadata candidate is present in the generated output. Build output remains ignored.

Prior readiness evidence retained:1,990 expected dynamic Battle/shared image URLs checked, none missing; all current numerical fixtures, full unit suite, current browser regressions and source import checks pass. No application change since that asset inventory. All local Markdown targets were also checked during readiness inspection; retaining all eight historical documents preserves those cross-links.

## Remaining limitations

No technical or publication-choice blocker remains. Await explicit approval before staging/committing/pushing. Physical Safari smoke testing, the known large JS chunk, portable browser-test infrastructure and lack of a configured lint runner remain documented limitations; none authorizes new fixes or refactoring here. Browser checks used the existing installed runtime with temporary orchestration; no dependencies or permanent scripts were added.

Remote freshness is time-sensitive: **before any future commit, run `git fetch origin` again and compare histories**. If the remote history has diverged, report it and stop. Any unexpected nonzero ahead/behind result should be reviewed before proceeding; do not silently pull/rebase/reset or overwrite work.

## Recommended future commands — NOT executed

The fetch/comparison above already ran for this preparation. Repeat them immediately before a future commit:

```sh
git fetch origin
git rev-list --left-right --count 'HEAD...origin/main'
git log -1 --oneline HEAD
git log -1 --oneline origin/main
```

If histories have diverged, STOP and report. Do not interpret successful fetching as permission to stage or commit.

Only after **explicit staging approval**, use the exact approved inventory, then inspect the staged diff. This example is documentation, not an action performed by this task:

```sh
python3 - <<'PYCODE'
from pathlib import Path
report = Path('docs/GITHUB_RELEASE_READINESS.md').read_text()
block = report.split('<!-- APPROVED_PATHS_BEGIN -->', 1)[1].split('<!-- APPROVED_PATHS_END -->', 1)[0]
paths = [line for line in block.splitlines() if line and not line.startswith('```')]
assert len(paths) == 169 and len(set(paths)) == 169
assert all(Path(path).is_file() for path in paths)
Path('/private/tmp/emerald-approved-paths.nul').write_bytes(b'\0'.join(path.encode() for path in paths) + b'\0')
PYCODE
git add --pathspec-from-file=/private/tmp/emerald-approved-paths.nul --pathspec-file-nul
git diff --cached --stat
git diff --cached --check
git diff --cached
git status --short
```

Only after staged review, fresh remote comparison and **explicit commit approval**:

```sh
git commit -m "Complete Battle milestone and calculator cleanup"
```

No `git add .`, `git add -A`, force-add, clean, reset, stash or push is authorized here. Pushing needs explicit approval.

## Preservation and stop point

Final checksum/diff comparison confirms **only the three authorized files changed**: `.gitignore`, `docs/BATTLE_CLEANUP_PASS_2.md`, this report. All other3,440 original captured files are unchanged; no new scoped files or deletions. All11 original archive files and every Pass2 recovery-backup file are byte-identical. Historical Pass2 findings/body/links remain unchanged except the approved recovery-path/instruction edits. Index is empty; current169 modified/untracked paths exactly equal the169 explicit approved paths. No unrelated user work was overwritten. Stop after preparation and await approval; no additional cleanup/refactor, staging, commit or push is authorized.
