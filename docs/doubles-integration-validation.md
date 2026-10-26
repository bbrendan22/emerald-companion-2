# Doubles Step 6 integration validation

Completed October 25, 2026. Scope: integration of the five completed Doubles steps, not the comprehensive calculator audit. Reference: pret/pokeemerald revision `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`.

## Outcome

- Full unit suite: **984 passed, 0 failed, 0 skipped**, across 146 test files. Added **32 unit integration regressions**.
- Production build: **PASS**, including PWA generation.
- Browser validation: **32 WebKit suites passed**. Added one combined-mechanic browser suite at 320/375/430px. Most existing suites cover those three widths; the legacy dynamic-move suite uses 375px only; additional desktop/390px coverage is recorded below.
- Singles snapshot: **10,620 complete results unchanged** across all 354 move IDs, five weather states, two critical settings and three attacker/defender profiles at levels 1/50/100. Snapshots preserve full conditional results and aggregate distributions, not only endpoints. They were captured from the approved 952-test baseline before this step and serve as regression snapshots, not independent arithmetic proofs.
- **No production integration defect demonstrated. No production fix required.** All **292 files under src/** retain their pre-step SHA-256 digests. No UI, rules, opponent observations, Frontier identification, ability mechanics or damage formulas changed.

Evidence: [full unit output](../artifacts/doubles-integration/unit-tests.log), [all unit files executed](../artifacts/doubles-integration/unit-test-files.txt), [build output](../artifacts/doubles-integration/production-build.log), [source comparison](../artifacts/doubles-integration/production-source-check.json), [browser manifest](../artifacts/doubles-integration/browser-results.json).

## Independently derived arithmetic

Unless stated otherwise: level 50, relevant raw stats 100, no stages/item/status, two active defenders, screens on the defending side. Every table scenario is checked in both attacking directions through reducer-owned conditions, Trace projection and matchupBattleContext. Individual random rolls are checked against the literal maximum using Emerald's final floor(max × r / 100), r=85..100.

| Scenario | Integer stages before random | Expected HP range |
| --- | --- | --- |
| Water-STAB Surf into Fire/Rock + Light Screen + Helping Hand | 41 → screen26 → spread13 → +2=15 → HH22 → STAB33 → typing132 | 112–132 |
| Same, one active defender | 41 → screen20 → +2=22 → HH33 → STAB49 → typing196 | 166–196 |
| Normal-STAB Razor Wind + Reflect + critical + Helping Hand | screen bypass; 35 → spread17 → +2=19 → crit38 → HH57 → STAB85 | 72–85 |
| Same, Battle Armor defender | 35 → screen22 → spread11 → +2=13 → HH19 → STAB28 | 23–28 |
| Copied Shell Armor, attacker Attack−2 / defender Defense+2 | Atk50/Def200 → subtotal8 → screen4 → spread2 → +2=4 → HH6 → STAB9 | 7–9 |
| Non-spread Normal-STAB Strength + critical + Helping Hand | 35 → +2=37 → crit74 → HH111 → STAB166 | 141–166 |
| Fire-STAB Heat Wave + Charcoal + activated/copied Flash Fire + Light Screen + spread + Helping Hand into Grass/Ice; represented Cloud Nine suppresses sun | SpA110 → 48 → screen32 → spread16 → FF24 → +2=26 → HH39 → STAB58 → typing232 | 197–232 |
| Same offensive setup, critical and represented Air Lock | 48 → spread24 → FF36 → +2=38 → crit76 → HH114 → STAB171 → typing684 | 581–684 |
| Fire-STAB Eruption at 67/200 HP into Grass/Ice + Light Screen + spread + Helping Hand | power50 → 22 → screen14 → spread7 → +2=9 → HH13 → STAB19 → typing76 | 64–76 |
| Water-STAB Water Spout at 133/200 HP into Fire/Rock + Light Screen + spread + Helping Hand | power99 → 43 → screen28 → spread14 → +2=16 → HH24 → STAB36 → typing144 | 122–144 |
| Fire-STAB Eruption at 1/200 HP, same modifiers | power1 → special subtotal0 → +2=2 → HH3 → STAB4 → typing16 | 13–16 |
| Ground-STAB Earthquake + Reflect + Helping Hand | 44 → screen28 → +2=30 → HH45 → STAB67; no spread reduction | 56–67 |

Additional independent regressions verify all 4,096 ordered random outcomes for three-hit Comet Punch (48–57 HP; Reflect 33–39; critical bypass 102–120) and Triple Kick (Fighting vs Normal: 77–92). These enumerate individual hits directly from independently derived per-hit maxima; they do not reuse the engine's convolution helper. The phone fixture's Psychic defender plus Reflect gives Triple Kick 10–14 HP, also checked.

Pursuit script doubling: subtotal17 → +2=19 → switching multiplier38 → HH57 (normal HH28). Revenge: subtotal26 → +2=28 → script56 → HH84 → Fighting/Normal168 (normal84). Hail Weather Ball's single-target Ice50 branch with Light Screen has subtotal22 → screen14 → +2=16 → script32 → HH48. No multiplied-base-power substitution is used.

Weather-sensitive Surf branches in the first scenario independently produce clear 112–132, sun 61–72, rain 156–184. The modeled Doubles result correctly remains unavailable for sun/rain because unseen suppression changes those distributions. Branch arithmetic is verified through the existing base/modifier functions; it is not presented as a known live-field outcome. Weather Ball type/power uncertainty is retained even when damage alone could be identical.

## Pinned source review

[CalculateBaseDamage and CountAliveMonsInBattle](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/pokemon.c): defending-side screen division precedes canonical BOTH-target spread division; critical bypasses screens, not spread. Weather and Flash Fire precede +2. The physical minimum-one rule is preserved. The existing move-target fingerprint test verifies all 354 entries and the exact 17 damaging BOTH moves. Earthquake, Magnitude, Explosion and Selfdestruct retain FOES_AND_ALLY targeting.

[Cmd_critcalc, Cmd_damagecalc and Cmd_typecalc](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/battle_script_commands.c): armor suppresses critical before calculation; critical/script multipliers precede Helping Hand, then STAB/types and random variation. Retained fixed/OHKO/unsupported dispatch exclusions are tested. [Field lookup and uncertainty details](doubles-field-abilities.md) remain applicable for Cloud Nine, Air Lock, Forecast, Damp, Plus/Minus and copied abilities.

## State and mobile findings

Confirmed independent count defaults/reset/format restoration; side-owned screens across selection/removal/replacement; recipient-owned Helping Hand across Pokémon switches, popup reopening and format changes; active-slot personal reset conventions; distinct copied-ability scenarios; unchanged opponent ability/item/move observations and possible set identification.

At 320/375/430px the new combined suite checks live count/Helping Hand updates in an open popup, both directions, crit/armor restoration, copied Flash Fire activation alongside Helping Hand, conditional visibility, one active-count row, two matchup positions, compact checkbox rows, 16px native count/copied-ability selectors, visual viewport scale on focus, percentage-before-HP, dismissal/reopening and no horizontal overflow. Screenshots: [320 conditions](../artifacts/doubles-integration/conditions-320.png), [375 conditions](../artifacts/doubles-integration/conditions-375.png), [430 conditions](../artifacts/doubles-integration/conditions-430.png), plus popup and conditional-ability captures in the same artifact folder. These are desktop Playwright WebKit checks, not physical-device keyboard testing.

## Test harness defect corrected

The first battlePopupDismiss WebKit attempt timed out before its assertions: it attempted to add an opponent without the existing trainer prerequisite. The old test also expected a selected trainer to open a picker and searched an unrestricted species roster. Production correctly gates selection and uses trainer rosters.

Updated only the harness to select VINCE first, test the empty-trainer popup separately, exercise the four other popup types with a populated matchup, and use VINCE's actual roster (Metagross/Gengar supported; Metang/Metapod/Mr. Mime absent). Existing outside-tap, compatibility-click, held-dismissal, next-tap, disabled-entry, team-editing and search assertions are retained. No damage expectation changed. Final rerun passed at 320/375/390/430/1440px. [Initial failure evidence](../artifacts/doubles-integration/logs/battlePopupDismiss-initial-stale-setup.log), [passing rerun](../artifacts/doubles-integration/logs/battlePopupDismiss.log).

## Files changed in this step

- test/doublesIntegration.test.js — 32 combined arithmetic/state/snapshot regressions.
- test/doublesIntegrationPopup.browser.mjs — combined mobile integration suite.
- test/fixtures/doublesSinglesSnapshot.js — reproducible Singles matrix.
- test/fixtures/doublesSinglesBaseline.json — approved pre-step result digests.
- test/fixtures/doublesSideConditions.jsx — test-only Razor Wind/Comet Punch/Triple Kick opening buttons.
- test/battlePopupDismiss.browser.mjs — stale prerequisite/workflow correction described above.
- docs/doubles-integration-validation.md — this validation report.

## Executed browser suites

Each row is one sequential command: node <file> [arguments]. Fixture servers ran sequentially to avoid Vite dependency-cache races. The unit command was npm test; build command npm run build. Existing test values were not changed to conceal a mechanic mismatch.

| Suite | Widths (px) | Final result | Output |
| --- | --- | --- | --- |
| [test/doublesSideConditions.browser.mjs](../test/doublesSideConditions.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/doublesSideConditions.log) |
| [test/spreadDamagePopup.browser.mjs](../test/spreadDamagePopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/spreadDamagePopup.log) |
| [test/helpingHandPopup.browser.mjs](../test/helpingHandPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/helpingHandPopup.log) |
| [test/unseenFieldAbilitiesPopup.browser.mjs](../test/unseenFieldAbilitiesPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/unseenFieldAbilitiesPopup.log) |
| [test/coreDamagePopup.browser.mjs](../test/coreDamagePopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/coreDamagePopup.log) |
| [test/screensPopup.browser.mjs](../test/screensPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/screensPopup.log) |
| [test/conditionalAbilitiesPopup.browser.mjs](../test/conditionalAbilitiesPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/conditionalAbilitiesPopup.log) |
| [test/plusMinusPopup.browser.mjs](../test/plusMinusPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/plusMinusPopup.log) |
| [test/forecastPopup.browser.mjs](../test/forecastPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/forecastPopup.log) |
| [test/weatherSuppressionPopup.browser.mjs](../test/weatherSuppressionPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/weatherSuppressionPopup.log) |
| [test/weatherBallPopup.browser.mjs](../test/weatherBallPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/weatherBallPopup.log) |
| [test/scenarioSelectorsPopup.browser.mjs](../test/scenarioSelectorsPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/scenarioSelectorsPopup.log) |
| [test/multiHitSelectorsPopup.browser.mjs](../test/multiHitSelectorsPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/multiHitSelectorsPopup.log) |
| [test/specialMoveOutcomesPopup.browser.mjs](../test/specialMoveOutcomesPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/specialMoveOutcomesPopup.log) |
| [test/psywavePresentPopup.browser.mjs](../test/psywavePresentPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/psywavePresentPopup.log) |
| [test/twoHitPopup.browser.mjs](../test/twoHitPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/twoHitPopup.log) |
| [test/deterministicDamagePopup.browser.mjs](../test/deterministicDamagePopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/deterministicDamagePopup.log) |
| [test/dynamicMovesPopup.browser.mjs](../test/dynamicMovesPopup.browser.mjs) | 375 | PASS | [Log](../artifacts/doubles-integration/logs/dynamicMovesPopup.log) |
| [test/hpDependentMovesPopup.browser.mjs](../test/hpDependentMovesPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/hpDependentMovesPopup.log) |
| [test/specialConventionalPopup.browser.mjs](../test/specialConventionalPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/specialConventionalPopup.log) |
| [test/abilityPreventionPopup.browser.mjs](../test/abilityPreventionPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/abilityPreventionPopup.log) |
| [test/opponentAbilitySelection.browser.mjs](../test/opponentAbilitySelection.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/opponentAbilitySelection.log) |
| [test/matchupAlignment.browser.mjs](../test/matchupAlignment.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/matchupAlignment.log) |
| [test/battleConditionsSlots.browser.mjs](../test/battleConditionsSlots.browser.mjs) --webkit | 320, 375, 430, 1440 | PASS | [Log](../artifacts/doubles-integration/logs/battleConditionsSlots.log) |
| [test/battlePopupDismiss.browser.mjs](../test/battlePopupDismiss.browser.mjs) --webkit | 320, 375, 390, 430, 1440 | PASS | [Log](../artifacts/doubles-integration/logs/battlePopupDismiss.log) |
| [test/doublesIntegrationPopup.browser.mjs](../test/doublesIntegrationPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/doublesIntegrationPopup.log) |
| [test/conditionalDamagePopup.browser.mjs](../test/conditionalDamagePopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/conditionalDamagePopup.log) |
| [test/consecutiveUsePopup.browser.mjs](../test/consecutiveUsePopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/consecutiveUsePopup.log) |
| [test/magnitudePopup.browser.mjs](../test/magnitudePopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/magnitudePopup.log) |
| [test/moveDamageModifiersPopup.browser.mjs](../test/moveDamageModifiersPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/moveDamageModifiersPopup.log) |
| [test/tripleKickPopup.browser.mjs](../test/tripleKickPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/tripleKickPopup.log) |
| [test/variableMultiHitPopup.browser.mjs](../test/variableMultiHitPopup.browser.mjs) | 320, 375, 430 | PASS | [Log](../artifacts/doubles-integration/logs/variableMultiHitPopup.log) |

## Remaining limits and readiness

Ready for the approved two-Pokémon Doubles calculation model within its documented coverage. Unseen weather suppression/Damp, missing opposite Plus/Minus and unresolved Trace may still require an unavailable result. Active counts cannot substitute for unknown battler ability/HP records. Unknown opponent IVs, legitimate ability alternatives and unsupported between-hit safeguards remain. Multi-hit critical policy and successful-hit assumptions remain as previously documented; no turn/partner/berry/Shell Bell simulation is added.

This step does not certify every mechanic in the entire calculator, implement OHKO probabilities or perform the separate comprehensive final audit. Stopped after Doubles Step 6.
