# Battle cleanup Pass 2 — retirement record

Scope: B01 only, including required test-fixture migration. No new calculator, UI, CSS, assets, dataset, state/persistence, or shared-helper implementation changed. No commit or push. No Pass 3 work.

## Safety, inventory and recovery

Pre-edit Git status was captured including all untracked paths. Baseline unit suite: **330 passed, 0 failed/skipped**. The required cleanup audit, final calculator audit and Earthquake fix document were read before edits.

The previous `archive/retired-battle-calculator/` contains11 files (79,458 bytes): the preview/KO orchestration and rendering, old calculator CSS, and six old test/browser files. It does **not** contain the two old source engine modules or the six active test consumers inventoried below. Existing archive relative imports are historical and were already not a standalone package. Git history is insufficient because this work is mostly untracked.

Before any source/test alteration, a NEW durable local snapshot was made, without overwriting the old archive:

`backups/battle-calculator-pass2-20261018T002530Z/`

- `originals.tar.gz`: **433,244 bytes**; contains **213 files** with original relative paths: all source, tests, archive and docs, plus package files, index and ignore rules. No personal save data or image assets was added to the backup.
- `manifest.json`: original per-file SHA-256 and byte sizes. Every tar member was read back and checked against its original checksum **before editing**.
- `originals.tar.gz.sha256`: complete tar checksum.
- `git-status-before.txt`: full original status including untracked files.
- `README.md`: checksum and selective recovery procedure.
- Archive SHA-256: `daf2c880faa4c7323de98dfcfe2a97a594b7825b0bf9b79dd4a55937d73b4929`.

The backup is deliberately local and covered by the project's existing `backups/` ignore rule. It is not a substitute for a future approved commit/off-machine backup. Do not clean ignored backups while this is the recovery copy.

Recovery: from the repository root, change into `backups/battle-calculator-pass2-20261018T002530Z/`, then run `shasum -a 256 -c originals.tar.gz.sha256`. Extract `originals.tar.gz` into a **new empty recovery directory** using `tar -xzf originals.tar.gz -C /absolute/path/to/recovery-directory`. Compare desired files with `manifest.json`, then restore only deliberately selected paths; do not blindly overwrite newer project work. Extraction restores complete original `src`, `test`, `archive` and documentation dependencies in their original relative layout. Dependencies can be installed from the preserved package/lock files if historical execution is required.

### Original retirement archive inventory — kept byte-identical

- `archive/retired-battle-calculator/README.md` (578 bytes).
- `archive/retired-battle-calculator/calculator.css` (1,020 bytes).
- `archive/retired-battle-calculator/src/battle/damagePreview.js` (7,753 bytes).
- `archive/retired-battle-calculator/src/battle/koProbability.js` (10,773 bytes).
- `archive/retired-battle-calculator/src/ui/components/BattleDamageResults.jsx` (3,386 bytes).
- `archive/retired-battle-calculator/test/battleDamagePopup.browser.mjs` (9,012 bytes).
- `archive/retired-battle-calculator/test/battlePopupColors.browser.mjs` (7,733 bytes).
- `archive/retired-battle-calculator/test/battleReliability.browser.mjs` (5,798 bytes).
- `archive/retired-battle-calculator/test/damagePreview.test.js` (13,283 bytes).
- `archive/retired-battle-calculator/test/koReliability.test.js` (16,043 bytes).
- `archive/retired-battle-calculator/test/repeatKoPopup.test.js` (4,079 bytes).

### Old source and active test consumers

`battleDamage.js` imported shared conditions/type/Hidden Power/effectiveness/weight helpers; `battleRetaliation.js` imported it and shared effectiveness. Shared modules remain unchanged because the new calculator and other Battle behavior still need them.

| Original path | Original bytes | Original lines | Disposition |
| --- | ---: | ---: | --- |
| `src/battle/battleDamage.js` | 16,452 | 214 | Removed after fixture migration |
| `src/battle/battleRetaliation.js` | 2,755 | 33 | Removed after fixture migration |
| `test/battleDamage.test.js` | 15,629 | 226 | Removed after fixture migration |
| `test/battleRetaliation.test.js` | 2,045 | 30 | Removed after fixture migration |
| `test/battleAccuracy.test.js` | 4,173 | 56 | Removed after fixture migration |
| `test/battleAccuracyCorrections.test.js` | 9,143 | 126 | Kept; only retired dependency/associated assertions migrated |
| `test/battleFoundation.test.js` | 11,202 | 173 | Kept; only retired dependency/associated assertions migrated |
| `test/conditionState.test.js` | 6,707 | 59 | Kept; only retired dependency/associated assertions migrated |

The six original test consumers used inline `mon`/move/numerical fixtures. Foundation and condition-state tests additionally use `test/fixtures/synthetic.js`, parser/role identity and active adapters. All these dependencies are included in the verified snapshot; synthetic fixture code is unchanged. The existing archive's old imports remain historical references, not active test dependencies. Existing browser/import guards mentioning retired filenames are intentional and unchanged.

## Independent fixture disposition

The following is a per-test audit of the six original consumers. M1–M25 refer to tests in `test/calculatorMigration.test.js` in declaration order. Expectations were retained from the original literals/arithmetic, not generated from the new production output. The small local `conditions` helper only projects fixture input fields into the new explicit input shape; it implements no damage math or legacy facade.

All relevant supported mechanics are now exercised through the active calculator. Unsupported KO/retaliation/multi-strike/healing requirements remain recoverable historical evidence and are not active requirements.

### Migrated literal fixture inventory

1. **M1:** HIT100 base44 +2, Normal STAB69, sixteen literal rolls58–69.
2. **M2:** physical Ghost and special Dark categories use separate raw operands.
3. **M3:** Thick Fat24 and Flash Fire0 stay distinct; chart immunity is zero.
4. **M4:** Choice Band changes the pre-base operand, yielding102 not a final multiplier.
5. **M5:** unsupported/status/missing target inputs never receive ordinary damage.
6. **M6:** ordinary raw range and max-HP denominator are independent of target current HP.
7. **M7:** Eruption power150/75/1 at full/half/one HP.
8. **M8:** original Flail480-HP bracket fixtures retain20/40/80/100/150/200.
9. **M9:** Overgrow threshold is33HP, not34, for maxHP100.
10. **M10:** +2 Attack135, +2 Defense36, equal stages cancel69.
11. **M11:** burn36, Guts102 for all six statuses, special damage ignores burn.
12. **M12:** Marvel Scale physical46 only while statused.
13. **M13:** weather before +2 yields Water68/24 and Fire68.
14. **M14:** independent Reflect36 and Light Screen24 fixture values.
15. **M15:** weather suppression from either side yields46; uncertainty preserves46/68.
16. **M16:** sand grants no Rock special-defense boost.
17. **M17:** fixed50/40/20 ignore ordinary stat/status/weather/screen boosts.
18. **M18:** fixed chart immunity0 and SonicBoom Soundproof exception20.
19. **M19:** Super Fang floors51HP to25 and retains minimum1 on a living target.
20. **M20:** all original Low Kick weight boundaries and Aggron/Shroomish species fixtures.
21. **M21:** exact friendship0/100/255 preserves both Return and Frustration powers.
22. **M22:** critical138 and armor69 retain distinct ability scenarios.
23. **M23:** critical adverse/favorable stages, screens and burn retain138/534/72/92.
24. **M24:** row Thick Fat effectiveness stays separate from damage operand rounding.
25. **M25:** Frontier Soul Dew is inactive; Pikachu Light Ball is special-only69/90.

### `test/battleDamage.test.js` — original test-by-test disposition

| # | Original test | Action / independent equivalent |
| --- | --- | --- |
| 1 | Gen III base damage, STAB and sixteen random rolls | M1: literal58–69 and all16 rolls; old KO assertions retired. |
| 2 | physical and special categories follow type rather than move | M2; existing basicDamage category fixtures also retained. |
| 3 | immunities, ability uncertainty, and Thick Fat use separate scenarios | M3: Thick Fat24/Flash Fire0 and chart immunity. |
| 4 | Choice Band and Explosion modify stats before base damage | M4: Choice Band102. Explosion is excluded by the new supported scope; old135 preserved only in backup. |
| 5 | special and status moves never receive a misleading normal calculation | M5: status/Counter/missing-target omission; new API returns null instead of legacy messages. |
| 6 | remaining target HP changes KO odds without changing maximum-HP damage percentages | M6: unchanged raw range/max-HP denominator. KO/currentHP0 legacy policy is not migrated. |
| 7 | Eruption scales down with current HP and remains calculable at one HP | M7: exact Eruption150/75/1; specialDamage boundary fixtures retained. |
| 8 | Flail and Reversal respect the Gen III HP brackets | M8: original480HP brackets and literal powers; variableDamage covers Reversal and exact boundaries. |
| 9 | starter abilities activate at one third HP, including the integer threshold | M9: exact33/34HP boundary; modifier tests cover all four pinch abilities. |
| 10 | attack and defense stages apply independently and cancel at equal stages | M10:135/36/69 unchanged. |
| 11 | burn reduces physical damage, Guts overrides that penalty and activates on all major status | M11:36/102 and all six statuses unchanged. |
| 12 | Marvel Scale boosts physical defense only while statused | M12:46/69 unchanged; modifier tests also protect special-vs-physical distinction. |
| 13 | sun and rain modify damage before the final +2 | M13:68/24/68 unchanged. |
| 14 | Reflect and Light Screen affect only their damage category, while Brick Break bypasses screens | M14:36/24 unchanged. Real Brick Break75 and screen immutability already independently tested in specialDamage. The legacy name-only synthetic100-power Brick Break69 is not a valid canonical new special-move input. |
| 15 | Cloud Nine and Air Lock suppress weather for either side, preserving possible ability scenarios | M15:46/68 and both-side suppression unchanged. |
| 16 | Weather Ball changes type, power and category; Sandstorm grants no Gen III SpD boost | M16 retains no sand SpD boost. Weather Ball type/category, suppression,50 base/post-base doubling and literal ranges remain in migrated H04 and specialDamage tests; old effective-power100 metadata is not the new base-power contract. |
| 17 | fixed damage ignores stats, STAB, resistance, items, weather, and screens | M17: fixed50/40/20 unchanged; fixedDamage tests retain broader modifier immunity. |
| 18 | fixed damage respects immunities and Emerald’s Soundproof exceptions | M18: chart0/SonicBoom20. Wonder Guard is deliberately unavailable in the new engine, protected by existing modifier tests, not silently enabled. |
| 19 | Super Fang rounds down remaining HP, deals one at one HP; Endeavor uses the difference or fails | M19: Fang25 and1 unchanged; Endeavor/KO-only behavior stays retired. Existing fixedDamage tests protect Ghost immunity. |
| 20 | Low Kick uses Gen III weights and each exact weight bracket | M20: every original weight boundary and Aggron120/Shroomish20; no old lowKickPower import. |
| 21 | Return and Frustration use exact friendship, preserving zero and defaulting unknown to maximum power | M21: original0/100/255 values and null/undefined player defaults unchanged. Old empty-string fallback is not supported by the new strict friendship contract; existing variableDamage tests cover validation. |
| 22 | two-hit moves sum independently rounded damage rolls | Retired multi-strike calculation/KO. No equivalent is required by current scope; original test preserved in backup. |
| 23 | 2–5 hits use Emerald probabilities and exact independent-roll convolution | Retired multi-strike probability/convolution/KO requirements. Preserved in backup; do not import into the new engine. |
| 24 | multi-hit immunity produces zero total damage at every hit count | Retired multi-strike per-hit immunity/KO; ordinary and fixed immunities remain independently covered. |
| 25 | critical toggle doubles base damage and respects Shell Armor and Battle Armor | M22:138/69 and ability-dependent69/138 unchanged; modifier tests retain armor stage/screen boundaries. |
| 26 | Gen III critical hits ignore negative attack, positive defense and screens, retaining opposite stages and burn | M23:138/534/72/92 unchanged. |
| 27 | fixed damage ignores the crit toggle and multi-hit moves apply it per hit | M23 retains fixed50 under critical; multi-strike critical276 is outside scope and archived. |
| 28 | Psywave uses eleven level-scaled outcomes without ordinary modifiers | Psywave is excluded; original25–75 eleven-roll fixture is recoverable in backup. Existing basic/special omission guards retained. |
| 29 | Magnitude enumerates all seven powers and weighted KO odds | Magnitude/weighted KO is excluded; original powers/probabilities recoverable in backup. Existing omission guards retained. |
| 30 | Present separates exact cartridge damage and healing probabilities | Present damage/healing/probability is excluded; original outcomes recoverable in backup. Existing omission guards retained. |
| 31 | Triple Kick escalates each separately rounded kick and checks subsequent accuracy | Triple Kick escalation/accuracy/KO is excluded; original evidence recoverable in backup. |
| 32 | Triple Kick hit odds honor accuracy abilities, weather and Gen III evasion items | Triple Kick accuracy/Compound Eyes/Hustle/evasion scenarios are excluded and recoverable in backup. |

### `test/battleAccuracy.test.js` — original test-by-test disposition

| # | Original test | Action / independent equivalent |
| --- | --- | --- |
| 1 | Facade and SmellingSalt double completed base damage rather than base power | Canonical Facade70 post-base doubling, burn, Guts and screens already independently covered in specialDamage.test.js. SmellingSalt is excluded. Legacy synthetic Facade100/138/72 expectations are archived, not imposed on the canonical70 resolver. |
| 2 | Emerald Soundproof blocks Hyper Voice but not SonicBoom | SonicBoom20 retained in M18 and fixedDamage.test.js. Hyper Voice/Soundproof is intentionally unavailable, with omission guarded by basicDamageModifiers.test.js; do not fabricate zero damage. |
| 3 | Hidden Power triggers Counter even when its damage category is special in Emerald | Hidden Power category/type/IV fixtures remain in variableDamage.test.js. Counter/Mirror Coat classification is retired; original assertions preserved in backup. |
| 4 | False Swipe cannot knock out and caps damage at current HP minus one | False Swipe damage cap/KO is outside current eligibility and protected by existing basicDamage omission checks; original9/0 fixture archived. |
| 5 | Focus Band affects single-hit, fixed damage and multi-hit knockout odds | Focus Band KO odds and multi-strike survival are retired; raw damage/item invariance remains in existing basicDamageModifiers/fixedDamage tests. |
| 6 | Focus Band survival can enable Counter and is also respected by retaliation KO chances | Focus Band retaliation survival/KO is retired and preserved in backup. |
| 7 | type-only effectiveness remains separate from Thick Fat damage rounding | M24 retains the shared effectiveness helper assertion and literal Thick Fat24. |
| 8 | Soul Dew provides no boost in Frontier battles, Light Ball boosts only Pikachu special damage | M25 retains Soul Dew invariance and Pikachu physical69/special90. Existing modifier tests cover species restrictions. |

### `test/battleAccuracyCorrections.test.js` — original test-by-test disposition

| # | Original test | Action / independent equivalent |
| --- | --- | --- |
| 1 | H01 Forecast types cover every weather without mutating species or saved inputs | Unchanged shared type/immutability assertions; no retired dependency. |
| 2 | H01 Forecast STAB and defensive effectiveness use effective weather in both directions | Migrated to active result/scenario APIs with explicit conditions. Literal61/41/92/28/46 and ability split28/61 retained. |
| 3 | H04 Weather Ball independent cartridge-position fixtures for all weather and suppression | Migrated to active result/preparation APIs. Literal59–70,40–48,30–36, suppression, type/category and reference immutability retained. |
| 4 | H04 Weather Ball combines screens, crit, Forecast STAB and type modifiers with independent rounding | Migrated with literals36/140/105/210/36 unchanged. |
| 5 | H05 Ice Beam versus Charizard uses cartridge type order, independent of displayed type order | Migrated all16 literal rolls and56–67 in both defender type orders, plus immunity/effectiveness checks. Only retired6.25% KO assertion removed. |
| 6 | M01 Super Fang bypasses Focus Band while applicable fixed and ordinary damage retain it | Retired M01 Focus Band KO test. Its Ghost/Super Fang0 assertion is already retained independently in fixedDamage.test.js (each-script chart-immunity test). Original full test in backup. |
| 7 | H03 green Speed uses effective values without altering stage-only numbers or raw stats | Unchanged shared effective Speed/raw/display assertions. |
| 8 | H03 uncertain Speed scenarios suppress false certainty and retain correlated weather comparisons | Unchanged uncertain/correlated effective Speed assertions. |
| 9 | M02 Weather Ball icons/effectiveness share engine projection while reference move stays unchanged | Shared row/popup metadata assertions retained; only engine type access moves to active prepareBasicDamage. |
| 10 | H01 all Forecast weather forms apply offensive STAB and defensive typing numerically | All offensive/defensive Forecast literal maxima40/23,61/92,64/46,25/46 retained against active calculator. |

### `test/battleRetaliation.test.js` — original test-by-test disposition

| # | Original test | Action |
| --- | --- | --- |
| 1 | Counter doubles physical damage and Mirror Coat rejects it | Retired exclusively: Counter/Mirror Coat incoming damage, survival/KO or multi-strike/self-KO limitations are outside the approved new calculator. Full original test and literals preserved in verified recovery snapshot. |
| 2 | Gen III special typing qualifies for Mirror Coat and includes ability immunities | Retired exclusively: Counter/Mirror Coat incoming damage, survival/KO or multi-strike/self-KO limitations are outside the approved new calculator. Full original test and literals preserved in verified recovery snapshot. |
| 3 | previews exclude lethal rolls and flag unavoidable fainting | Retired exclusively: Counter/Mirror Coat incoming damage, survival/KO or multi-strike/self-KO limitations are outside the approved new calculator. Full original test and literals preserved in verified recovery snapshot. |
| 4 | multi-hit and self-KO moves have explicit limitations | Retired exclusively: Counter/Mirror Coat incoming damage, survival/KO or multi-strike/self-KO limitations are outside the approved new calculator. Full original test and literals preserved in verified recovery snapshot. |

### `test/battleFoundation.test.js` — mixed shared-behavior tests

| # | Original test | Action |
| --- | --- | --- |
| 1 | Frontier counts, identifiers and every trainer association survive migration | Kept unchanged; shared state/rules/adapter/identity/stat/conditions coverage. |
| 2 | all migrated sets resolve species, moves, abilities, items, natures and EV fields | Kept unchanged; shared state/rules/adapter/identity/stat/conditions coverage. |
| 3 | Tucker Silver abilities corrected; cartridge Shuckle anomaly deliberately preserved | Kept unchanged; shared state/rules/adapter/identity/stat/conditions coverage. |
| 4 | Tower level rules accept each manual Open Level and reject invalid values | Kept unchanged; shared state/rules/adapter/identity/stat/conditions coverage. |
| 5 | trainer IVs, explicit fallback, fixed Anabel IVs and future Dome exception | Kept unchanged; shared state/rules/adapter/identity/stat/conditions coverage. |
| 6 | Tower pool resolution retains trainer associations and excludes other Brains | Kept unchanged; shared state/rules/adapter/identity/stat/conditions coverage. |
| 7 | damage uses each chosen opponent level while retaining Gen 3 STAB and rounding | Kept all42 level cases and independently derived STAB/rounding arithmetic. Calls active calculateBasicDamage. Synthetic HP1000 normalized to999 to satisfy existing active input validation; HP is not part of asserted damage arithmetic, and no expected damage value changed. |
| 8 | trainer selection preserves player team/rules and all temporary conditions | Kept unchanged; shared state/rules/adapter/identity/stat/conditions coverage. |
| 9 | 2.0 party adapter preserves actual stats, identity, moves and zero friendship | Kept unchanged; shared state/rules/adapter/identity/stat/conditions coverage. |
| 10 | PC and Day Care use parser-calculated stats without selected-level rescaling | Kept PC/Day Care parser-stat and no-rescaling assertions; calculation smoke call uses active calculateBasicDamage. |
| 11 | Frontier role pool uses full-collection occurrence identities for same species and clones | Kept unchanged; shared state/rules/adapter/identity/stat/conditions coverage. |
| 12 | missing, egg, corrupt and malformed player records never produce guessed battle stats | Kept unchanged; shared state/rules/adapter/identity/stat/conditions coverage. |
| 13 | migrated nature/stat math retains known values and Shedinja override | Kept unchanged; shared state/rules/adapter/identity/stat/conditions coverage. |

### `test/conditionState.test.js` — mixed shared-behavior tests

| # | Original test | Action |
| --- | --- | --- |
| 1 | conditions validate HP/status/weather/stages/screens, including all stage endpoints | Kept unchanged; shared state/rules/adapter/identity/stat/conditions coverage. |
| 2 | every selection/navigation/team/rules action preserves conditions and expansion | Kept unchanged; shared state/rules/adapter/identity/stat/conditions coverage. |
| 3 | HP/status follow identities; stages/screens stay on the battle side; projection never mutates Pokémon | Kept unchanged; shared state/rules/adapter/identity/stat/conditions coverage. |
| 4 | Reset alone clears all conditions and keeps teams/trainer/active/rules/open state | Kept unchanged; shared state/rules/adapter/identity/stat/conditions coverage. |
| 5 | party HP initializes from the recorded save; PC/opponent HP initializes full without modifying imported data | Kept unchanged; shared state/rules/adapter/identity/stat/conditions coverage. |
| 6 | conditioned Pokémon feed existing Gen 3 damage and Speed helpers | Kept projection/Speed/level assertions. Explicit conditions reach active calculator; compare selected critical damage with critical-off and baseline damage instead of reading retired result metadata. |

## Files and scope

Removed:

- `src/battle/battleDamage.js`:16,452 bytes /214 lines.
- `src/battle/battleRetaliation.js`:2,755 bytes /33 lines.
- Three exclusively retired-engine test files: `battleDamage.test.js`, `battleRetaliation.test.js`, `battleAccuracy.test.js`, replaced by supported fixtures above; original complete tests recoverable in backup.

**Production-source removal:19,207 bytes /247 lines.** This is source-maintenance cleanup, not shipped-code savings: those modules were already excluded from production. Historical source, KO requirements and independent original expectations remain intact in recovery storage.

Modified only the three mixed test files: `battleAccuracyCorrections.test.js`, `battleFoundation.test.js`, `conditionState.test.js`. Added `test/calculatorMigration.test.js` (25 cases) and this record. The original cleanup audit and all historical docs remain unchanged; historical mentions of removed paths were not rewritten as part of B01. No B02–B07 helper/API cleanup was applied.

Kept unchanged:

- All six protected active calculator implementation modules and every other surviving source/UI/style/state implementation.
- All shared stat, stage, type, Hidden Power, Speed, projection, reference, identity and adapter helpers; all datasets/assets.
- Original11-file retirement archive and its historical non-executable imports.
- Existing transitive active-application retired-import guard and browser network guards.
- All25 browser scripts and every pre-existing new-calculator numerical fixture, including162 eligible moves,39 restored moves and corrected AUD-01.

## Verification

- Before:330 unit tests passed.
- After: **310 tests passed,0 failed/skipped**. Accounting:330 −44 tests in the three retired-only files +25 migrated supported-fixture tests −1 KO-only M01 test =310. Other mixed-file tests remain. The count changed because intentionally abandoned feature tests were retired/consolidated after supported evidence migration, not to bypass failures. Removed KO subassertions do not represent supported current scope.
- All current independent supported numeric fixture expectations pass unchanged. H05 retains56–67 and every literal roll in both defender type orders. Current restored-move and final-audit tests retain162/192 eligibility, all39 moves, both directions and AUD-01.
- Targeted migration run:53/53 passed before deleting old source. Full suite subsequently passed without either old source module.
- Production build passed:103 modules; HTML1.20kB/gzip0.48kB; CSS44.59kB/gzip8.97kB; JS1,014.18kB/gzip214.97kB. Existing >500kB JS warning remains. Artifact hashes match Pass1 (`index-5FY94Aqr.css`, `index-BZIREeMP.js`), consistent with no production behavior changes.
- All **25/25 browser scripts passed**. Existing checks cover320/375/430px mobile layouts, all four independent Matchup selection combinations, Conditions persistence, live popup recalculation/dismissal, both damage directions, all39 restored moves and unchanged UI controls. These are Chrome touch/mobile emulation checks, not a new physical iPhone Safari claim.
- Final full original-file comparison found only the three authorized mixed-test edits and five authorized deletions. New scoped files are only the migration test and this record. All other original source, tests, documentation, datasets, image assets, CSS and archive files are byte-identical. All213 tar members and the whole-tar checksum were reverified.
- Git status: **178 entries before** (one pre-existing tracked modification,177 untracked) and **175 after** (same tracked modification,174 untracked). Exactly five removed untracked paths are the two source modules and three retired test files; exactly two added paths are this record and the migration test. The three mixed test files were already untracked. Backup is intentionally ignored by the existing unchanged ignore rule. No staged changes, unrelated overwrites, commit or push.

No blocker prevented safe retirement. Remaining old filename references in archive/historical docs/recovery snapshots and rejection guards are intentional. No active application, test, browser or build-tool imports either removed module.

Stop after Pass2. Do not begin Pass3 without approval.
